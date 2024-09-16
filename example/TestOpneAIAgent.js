// ai_helper/agent/testAgent.js
const { Response } = require('ai-agent-response');
const OpenAIProcessorInstance = require('../openai_client/factory.js');

class TestOpenAIAgent {
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
        const chat_history = thread.messages.map(message => {
            let sender = message.sender === 'user' ? 'User' : 'Bot';
            let text = message.text;
            return `${sender}: ${text}`;
          }).join('\n');
        return this.openAIProcessor.processPromptStream(chat_history);
    }
}

module.exports = TestOpenAIAgent;