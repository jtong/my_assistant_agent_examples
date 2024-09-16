const { expect } = require('chai');
const TestGeminiStreamAgent = require('../example/TestGeminiStreamAgent');
const { Response } = require('ai-agent-response');

describe('TestGeminiStreamAgent', function() {
    let agent;

    before(function() {
        // 检查是否设置了必要的环境变量
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error('GOOGLE_API_KEY environment variable is not set');
        }
        agent = new TestGeminiStreamAgent({
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

    it('should generate a streaming reply', async function() {
        this.timeout(15000); // 增加超时时间，因为流式 API 调用可能需要更长时间

        const thread = {
            messages: [
                { text: "What is the capital of France?" }
            ]
        };
        
        const response = await agent.generateReply(thread);
        
        expect(response).to.be.instanceOf(Response);
        expect(response.isStream()).to.be.true;

        let fullResponse = '';
        for await (const chunk of response.getStream()) {
            fullResponse += chunk;
        }

        expect(fullResponse).to.be.a('string');
        expect(fullResponse.toLowerCase()).to.include('paris');
    }).timeout(15000);

    it('should handle errors gracefully', async function() {
        this.timeout(10000);

        const thread = {
            messages: [
                { text: "" } // 空消息可能会导致错误
            ]
        };

        try {
            await agent.generateReply(thread);
        } catch (error) {
            expect(error).to.be.an('error');
        }
    }).timeout(10000);
});