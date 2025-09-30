/**
 * Knowledge Base API Schemas
 * All request/response schemas for knowledge base endpoints
 */

export const KnowledgeSchemas = {
  // ============================================================================
  // KNOWLEDGE ITEM REQUEST SCHEMAS
  // ============================================================================
  CreateKnowledgeItemRequest: {
    type: 'object',
    required: ['title', 'type', 'created_by_uuid'],
    properties: {
      parent_uuid: { type: 'string', description: 'Parent item UUID (for hierarchical structure)' },
      company_uuid: { type: 'integer', description: 'Company UUID', default: 67890 },
      title: { type: 'string', description: 'Item title' },
      description: { type: 'string', description: 'Item description' },
      type: { 
        type: 'string', 
        enum: ['folder', 'document', 'file', 'url', 'url_directory'],
        description: 'Item type'
      },
      content: { type: 'string', description: 'Content (required for document type)' },
      file_url: { type: 'string', description: 'File/URL (required for file and url types)' },
      file_size: { type: 'integer', description: 'File size in bytes' },
      file_type: { type: 'string', description: 'MIME type for files' },
      metadata: { type: 'object', description: 'Additional metadata' },
      created_by_uuid: { type: 'integer', description: 'User UUID who created the item', default: 12345 }
    }
  },

  UpdateKnowledgeItemRequest: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Item title' },
      description: { type: 'string', description: 'Item description' },
      content: { type: 'string', description: 'Item content' },
      file_url: { type: 'string', description: 'File/URL' },
      file_size: { type: 'integer', description: 'File size in bytes' },
      file_type: { type: 'string', description: 'MIME type' },
      metadata: { type: 'object', description: 'Additional metadata' }
    }
  },

  KnowledgeSearchRequest: {
    type: 'object',
    required: ['query'],
    properties: {
      query: { type: 'string', description: 'Search query' },
      limit: { type: 'integer', default: 5, description: 'Max results' },
      threshold: { type: 'number', default: 0.7, description: 'Similarity threshold' },
      type: { type: 'string', enum: ['semantic', 'keyword', 'hybrid'], default: 'hybrid', description: 'Search type' },
      company_uuid: { type: 'integer', description: 'Filter by company UUID', default: 67890 }
    }
  },

  // ============================================================================
  // KNOWLEDGE ITEM RESPONSE SCHEMAS
  // ============================================================================
  KnowledgeItemResponse: {
    type: 'object',
    properties: {
      uuid: { type: 'string', description: 'Item UUID' },
      parent_uuid: { type: 'string', description: 'Parent item UUID' },
      company_uuid: { type: 'integer', description: 'Company UUID', default: 67890 },
      title: { type: 'string', description: 'Item title' },
      description: { type: 'string', description: 'Item description' },
      type: { type: 'string', description: 'Item type' },
      content: { type: 'string', description: 'Item content' },
      file_url: { type: 'string', description: 'File/URL' },
      file_size: { type: 'integer', description: 'File size in bytes' },
      file_type: { type: 'string', description: 'MIME type' },
      metadata: { type: 'object', description: 'Additional metadata' },
      created_by_uuid: { type: 'integer', description: 'Creator user UUID' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },

  KnowledgeItemListResponse: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/KnowledgeItemResponse' }
      },
      total: { type: 'integer', description: 'Total number of items' },
      limit: { type: 'integer', description: 'Items per page' },
      offset: { type: 'integer', description: 'Items skipped' }
    }
  },

  KnowledgeSearchResponse: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Original search query' },
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            uuid: { type: 'string', description: 'Item UUID' },
            title: { type: 'string', description: 'Item title' },
            description: { type: 'string', description: 'Item description' },
            content: { type: 'string', description: 'Item content' },
            type: { type: 'string', description: 'Item type' },
            score: { type: 'number', description: 'Relevance score' },
            metadata: { type: 'object', description: 'Additional metadata' }
          }
        }
      },
      total: { type: 'integer', description: 'Total results found' },
      search_type: { type: 'string', description: 'Type of search performed' },
      threshold: { type: 'number', description: 'Similarity threshold used' }
    }
  }
};
