// ai_helper/agent/testAgent.js
const { Response } = require('ai-agent-response');
const OpenAIProcessorInstance = require('./openai_client/factory.js');

class TestOpenAISyncAgent {
    constructor(metadata) {
        this.metadata = metadata;
        this.openAIProcessor = OpenAIProcessorInstance.getOpenAIProcessor(this.metadata.llm.openai.apiKey, this.metadata.llm.openai.model);

    }

    generateReply(thread) {
        const lastMessage = thread.messages[thread.messages.length - 1];
        return this.openAIProcessor.processPrompt(lastMessage.text);
    }
}

module.exports = TestOpenAISyncAgent;