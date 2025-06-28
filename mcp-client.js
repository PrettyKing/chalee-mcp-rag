const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');
require('dotenv').config();

class MCPRAGClient {
  constructor() {
    this.client = null;
    this.serverProcess = null;
  }

  async connect() {
    try {
      console.log('🚀 启动 MCP RAG 服务器...');
      
      this.serverProcess = spawn('node', ['mcp-rag-server.js'], {
        stdio: ['pipe', 'pipe', 'inherit']
      });

      const transport = new StdioClientTransport({
        stdin: this.serverProcess.stdin,
        stdout: this.serverProcess.stdout
      });

      this.client = new Client({ name: 'rag-mcp-client', version: '1.0.0' }, { capabilities: {} });
      await this.client.connect(transport);
      console.log('✅ 已连接到 MCP RAG 服务器');
      return true;
    } catch (error) {
      console.error('❌ 连接失败:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) await this.client.close();
    if (this.serverProcess) this.serverProcess.kill();
    console.log('🔌 已断开连接');
  }

  async listTools() {
    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      console.error('获取工具列表失败:', error);
      return [];
    }
  }

  async callTool(name, args = {}) {
    try {
      console.log(`🔧 调用工具: ${name}`);
      const response = await this.client.callTool({ name, arguments: args });
      if (response.content && response.content[0] && response.content[0].text) {
        return JSON.parse(response.content[0].text);
      }
      return response;
    } catch (error) {
      console.error(`调用工具 ${name} 失败:`, error);
      throw error;
    }
  }

  async initializeRAG(apiKey, config = {}) {
    return await this.callTool('initialize_rag', { apiKey, config });
  }

  async addDocument(content, metadata = {}) {
    return await this.callTool('add_document', { content, metadata });
  }

  async askQuestion(question) {
    return await this.callTool('ask_question', { question });
  }

  async getStats() {
    return await this.callTool('get_knowledge_base_stats');
  }

  async searchDocuments(query, maxResults = 5) {
    return await this.callTool('search_documents', { query, maxResults });
  }

  async clearKnowledgeBase() {
    return await this.callTool('clear_knowledge_base');
  }
}

async function demonstrateMCPRAG() {
  const client = new MCPRAGClient();
  
  try {
    const connected = await client.connect();
    if (!connected) {
      console.error('无法连接到服务器');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n📋 可用工具列表:');
    const tools = await client.listTools();
    tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}: ${tool.description}`);
    });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('\n❌ 请在 .env 文件中设置 OPENAI_API_KEY');
      return;
    }

    console.log('\n🔧 初始化 RAG Agent...');
    const initResult = await client.initializeRAG(apiKey, {
      chunkSize: 800, chunkOverlap: 100, maxRetrievedDocs: 3
    });
    console.log('初始化结果:', initResult);

    console.log('\n📚 添加示例文档...');
    
    const nodeDoc = `
    Node.js 是一个基于 Chrome V8 JavaScript 引擎的 JavaScript 运行时环境。
    它使用事件驱动、非阻塞 I/O 模型，使其轻量且高效。
    Node.js 特别适合构建数据密集型的实时应用程序。
    
    Node.js 的主要特点包括：
    - 单线程事件循环
    - 异步非阻塞 I/O
    - 丰富的 NPM 生态系统
    - 跨平台支持
    - V8 引擎的高性能
    `;
    
    await client.addDocument(nodeDoc, { category: '技术文档', topic: 'Node.js' });

    const mcpDoc = `
    Model Context Protocol (MCP) 是 Anthropic 开发的开放标准协议。
    MCP 旨在为 AI 应用程序与外部数据源和工具之间提供安全、标准化的连接。
    
    MCP 的核心优势：
    - 标准化接口：统一的协议规范
    - 安全性：内置权限控制和数据保护
    - 可扩展性：支持各种外部资源类型
    - 互操作性：不同系统间的无缝集成
    `;
    
    await client.addDocument(mcpDoc, { category: '技术文档', topic: 'MCP' });

    console.log('\n📊 知识库统计:');
    const stats = await client.getStats();
    console.log(stats);

    console.log('\n❓ 测试问答功能...');
    
    const questions = [
      'Node.js 有什么特点？',
      'MCP 协议的主要优势是什么？',
      'Node.js 和 MCP 有什么关系？'
    ];

    for (const question of questions) {
      console.log(`\n🤔 问题: ${question}`);
      try {
        const answer = await client.askQuestion(question);
        console.log(`🤖 回答: ${answer.answer}`);
        
        if (answer.sources && answer.sources.length > 0) {
          console.log('📖 参考来源:');
          answer.sources.forEach((source, index) => {
            console.log(`   ${index + 1}. 相似度: ${(source.similarity * 100).toFixed(1)}%`);
            console.log(`      内容: ${source.content}`);
          });
        }
      } catch (error) {
        console.error(`处理问题时出错: ${error.message}`);
      }
    }

    console.log('\n✅ MCP RAG 演示完成！');

  } catch (error) {
    console.error('演示过程中出错:', error);
  } finally {
    await client.disconnect();
  }
}

process.on('SIGINT', () => {
  console.log('\n\n🛑 收到中断信号，正在退出...');
  process.exit(0);
});

if (require.main === module) {
  demonstrateMCPRAG().catch(console.error);
}

module.exports = MCPRAGClient;