
const { Response } = require('ai-agent-response');
const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiStreamAgent {
    constructor(metadata, settings) {
        this.metadata = metadata;
        this.settings = settings;
        const genAI = new GoogleGenerativeAI(this.settings[this.metadata.llm.apiKey]);
        this.model = genAI.getGenerativeModel({ model: this.metadata.llm.model });
    }

    async generateReply(thread) {
        const history = this.convertToGeminiHistory(thread.messages);
        const chat = this.model.startChat({ history });
        const result = await chat.sendMessageStream(thread.messages[thread.messages.length - 1].text);

        const response = new Response('');
        response.setStream(this.createStream(result.stream));
        return response;
    }

    convertToGeminiHistory(messages) {
        return messages.slice(0, -1).map(message => ({
            role: message.sender === 'user' ? 'user' : 'model',
            parts: [{ text: message.text }]
        }));
    }

    async *createStream(stream) {
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            yield chunkText;
        }
    }
}

module.exports = GeminiStreamAgent;