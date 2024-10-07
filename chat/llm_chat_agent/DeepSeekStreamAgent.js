const { Response } = require('ai-agent-response');
const OpenAI = require('openai');

class DeepSeekStreamAgent {
    constructor(metadata, settings) {
        this.metadata = metadata;
        this.settings = settings;
        this.openai = new OpenAI({
            apiKey: this.settings[this.metadata.llm.apiKey],
            baseURL: 'https://api.deepseek.com',
        });
        this.model = this.metadata.llm.model;
    }

    async generateReply(thread) {
        const messages = this.convertToOpenAIMessages(thread.messages);
        const stream = await this.openai.chat.completions.create({
            model: this.model,
            messages: messages,
            stream: true,
        });

        const response = new Response('');
        response.setStream(this.createStream(stream));
        return response;
    }

    convertToOpenAIMessages(messages) {
        return messages.map(message => ({
            role: message.sender === 'user' ? 'user' : 'assistant',
            content: message.text
        }));
    }

    async *createStream(stream) {
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                yield content;
            }
        }
    }
}

module.exports = DeepSeekStreamAgent;