const RAGAgent = require('./rag-agent');
require('dotenv').config();

async function testRAGAgent() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        console.error('请在 .env 文件中设置 OPENAI_API_KEY');
        return;
    }

    const agent = new RAGAgent(apiKey, {
        chunkSize: 1000,
        chunkOverlap: 200,
        maxRetrievedDocs: 3
    });

    try {
        console.log('🚀 开始测试 RAG Agent...\n');

        await agent.addDocument(`
        React 是一个用于构建用户界面的 JavaScript 库。它由 Facebook 开发并维护。
        React 的核心概念包括组件、JSX、状态管理和生命周期方法。
        React 使用虚拟 DOM 来提高性能，通过 diff 算法来最小化实际 DOM 操作。
        React Hooks 是 React 16.8 引入的新特性，允许在函数组件中使用状态和其他 React 特性。
        常用的 Hooks 包括 useState、useEffect、useContext 等。
        `, { category: '前端技术', framework: 'React' });

        await agent.addDocument(`
        Vue.js 是一个渐进式 JavaScript 框架，用于构建用户界面。
        Vue 的核心特性包括响应式数据绑定、组件系统、模板语法和指令。
        Vue 3 引入了 Composition API，提供了更灵活的组件逻辑组织方式。
        Vue 的生态系统包括 Vue Router（路由）、Vuex/Pinia（状态管理）等工具。
        Vue 以其简单易学和渐进式的特点而受到开发者喜爱。
        `, { category: '前端技术', framework: 'Vue.js' });

        await agent.addDocument(`
        Docker 是一个开源的容器化平台，用于开发、运输和运行应用程序。
        Docker 容器将应用程序及其依赖项打包在一起，确保在任何环境中都能一致地运行。
        Docker 的核心概念包括镜像（Image）、容器（Container）、Dockerfile 和 Docker Compose。
        使用 Docker 可以实现应用程序的快速部署、扩展和管理。
        Docker 在微服务架构和 DevOps 实践中起着重要作用。
        `, { category: '运维技术', tool: 'Docker' });

        console.log('📊 知识库统计:', agent.getStats());
        console.log('\n');

        const testQuestions = [
            'React Hooks 是什么？',
            'Vue.js 和 React 有什么区别？',
            'Docker 容器有什么优势？',
            '什么是响应式数据绑定？',
            'Python 的优点是什么？' // 这个问题在知识库中没有答案
        ];

        for (let i = 0; i < testQuestions.length; i++) {
            const question = testQuestions[i];
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📝 测试问题 ${i + 1}: ${question}`);
            console.log('='.repeat(60));

            const startTime = Date.now();
            const result = await agent.ask(question);
            const endTime = Date.now();

            if (typeof result === 'string') {
                console.log('\n🤖 回答:');
                console.log(result);
            } else {
                console.log('\n🤖 回答:');
                console.log(result.answer);
                
                console.log('\n📚 参考来源:');
                result.sources.forEach((source, index) => {
                    console.log(`\n${index + 1}. 相似度: ${(source.similarity * 100).toFixed(1)}%`);
                    console.log(`   内容: ${source.content}`);
                    console.log(`   元数据: ${JSON.stringify(source.metadata)}`);
                });
            }
            
            console.log(`\n⏱️  响应时间: ${endTime - startTime}ms`);
        }

        console.log('\n\n📈 最终知识库统计:', agent.getStats());
        console.log('\n✅ RAG Agent 测试完成！');

    } catch (error) {
        console.error('❌ 测试过程中出错:', error);
    }
}

if (require.main === module) {
    testRAGAgent();
}

module.exports = testRAGAgent;