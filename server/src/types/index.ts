export interface AIServiceConfig {
  openaiApiKey: string;
  organizationName?: string;
  assistantName?: string;
  platformDescription?: string;
  supportEmail?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableDatabaseSearch?: boolean;
  enableFeedbackDetection?: boolean;
  navigationLinks?: NavigationLink[];
  existingFeatures?: string[];
  missingFeatures?: string[];
  customInstructions?: string;
  knowledgeBase?: string;
  knowledgeBaseService?: any;
}

export interface ChatContext {
  userId?: string;
  organizationId?: string;
  conversationId?: string;
  threadId?: string;
  conversationHistory?: ChatMessage[];
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
  toolCalls?: any;
  toolResults?: DatabaseSearchResult[];
}

export interface AIResponse {
  content: string;
  toolResults: DatabaseSearchResult[];
  feedbackDetection: FeedbackDetection | null;
  suggestedLinks: NavigationLink[];
}

export interface DatabaseSearchResult {
  type: string;
  entity: string;
  source: string;
  title: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  citations: {
    enabled: boolean;
  };
  count?: number;
  data?: any;
}

export interface FeedbackDetection {
  type: 'bug_report' | 'feature_request' | 'general_feedback' | 'not_feedback';
  confidence: number;
  keyPoints: string[];
  suggestedAction: string;
}

export interface NavigationLink {
  label: string;
  path: string;
  description?: string;
  keywords?: string[];
  icon?: string;
  category?: string;
}

export interface ChatConversation {
  id?: string;
  threadId: string;
  userId: string;
  organizationId?: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface StoredChatMessage {
  id?: string;
  conversationId: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parentMessageId?: string;
  toolCalls?: any;
  toolResults?: DatabaseSearchResult[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface ChatStorage {
  saveConversation(conversation: ChatConversation): Promise<ChatConversation>;
  getConversation(conversationId: string): Promise<ChatConversation | null>;
  updateConversation(conversationId: string, updates: Partial<ChatConversation>): Promise<ChatConversation>;
  deleteConversation(conversationId: string): Promise<boolean>;
  getUserConversations(userId: string, organizationId?: string): Promise<ChatConversation[]>;
  saveMessage(message: StoredChatMessage): Promise<StoredChatMessage>;
  getMessages(conversationId: string, limit?: number, offset?: number): Promise<StoredChatMessage[]>;
  deleteMessage(messageId: string): Promise<boolean>;
  saveFeedback(feedback: Feedback): Promise<Feedback>;
  getFeedback(messageId: string): Promise<Feedback[]>;
}

export interface Feedback {
  id?: string;
  messageId: string;
  conversationId: string;
  userId: string;
  rating: 'positive' | 'negative';
  category?: string;
  comment?: string;
  suggestedImprovement?: string;
  createdAt: Date;
}

export interface ChatManagerConfig {
  aiService: any;
  storage?: ChatStorage;
  enableConversationManagement?: boolean;
  conversationTimeout?: number;
  maxMessagesPerConversation?: number;
}

export interface HandoffRequest {
  id?: string;
  conversationId: string;
  userId: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'active' | 'resolved' | 'cancelled';
  agentId?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AgentProfile {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'offline' | 'busy';
  skills: string[];
  maxConcurrentChats: number;
  currentChatCount: number;
}

export interface MessageFeedback {
  id?: string;
  messageId: string;
  conversationId: string;
  userId: string;
  rating: 'positive' | 'negative';
  category?: string;
  comment?: string;
  suggestedImprovement?: string;
  createdAt: Date;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  embeddings?: number[];
  lastModified: Date;
  source: string;
}


