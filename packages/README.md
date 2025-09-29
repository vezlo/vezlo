# Vezlo Source-to-Knowledge SDK

📦 **Source-to-Knowledge Library** - Node.js library that converts your codebase into searchable knowledge bases.

## 🚧 Coming Soon

This directory will contain the **Source-to-Knowledge Library** that will be integrated with the Vezlo Server backend APIs.

## 🎯 Current Status

### ✅ Available Now (Separate Repository)
The **src-to-kb** library is currently available as a separate repository:

```bash
npm install @vezlo/src-to-kb
```

**Current Features:**
- **Source Code Parsing** - Analyze JavaScript/TypeScript codebases
- **Knowledge Base Generation** - Create local searchable knowledge bases
- **Multiple Language Support** - JavaScript, TypeScript, Python, Java, C/C++, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala
- **CLI Tools** - Command-line interface for analysis

### Usage Examples

```bash
# Generate knowledge base from your project
src-to-kb /path/to/your/project --output ./project-kb

# Search your codebase
src-to-kb-search search "authentication" --kb ./project-kb
```

### 🚧 In Progress (This Packages Folder)
**Server Integration** - Work is currently in progress to:
- Move the src-to-kb library into this packages folder
- Integrate it with Vezlo Server backend APIs
- Enable automatic push of analyzed code to server
- Provide seamless AI assistant integration

## 🎯 Use Cases for SaaS Businesses

### Product Documentation
- **API Documentation** - Generate searchable documentation from your codebase
- **Feature Documentation** - Automatically document product features
- **Code Intelligence** - Get help with your codebase through AI

### Customer Support
- **Knowledge Base Creation** - Convert code to customer-facing documentation
- **Technical Support** - AI assistant understands your product code
- **FAQ Generation** - Create FAQs from code comments and documentation

## 🤝 Contributing

The **src-to-kb** library is actively maintained! If you're interested in contributing:

1. **GitHub Repository** - [vezlo/src-to-kb](https://github.com/vezlo/src-to-kb)
2. **Check Issues** - Look for open issues and feature requests
3. **Propose Features** - Suggest new analysis capabilities
4. **Submit PRs** - Contribute improvements and bug fixes

## 📚 Related Documentation

- **[Server Documentation](../server/README.md)** - Backend APIs for knowledge base
- **[Web Documentation](../web/README.md)** - Embeddable widget SDK
- **[Global Documentation](../README.md)** - Complete SDK overview

## 📄 License

This project is dual-licensed:

- **Non-Commercial Use**: Free under AGPL-3.0 license
- **Commercial Use**: Requires a commercial license - contact us for details

---

**Status**: 🚧 In Development | **Current**: [src-to-kb](https://github.com/vezlo/src-to-kb) | **Future**: This packages folder | **Contributors Welcome**: ✅
