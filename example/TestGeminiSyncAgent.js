const { Response } = require('ai-agent-response');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { setGlobalDispatcher, ProxyAgent } = require("undici");
const dispatcher = new ProxyAgent({ uri: new URL(process.env.https_proxy).toString() });
//全局fetch调用启用代理
setGlobalDispatcher(dispatcher);

class TestGeminiSyncAgent {
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
        const result = await this.model.generateContent(lastMessage.text);
        const response = await result.response;
        const text = response.text();
        return text;
    }
}

module.exports = TestGeminiSyncAgent;