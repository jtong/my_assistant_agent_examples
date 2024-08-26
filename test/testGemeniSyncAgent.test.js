const { expect } = require('chai');
const TestGemeniSyncAgent = require('../TestGemeniSyncAgent');
const { GoogleGenerativeAI } = require("@google/generative-ai");

describe('TestGemeniSyncAgent', function() {
    let agent;

    before(function() {
        // 检查是否设置了必要的环境变量
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error('GOOGLE_API_KEY environment variable is not set');
        }
        console.log(process.env.GOOGLE_API_KEY)
        agent = new TestGemeniSyncAgent({
            llm: {
                openai: {
                    apiKey: process.env.GOOGLE_API_KEY,
                    model: 'gemini-1.5-pro' // 或者您想使用的其他Gemini模型
                }
            }
        });
    });

    it('should initialize with correct metadata', function() {
        expect(agent.metadata.llm.openai.apiKey).to.equal(process.env.GOOGLE_API_KEY);
        expect(agent.metadata.llm.openai.model).to.equal('gemini-1.5-pro');
    });

    it('should generate a reply using Gemini', async function() {
        this.timeout(10000); // 增加超时时间，因为 API 调用可能需要几秒钟

        const thread = {
            messages: [
                { text: "What is the capital of France?" }
            ]
        };
        
        const response = await agent.generateReply(thread);
        
        expect(response).to.be.a('string');
        expect(response.toLowerCase()).to.include('paris');
    });

    
});