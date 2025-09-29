import { SupabaseClient } from '@supabase/supabase-js';
import {
  ChatStorage,
  ChatConversation,
  StoredChatMessage,
  Feedback
} from '../types';

export class SupabaseStorage implements ChatStorage {
  private supabase: SupabaseClient;
  private tablePrefix: string;

  constructor(
    supabase: SupabaseClient,
    tablePrefix: string = ''
  ) {
    this.supabase = supabase;
    this.tablePrefix = tablePrefix;
  }

  private getTableName(table: string): string {
    return this.tablePrefix ? `${this.tablePrefix}_${table}` : table;
  }

  async saveConversation(conversation: ChatConversation): Promise<ChatConversation> {
    const tableName = this.getTableName('conversations');

    if (conversation.id) {
      const { data, error } = await this.supabase
        .from(tableName)
        .update({
          title: conversation.title,
          message_count: conversation.messageCount,
          updated_at: conversation.updatedAt || new Date().toISOString()
        })
        .eq('uuid', conversation.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update conversation: ${error.message}`);
      return this.rowToConversation(data);
    } else {
      // Convert string IDs to integers (dummy IDs for now)
      const companyId = conversation.organizationId ? parseInt(conversation.organizationId) || 1 : 1;
      const creatorId = parseInt(conversation.userId) || 1;
      
      const { data, error } = await this.supabase
        .from(tableName)
        .insert({
          company_id: companyId,
          creator_id: creatorId,
          title: conversation.title,
          message_count: conversation.messageCount,
          created_at: conversation.createdAt.toISOString(),
          updated_at: conversation.updatedAt.toISOString()
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create conversation: ${error.message}`);
      return this.rowToConversation(data);
    }
  }

  async getConversation(conversationId: string): Promise<ChatConversation | null> {
    const tableName = this.getTableName('conversations');

    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .eq('uuid', conversationId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    return this.rowToConversation(data);
  }

  async updateConversation(conversationId: string, updates: Partial<ChatConversation>): Promise<ChatConversation> {
    const tableName = this.getTableName('conversations');

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.messageCount !== undefined) updateData.message_count = updates.messageCount;

    const { data, error } = await this.supabase
      .from(tableName)
      .update(updateData)
      .eq('uuid', conversationId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update conversation: ${error.message}`);
    return this.rowToConversation(data);
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    const tableName = this.getTableName('conversations');

    const { error } = await this.supabase
      .from(tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('uuid', conversationId);

    if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
    return true;
  }

  async getUserConversations(userId: string, organizationId?: string): Promise<ChatConversation[]> {
    const tableName = this.getTableName('conversations');
    
    // Convert string IDs to integers (dummy IDs for now)
    const creatorId = parseInt(userId) || 1;
    const companyId = organizationId ? parseInt(organizationId) || 1 : null;

    let query = this.supabase
      .from(tableName)
      .select('*')
      .eq('creator_id', creatorId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get user conversations: ${error.message}`);
    return data.map(row => this.rowToConversation(row));
  }

  async saveMessage(message: StoredChatMessage): Promise<StoredChatMessage> {
    const tableName = this.getTableName('messages');

    if (message.id) {
      const { data, error } = await this.supabase
        .from(tableName)
        .update({
          content: message.content,
          metadata: { tool_calls: message.toolCalls, tool_results: message.toolResults },
          updated_at: new Date().toISOString()
        })
        .eq('uuid', message.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update message: ${error.message}`);
      const metadata = data.metadata || {};
      return {
        id: data.uuid,
        conversationId: message.conversationId,
        threadId: message.threadId,
        role: data.type,
        content: data.content,
        toolCalls: metadata.tool_calls,
        toolResults: metadata.tool_results,
        parentMessageId: data.parent_message_id,
        createdAt: new Date(data.created_at),
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      };
    } else {
      // Get conversation internal ID from UUID
      const conversationQuery = await this.supabase
        .from('conversations')
        .select('id')
        .eq('uuid', message.conversationId)
        .single();
        
      if (conversationQuery.error) throw new Error(`Failed to find conversation: ${conversationQuery.error.message}`);
      
      // Get parent message internal ID if parentMessageId is provided
      let parentMessageInternalId = null;
      if (message.parentMessageId) {
        const parentMessageQuery = await this.supabase
          .from('messages')
          .select('id')
          .eq('uuid', message.parentMessageId)
          .single();
          
        if (parentMessageQuery.data && !parentMessageQuery.error) {
          parentMessageInternalId = parentMessageQuery.data.id;
        }
      }
      
      const { data, error } = await this.supabase
        .from(tableName)
        .insert({
          conversation_id: conversationQuery.data.id,
          parent_message_id: parentMessageInternalId,
          type: message.role,
          content: message.content,
          metadata: { tool_calls: message.toolCalls, tool_results: message.toolResults },
          created_at: message.createdAt.toISOString()
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create message: ${error.message}`);
      const metadata = data.metadata || {};
      return {
        id: data.uuid,
        conversationId: message.conversationId,
        threadId: message.threadId,
        role: data.type,
        content: data.content,
        toolCalls: metadata.tool_calls,
        toolResults: metadata.tool_results,
        parentMessageId: data.parent_message_id,
        createdAt: new Date(data.created_at),
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      };
    }
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<StoredChatMessage[]> {
    // Join messages with conversations to get conversation UUID
    const { data, error } = await this.supabase
      .from('messages')
      .select(`
        uuid,
        type,
        content,
        status,
        metadata,
        parent_message_id,
        created_at,
        updated_at,
        conversations!inner(uuid)
      `)
      .eq('conversations.uuid', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to get messages: ${error.message}`);
    
    return data.map((row: any) => ({
      id: row.uuid,
      conversationId: (row.conversations as any).uuid,
      threadId: (row.conversations as any).uuid,
      role: row.type,
      content: row.content,
      toolCalls: row.metadata?.tool_calls,
      toolResults: row.metadata?.tool_results,
      parentMessageId: row.parent_message_id,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    }));
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    const tableName = this.getTableName('messages');

    const { error } = await this.supabase
      .from(tableName)
      .delete()
      .eq('uuid', messageId);

    if (error) throw new Error(`Failed to delete message: ${error.message}`);
    return true;
  }

  async saveFeedback(feedback: Feedback): Promise<Feedback> {
    const tableName = this.getTableName('message_feedback');

    if (feedback.id) {
      const { data, error } = await this.supabase
        .from(tableName)
        .update({
          rating: feedback.rating,
          category: feedback.category,
          comment: feedback.comment,
          suggested_improvement: feedback.suggestedImprovement
        })
        .eq('uuid', feedback.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update feedback: ${error.message}`);
      return {
        id: data.uuid,
        messageId: feedback.messageId,
        conversationId: feedback.conversationId,
        userId: data.user_id.toString(),
        rating: data.rating,
        category: data.category,
        comment: data.comment,
        suggestedImprovement: data.suggested_improvement,
        createdAt: new Date(data.created_at)
      };
    } else {
      // Get message internal ID from UUID
      const messageQuery = await this.supabase
        .from('messages')
        .select('id')
        .eq('uuid', feedback.messageId)
        .single();
        
      if (messageQuery.error) throw new Error(`Failed to find message: ${messageQuery.error.message}`);
      
      // Convert user ID to integer (dummy ID for now)
      const userId = parseInt(feedback.userId) || 1;
      
      const { data, error } = await this.supabase
        .from(tableName)
        .insert({
          message_id: messageQuery.data.id,
          user_id: userId,
          rating: feedback.rating,
          category: feedback.category,
          comment: feedback.comment,
          suggested_improvement: feedback.suggestedImprovement,
          created_at: feedback.createdAt.toISOString()
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create feedback: ${error.message}`);
      return {
        id: data.uuid,
        messageId: feedback.messageId,
        conversationId: feedback.conversationId,
        userId: data.user_id.toString(),
        rating: data.rating,
        category: data.category,
        comment: data.comment,
        suggestedImprovement: data.suggested_improvement,
        createdAt: new Date(data.created_at)
      };
    }
  }

  async getFeedback(messageId: string): Promise<Feedback[]> {
    // Join feedback with messages to get message UUID
    const { data, error } = await this.supabase
      .from('message_feedback')
      .select(`
        uuid,
        user_id,
        rating,
        category,
        comment,
        suggested_improvement,
        created_at,
        messages!inner(uuid)
      `)
      .eq('messages.uuid', messageId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get feedback: ${error.message}`);
    
    return data.map((row: any) => ({
      id: row.uuid,
      messageId: (row.messages as any).uuid,
      conversationId: '', // Will be populated by controller if needed
      userId: row.user_id.toString(),
      rating: row.rating,
      category: row.category,
      comment: row.comment,
      suggestedImprovement: row.suggested_improvement,
      createdAt: new Date(row.created_at)
    }));
  }

  private rowToConversation(row: any): ChatConversation {
    return {
      id: row.uuid,
      threadId: row.uuid, // Use UUID as thread ID
      userId: row.creator_id.toString(),
      organizationId: row.company_id ? row.company_id.toString() : undefined,
      title: row.title,
      messageCount: row.message_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined
    };
  }

}

