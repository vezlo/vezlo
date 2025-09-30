/**
 * Conversation API Schemas
 * All request/response schemas for conversation-related endpoints
 */

export const ConversationSchemas = {
  // ============================================================================
  // CONVERSATION REQUEST SCHEMAS
  // ============================================================================
  CreateConversationRequest: {
    type: 'object',
    required: ['user_uuid'],
    properties: {
      title: { type: 'string', description: 'Conversation title', default: 'New Conversation' },
      user_uuid: { type: 'integer', description: 'User UUID who creates the conversation', default: 12345 },
      company_uuid: { type: 'integer', description: 'Optional company UUID', default: 67890 }
    }
  },

  UpdateConversationRequest: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Updated conversation title' }
    }
  },

  // ============================================================================
  // CONVERSATION RESPONSE SCHEMAS
  // ============================================================================
  ConversationResponse: {
    type: 'object',
    properties: {
      uuid: { type: 'string', description: 'Conversation UUID' },
      title: { type: 'string', description: 'Conversation title' },
      user_uuid: { type: 'string', description: 'User UUID' },
      company_uuid: { type: 'string', description: 'Company UUID' },
      message_count: { type: 'integer', description: 'Number of messages' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },

  ConversationWithMessages: {
    type: 'object',
    properties: {
      uuid: { type: 'string', description: 'Conversation UUID' },
      title: { type: 'string', description: 'Conversation title' },
      user_uuid: { type: 'string', description: 'User UUID' },
      company_uuid: { type: 'string', description: 'Company UUID' },
      message_count: { type: 'integer', description: 'Number of messages' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
      messages: {
        type: 'array',
        items: { $ref: '#/components/schemas/MessageResponse' }
      }
    }
  },

  ConversationListResponse: {
    type: 'object',
    properties: {
      conversations: {
        type: 'array',
        items: { $ref: '#/components/schemas/ConversationResponse' }
      },
      total: { type: 'integer', description: 'Total number of conversations' },
      limit: { type: 'integer', description: 'Conversations per page' },
      offset: { type: 'integer', description: 'Conversations skipped' }
    }
  }
};
