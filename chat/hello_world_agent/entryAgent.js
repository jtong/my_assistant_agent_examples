const { Response } = require('ai-agent-response');

class EntryAgent {
    constructor(metadata) {
        this.metadata = metadata;
    }

    async generateReply(thread, host_utils) {
        const lastMessage = thread.messages[thread.messages.length - 1];
        const replyText = `回复: ${lastMessage.text}`;
        return new Response(replyText);
    }
}

module.exports = EntryAgent;