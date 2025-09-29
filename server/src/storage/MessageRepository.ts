import { SupabaseClient } from '@supabase/supabase-js';
import { StoredChatMessage } from '../types';

export class MessageRepository {
  private supabase: SupabaseClient;
  private tablePrefix: string;

  constructor(supabase: SupabaseClient, tablePrefix: string = '') {
    this.supabase = supabase;
    this.tablePrefix = tablePrefix;
  }

  private getTableName(table: string): string {
    return this.tablePrefix ? `${this.tablePrefix}_${table}` : table;
  }

  async saveMessage(message: StoredChatMessage): Promise<StoredChatMessage> {
    const tableName = this.getTableName('messages');

    if (message.id) {
      // Update existing message
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
        parentMessageId: message.parentMessageId,
        createdAt: new Date(data.created_at),
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      };
    }
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<StoredChatMessage[]> {
    const tableName = this.getTableName('messages');
    
    // First get the conversation internal ID
    const conversationQuery = await this.supabase
      .from('conversations')
      .select('id')
      .eq('uuid', conversationId)
      .single();
      
    if (conversationQuery.error) {
      throw new Error(`Failed to find conversation: ${conversationQuery.error.message}`);
    }

    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .eq('conversation_id', conversationQuery.data.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to get messages: ${error.message}`);

    return (data || []).map(row => {
      const metadata = row.metadata || {};
      return {
        id: row.uuid,
        conversationId: conversationId,
        threadId: conversationId,
        role: row.type,
        content: row.content,
        toolCalls: metadata.tool_calls,
        toolResults: metadata.tool_results,
        parentMessageId: row.parent_message_id,
        createdAt: new Date(row.created_at),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
      };
    });
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

  async getMessageById(messageId: string): Promise<StoredChatMessage | null> {
    const tableName = this.getTableName('messages');
    
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*, conversations!inner(uuid)')
      .eq('uuid', messageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get message: ${error.message}`);
    }

    const metadata = data.metadata || {};
    return {
      id: data.uuid,
      conversationId: data.conversations.uuid,
      threadId: data.conversations.uuid,
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
