#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const RAGAgent = require('./rag-agent');
const fs = require('fs');
const path = require('path');

class MCPRAGServer {
  constructor() {
    this.server = new Server(
      {
        name: 'rag-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.ragAgent = null;
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'initialize_rag',
            description: 'Initialize the RAG agent with OpenAI API key and configuration',
            inputSchema: {
              type: 'object',
              properties: {
                apiKey: { type: 'string', description: 'OpenAI API key' },
                config: {
                  type: 'object',
                  properties: {
                    chunkSize: { type: 'number', description: 'Size of document chunks', default: 1000 },
                    chunkOverlap: { type: 'number', description: 'Overlap between chunks', default: 200 },
                    maxRetrievedDocs: { type: 'number', description: 'Maximum number of documents to retrieve', default: 3 }
                  }
                }
              },
              required: ['apiKey']
            }
          },
          {
            name: 'add_document',
            description: 'Add a document to the knowledge base',
            inputSchema: {
              type: 'object',
              properties: {
                content: { type: 'string', description: 'Document content to add' },
                metadata: { type: 'object', description: 'Optional metadata for the document' }
              },
              required: ['content']
            }
          },
          {
            name: 'ask_question',
            description: 'Ask a question using RAG (Retrieval-Augmented Generation)',
            inputSchema: {
              type: 'object',
              properties: {
                question: { type: 'string', description: 'Question to ask' }
              },
              required: ['question']
            }
          },
          {
            name: 'search_documents',
            description: 'Search for documents without generating an answer',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                maxResults: { type: 'number', description: 'Maximum number of results to return', default: 5 }
              },
              required: ['query']
            }
          },
          {
            name: 'get_knowledge_base_stats',
            description: 'Get statistics about the current knowledge base',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'clear_knowledge_base',
            description: 'Clear all documents from the knowledge base',
            inputSchema: { type: 'object', properties: {} }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'initialize_rag': return await this.initializeRAG(args);
          case 'add_document': return await this.addDocument(args);
          case 'ask_question': return await this.askQuestion(args);
          case 'search_documents': return await this.searchDocuments(args);
          case 'get_knowledge_base_stats': return await this.getKnowledgeBaseStats();
          case 'clear_knowledge_base': return await this.clearKnowledgeBase();
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(ErrorCode.InternalError, `Error executing tool ${name}: ${error.message}`);
      }
    });
  }

  async initializeRAG(args) {
    const { apiKey, config = {} } = args;
    if (!apiKey) throw new McpError(ErrorCode.InvalidParams, 'API key is required');

    try {
      this.ragAgent = new RAGAgent(apiKey, config);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'RAG Agent initialized successfully',
            config: { chunkSize: config.chunkSize || 1000, chunkOverlap: config.chunkOverlap || 200, maxRetrievedDocs: config.maxRetrievedDocs || 3 }
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to initialize RAG agent: ${error.message}`);
    }
  }

  async addDocument(args) {
    this.ensureRAGInitialized();
    const { content, metadata = {} } = args;
    if (!content) throw new McpError(ErrorCode.InvalidParams, 'Document content is required');

    try {
      const chunksAdded = await this.ragAgent.addDocument(content, metadata);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, message: `Document added successfully. ${chunksAdded} chunks created.`, chunksAdded, metadata }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to add document: ${error.message}`);
    }
  }

  async askQuestion(args) {
    this.ensureRAGInitialized();
    const { question } = args;
    if (!question) throw new McpError(ErrorCode.InvalidParams, 'Question is required');

    try {
      const result = await this.ragAgent.ask(question);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            question,
            answer: typeof result === 'string' ? result : result.answer,
            sources: typeof result === 'object' ? result.sources : null,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to process question: ${error.message}`);
    }
  }

  async searchDocuments(args) {
    this.ensureRAGInitialized();
    const { query, maxResults = 5 } = args;
    if (!query) throw new McpError(ErrorCode.InvalidParams, 'Search query is required');

    try {
      const relevantDocs = await this.ragAgent.retrieveRelevantDocs(query);
      const limitedResults = relevantDocs.slice(0, maxResults);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query, totalFound: relevantDocs.length, returned: limitedResults.length,
            documents: limitedResults.map(doc => ({
              id: doc.id,
              content: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
              similarity: doc.similarity,
              metadata: doc.metadata
            })),
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to search documents: ${error.message}`);
    }
  }

  async getKnowledgeBaseStats() {
    this.ensureRAGInitialized();
    try {
      const stats = this.ragAgent.getStats();
      return { content: [{ type: 'text', text: JSON.stringify({ stats, timestamp: new Date().toISOString() }, null, 2) }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get stats: ${error.message}`);
    }
  }

  async clearKnowledgeBase() {
    this.ensureRAGInitialized();
    try {
      this.ragAgent.clearKnowledgeBase();
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Knowledge base cleared successfully', timestamp: new Date().toISOString() }, null, 2) }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to clear knowledge base: ${error.message}`);
    }
  }

  ensureRAGInitialized() {
    if (!this.ragAgent) {
      throw new McpError(ErrorCode.InvalidRequest, 'RAG agent not initialized. Please call initialize_rag first.');
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP RAG Server running on stdio');
  }
}

async function main() {
  const server = new MCPRAGServer();
  await server.run();
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = MCPRAGServer;