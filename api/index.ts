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
import path from 'path';
import { fileURLToPath } from 'url';

// Import configurations from compiled dist
import logger from '../dist/config/logger';
import { initializeSupabase, getSupabaseClient } from '../dist/config/database';
import { specs, swaggerUi, swaggerUiOptions } from '../dist/config/swagger';
import { config as globalConfig } from '../dist/config/global';
import { errorHandler, notFoundHandler } from '../dist/middleware/errorHandler';

// Import services from compiled dist
import { AIService } from '../dist/services/AIService';
import { ChatManager } from '../dist/services/ChatManager';
import { KnowledgeBaseService } from '../dist/services/KnowledgeBaseService';
import { UnifiedStorage } from '../dist/storage/UnifiedStorage';

// Import controllers from compiled dist
import { ChatController } from '../dist/controllers/ChatController';
import { KnowledgeController } from '../dist/controllers/KnowledgeController';

// Load environment variables
config();

// Get the directory path in a way that works with both CommonJS and ES modules
const __dirname = path.resolve();
const publicPath = path.join(__dirname, 'public');

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
app.use('/public', express.static(publicPath));

// Setup wizard route
app.get('/setup', (req, res) => {
  const setupHtmlPath = path.join(publicPath, 'setup.html');
  res.sendFile(setupHtmlPath);
});

// Setup API endpoint
app.post('/api/setup/configure', async (req, res) => {
  // Import setup handler dynamically
  const setupHandler = await import('./setup');
  return setupHandler.default(req as any, res as any);
});

// Helper to check if environment is configured
function isEnvironmentConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.OPENAI_API_KEY);
}

// Redirect root to setup if not configured, otherwise to docs
app.get('/', (req, res) => {
  if (!isEnvironmentConfigured()) {
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
      platform: 'vercel',
      configured: isEnvironmentConfigured()
    };

    // Only check Supabase if configured
    if (isEnvironmentConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('conversations').select('count').limit(1);
        healthChecks.supabase = error ? 'error' : 'connected';
      } catch (error) {
        healthChecks.supabase = 'disconnected';
      }
    } else {
      healthChecks.supabase = 'not_configured';
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

// Middleware to ensure services are initialized for API routes
const requireServices = async (req: any, res: any, next: any) => {
  if (!isEnvironmentConfigured()) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'NOT_CONFIGURED',
        message: 'Server not configured. Please visit /setup to configure.',
        timestamp: new Date().toISOString()
      }
    });
  }

  try {
    await initializeServices();
    next();
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INITIALIZATION_FAILED',
        message: 'Failed to initialize server services',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Conversation APIs
app.post('/api/conversations', requireServices, (req, res) => chatController.createConversation(req, res));
app.get('/api/conversations/:uuid', requireServices, (req, res) => chatController.getConversation(req, res));
app.delete('/api/conversations/:uuid', requireServices, (req, res) => chatController.deleteConversation(req, res));
app.get('/api/users/:uuid/conversations', requireServices, (req, res) => chatController.getUserConversations(req, res));

// Message APIs
app.post('/api/conversations/:uuid/messages', requireServices, (req, res) => chatController.createMessage(req, res));
app.post('/api/messages/:uuid/generate', requireServices, (req, res) => chatController.generateResponse(req, res));

// Knowledge Base APIs
app.post('/api/knowledge/items', requireServices, (req, res) => knowledgeController.createItem(req, res));
app.get('/api/knowledge/items', requireServices, (req, res) => knowledgeController.listItems(req, res));
app.get('/api/knowledge/items/:uuid', requireServices, (req, res) => knowledgeController.getItem(req, res));
app.put('/api/knowledge/items/:uuid', requireServices, (req, res) => knowledgeController.updateItem(req, res));
app.delete('/api/knowledge/items/:uuid', requireServices, (req, res) => knowledgeController.deleteItem(req, res));
app.post('/api/knowledge/search', requireServices, (req, res) => knowledgeController.searchKnowledge(req, res));

// Feedback API
app.post('/api/feedback', requireServices, (req, res) => chatController.submitFeedback(req, res));

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Vercel serverless function export
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Don't initialize services here - let routes handle it conditionally
    // This allows /setup and /health to work without configuration
    return app(req as any, res as any);
  } catch (error) {
    logger.error('Function invocation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
};
