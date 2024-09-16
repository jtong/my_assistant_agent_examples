const { expect } = require('chai');
const TestGeminiSyncAgent = require('../example/TestGeminiSyncAgent');
const { GoogleGenerativeAI } = require("@google/generative-ai");

describe('TestGeminiSyncAgent', function() {
    let agent;

    before(function() {
        // 检查是否设置了必要的环境变量
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error('GOOGLE_API_KEY environment variable is not set');
        }
        agent = new TestGeminiSyncAgent({
            "llm": {
                    "apiKey": "gemini",
                    "model": "gemini-1.5-flash"
                }
        }, {
            "gemini": process.env.GOOGLE_API_KEY
        });
    });

    it('should initialize with correct metadata', function() {
        expect(agent.metadata.llm.apiKey).to.equal("gemini");
        expect(agent.metadata.llm.model).to.equal('gemini-1.5-flash');
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
    }).timeout(10000);

    
});