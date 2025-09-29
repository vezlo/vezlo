# Vezlo Server Developer Guidelines

## 🏗️ Architecture Overview

The Vezlo Server follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────┐
│   Controllers   │ ← API endpoints & request/response handling
├─────────────────┤
│    Services     │ ← Business logic & AI integration
├─────────────────┤
│   Repositories  │ ← Data access & database operations
├─────────────────┤
│   Storage       │ ← Database abstraction layer
└─────────────────┘
```

## 🔑 Core Development Principles

### 1. **ID vs UUID Pattern**
- **Internal Database**: Use `id` (integer) for all database relations
- **External APIs**: Expose `uuid` (string) for all public endpoints
- **Request/Response**: Always use `uuid` in API schemas

```typescript
// ✅ Database Entity
interface Conversation {
  id: number;           // Internal ID
  uuid: string;         // External UUID
  userId: number;       // Internal user ID
}

// ✅ API Response
interface ConversationResponse {
  uuid: string;         // External UUID
  user_uuid: string;    // External user UUID
}
```

### 2. **Request/Response Schema Standards**

#### **User & Company Identifiers**
- **Request**: Use `user_uuid` and `company_uuid`
- **Response**: Use `user_uuid` and `company_uuid`
- **Internal Logic**: Convert to `userId` and `companyId` (integers)

#### **Standard Response Patterns**
```typescript
// ✅ Conversation Response
interface ConversationResponse {
  uuid: string;
  title: string;
  user_uuid: string;
  company_uuid: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

// ✅ Message Response
interface MessageResponse {
  uuid: string;
  conversation_uuid: string;
  parent_message_uuid?: string;
  type: 'user' | 'assistant';
  content: string;
  created_at: string;
}
```

### 3. **Repository Pattern**

#### **Standard Repository Structure**
```typescript
interface BaseRepository<T> {
  save(entity: Partial<T>): Promise<number>;
  getById(id: number): Promise<T | null>;
  update(id: number, updates: Partial<T>): Promise<void>;
  delete(id: number): Promise<void>;
}
```

#### **Conversation Repository**
```typescript
interface ConversationRepository {
  saveConversation(conversation: ConversationData): Promise<Conversation>;
  getConversation(uuid: string): Promise<Conversation | null>;
  updateConversation(uuid: string, updates: Partial<Conversation>): Promise<void>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  deleteConversation(uuid: string): Promise<void>;
}
```

### 4. **Service Layer Guidelines**

#### **AI Service Integration**
```typescript
class AIService {
  async generateResponse(message: string, context?: string): Promise<string>;
  async generateEmbedding(text: string): Promise<number[]>;
  async searchSimilarContent(query: string, threshold: number): Promise<KnowledgeItem[]>;
}
```

#### **Chat Manager**
```typescript
class ChatManager {
  async processUserMessage(conversationId: string, content: string): Promise<Message>;
  async generateAIResponse(messageId: string): Promise<Message>;
  async getConversationHistory(conversationId: string): Promise<Message[]>;
}
```

### 5. **Controller Standards**

#### **Error Handling**
```typescript
async createConversation(req: Request, res: Response): Promise<void> {
  try {
    const result = await this.service.createConversation(data);
    res.json(result);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
}
```

#### **Request Validation**
```typescript
// ✅ Always validate required fields
if (!user_uuid) {
  res.status(400).json({ error: 'user_uuid is required' });
  return;
}
```

### 6. **Database Schema Guidelines**

#### **Table Naming**
- Use `snake_case` for table names
- Use `snake_case` for column names
- Use `id` for primary keys (integer)
- Use `uuid` for external identifiers (string)

#### **Required Columns**
```sql
-- Every table should have:
id SERIAL PRIMARY KEY,
uuid VARCHAR(255) UNIQUE NOT NULL,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
```

### 7. **API Endpoint Standards**

#### **RESTful Conventions**
```
GET    /api/conversations/{uuid}           # Get conversation
POST   /api/conversations                   # Create conversation
PUT    /api/conversations/{uuid}            # Update conversation
DELETE /api/conversations/{uuid}           # Delete conversation

GET    /api/conversations/{uuid}/messages   # Get messages
POST   /api/conversations/{uuid}/messages   # Create message
POST   /api/messages/{uuid}/generate       # Generate AI response
```

#### **2-API Conversation Flow**
1. **Store User Message**: `POST /api/conversations/{uuid}/messages`
2. **Generate AI Response**: `POST /api/messages/{uuid}/generate`

### 8. **Code Organization**

#### **File Structure**
```
src/
├── config/           # Configuration files
├── controllers/      # API controllers
├── middleware/       # Express middleware
├── schemas/          # Request/response schemas
├── services/         # Business logic services
├── storage/          # Data access layer
└── types/            # TypeScript type definitions
```

#### **Import Conventions**
```typescript
// ✅ Use absolute imports
import { ConversationRepository } from '../storage/ConversationRepository';
import { AIService } from '../services/AIService';

// ✅ Group imports
import express from 'express';
import { Request, Response } from 'express';

import { Conversation } from '../types';
import { ConversationService } from '../services';
```

### 9. **Environment Configuration**

#### **Required Environment Variables**
```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Service
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Knowledge Base
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### 10. **Security & Performance Guidelines**

#### **Input Validation**
- Validate all input parameters
- Sanitize user content
- Use proper HTTP status codes

#### **Database Optimization**
- Use proper indexes
- Implement pagination for large datasets
- Use connection pooling

#### **Authentication**
- Validate user permissions
- Implement rate limiting
- Use CORS properly

---

**Remember**: These guidelines ensure consistency, maintainability, and scalability across the Vezlo Server codebase.
