const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { Document } = require('langchain/document');

class RAGAgent {
    constructor(apiKey, options = {}) {
        this.openai = new OpenAI({ apiKey });
        this.vectorStore = new Map(); // 简单的内存向量存储
        this.documents = [];
        this.chunkSize = options.chunkSize || 1000;
        this.chunkOverlap = options.chunkOverlap || 200;
        this.maxRetrievedDocs = options.maxRetrievedDocs || 3;
        
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap,
        });
    }

    // 添加文档到知识库
    async addDocument(content, metadata = {}) {
        try {
            console.log('正在处理文档...');
            
            // 分割文档
            const docs = await this.textSplitter.createDocuments([content], [metadata]);
            
            // 为每个文档块生成嵌入向量
            for (const doc of docs) {
                const embedding = await this.generateEmbedding(doc.pageContent);
                const docId = this.generateDocId();
                
                this.vectorStore.set(docId, {
                    id: docId,
                    content: doc.pageContent,
                    embedding: embedding,
                    metadata: doc.metadata
                });
                
                this.documents.push({
                    id: docId,
                    content: doc.pageContent,
                    metadata: doc.metadata
                });
            }
            
            console.log(`成功添加 ${docs.length} 个文档块`);
            return docs.length;
        } catch (error) {
            console.error('添加文档时出错:', error);
            throw error;
        }
    }

    // 从文件加载文档
    async loadDocumentFromFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const filename = path.basename(filePath);
            
            await this.addDocument(content, { source: filename, filePath });
            console.log(`成功加载文件: ${filename}`);
        } catch (error) {
            console.error('加载文件时出错:', error);
            throw error;
        }
    }

    // 生成文本嵌入向量
    async generateEmbedding(text) {
        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: text,
            });
            
            return response.data[0].embedding;
        } catch (error) {
            console.error('生成嵌入向量时出错:', error);
            throw error;
        }
    }

    // 计算余弦相似度
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('向量维度不匹配');
        }
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // 检索相关文档
    async retrieveRelevantDocs(query) {
        try {
            console.log(`正在检索与"${query}"相关的文档...`);
            
            // 生成查询的嵌入向量
            const queryEmbedding = await this.generateEmbedding(query);
            
            // 计算相似度并排序
            const similarities = [];
            for (const [docId, doc] of this.vectorStore) {
                const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
                similarities.push({
                    ...doc,
                    similarity: similarity
                });
            }
            
            // 按相似度排序并返回前N个
            const relevantDocs = similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, this.maxRetrievedDocs);
            
            console.log(`找到 ${relevantDocs.length} 个相关文档`);
            return relevantDocs;
        } catch (error) {
            console.error('检索文档时出错:', error);
            throw error;
        }
    }

    // 生成回答
    async generateAnswer(query, context) {
        try {
            const prompt = this.buildPrompt(query, context);
            
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个有用的AI助手。请基于提供的上下文信息来回答用户的问题。如果上下文中没有相关信息，请诚实地说明。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            });
            
            return response.choices[0].message.content;
        } catch (error) {
            console.error('生成回答时出错:', error);
            throw error;
        }
    }

    // 构建提示词
    buildPrompt(query, relevantDocs) {
        const context = relevantDocs
            .map((doc, index) => `文档${index + 1} (相似度: ${doc.similarity.toFixed(3)}):\n${doc.content}`)
            .join('\n\n---\n\n');
        
        return `基于以下上下文信息回答问题：

上下文信息：
${context}

问题：${query}

请提供准确、有用的回答：`;
    }

    // 主要的问答方法
    async ask(query) {
        try {
            console.log(`\n🤖 收到问题: ${query}`);
            
            if (this.vectorStore.size === 0) {
                return '知识库为空，请先添加一些文档。';
            }
            
            // 1. 检索相关文档
            const relevantDocs = await this.retrieveRelevantDocs(query);
            
            if (relevantDocs.length === 0) {
                return '很抱歉，我在知识库中没有找到相关信息来回答您的问题。';
            }
            
            // 2. 生成回答
            const answer = await this.generateAnswer(query, relevantDocs);
            
            // 3. 返回结果
            return {
                answer: answer,
                sources: relevantDocs.map(doc => ({
                    content: doc.content.substring(0, 100) + '...',
                    similarity: doc.similarity,
                    metadata: doc.metadata
                }))
            };
        } catch (error) {
            console.error('处理问题时出错:', error);
            return '抱歉，处理您的问题时遇到了错误。';
        }
    }

    // 生成文档ID
    generateDocId() {
        return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 获取知识库统计信息
    getStats() {
        return {
            totalDocuments: this.documents.length,
            totalChunks: this.vectorStore.size,
            avgChunkSize: this.documents.length > 0 
                ? Math.round(this.documents.reduce((sum, doc) => sum + doc.content.length, 0) / this.documents.length)
                : 0
        };
    }

    // 清空知识库
    clearKnowledgeBase() {
        this.vectorStore.clear();
        this.documents = [];
        console.log('知识库已清空');
    }
}

module.exports = RAGAgent;