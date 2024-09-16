// ai_helper/agent/testAgent.js
const { Response } = require('ai-agent-response');

class TestAgent {
    constructor(metadata) {
        this.metadata = metadata;
    }

    generateReply(thread) {
        const lastMessage = thread.messages[thread.messages.length - 1];
        const replyText = `回复: ${lastMessage.text}`;
        return new Response(replyText);
    }
}

module.exports = TestAgent;