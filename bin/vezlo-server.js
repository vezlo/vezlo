#!/usr/bin/env node

/**
 * Vezlo Assistant Server CLI
 * Starts the AI assistant server with environment configuration
 */

const path = require('path');
const fs = require('fs');

// Check if server is built
const serverPath = path.join(__dirname, '..', 'dist', 'server.js');

if (!fs.existsSync(serverPath)) {
  console.error('❌ Error: Server not built. Please run "npm run build" first.');
  console.error('');
  console.error('If you installed via npm, try reinstalling:');
  console.error('  npm install -g @vezlo/assistant-server');
  process.exit(1);
}

// Display startup banner
console.log('');
console.log('🚀 Starting Vezlo Assistant Server...');
console.log('');

// Check for .env file
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.warn('⚠️  Warning: No .env file found in current directory');
  console.warn('   Copy env.example to .env and configure your settings');
  console.warn('');
}

// Start the server
require(serverPath);
