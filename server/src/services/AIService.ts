import OpenAI from 'openai';
import {
  AIServiceConfig,
  ChatContext,
  AIResponse,
  DatabaseSearchResult,
  FeedbackDetection,
  NavigationLink
} from '../types';
import { KnowledgeBaseService } from './KnowledgeBaseService';

export class AIService {
  private openai: OpenAI;
  private systemPrompt: string;
  private config: AIServiceConfig;
  private navigationLinks: NavigationLink[];
  private knowledgeBase: string;
  private knowledgeBaseService?: KnowledgeBaseService;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
    this.navigationLinks = config.navigationLinks || [];
    this.knowledgeBase = config.knowledgeBase || '';

    if (config.knowledgeBaseService) {
      this.knowledgeBaseService = config.knowledgeBaseService;
    }

    this.systemPrompt = this.buildSystemPrompt();
  }

  setKnowledgeBaseService(service: KnowledgeBaseService): void {
    this.knowledgeBaseService = service;
    this.systemPrompt = this.buildSystemPrompt();
  }

  private buildSystemPrompt(): string {
    const orgName = this.config.organizationName || 'Vezlo';
    const assistantName = this.config.assistantName || `${orgName} Assistant`;

    let prompt = `You are ${assistantName}, an AI-powered help bot for the ${orgName} platform.

${this.config.platformDescription || `${orgName} is a comprehensive AI assistant platform that helps businesses with their operations.`}

## Your Capabilities:
1. Answer questions about ${orgName}'s features and functionality
2. Search the user's database in real-time when configured
3. Provide step-by-step guidance on how to use features
4. Navigate users to appropriate pages
5. Identify and classify user feedback as bug reports or feature requests

## Platform Knowledge Base:
${this.knowledgeBase}
`;

    if (this.navigationLinks.length > 0) {
      prompt += '\n## Navigation & Links:\n';
      this.navigationLinks.forEach(link => {
        prompt += `- ${link.label}: [${link.description || link.label}](${link.path})`;
        if (link.keywords) {
          prompt += ` (Keywords: ${link.keywords.join(', ')})`;
        }
        prompt += '\n';
      });
    }

    if (this.config.existingFeatures && this.config.existingFeatures.length > 0) {
      prompt += '\n## Key Features That EXIST:\n';
      this.config.existingFeatures.forEach(feature => {
        prompt += `- ${feature}\n`;
      });
    }

    if (this.config.missingFeatures && this.config.missingFeatures.length > 0) {
      prompt += '\n## Features That DON\'T Exist:\n';
      this.config.missingFeatures.forEach(feature => {
        prompt += `- ${feature} - NOT AVAILABLE\n`;
      });
    }

    prompt += `
## Important Guidelines:
1. Be professional, helpful, and guide users towards successful use of ${orgName}
2. Always provide direct clickable links using markdown format [text](path) for features that exist
3. If a feature doesn't exist, be honest and transparent
4. For support issues, direct users to: ${this.config.supportEmail || 'support@vezlo.ai'}
`;

    if (this.config.customInstructions) {
      prompt += `\n## Custom Instructions:\n${this.config.customInstructions}\n`;
    }

    return prompt;
  }

  async generateResponse(message: string, context?: ChatContext): Promise<AIResponse> {
    try {
      let knowledgeResults: string = '';
      if (this.knowledgeBaseService) {
        const searchResults = await this.knowledgeBaseService.search(message, {
          limit: 3,
          type: 'hybrid'
        });

        if (searchResults.length > 0) {
          knowledgeResults = '\n\nRelevant information from knowledge base:\n';
          searchResults.forEach(result => {
            knowledgeResults += `- ${result.title}: ${result.content}\n`;
          });
        }
      }

      const messages: any[] = [
        {
          role: 'system',
          content: this.systemPrompt + knowledgeResults
        }
      ];

      if (context?.conversationHistory) {
        messages.push(...context.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })));
      }

      messages.push({
        role: 'user',
        content: message
      });

      const completion = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4',
        messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000,
      });

      const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

      const feedbackDetection = this.config.enableFeedbackDetection ? 
        await this.detectFeedback(message) : null;

      const suggestedLinks = this.findRelevantLinks(message);

      return {
        content: response,
        toolResults: [],
        feedbackDetection,
        suggestedLinks
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  private async detectFeedback(message: string): Promise<FeedbackDetection | null> {
    try {
      const feedbackPrompt = `Analyze this user message and determine if it contains feedback. Classify it as:
- bug_report: User reporting a problem or error
- feature_request: User asking for new functionality
- general_feedback: User providing opinions or suggestions
- not_feedback: Regular question or conversation

Message: "${message}"

Respond with JSON: {"type": "...", "confidence": 0-1, "keyPoints": ["..."], "suggestedAction": "..."}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: feedbackPrompt }],
        temperature: 0.1,
        max_tokens: 200,
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        return JSON.parse(response);
      }
    } catch (error) {
      console.error('Feedback detection error:', error);
    }

    return null;
  }

  private findRelevantLinks(message: string): NavigationLink[] {
    const relevantLinks: NavigationLink[] = [];
    const messageLower = message.toLowerCase();

    this.navigationLinks.forEach(link => {
      const linkKeywords = [
        link.label.toLowerCase(),
        ...(link.keywords || []).map(k => k.toLowerCase()),
        link.description?.toLowerCase() || ''
      ];

      const isRelevant = linkKeywords.some(keyword => 
        keyword && messageLower.includes(keyword)
      );

      if (isRelevant) {
        relevantLinks.push(link);
      }
    });

    return relevantLinks.slice(0, 3);
  }
}


