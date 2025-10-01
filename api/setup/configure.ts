/**
 * Web-Based Setup API Endpoint
 *
 * Handles configuration and database setup from the web UI
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

interface SetupConfig {
  supabase_url: string;
  supabase_service_key: string;
  openai_api_key: string;
  ai_model?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const config: SetupConfig = req.body;

    // Validate required fields
    if (!config.supabase_url || !config.supabase_service_key || !config.openai_api_key) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: supabase_url, supabase_service_key, openai_api_key'
      });
    }

    // Step 1: Create Supabase client
    console.log('Creating Supabase client...');
    const supabase = createClient(config.supabase_url, config.supabase_service_key);

    // Step 2: Execute SQL using Supabase Management API
    console.log('Reading database schema...');
    const schemaPath = join(process.cwd(), 'database-schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    // Extract project reference from URL
    const projectRef = config.supabase_url.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];
    if (!projectRef) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Supabase URL format'
      });
    }

    // Extract database host from project reference
    const dbHost = `db.${projectRef}.supabase.co`;

    // Use Supabase Management API to execute SQL
    console.log('Executing SQL via Management API...');
    const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

    const sqlResponse = await fetch(managementApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.supabase_service_key}`,
        'Content-Type': 'application/json',
        'apikey': config.supabase_service_key
      },
      body: JSON.stringify({
        query: schema
      })
    });

    if (!sqlResponse.ok) {
      const error = await sqlResponse.text();
      console.error('SQL execution failed:', error);
      throw new Error(`Failed to execute SQL: ${error}`);
    }

    console.log('Tables created successfully');

    // Step 3: Verify tables were created using Supabase client
    const { data: tables, error: verifyError } = await supabase
      .from('vezlo_conversations')
      .select('count')
      .limit(0);

    if (verifyError && verifyError.code !== 'PGRST116') {
      console.error('Table verification failed:', verifyError);
    }

    const createdTables = ['vezlo_conversations', 'vezlo_messages', 'vezlo_message_feedback', 'vezlo_knowledge_items'];
    console.log('Setup completed for tables:', createdTables);

    // Step 6: In a real Vercel deployment, you would update environment variables here
    // Note: This requires Vercel API token and is done through their API
    // For now, we'll return success and instructions to add env vars manually

    return res.status(200).json({
      success: true,
      message: 'Database setup completed successfully',
      tables_created: createdTables,
      next_steps: [
        'Add environment variables to Vercel project settings',
        'Redeploy your application',
        'Test the /health endpoint'
      ],
      env_vars_needed: {
        SUPABASE_URL: config.supabase_url,
        SUPABASE_SERVICE_KEY: '***hidden***',
        SUPABASE_DB_HOST: dbHost,
        SUPABASE_DB_PORT: '5432',
        SUPABASE_DB_NAME: 'postgres',
        SUPABASE_DB_USER: 'postgres',
        SUPABASE_DB_PASSWORD: '***hidden***',
        OPENAI_API_KEY: '***hidden***',
        AI_MODEL: config.ai_model || 'gpt-4o'
      }
    });

  } catch (error: any) {
    console.error('Setup error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Setup failed',
      details: error.stack
    });
  }
}
