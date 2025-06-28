# Chalee MCP RAG 🤖

一个基于 **Model Context Protocol (MCP)** 的 **RAG（检索增强生成）**服务器，提供文档处理、向量存储和智能问答功能。

## ✨ 特性

- 🔧 **标准化 MCP 协议**：遵循 Anthropic MCP 标准，可与 Claude Desktop 等客户端集成
- 📚 **智能文档处理**：自动分块、向量化存储
- 🔍 **语义检索**：基于余弦相似度的相关文档检索
- 💬 **智能问答**：结合检索上下文的准确回答生成
- 🛡️ **安全可靠**：内置错误处理和参数验证
- 🚀 **生产就绪**：完整的配置和部署支持

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/PrettyKing/chalee-mcp-rag.git
cd chalee-mcp-rag
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，设置你的 OpenAI API 密钥
```

### 4. 启动 MCP 服务器

```bash
npm run mcp-server
```

### 5. 运行客户端演示

```bash
# 在另一个终端
npm run mcp-client
```

## 🛠️ 可用工具

MCP RAG 服务器提供以下 6 个核心工具：

| 工具名称 | 描述 | 参数 |
|---------|------|------|
| `initialize_rag` | 初始化 RAG Agent | `apiKey`, `config` |
| `add_document` | 添加文档到知识库 | `content`, `metadata` |
| `ask_question` | 智能问答 | `question` |
| `search_documents` | 文档相似性搜索 | `query`, `maxResults` |
| `get_knowledge_base_stats` | 获取知识库统计 | - |
| `clear_knowledge_base` | 清空知识库 | - |

## 📁 项目结构

```
chalee-mcp-rag/
├── rag-agent.js           # RAG Agent 核心实现
├── mcp-rag-server.js      # MCP 服务器
├── mcp-client.js          # MCP 客户端示例
├── test.js                # RAG Agent 测试
├── package.json           # 项目配置
├── .env.example           # 环境变量示例
└── README.md              # 说明文档
```

## 🌐 与 Claude Desktop 集成

要在 Claude Desktop 中使用此 MCP 服务器，请在 Claude 配置文件中添加：

### macOS
编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chalee-rag-server": {
      "command": "node",
      "args": ["/path/to/your/chalee-mcp-rag/mcp-rag-server.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key_here"
      }
    }
  }
}
```

### Windows
编辑 `%APPDATA%\\Claude\\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chalee-rag-server": {
      "command": "node",
      "args": ["C:\\path\\to\\your\\chalee-mcp-rag\\mcp-rag-server.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key_here"
      }
    }
  }
}
```

## 📖 使用示例

### 基本用法

```javascript
const MCPRAGClient = require('./mcp-client');

async function example() {
  const client = new MCPRAGClient();
  
  // 连接服务器
  await client.connect();
  
  // 初始化 RAG
  await client.initializeRAG('your-openai-api-key');
  
  // 添加文档
  await client.addDocument('这是一个示例文档...', {
    category: '示例',
    source: 'demo'
  });
  
  // 提问
  const answer = await client.askQuestion('这个文档讲了什么？');
  console.log(answer.answer);
  
  // 断开连接
  await client.disconnect();
}
```

### 高级配置

```javascript
// 自定义 RAG 配置
await client.initializeRAG('your-api-key', {
  chunkSize: 800,        // 文档分块大小
  chunkOverlap: 100,     // 分块重叠大小
  maxRetrievedDocs: 5    // 最大检索文档数
});
```

## 🔧 配置选项

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | 必需 |
| `CHUNK_SIZE` | 文档分块大小 | 1000 |
| `CHUNK_OVERLAP` | 分块重叠大小 | 200 |
| `MAX_RETRIEVED_DOCS` | 最大检索文档数 | 3 |
| `MODEL_NAME` | GPT 模型名称 | gpt-3.5-turbo |
| `EMBEDDING_MODEL` | 嵌入模型名称 | text-embedding-ada-002 |

## 🧪 测试

```bash
# 运行 RAG Agent 测试
npm test

# 运行 MCP 客户端演示
npm run mcp-client
```

## 🚀 部署

### Docker 部署

```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "mcp-server"]
```

### 进程管理

```bash
# 使用 PM2 管理进程
npm install -g pm2
pm2 start mcp-rag-server.js --name "mcp-rag-server"
pm2 monitor
```

## 🔍 故障排除

### 常见问题

1. **连接失败**
   - 确保 Node.js 版本 >= 16
   - 检查依赖是否正确安装
   - 验证 API 密钥是否有效

2. **工具调用失败**
   - 确保先调用 `initialize_rag`
   - 检查参数格式是否正确
   - 查看服务器日志获取详细错误信息

3. **性能问题**
   - 减少 `chunkSize` 或 `maxRetrievedDocs`
   - 优化文档大小和数量
   - 考虑使用外部向量数据库

### 调试模式

```bash
# 启用详细日志
DEBUG=mcp:* npm run mcp-server
```

## 🌟 扩展功能

### 支持更多文档格式

```javascript
// PDF 支持
const pdfParse = require('pdf-parse');

async function loadPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return await agent.addDocument(data.text, { type: 'pdf', source: filePath });
}
```

### 持久化存储

```javascript
// 使用 Pinecone 向量数据库
const { PineconeStore } = require('langchain/vectorstores/pinecone');

class PersistentRAGAgent extends RAGAgent {
  async initializePinecone() {
    this.vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex: this.index }
    );
  }
}
```

## 📚 API 文档

### initialize_rag

初始化 RAG Agent 实例。

```typescript
interface InitializeRAGParams {
  apiKey: string;
  config?: {
    chunkSize?: number;
    chunkOverlap?: number;
    maxRetrievedDocs?: number;
  };
}
```

### add_document

向知识库添加文档。

```typescript
interface AddDocumentParams {
  content: string;
  metadata?: Record<string, any>;
}
```

### ask_question

使用 RAG 技术回答问题。

```typescript
interface AskQuestionParams {
  question: string;
}

interface AskQuestionResponse {
  question: string;
  answer: string;
  sources?: Array<{
    content: string;
    similarity: number;
    metadata: Record<string, any>;
  }>;
  timestamp: string;
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Anthropic](https://www.anthropic.com/) - MCP 协议开发者
- [OpenAI](https://openai.com/) - GPT 和 Embedding API
- [LangChain](https://www.langchain.com/) - 文本处理工具

## 📞 支持

- 📧 Email: [your-email@example.com](mailto:your-email@example.com)
- 🐛 Issues: [GitHub Issues](https://github.com/PrettyKing/chalee-mcp-rag/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/PrettyKing/chalee-mcp-rag/discussions)

---

⭐ 如果这个项目对你有帮助，请给它一个星标！