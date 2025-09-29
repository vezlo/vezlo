import { v4 as uuidv4 } from 'uuid';
import {
  ChatManagerConfig,
  ChatConversation,
  StoredChatMessage,
  ChatContext,
  AIResponse,
  ChatMessage
} from '../types';
import { AIService } from './AIService';

export class ChatManager {
  private aiService: AIService;
  private config: ChatManagerConfig;
  private activeConversations: Map<string, ChatConversation>;

  constructor(config: ChatManagerConfig) {
    this.config = config;
    this.aiService = config.aiService;
    this.activeConversations = new Map();

    if (config.conversationTimeout) {
      setInterval(() => this.cleanupExpiredConversations(), 60000);
    }
  }

  async createConversation(
    userId: string,
    organizationId?: string,
    title?: string
  ): Promise<ChatConversation> {
    const threadId = uuidv4();
    const conversation: ChatConversation = {
      threadId,
      userId,
      organizationId,
      title: title || 'New Conversation',
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.config.storage && this.config.enableConversationManagement) {
      const savedConversation = await this.config.storage.saveConversation(conversation);
      conversation.id = savedConversation.id;
    }

    this.activeConversations.set(conversation.threadId, conversation);
    return conversation;
  }

  async getConversation(threadId: string): Promise<ChatConversation | null> {
    let conversation: ChatConversation | null | undefined = this.activeConversations.get(threadId);
    
    if (!conversation && this.config.storage && this.config.enableConversationManagement) {
      conversation = await this.config.storage.getConversation(threadId);
      if (conversation) {
        this.activeConversations.set(threadId, conversation);
      }
    }

    return conversation || null;
  }

  async sendMessage(
    message: string,
    threadId?: string,
    context?: ChatContext
  ): Promise<AIResponse & { conversationId?: string; messageId?: string }> {
    let conversation: ChatConversation | null = null;

    if (threadId) {
      conversation = await this.getConversation(threadId);
    }

    if (!conversation) {
      conversation = await this.createConversation(
        context?.userId || 'anonymous',
        context?.organizationId,
        'Chat Conversation'
      );
    }

    if (!conversation) {
      throw new Error('Failed to create or retrieve conversation');
    }

    const userMessage: StoredChatMessage = {
      conversationId: conversation.id || conversation.threadId,
      threadId: conversation.threadId,
      role: 'user',
      content: message,
      createdAt: new Date()
    };

    if (this.config.storage) {
      try {
        await this.config.storage.saveMessage(userMessage);
      } catch (error) {
        console.error('Failed to save user message:', error);
      }
    }

    const chatContext: ChatContext = {
      ...context,
      conversationId: conversation.id || conversation.threadId,
      threadId: conversation.threadId,
      conversationHistory: await this.getRecentMessages(conversation.threadId)
    };

    const aiResponse = await this.aiService.generateResponse(message, chatContext);

    const assistantMessage: StoredChatMessage = {
      conversationId: conversation.id || conversation.threadId,
      threadId: conversation.threadId,
      role: 'assistant',
      content: aiResponse.content,
      toolResults: aiResponse.toolResults,
      createdAt: new Date()
    };

    let messageId: string | undefined;
    if (this.config.storage) {
      try {
        const savedMessage = await this.config.storage.saveMessage(assistantMessage);
        messageId = savedMessage.id;
      } catch (error) {
        console.error('Failed to save assistant message:', error);
      }
    }

    conversation.messageCount += 2;
    conversation.updatedAt = new Date();

    if (this.config.storage && this.config.enableConversationManagement) {
      try {
        await this.config.storage.updateConversation(conversation.id || conversation.threadId, {
          messageCount: conversation.messageCount,
          updatedAt: conversation.updatedAt
        });
      } catch (error) {
        console.error('Failed to update conversation:', error);
      }
    }

    this.activeConversations.set(conversation.threadId, conversation);

    return {
      ...aiResponse,
      conversationId: conversation.id || conversation.threadId,
      messageId
    };
  }

  async getRecentMessages(threadId: string, limit = 10): Promise<ChatMessage[]> {
    if (!this.config.storage) {
      return [];
    }

    try {
      const messages = await this.config.storage.getMessages(threadId, limit);
      return messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        toolResults: msg.toolResults
      }));
    } catch (error) {
      console.error('Failed to get recent messages:', error);
      return [];
    }
  }

  async getUserConversations(userId: string, organizationId?: string): Promise<ChatConversation[]> {
    if (!this.config.storage) {
      return [];
    }

    try {
      return await this.config.storage.getUserConversations(userId, organizationId);
    } catch (error) {
      console.error('Failed to get user conversations:', error);
      return [];
    }
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    if (!this.config.storage) {
      return false;
    }

    try {
      const result = await this.config.storage.deleteConversation(conversationId);
      
      // Remove from active conversations
      for (const [threadId, conversation] of this.activeConversations.entries()) {
        if (conversation.id === conversationId) {
          this.activeConversations.delete(threadId);
          break;
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    }
  }

  private cleanupExpiredConversations(): void {
    const timeout = this.config.conversationTimeout || 3600000; // 1 hour default
    const cutoff = new Date(Date.now() - timeout);

    for (const [threadId, conversation] of this.activeConversations.entries()) {
      if (conversation.updatedAt < cutoff) {
        this.activeConversations.delete(threadId);
      }
    }
  }
}
