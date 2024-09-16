const { expect } = require('chai');
const TestOpenAISyncAgent = require('../example/testOpneAISyncAgent');

describe('TestOpenAISyncAgent', function () {
    let agent;

    before(function () {
        // 检查是否设置了必要的环境变量
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }
        agent = new TestOpenAISyncAgent({
            "llm": {
                "apiKey": "openai",
                "model": "gpt-3.5-turbo"
            }
        }, {
            "openai": process.env.OPENAI_API_KEY
        });
    });

    it('should initialize with correct metadata', function () {
        expect(agent.metadata.llm.apiKey).to.equal("openai");
        expect(agent.metadata.llm.model).to.equal('gpt-3.5-turbo');
    });

    it('should generate a reply using OpenAI', async function () {
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