const { Response } = require('ai-agent-response');

class StreamAgent {
    constructor(metadata) {
        this.metadata = metadata;
        this.delay = metadata.delay || 100;
    }

    async generateReply(thread) {
        const response = new Response();
        const fakeMessage = this.generateFakeMessage(thread);
        response.setStream(this.createStream(fakeMessage));
        return response;
    }

    generateFakeMessage(thread, host_utils) {
        const lastMessage = thread.messages[thread.messages.length - 1];
        return `This is a stream response to: "${lastMessage.text}". It was generated by StreamAgent.`;
    }

    async *createStream(message) {
        const words = message.split(' ');
        for (const word of words) {
            yield word + ' ';
            await new Promise(resolve => setTimeout(resolve, this.delay));
        }
    }
}

module.exports = StreamAgent;