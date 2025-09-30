/**
 * Storage Layer Exports
 * Organized repository pattern with separate concerns
 */

// Individual repositories for specific entities
export { ConversationRepository } from './ConversationRepository';
export { MessageRepository } from './MessageRepository';
export { FeedbackRepository } from './FeedbackRepository';

// Unified storage that combines all repositories
export { UnifiedStorage } from './UnifiedStorage';

// Legacy export for backward compatibility
export { SupabaseStorage } from './SupabaseStorage';

// Re-export types for convenience
export type { ChatStorage, ChatConversation, StoredChatMessage, Feedback } from '../types';
