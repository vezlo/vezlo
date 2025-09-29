# Vezlo AI Assistant SDK

🚀 **AI Assistant SDK for SaaS Businesses** - Backend APIs, source-to-knowledge library, and embeddable widgets for building intelligent AI assistants.

## 🏗️ SDK Components

Vezlo provides three core components for SaaS businesses:

| Component | Status | Description | Documentation |
|-----------|--------|-------------|---------------|
| **🖥️ Server** | ✅ **Production Ready** | Backend APIs for AI chat and knowledge management | [Complete Setup Guide](./server/README.md) |
| **📦 Packages** | 🚧 **Coming Soon** | **Source-to-knowledge library** integration with server | [Development Status](./packages/README.md) |
| **🌐 Web** | 🚧 **Coming Soon** | **Embeddable widget SDK** configuration and deployment | [Planned Features](./web/README.md) |

## 🚀 Quick Start

### Option 1: Backend APIs (Available Now)
Deploy the complete backend API server:

```bash
# Clone repository
git clone https://github.com/vezlo/vezlo.git
cd vezlo

# Start server with Docker
docker-compose up -d

# Access API documentation
open http://localhost:3000/docs
```

**What you get:**
- ✅ RESTful API endpoints for AI chat
- ✅ Knowledge base management with vector search
- ✅ Real-time WebSocket communication
- ✅ Conversation management and feedback system
- ✅ Production-ready Docker deployment

### Option 2: Source-to-Knowledge Library (Available Now)
Convert your codebase into a searchable knowledge base:

```bash
# Install the library from separate repository
npm install @vezlo/src-to-kb

# Generate knowledge base from your project
src-to-kb /path/to/your/project --output ./project-kb

# Search your codebase
src-to-kb-search search "authentication" --kb ./project-kb
```

**What you get:**
- ✅ **Multi-language support** - JavaScript, TypeScript, Python, Java, C/C++, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala
- ✅ **Local knowledge base** - Create searchable documentation from your codebase
- ✅ **CLI tools** - Command-line interface for analysis and search
- 🚧 **Server integration** - Work in progress to push analyzed code to backend APIs

### Option 3: Embeddable Widget SDK (Coming Soon)
Configure and deploy AI chat widgets with SDK:

```html
<!-- Generated embeddable SDK code (Planned) -->
<script src="https://widget.vezlo.ai/chat.js" data-config="your-widget"></script>
```

**What you'll get:**
- 🚧 **Visual widget configuration** dashboard
- 🚧 **Customizable appearance** and behavior
- 🚧 **Analytics and performance** tracking
- 🚧 **SDK-based deployment** for easy integration

## 🎯 Use Cases for SaaS Businesses

### Customer Support
- **AI-powered customer service** with product knowledge
- **Automated FAQ responses** based on your documentation
- **24/7 customer assistance** without human intervention

### User Onboarding
- **Interactive product tours** with AI guidance
- **Feature discovery** through conversational AI
- **Self-service setup** with intelligent assistance

### Product Intelligence
- **User behavior analysis** through chat interactions
- **Feature usage insights** from AI conversations
- **Product improvement suggestions** based on user queries

## 📚 Documentation

### Core Components
- **[Server Documentation](./server/README.md)** - Complete backend API setup and usage
- **[Packages Documentation](./packages/README.md)** - Source-to-knowledge library development status
- **[Web Documentation](./web/README.md)** - Embeddable widget SDK details

### Quick Links
- **API Documentation**: `http://localhost:3000/docs` (when server is running)
- **Health Check**: `http://localhost:3000/health`

## 🛠️ Development Setup

### Prerequisites
- Docker & Docker Compose
- Supabase project with vector extension
- OpenAI API key

### Local Development
```bash
# Clone repository
git clone https://github.com/vezlo/vezlo.git
cd vezlo

# Start server
cd server
cp env.example .env
# Edit .env with your credentials
docker-compose up -d

# Verify installation
curl http://localhost:3000/health
```

### Project Structure
```
vezlo/
├── README.md              ← This file (SDK overview)
├── server/                ← Backend APIs (✅ Ready)
│   ├── README.md         ← Complete server documentation
│   ├── src/              ← TypeScript source code
│   ├── Dockerfile        ← Production container
│   └── env.example       ← Environment configuration
├── packages/              ← Source-to-knowledge library (🚧 Coming Soon)
│   └── README.md         ← Development status and separate repo info
└── web/                   ← Embeddable widget SDK (🚧 Coming Soon)
    └── README.md         ← Widget SDK features
```

## 🚀 Production Deployment

### Server Deployment
The server is production-ready with Docker:

```bash
# Production deployment
docker-compose up -d

# Environment configuration
cp server/env.example server/.env
# Edit .env with production values
```

**Production Features:**
- ✅ Docker containerization
- ✅ Health checks and monitoring
- ✅ Rate limiting and security
- ✅ Logging and error handling
- ✅ Supabase integration
- ✅ OpenAI API integration

## 📊 Current Status

### ✅ Production Ready
- **Backend APIs** - Complete REST API with WebSocket support
- **Knowledge Base** - Vector search with Supabase
- **Source-to-Knowledge** - Local knowledge base generation (separate repository)
- **Docker Deployment** - Production-ready containerization

### 🚧 In Development
- **Server Integration** - Work in progress to sync local knowledge base to server
- **Widget SDK** - Work in progress on embeddable widget configuration and deployment

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and test locally
4. Commit: `git commit -m 'Add new feature'`
5. Push: `git push origin feature/new-feature`
6. Submit pull request

### Areas for Contribution
- **Backend APIs** - Server improvements and new endpoints
- **Source-to-Knowledge** - Help improve the src-to-kb library
- **Widget SDK** - Contribute to the embeddable widget system
- **Documentation** - Improve guides and examples

### Community
- **GitHub**: [vezlo/vezlo](https://github.com/vezlo/vezlo) - Main repository
- **src-to-kb**: [vezlo/src-to-kb](https://github.com/vezlo/src-to-kb) - Source-to-knowledge library
- **Issues**: [Report bugs and request features](https://github.com/vezlo/vezlo/issues)
- **Discussions**: [Community discussions](https://github.com/vezlo/vezlo/discussions)

## 🔒 Security & Privacy

### Data Protection
- **Your Data Stays Yours** - All data stored in your Supabase instance
- **No Third-Party Processing** - OpenAI API calls only for AI responses
- **Configurable CORS** - Control which domains can access your APIs
- **Rate Limiting** - Prevent abuse and ensure fair usage

### Best Practices
- Use environment variables for sensitive data
- Regular dependency updates
- Monitor logs for suspicious activity
- Configure proper CORS origins

## 📄 License

This project is dual-licensed:

- **Non-Commercial Use**: Free under AGPL-3.0 license
- **Commercial Use**: Requires a commercial license - contact us for details

The source-to-knowledge library ([src-to-kb](https://github.com/vezlo/src-to-kb)) follows the same dual-licensing model.

## 🙏 Acknowledgments

Built with ❤️ by the Vezlo team and contributors.

Special thanks to:
- OpenAI for the incredible AI models
- Supabase for the backend infrastructure
- The open-source community for inspiration

---

<div align="center">

**[🚀 Get Started with Server](./server/README.md)** | **[📦 Source-to-Knowledge Library](https://github.com/vezlo/src-to-kb)** | **[🌐 Widget SDK](./web/README.md)** | **[💬 GitHub](https://github.com/vezlo/vezlo)**

**Made with ❤️ for the developer community**

</div>
