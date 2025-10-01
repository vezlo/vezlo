import { Request, Response } from 'express';
import { KnowledgeBaseService } from '../services/KnowledgeBaseService';
import { AIService } from '../services/AIService';
import logger from '../config/logger';

export class KnowledgeController {
  private knowledgeBase: KnowledgeBaseService;
  private aiService?: AIService;

  constructor(knowledgeBase: KnowledgeBaseService, aiService?: AIService) {
    this.knowledgeBase = knowledgeBase;
    this.aiService = aiService;
  }

  async createItem(req: Request, res: Response): Promise<void> {
    try {
      const { 
        parent_uuid,
        company_uuid, 
        title, 
        description, 
        type, 
        content, 
        file_url, 
        file_size, 
        file_type, 
        metadata, 
        created_by_uuid 
      } = req.body;

      if (!title || !type || !created_by_uuid) {
        res.status(400).json({ error: 'title, type, and created_by_uuid are required' });
        return;
      }

      // Validate type
      const validTypes = ['folder', 'document', 'file', 'url', 'url_directory'];
      if (!validTypes.includes(type)) {
        res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
        return;
      }

      // Validate required fields based on type
      if ((type === 'document') && !content) {
        res.status(400).json({ error: 'content is required for document type' });
        return;
      }

      if ((type === 'file' || type === 'url') && !file_url) {
        res.status(400).json({ error: 'file_url is required for file and url types' });
        return;
      }

      const itemId = await this.knowledgeBase.createItem({
        parent_id: parent_uuid,
        company_id: company_uuid || 1,
        title,
        description,
        type,
        content,
        file_url,
        file_size,
        file_type,
        metadata,
        created_by: parseInt(created_by_uuid) || 1
      });

      res.json({
        success: true,
        uuid: itemId
      });

    } catch (error) {
      logger.error('Create knowledge item error:', error);
      res.status(500).json({
        error: 'Failed to create knowledge item',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getItem(req: Request, res: Response): Promise<void> {
    try {
      const { uuid } = req.params;
      const item = await this.knowledgeBase.getItem(uuid);

      if (!item) {
        res.status(404).json({ error: 'Knowledge item not found' });
        return;
      }

      res.json({
        uuid: item.id,
        parent_uuid: item.parent_id,
        company_uuid: item.company_id,
        title: item.title,
        description: item.description,
        type: item.type,
        content: item.content,
        file_url: item.file_url,
        file_size: item.file_size,
        file_type: item.file_type,
        metadata: item.metadata,
        created_by: item.created_by
      });

    } catch (error) {
      logger.error('Get knowledge item error:', error);
      res.status(500).json({
        error: 'Failed to get knowledge item',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async listItems(req: Request, res: Response): Promise<void> {
    try {
      const { 
        parent_uuid, 
        company_uuid, 
        type, 
        limit = '50', 
        offset = '0' 
      } = req.query;

      const options = {
        parent_id: parent_uuid as string,
        company_id: company_uuid ? parseInt(company_uuid as string) : undefined,
        type: type as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const result = await this.knowledgeBase.listItems(options);

      res.json({
        items: result.items.map(item => ({
          uuid: item.id,
          parent_uuid: item.parent_id,
          company_uuid: item.company_id,
          title: item.title,
          description: item.description,
          type: item.type,
          file_url: item.file_url,
          file_size: item.file_size,
          file_type: item.file_type,
          metadata: item.metadata,
          created_by: item.created_by
        })),
        total: result.total,
        limit: options.limit,
        offset: options.offset
      });

    } catch (error) {
      logger.error('List knowledge items error:', error);
      res.status(500).json({
        error: 'Failed to list knowledge items',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const { uuid } = req.params;
      const { 
        title, 
        description, 
        content, 
        file_url, 
        file_size, 
        file_type, 
        metadata 
      } = req.body;

      const success = await this.knowledgeBase.updateItem(uuid, {
        title,
        description,
        content,
        file_url,
        file_size,
        file_type,
        metadata
      });

      if (!success) {
        res.status(404).json({ error: 'Knowledge item not found or could not be updated' });
        return;
      }

      res.json({ success: true });

    } catch (error) {
      logger.error('Update knowledge item error:', error);
      res.status(500).json({
        error: 'Failed to update knowledge item',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const { uuid } = req.params;
      const success = await this.knowledgeBase.deleteItem(uuid);

      if (!success) {
        res.status(404).json({ error: 'Knowledge item not found or could not be deleted' });
        return;
      }

      res.json({ success: true });

    } catch (error) {
      logger.error('Delete knowledge item error:', error);
      res.status(500).json({
        error: 'Failed to delete knowledge item',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit = '5', threshold = '0.7', type = 'hybrid', company_uuid } = req.body;

      if (!query) {
        res.status(400).json({ error: 'query is required' });
        return;
      }

      const results = await this.knowledgeBase.search(query, {
        limit: parseInt(limit as string),
        threshold: parseFloat(threshold as string),
        type: type as 'semantic' | 'keyword' | 'hybrid',
        company_id: company_uuid ? parseInt(company_uuid) : undefined
      });

      res.json({
        query,
        results: results.map(result => ({
          uuid: result.id,
          title: result.title,
          description: result.description,
          content: result.content,
          type: result.type,
          score: result.score,
          metadata: result.metadata
        }))
      });

    } catch (error) {
      logger.error('Search knowledge items error:', error);
      res.status(500).json({
        error: 'Failed to search knowledge items',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async ragSearch(req: Request, res: Response): Promise<void> {
    try {
      const { query, company_uuid } = req.body;

      if (!query) {
        res.status(400).json({ error: 'query is required' });
        return;
      }

      if (!this.aiService) {
        res.status(500).json({ error: 'AI service not available' });
        return;
      }

      // Perform knowledge base search
      const searchResults = await this.knowledgeBase.search(query, {
        limit: 3,
        threshold: 0.7,
        type: 'hybrid',
        company_id: company_uuid ? parseInt(company_uuid) : undefined
      });

      // Generate AI response using the search results
      const aiResponse = await this.aiService.generateResponse(query);

      res.json({
        response: aiResponse.content
      });

    } catch (error) {
      logger.error('RAG search error:', error);
      res.status(500).json({
        error: 'Failed to perform RAG search',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}