/**
 * Vercel Serverless Function Entry Point
 *
 * This file wraps the Express application for Vercel's serverless platform.
 * Vercel requires serverless functions in the /api directory.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { config } from 'dotenv';

// Import configurations
import logger from '../src/config/logger';
import { initializeSupabase, getSupabaseClient } from '../src/config/database';
import { specs, swaggerUi, swaggerUiOptions } from '../src/config/swagger';
import { config as globalConfig } from '../src/config/global';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';

// Import services
import { AIService } from '../src/services/AIService';
import { ChatManager } from '../src/services/ChatManager';
import { KnowledgeBaseService } from '../src/services/KnowledgeBaseService';
import { UnifiedStorage } from '../src/storage/UnifiedStorage';

// Import controllers
import { ChatController } from '../src/controllers/ChatController';
import { KnowledgeController } from '../src/controllers/KnowledgeController';

// Load environment variables
config();

// Initialize Express app (shared across invocations)
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Vercel handles this
}));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: globalConfig.api.rateLimiting.windowMs,
  max: globalConfig.api.rateLimiting.maxRequests,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
      timestamp: new Date().toISOString()
    },
    success: false
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Global services (initialized lazily)
let servicesInitialized = false;
let aiService: AIService;
let chatManager: ChatManager;
let knowledgeBase: KnowledgeBaseService;
let storage: UnifiedStorage;
let chatController: ChatController;
let knowledgeController: KnowledgeController;

async function initializeServices() {
  if (servicesInitialized) return;

  logger.info('Initializing Vezlo services...');

  try {
    // Initialize Supabase
    const supabase = initializeSupabase();
    logger.info('Supabase client initialized');

    // Initialize storage
    storage = new UnifiedStorage(supabase);

    // Initialize knowledge base
    knowledgeBase = new KnowledgeBaseService({
      supabase,
      tableName: 'knowledge_items'
    });

    // Initialize AI service
    aiService = new AIService({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      organizationName: process.env.ORGANIZATION_NAME || 'Vezlo',
      assistantName: process.env.ASSISTANT_NAME || 'Vezlo Assistant',
      model: process.env.AI_MODEL || 'gpt-4',
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000'),
      enableFeedbackDetection: process.env.ENABLE_FEEDBACK_DETECTION === 'true',
      knowledgeBaseService: knowledgeBase
    });

    // Initialize chat manager
    chatManager = new ChatManager({
      aiService,
      storage,
      enableConversationManagement: true,
      conversationTimeout: 3600000
    });

    // Initialize controllers
    chatController = new ChatController(chatManager, storage);
    knowledgeController = new KnowledgeController(knowledgeBase);

    servicesInitialized = true;
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Routes

// Serve static files from public directory
app.use('/public', express.static('public'));

// Setup wizard route
app.get('/setup', (req, res) => {
  res.sendFile('setup.html', { root: 'public' });
});

// Setup API endpoint
app.post('/api/setup/configure', async (req, res) => {
  // Import setup handler dynamically
  const setupHandler = await import('./setup');
  return setupHandler.default(req as any, res as any);
});

// Redirect root to setup if not configured, otherwise to docs
app.get('/', (req, res) => {
  // Check if environment variables are configured
  const isConfigured = process.env.SUPABASE_URL && process.env.OPENAI_API_KEY;
  if (!isConfigured) {
    res.redirect('/setup');
  } else {
    res.redirect('/docs');
  }
});

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// Health check
app.get('/health', async (req, res) => {
  try {
    const healthChecks: any = {
      server: 'healthy',
      timestamp: new Date().toISOString(),
      platform: 'vercel'
    };

    // Check Supabase connection
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('conversations').select('count').limit(1);
      healthChecks.supabase = error ? 'error' : 'connected';
    } catch (error) {
      healthChecks.supabase = 'disconnected';
    }

    res.json({
      status: 'healthy',
      checks: healthChecks
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Conversation APIs
app.post('/api/conversations', (req, res) => chatController.createConversation(req, res));
app.get('/api/conversations/:uuid', (req, res) => chatController.getConversation(req, res));
app.delete('/api/conversations/:uuid', (req, res) => chatController.deleteConversation(req, res));
app.get('/api/users/:uuid/conversations', (req, res) => chatController.getUserConversations(req, res));

// Message APIs
app.post('/api/conversations/:uuid/messages', (req, res) => chatController.createMessage(req, res));
app.post('/api/messages/:uuid/generate', (req, res) => chatController.generateResponse(req, res));

// Knowledge Base APIs
app.post('/api/knowledge/items', (req, res) => knowledgeController.createItem(req, res));
app.get('/api/knowledge/items', (req, res) => knowledgeController.listItems(req, res));
app.get('/api/knowledge/items/:uuid', (req, res) => knowledgeController.getItem(req, res));
app.put('/api/knowledge/items/:uuid', (req, res) => knowledgeController.updateItem(req, res));
app.delete('/api/knowledge/items/:uuid', (req, res) => knowledgeController.deleteItem(req, res));
app.post('/api/knowledge/search', (req, res) => knowledgeController.searchKnowledge(req, res));

// Feedback API
app.post('/api/feedback', (req, res) => chatController.submitFeedback(req, res));

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Vercel serverless function export
export default async (req: VercelRequest, res: VercelResponse) => {
  // Initialize services on first request (cold start)
  await initializeServices();

  // Handle the request with Express
  return app(req as any, res as any);
};
