-- Vezlo AI Assistant - Modern Database Schema
-- Finalized schema with conversation-based chat and unified knowledge base
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- CONVERSATIONS & MESSAGES SCHEMA (Modern 2-API Flow)
-- ============================================================================

-- Conversations table (renamed from chat_sessions)
CREATE TABLE IF NOT EXISTS vezlo_conversations (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  company_id BIGINT,                        -- Multi-tenancy support
  creator_id BIGINT NOT NULL,               -- User who created conversation
  title TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ                    -- Soft delete
);

-- Messages table (supports parent-child relationships for regeneration)
CREATE TABLE IF NOT EXISTS vezlo_messages (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  conversation_id BIGINT NOT NULL REFERENCES vezlo_conversations(id) ON DELETE CASCADE,
  parent_message_id BIGINT REFERENCES vezlo_messages(id), -- For regeneration chains
  type TEXT NOT NULL,                       -- user, assistant, system
  content TEXT NOT NULL,
  status TEXT DEFAULT 'completed',          -- generating, completed, stopped, failed
  metadata JSONB DEFAULT '{}',              -- For tool_calls, tool_results, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message feedback table
CREATE TABLE IF NOT EXISTS vezlo_message_feedback (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  message_id BIGINT NOT NULL REFERENCES vezlo_messages(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  rating TEXT NOT NULL,                     -- positive, negative
  category TEXT,
  comment TEXT,
  suggested_improvement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- KNOWLEDGE BASE SCHEMA (Unified Single Table)
-- ============================================================================

-- Knowledge items table (folders, documents, files, URLs - everything)
CREATE TABLE IF NOT EXISTS vezlo_knowledge_items (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  parent_id BIGINT REFERENCES knowledge_items(id), -- Hierarchical structure
  company_id BIGINT,                        -- Multi-tenancy support
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,                       -- folder, document, file, url, url_directory
  content TEXT,                             -- For document type
  file_url TEXT,                            -- For file/url types
  file_size BIGINT,                         -- File size in bytes
  file_type TEXT,                           -- MIME type for files
  metadata JSONB DEFAULT '{}',              -- Flexible metadata storage
  embedding vector(1536),                  -- OpenAI embeddings for search
  processed_at TIMESTAMPTZ,                -- When embedding was generated
  created_by BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_vezlo_conversations_uuid ON vezlo_conversations(uuid);
CREATE INDEX IF NOT EXISTS idx_vezlo_conversations_uuid ON vezlo_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_vezlo_conversations_uuid ON vezlo_conversations(creator_id);
CREATE INDEX IF NOT EXISTS idx_vezlo_conversations_uuid ON vezlo_conversations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vezlo_conversations_uuid ON vezlo_conversations(updated_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_vezlo_messages_conversation ON vezlo_messages(uuid);
CREATE INDEX IF NOT EXISTS idx_vezlo_messages_conversation ON vezlo_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_vezlo_messages_conversation ON vezlo_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_vezlo_messages_conversation ON vezlo_messages(type);
CREATE INDEX IF NOT EXISTS idx_vezlo_messages_conversation ON vezlo_messages(status);
CREATE INDEX IF NOT EXISTS idx_vezlo_messages_conversation ON vezlo_messages(created_at DESC);

-- Message feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_uuid ON message_feedback(uuid);
CREATE INDEX IF NOT EXISTS idx_feedback_message_id ON message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON message_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON message_feedback(rating);

-- Knowledge items indexes
CREATE INDEX IF NOT EXISTS idx_vezlo_knowledge_items_embedding ON vezlo_knowledge_items(uuid);
CREATE INDEX IF NOT EXISTS idx_vezlo_knowledge_items_embedding ON vezlo_knowledge_items(company_id);
CREATE INDEX IF NOT EXISTS idx_vezlo_knowledge_items_embedding ON vezlo_knowledge_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_vezlo_knowledge_items_embedding ON vezlo_knowledge_items(type);
CREATE INDEX IF NOT EXISTS idx_vezlo_knowledge_items_embedding ON vezlo_knowledge_items(created_by);
CREATE INDEX IF NOT EXISTS idx_vezlo_knowledge_items_embedding ON vezlo_knowledge_items(created_at DESC);

-- Full-text search index for knowledge items
CREATE INDEX IF NOT EXISTS idx_knowledge_search 
ON knowledge_items USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, '')));

-- Vector similarity index for semantic search (only for items with content)
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding 
ON knowledge_items USING ivfflat (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Sparse indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_content 
ON knowledge_items(content) WHERE content IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_file_url 
ON knowledge_items(file_url) WHERE file_url IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (Optional but Recommended)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;

-- Policies for service role access (full access)
CREATE POLICY "Service role can access all conversations" ON conversations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all messages" ON messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all feedback" ON message_feedback
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all knowledge items" ON knowledge_items
  FOR ALL USING (auth.role() = 'service_role');

-- Example company-based policies (uncomment and modify as needed)
-- CREATE POLICY "Users can access their company conversations" ON conversations
--   FOR ALL USING (company_id = auth.jwt() ->> 'company_id');

-- CREATE POLICY "Users can access their company knowledge" ON knowledge_items
--   FOR ALL USING (company_id = auth.jwt() ->> 'company_id');
