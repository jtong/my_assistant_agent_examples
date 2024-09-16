const { Response } = require('ai-agent-response');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { setGlobalDispatcher, ProxyAgent } = require("undici");

// Set up the proxy if needed
const dispatcher = new ProxyAgent({ uri: new URL("http://127.0.0.1:7890").toString() });
setGlobalDispatcher(dispatcher);

class TestGemeniStreamAgent {
    constructor(metadata, settings) {
        this.metadata = metadata;
        this.settings = settings;
        const llmConfig = {
            apiKey: this.settings[this.metadata.llm.apiKey],
            model: this.metadata.llm.model
        }
        const genAI = new GoogleGenerativeAI(llmConfig.apiKey);
        this.model = genAI.getGenerativeModel({ model: llmConfig.model });
    }

    async generateReply(thread) {
        const lastMessage = thread.messages[thread.messages.length - 1];
        const result = await this.model.generateContentStream(lastMessage.text);

        const response = new Response('');
        response.setStream(this.createStream(result.stream));

        return response;
    }

    async *createStream(stream) {
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            yield chunkText;
        }
    }
}

module.exports = TestGemeniStreamAgent;