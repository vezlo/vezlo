import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable required extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS vector');

  // ============================================================================
  // CONVERSATIONS & MESSAGES SCHEMA (Modern 2-API Flow)
  // ============================================================================

  // Conversations table (renamed from chat_sessions)
  await knex.schema.createTable('conversations', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').defaultTo(knex.raw('gen_random_uuid()')).unique().notNullable();
    table.bigInteger('company_id').comment('Multi-tenancy support');
    table.bigInteger('creator_id').notNullable().comment('User who created conversation');
    table.text('title').notNullable();
    table.integer('message_count').defaultTo(0);
    table.timestamps(true, true); // created_at, updated_at with timezone
    table.timestamp('deleted_at', { useTz: true }).comment('Soft delete');
  });

  // Messages table (supports parent-child relationships for regeneration)
  await knex.schema.createTable('messages', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').defaultTo(knex.raw('gen_random_uuid()')).unique().notNullable();
    table.bigInteger('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.bigInteger('parent_message_id').references('id').inTable('messages').comment('For regeneration chains');
    table.text('type').notNullable().comment('user, assistant, system');
    table.text('content').notNullable();
    table.text('status').defaultTo('completed').comment('generating, completed, stopped, failed');
    table.jsonb('metadata').defaultTo('{}').comment('For tool_calls, tool_results, etc.');
    table.timestamps(true, true); // created_at, updated_at with timezone
  });

  // Message feedback table
  await knex.schema.createTable('message_feedback', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').defaultTo(knex.raw('gen_random_uuid()')).unique().notNullable();
    table.bigInteger('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
    table.bigInteger('user_id').notNullable();
    table.text('rating').notNullable().comment('positive, negative');
    table.text('category');
    table.text('comment');
    table.text('suggested_improvement');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // ============================================================================
  // KNOWLEDGE BASE SCHEMA (Unified Single Table)
  // ============================================================================

  // Knowledge items table (folders, documents, files, URLs - everything)
  await knex.schema.createTable('knowledge_items', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').defaultTo(knex.raw('gen_random_uuid()')).unique().notNullable();
    table.bigInteger('parent_id').references('id').inTable('knowledge_items').comment('Hierarchical structure');
    table.bigInteger('company_id').comment('Multi-tenancy support');
    table.text('title').notNullable();
    table.text('description');
    table.text('type').notNullable().comment('folder, document, file, url, url_directory');
    table.text('content').comment('For document type');
    table.text('file_url').comment('For file/url types');
    table.bigInteger('file_size').comment('File size in bytes');
    table.text('file_type').comment('MIME type for files');
    table.jsonb('metadata').defaultTo('{}').comment('Flexible metadata storage');
    table.specificType('embedding', 'vector(1536)').comment('OpenAI embeddings for search');
    table.timestamp('processed_at', { useTz: true }).comment('When embedding was generated');
    table.bigInteger('created_by').notNullable();
    table.timestamps(true, true); // created_at, updated_at with timezone
  });

  // ============================================================================
  // INDEXES FOR PERFORMANCE
  // ============================================================================

  // Conversations indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_conversations_uuid ON conversations(uuid)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_conversations_company_id ON conversations(company_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_conversations_creator_id ON conversations(creator_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_conversations_deleted ON conversations(deleted_at) WHERE deleted_at IS NULL');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)');

  // Messages indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_messages_uuid ON messages(uuid)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_message_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)');

  // Message feedback indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_feedback_uuid ON message_feedback(uuid)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_feedback_message_id ON message_feedback(message_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON message_feedback(user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_feedback_rating ON message_feedback(rating)');

  // Knowledge items indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_knowledge_uuid ON knowledge_items(uuid)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_knowledge_company_id ON knowledge_items(company_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_knowledge_parent_id ON knowledge_items(parent_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_items(type)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_knowledge_created_by ON knowledge_items(created_by)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge_items(created_at DESC)');

  // Full-text search index for knowledge items
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_search 
    ON knowledge_items USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, '')))
  `);

  // Vector similarity index for semantic search (only for items with content)
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_embedding 
    ON knowledge_items USING ivfflat (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL
  `);

  // Sparse indexes for better performance
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_knowledge_content ON knowledge_items(content) WHERE content IS NOT NULL');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_knowledge_file_url ON knowledge_items(file_url) WHERE file_url IS NOT NULL');

  // ============================================================================
  // ROW LEVEL SECURITY (Optional but Recommended)
  // ============================================================================

  // Enable RLS on all tables
  await knex.schema.raw('ALTER TABLE conversations ENABLE ROW LEVEL SECURITY');
  await knex.schema.raw('ALTER TABLE messages ENABLE ROW LEVEL SECURITY');
  await knex.schema.raw('ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY');
  await knex.schema.raw('ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY');

  // Policies for service role access (full access)
  await knex.schema.raw(`
    CREATE POLICY "Service role can access all conversations" ON conversations
      FOR ALL USING (auth.role() = 'service_role')
  `);

  await knex.schema.raw(`
    CREATE POLICY "Service role can access all messages" ON messages
      FOR ALL USING (auth.role() = 'service_role')
  `);

  await knex.schema.raw(`
    CREATE POLICY "Service role can access all feedback" ON message_feedback
      FOR ALL USING (auth.role() = 'service_role')
  `);

  await knex.schema.raw(`
    CREATE POLICY "Service role can access all knowledge items" ON knowledge_items
      FOR ALL USING (auth.role() = 'service_role')
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order due to foreign key constraints
  await knex.schema.dropTableIfExists('message_feedback');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('knowledge_items');
  await knex.schema.dropTableIfExists('conversations');
  
  // Note: We don't drop the vector extension as it might be used by other tables
}


