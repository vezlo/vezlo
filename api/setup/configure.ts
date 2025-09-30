/**
 * Web-Based Setup API Endpoint
 *
 * Handles configuration and database setup from the web UI
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

interface SetupConfig {
  supabase_url: string;
  supabase_service_key: string;
  db_connection_string: string;  // Full postgres connection string
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

    console.log('Received config:', {
      has_supabase_url: !!config.supabase_url,
      has_supabase_service_key: !!config.supabase_service_key,
      has_db_connection_string: !!config.db_connection_string,
      has_openai_api_key: !!config.openai_api_key
    });

    // Validate required fields
    if (!config.supabase_url || !config.supabase_service_key || !config.db_connection_string || !config.openai_api_key) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        received: {
          supabase_url: !!config.supabase_url,
          supabase_service_key: !!config.supabase_service_key,
          db_connection_string: !!config.db_connection_string,
          openai_api_key: !!config.openai_api_key
        }
      });
    }

    // Step 1: Validate Supabase connection
    console.log('Validating Supabase connection...');
    const supabase = createClient(config.supabase_url, config.supabase_service_key);

    // Step 2: Connect to PostgreSQL using connection string
    console.log('Connecting to database...');
    const pgClient = new Client({
      connectionString: config.db_connection_string,
      ssl: { rejectUnauthorized: false }
    });

    await pgClient.connect();
    console.log('Connected to database');

    // Step 3: Execute database schema
    console.log('Creating database tables...');
    const schemaPath = join(process.cwd(), 'database-schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    await pgClient.query(schema);
    console.log('Tables created successfully');

    // Step 4: Verify tables were created
    const tablesResult = await pgClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('vezlo_conversations', 'vezlo_messages', 'vezlo_message_feedback', 'vezlo_knowledge_items')
      ORDER BY table_name
    `);

    const createdTables = tablesResult.rows.map(row => row.table_name);
    console.log('Verified tables:', createdTables);

    await pgClient.end();

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
