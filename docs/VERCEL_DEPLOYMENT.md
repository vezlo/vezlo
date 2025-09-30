# Vercel Deployment Guide

Deploy your Vezlo Assistant Server to Vercel in minutes with this comprehensive guide.

## 🚀 Quick Deploy

### Option 1: One-Click Deploy + Web Setup (Easiest!)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vezlo/assistant-server&project-name=vezlo-assistant&repository-name=vezlo-assistant-server)

**New!** After deployment:
1. Visit your deployed URL (e.g., `https://your-app.vercel.app`)
2. You'll be automatically redirected to the **Web Setup Wizard**
3. Follow the interactive wizard to:
   - Configure your Supabase database
   - Add your OpenAI API key
   - Automatically create database tables
   - Validate the entire setup

**No CLI required! Everything is done through a beautiful web interface.**

### Option 2: One-Click Deploy (Advanced - Manual Env Setup)

Use this if you prefer to configure environment variables manually in Vercel dashboard:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vezlo/assistant-server&env=SUPABASE_URL,SUPABASE_SERVICE_KEY,SUPABASE_DB_HOST,SUPABASE_DB_PASSWORD,OPENAI_API_KEY&envDescription=Required%20environment%20variables%20for%20Vezlo%20Assistant%20Server&envLink=https://github.com/vezlo/assistant-server/blob/main/.env.vercel.example&project-name=vezlo-assistant&repository-name=vezlo-assistant-server)

This will:
1. Fork the repository to your GitHub account
2. Create a new Vercel project
3. Prompt you for required environment variables
4. Deploy automatically

## 🌐 Web-Based Setup Wizard

After deploying to Vercel, visit your app URL and you'll see the interactive setup wizard:

**Features:**
- ✨ **Beautiful UI** - Step-by-step guided configuration
- 🔒 **Secure** - Credentials never leave your browser until submitted
- ✅ **Validation** - Tests database connections before proceeding
- 🚀 **Auto-Migration** - Automatically creates all database tables
- 📊 **Verification** - Confirms successful setup with detailed status

**Steps:**
1. **Welcome** - Introduction to the setup process
2. **Database** - Enter Supabase credentials
3. **OpenAI** - Configure AI model and API key
4. **Setup** - Automatic table creation and validation
5. **Complete** - Success confirmation with next steps

**Access the wizard:**
- First visit: Automatically redirected to `/setup`
- Manual access: Visit `https://your-app.vercel.app/setup`
- After setup: Redirected to `/docs` (API documentation)

### Option 3: Manual Vercel CLI Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Clone repository
git clone https://github.com/vezlo/assistant-server.git
cd assistant-server

# Install dependencies
npm install

# Build the project
npm run build

# Deploy to Vercel
vercel

# Follow prompts to configure your project
```

### Option 3: Deploy from GitHub

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables (see below)
6. Click "Deploy"

## ⚙️ Environment Variables

You'll need to configure these environment variables in Vercel:

### Required Variables

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_DB_HOST=db.your-project.supabase.co
SUPABASE_DB_PASSWORD=your-database-password

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
```

### How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click "Settings"
3. Navigate to "Environment Variables"
4. Add each variable:
   - **Name**: Variable name (e.g., `SUPABASE_URL`)
   - **Value**: Your credential
   - **Environment**: Select "Production", "Preview", and "Development"
5. Click "Save"

### Optional Variables (with defaults)

```env
# Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# CORS Configuration
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# AI Configuration
AI_MODEL=gpt-4o
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1000

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# Organization
ORGANIZATION_NAME=Vezlo
ASSISTANT_NAME=Vezlo Assistant

# Knowledge Base
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

## 📦 Pre-Deployment Setup

### 1. Setup Supabase Database

Before deploying, ensure your Supabase database is configured:

```bash
# Option A: Use setup wizard locally
npm install -g @vezlo/assistant-server
vezlo-setup

# Option B: Run SQL manually in Supabase SQL Editor
# Copy contents of database-schema.sql to Supabase Dashboard > SQL Editor
# Execute the SQL to create all required tables
```

### 2. Get Supabase Credentials

From your Supabase Dashboard:

**API Credentials** (Settings > API):
- Project URL → `SUPABASE_URL`
- anon/public key → `SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_KEY`

**Database Credentials** (Settings > Database):
- Host → `SUPABASE_DB_HOST` (e.g., `db.xxx.supabase.co`)
- Port → `SUPABASE_DB_PORT` (default: `5432`)
- Database → `SUPABASE_DB_NAME` (default: `postgres`)
- User → `SUPABASE_DB_USER` (default: `postgres`)
- Password → `SUPABASE_DB_PASSWORD` (from database settings)

### 3. Get OpenAI API Key

From [OpenAI Platform](https://platform.openai.com/api-keys):
1. Create new API key
2. Copy the key → `OPENAI_API_KEY`

## 🏗️ Vercel Configuration

The project includes `vercel.json` with optimized settings:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.ts"
    }
  ],
  "functions": {
    "api/index.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

### Key Settings:

- **Memory**: 1024 MB (suitable for AI operations)
- **Max Duration**: 60 seconds (for long-running AI generations)
- **Runtime**: Node.js serverless functions

## 🔍 Post-Deployment Verification

### 1. Test Health Endpoint

```bash
curl https://your-app.vercel.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "server": "healthy",
    "supabase": "connected",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "platform": "vercel"
  }
}
```

### 2. Test API Documentation

Visit: `https://your-app.vercel.app/docs`

You should see the Swagger UI with all API endpoints documented.

### 3. Test Conversation Flow

```bash
# Create a conversation
curl -X POST https://your-app.vercel.app/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Conversation",
    "user_uuid": "test-user-123",
    "company_uuid": "test-company-456"
  }'
```

## 🔧 Troubleshooting

### Common Issues

**❌ "SUPABASE_URL environment variable required"**
- Solution: Add missing environment variables in Vercel project settings
- Verify all required variables are set

**❌ Database connection fails**
- Check `SUPABASE_DB_HOST` format: `db.xxx.supabase.co`
- Verify `SUPABASE_DB_PASSWORD` is correct
- Ensure database tables are created (run `database-schema.sql`)

**❌ "Function exceeded maximum duration"**
- Increase timeout in `vercel.json` (max 60s for Pro plan)
- Optimize AI operations or switch to streaming responses

**❌ Cold start is slow**
- Normal for serverless - first request initializes services
- Consider Vercel Pro for faster cold starts
- Use serverless caching strategies

**❌ CORS errors**
- Update `CORS_ORIGINS` environment variable with your frontend domain
- Example: `https://yourdomain.com,https://www.yourdomain.com`

### Debug Logs

View deployment logs in Vercel:

1. Go to your project dashboard
2. Click "Deployments"
3. Select your deployment
4. Click "View Function Logs"

## 🎯 Production Optimization

### 1. Enable Vercel Edge Caching

Add headers for static responses:

```json
{
  "headers": [
    {
      "source": "/health",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=60, stale-while-revalidate"
        }
      ]
    }
  ]
}
```

### 2. Configure Custom Domain

1. Go to Project Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `CORS_ORIGINS` with new domain

### 3. Monitor Performance

Enable Vercel Analytics:
1. Go to Project Settings > Analytics
2. Enable Web Analytics
3. Monitor response times and errors

### 4. Setup Monitoring

Use Vercel's built-in monitoring or integrate with:
- Sentry for error tracking
- Datadog for APM
- LogDNA for log aggregation

## 🔐 Security Best Practices

1. **Use Environment Variables**: Never commit secrets to git
2. **Restrict CORS**: Set specific domains in `CORS_ORIGINS`
3. **Enable Rate Limiting**: Already configured in the code
4. **Use HTTPS**: Vercel provides this automatically
5. **Rotate Keys**: Regularly rotate API keys and database passwords
6. **Enable Vercel Password Protection**: For staging deployments

## 📊 Scaling Considerations

### Vercel Limits

- **Free Plan**: 100GB bandwidth, 100 hours serverless execution
- **Pro Plan**: 1TB bandwidth, 1000 hours execution
- **Enterprise**: Custom limits

### Database Scaling

- Monitor Supabase usage in dashboard
- Upgrade Supabase plan as needed
- Consider connection pooling for high traffic

### Cost Optimization

- Use edge caching for repeated responses
- Optimize AI token usage
- Monitor function execution time
- Consider Vercel Pro for better pricing

## 🆘 Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **GitHub Issues**: https://github.com/vezlo/assistant-server/issues
- **Discord Community**: (Coming soon)

## 🔄 Continuous Deployment

Vercel automatically deploys:
- **Production**: Commits to `main` branch
- **Preview**: Pull requests and other branches

Configure branch settings in Project Settings > Git.

---

**Ready to deploy?** Click the deploy button above or follow the manual steps. Your AI assistant will be live in minutes! 🚀
