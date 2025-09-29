import { Request, Response } from 'express';
import { ChatManager } from '../services/ChatManager';
import { UnifiedStorage } from '../storage/UnifiedStorage';
import logger from '../config/logger';

export class ChatController {
  private chatManager: ChatManager;
  private storage: UnifiedStorage;

  constructor(chatManager: ChatManager, storage: UnifiedStorage) {
    this.chatManager = chatManager;
    this.storage = storage;
  }

  // Create a new conversation
  async createConversation(req: Request, res: Response): Promise<void> {
    try {
      const { title, user_uuid, company_uuid } = req.body;

      if (!user_uuid) {
        res.status(400).json({ error: 'user_uuid is required' });
        return;
      }

      // Generate a unique thread ID for the conversation
      const threadId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const conversation = await this.storage.saveConversation({
        threadId,
        userId: user_uuid.toString(),
        organizationId: company_uuid?.toString(),
        title: title || 'New Conversation',
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.json({
        uuid: conversation.id,
        title: conversation.title,
        user_uuid: conversation.userId,
        company_uuid: conversation.organizationId,
        message_count: conversation.messageCount,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt
      });

    } catch (error) {
      logger.error('Create conversation error:', error);
      res.status(500).json({
        error: 'Failed to create conversation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Create a user message in a conversation
  async createUserMessage(req: Request, res: Response): Promise<void> {
    try {
      const { uuid } = req.params;
      const { content } = req.body;

      if (!content) {
        res.status(400).json({ error: 'content is required' });
        return;
      }

      // Check if conversation exists
      const conversation = await this.storage.getConversation(uuid);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      // Create user message
      const userMessage = await this.storage.saveMessage({
        conversationId: uuid,
        threadId: conversation.threadId,
        role: 'user',
        content,
        createdAt: new Date()
      });

      // Update conversation message count
      await this.storage.updateConversation(uuid, {
        messageCount: conversation.messageCount + 1
      });

      res.json({
        uuid: userMessage.id,
        conversation_uuid: uuid,
        type: userMessage.role,
        content: userMessage.content,
        created_at: userMessage.createdAt
      });

    } catch (error) {
      logger.error('Create user message error:', error);
      res.status(500).json({
        error: 'Failed to create user message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Generate AI response for a user message
  async generateResponse(req: Request, res: Response): Promise<void> {
    try {
      const { uuid } = req.params;

      // Get the user message by ID using the repository
      const userMessage = await this.storage.getMessageById(uuid);
      
      if (!userMessage) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      const conversationId = userMessage.conversationId;
      const userMessageContent = userMessage.content;

      // Get conversation context (recent messages)
      const messages = await this.storage.getMessages(conversationId, 10);
      
      // Build context for AI
      const chatContext = {
        conversationHistory: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          createdAt: msg.createdAt
        }))
      };

      // Generate AI response using the actual user message content
      const response = await (this.chatManager as any).aiService.generateResponse(userMessageContent, chatContext);

      // Save AI message to database
      // Note: The storage layer will handle UUID to internal ID conversion
      const assistantMessage = await this.storage.saveMessage({
        conversationId: conversationId, // This is the conversation UUID
        threadId: conversationId,
        role: 'assistant',
        content: response.content,
        parentMessageId: uuid, // This is the parent message UUID
        toolResults: response.toolResults,
        createdAt: new Date()
      });

      // Update conversation message count
      const conversation = await this.storage.getConversation(conversationId);
      if (conversation) {
        await this.storage.updateConversation(conversationId, {
          messageCount: conversation.messageCount + 1
        });
      }

      res.json({
        uuid: assistantMessage.id,
        parent_message_uuid: uuid,
        type: 'assistant',
        content: response.content,
        status: 'completed',
        created_at: assistantMessage.createdAt.toISOString()
      });

    } catch (error) {
      logger.error('Generate response error:', error);
      res.status(500).json({
        error: 'Failed to generate response',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get conversation details with messages
  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { uuid } = req.params;
      const conversation = await this.storage.getConversation(uuid);

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      const messages = await this.storage.getMessages(uuid, 50);

      res.json({
        uuid: conversation.id,
        title: conversation.title,
        user_uuid: conversation.userId,
        company_uuid: conversation.organizationId,
        message_count: conversation.messageCount,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
        messages: messages.map(msg => ({
          uuid: msg.id,
          parent_message_uuid: msg.parentMessageId,
          type: msg.role,
          content: msg.content,
          status: 'completed',
          created_at: msg.createdAt
        }))
      });

    } catch (error) {
      logger.error('Get conversation error:', error);
      res.status(500).json({
        error: 'Failed to get conversation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user conversations (renamed from getUserConversations)
  async getUserConversations(req: Request, res: Response): Promise<void> {
    try {
      const { uuid } = req.params;
      const { company_uuid } = req.query;

      const conversations = await this.storage.getUserConversations(
        uuid,
        company_uuid as string
      );

      res.json({
        conversations: conversations.map(conversation => ({
          uuid: conversation.id,
          title: conversation.title,
          user_uuid: conversation.userId,
          company_uuid: conversation.organizationId,
          message_count: conversation.messageCount,
          created_at: conversation.createdAt,
          updated_at: conversation.updatedAt
        }))
      });

    } catch (error) {
      logger.error('Get user conversations error:', error);
      res.status(500).json({
        error: 'Failed to get user conversations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete conversation
  async deleteConversation(req: Request, res: Response): Promise<void> {
    try {
      const { uuid } = req.params;
      const success = await this.storage.deleteConversation(uuid);

      if (!success) {
        res.status(404).json({ error: 'Conversation not found or could not be deleted' });
        return;
      }

      res.json({ success: true });

    } catch (error) {
      logger.error('Delete conversation error:', error);
      res.status(500).json({
        error: 'Failed to delete conversation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Submit message feedback
  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { message_uuid, user_uuid, rating, category, comment, suggested_improvement } = req.body;

      if (!message_uuid || !user_uuid || !rating) {
        res.status(400).json({ error: 'message_uuid, user_uuid, and rating are required' });
        return;
      }

      // Get the message to find its conversationId
      const message = await this.storage.getMessageById(message_uuid);
      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      const feedback = await this.storage.saveFeedback({
        messageId: message_uuid,
        conversationId: message.conversationId, // Use the actual conversationId from the message
        userId: user_uuid.toString(),
        rating,
        category,
        comment,
        suggestedImprovement: suggested_improvement,
        createdAt: new Date()
      });

      res.json({
        success: true,
        feedback: {
          uuid: feedback.id,
          message_uuid: feedback.messageId,
          user_uuid: feedback.userId,
          rating: feedback.rating,
          category: feedback.category,
          comment: feedback.comment,
          suggested_improvement: feedback.suggestedImprovement,
          created_at: feedback.createdAt
        }
      });

    } catch (error) {
      logger.error('Submit feedback error:', error);
      res.status(500).json({
        error: 'Failed to submit feedback',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

}