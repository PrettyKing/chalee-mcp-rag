# Chalee MCP RAG

一个基于 Model Context Protocol (MCP) 的 RAG（检索增强生成）服务器，提供文档处理、向量存储和智能问答功能。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件并添加你的 OpenAI API 密钥：

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 启动 MCP 服务器

```bash
npm run mcp-server
```

### 4. 运行客户端示例

```bash
node mcp-client.js
```

## 🛠️ 可用工具

MCP RAG 服务器提供以下工具：

- `initialize_rag` - 初始化 RAG Agent，需要 OpenAI API 密钥
- `add_document` - 向知识库添加文档
- `load_document_from_file` - 从文件加载文档到知识库
- `ask_question` - 使用 RAG 技术回答问题
- `search_documents` - 按相似度搜索文档
- `get_knowledge_base_stats` - 获取知识库统计信息
- `clear_knowledge_base` - 清空知识库中的所有文档
- `list_documents` - 列出知识库中的所有文档

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
      "args": ["/path/to/your/mcp-rag-server.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key_here"
      }
    }
  }
}
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！