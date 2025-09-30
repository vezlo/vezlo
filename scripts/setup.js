#!/usr/bin/env node

/**
 * Vezlo Assistant Server Setup Wizard
 * Interactive CLI to configure database and environment
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(prompt) {
  return new Promise(resolve => {
    rl.question(`${colors.cyan}${prompt}${colors.reset} `, resolve);
  });
}

async function main() {
  console.clear();
  log('\n🚀 Vezlo Assistant Server Setup Wizard\n', 'bright');
  log('This wizard will help you configure your server in 3 easy steps:\n', 'blue');
  log('  1. Database Connection (Supabase or PostgreSQL)');
  log('  2. OpenAI API Configuration');
  log('  3. Automatic Table Creation\n');

  // Step 1: Database Type Selection
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  STEP 1: Database Configuration', 'bright');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');

  log('Choose your database type:');
  log('  [1] Supabase (Recommended)');
  log('  [2] PostgreSQL (Direct Connection)');
  log('  [3] Use existing .env file\n');

  const dbChoice = await question('Enter your choice (1-3):');

  let config = {};

  if (dbChoice === '1') {
    config = await setupSupabase();
  } else if (dbChoice === '2') {
    config = await setupPostgreSQL();
  } else if (dbChoice === '3') {
    config = await loadExistingConfig();
  } else {
    log('\n❌ Invalid choice. Exiting...', 'red');
    rl.close();
    return;
  }

  // Step 2: OpenAI Configuration
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  STEP 2: OpenAI API Configuration', 'bright');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');

  const openaiKey = await question('Enter your OpenAI API key (sk-...):');
  config.OPENAI_API_KEY = openaiKey.trim();

  const aiModel = await question('AI Model (default: gpt-4o):') || 'gpt-4o';
  config.AI_MODEL = aiModel.trim();

  // Step 3: Save Configuration
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  STEP 3: Save Configuration', 'bright');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');

  const envPath = path.join(process.cwd(), '.env');
  await saveEnvFile(envPath, config);

  log('\n✅ Configuration saved to .env', 'green');

  // Step 4: Database Setup
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  STEP 4: Database Setup', 'bright');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');

  const setupDb = await question('Setup database tables now? (y/n):');

  if (setupDb.toLowerCase() === 'y') {
    await setupDatabase(config);
  } else {
    log('\n⚠️  Skipping database setup.', 'yellow');
    log('   Run "npx vezlo-setup-db" later to create tables.\n', 'yellow');
  }

  // Final Instructions
  log('\n═══════════════════════════════════════════════════════════', 'green');
  log('  🎉 Setup Complete!', 'bright');
  log('═══════════════════════════════════════════════════════════\n', 'green');

  log('Next steps:');
  log('  1. Review your .env file');
  log('  2. Start the server: ' + colors.bright + 'vezlo-server' + colors.reset);
  log('  3. Visit: ' + colors.bright + 'http://localhost:3000/health' + colors.reset);
  log('  4. API docs: ' + colors.bright + 'http://localhost:3000/docs' + colors.reset + '\n');

  rl.close();
}

async function setupSupabase() {
  log('\n📦 Supabase Configuration\n', 'blue');
  log('You can find these values in your Supabase Dashboard:', 'yellow');
  log('  Settings > API > Project URL & API Keys\n', 'yellow');

  const supabaseUrl = await question('Supabase Project URL (https://xxx.supabase.co):');
  const supabaseAnonKey = await question('Supabase Anon Key:');
  const supabaseServiceKey = await question('Supabase Service Role Key:');

  // Validate connection
  log('\n🔄 Testing connection...', 'yellow');

  try {
    const client = createClient(supabaseUrl.trim(), supabaseServiceKey.trim());
    const { data, error } = await client.from('_test').select('*').limit(1);

    // This will fail but confirms we can connect
    if (error && error.code !== 'PGRST204' && error.code !== '42P01') {
      log(`\n⚠️  Warning: ${error.message}`, 'yellow');
      log('Continuing with setup...\n', 'yellow');
    } else {
      log('✅ Connection successful!\n', 'green');
    }
  } catch (err) {
    log(`\n⚠️  Warning: Could not verify connection`, 'yellow');
    log('Continuing with setup...\n', 'yellow');
  }

  // Extract database connection info from Supabase URL
  const projectId = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];
  const dbHost = projectId ? `db.${projectId}.supabase.co` : '';

  log('Database connection details:', 'blue');
  log(`  Host: ${dbHost}`);
  log(`  Port: 5432`);
  log(`  Database: postgres`);
  log(`  User: postgres\n`);

  const dbPassword = await question('Supabase Database Password (from Settings > Database):');

  return {
    SUPABASE_URL: supabaseUrl.trim(),
    SUPABASE_ANON_KEY: supabaseAnonKey.trim(),
    SUPABASE_SERVICE_KEY: supabaseServiceKey.trim(),
    SUPABASE_DB_HOST: dbHost,
    SUPABASE_DB_PORT: '5432',
    SUPABASE_DB_NAME: 'postgres',
    SUPABASE_DB_USER: 'postgres',
    SUPABASE_DB_PASSWORD: dbPassword.trim(),
    PORT: '3000',
    NODE_ENV: 'development',
    CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173'
  };
}

async function setupPostgreSQL() {
  log('\n🗄️  PostgreSQL Configuration\n', 'blue');

  const host = await question('Database Host (localhost):') || 'localhost';
  const port = await question('Database Port (5432):') || '5432';
  const database = await question('Database Name (postgres):') || 'postgres';
  const user = await question('Database User (postgres):') || 'postgres';
  const password = await question('Database Password:');

  return {
    SUPABASE_DB_HOST: host.trim(),
    SUPABASE_DB_PORT: port.trim(),
    SUPABASE_DB_NAME: database.trim(),
    SUPABASE_DB_USER: user.trim(),
    SUPABASE_DB_PASSWORD: password.trim(),
    PORT: '3000',
    NODE_ENV: 'development',
    CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173'
  };
}

async function loadExistingConfig() {
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    log('\n❌ No .env file found in current directory', 'red');
    throw new Error('.env file not found');
  }

  log('\n✅ Loading configuration from .env\n', 'green');

  const envContent = fs.readFileSync(envPath, 'utf8');
  const config = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      config[key] = value;
    }
  });

  return config;
}

async function saveEnvFile(envPath, config) {
  const envContent = `# Vezlo Assistant Server Configuration
# Generated by setup wizard on ${new Date().toISOString()}

# Server Configuration
PORT=${config.PORT || '3000'}
NODE_ENV=${config.NODE_ENV || 'development'}
LOG_LEVEL=info

# CORS Configuration
CORS_ORIGINS=${config.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173'}

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# Supabase Configuration
${config.SUPABASE_URL ? `SUPABASE_URL=${config.SUPABASE_URL}` : '# SUPABASE_URL=https://your-project.supabase.co'}
${config.SUPABASE_ANON_KEY ? `SUPABASE_ANON_KEY=${config.SUPABASE_ANON_KEY}` : '# SUPABASE_ANON_KEY=your-anon-key'}
${config.SUPABASE_SERVICE_KEY ? `SUPABASE_SERVICE_KEY=${config.SUPABASE_SERVICE_KEY}` : '# SUPABASE_SERVICE_KEY=your-service-role-key'}

# Database Configuration
SUPABASE_DB_HOST=${config.SUPABASE_DB_HOST || 'localhost'}
SUPABASE_DB_PORT=${config.SUPABASE_DB_PORT || '5432'}
SUPABASE_DB_NAME=${config.SUPABASE_DB_NAME || 'postgres'}
SUPABASE_DB_USER=${config.SUPABASE_DB_USER || 'postgres'}
SUPABASE_DB_PASSWORD=${config.SUPABASE_DB_PASSWORD || ''}

# OpenAI Configuration
OPENAI_API_KEY=${config.OPENAI_API_KEY || 'sk-your-openai-api-key'}
AI_MODEL=${config.AI_MODEL || 'gpt-4o'}
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1000

# Organization Settings
ORGANIZATION_NAME=Vezlo
ASSISTANT_NAME=Vezlo Assistant

# Knowledge Base
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
`;

  fs.writeFileSync(envPath, envContent, 'utf8');
}

async function setupDatabase(config) {
  log('\n🔄 Setting up database tables...', 'yellow');

  try {
    const { Client } = require('pg');

    const client = new Client({
      host: config.SUPABASE_DB_HOST,
      port: parseInt(config.SUPABASE_DB_PORT || '5432'),
      database: config.SUPABASE_DB_NAME,
      user: config.SUPABASE_DB_USER,
      password: config.SUPABASE_DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    log('✅ Connected to database', 'green');

    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'database-schema.sql');

    if (!fs.existsSync(schemaPath)) {
      log('❌ database-schema.sql not found', 'red');
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    log('🔄 Creating tables...', 'yellow');
    await client.query(schema);

    log('✅ Database tables created successfully!', 'green');

    // Verify tables
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('conversations', 'messages', 'message_feedback', 'knowledge_items')
      ORDER BY table_name
    `);

    log('\n📊 Verified tables:', 'blue');
    result.rows.forEach(row => {
      log(`   ✓ ${row.table_name}`, 'green');
    });
    log('');

    await client.end();

  } catch (error) {
    log(`\n❌ Database setup failed: ${error.message}`, 'red');
    log('\nYou can manually run the setup later:', 'yellow');
    log('  1. Copy database-schema.sql to your Supabase SQL Editor', 'yellow');
    log('  2. Execute the SQL to create tables\n', 'yellow');
  }
}

// Handle errors and cleanup
process.on('SIGINT', () => {
  log('\n\n⚠️  Setup cancelled by user', 'yellow');
  rl.close();
  process.exit(0);
});

// Run the wizard
main().catch(error => {
  log(`\n❌ Setup failed: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});
