const { Response } = require('ai-agent-response');
const OpenAIProcessorInstance = require('../openai_client/factory.js');

class TestOpenAISyncAgent {
    constructor(metadata, settings) {
        this.metadata = metadata;
        this.settings = settings;
        const llmConfig = {
            apiKey: this.settings[this.metadata.llm.apiKey],
            model: this.metadata.llm.model
        }
        this.llmConfig = llmConfig;
        this.openAIProcessor = OpenAIProcessorInstance.getOpenAIProcessor(this.llmConfig.apiKey, this.llmConfig.model);

    }

    generateReply(thread) {
        const lastMessage = thread.messages[thread.messages.length - 1];
        return this.openAIProcessor.processPrompt(lastMessage.text);
    }
}

module.exports = TestOpenAISyncAgent;