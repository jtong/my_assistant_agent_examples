// ai_helper/agent/testAgent.js
const { Response } = require('ai-agent-response');
const OpenAIProcessorInstance = require('./openai_client/factory.js');

class TestOpenAIAgent {
    constructor(metadata) {
        this.metadata = metadata;
        this.openAIProcessor = OpenAIProcessorInstance.OpenAIProcessorInstance(this.metadata.llm.openai.apiKey, this.metadata.llm.openai.model);

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