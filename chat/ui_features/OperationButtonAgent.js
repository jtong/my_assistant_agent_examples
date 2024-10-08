const { Response, Task } = require('ai-agent-response');

class OperationButtonAgent {
    constructor(metadata) {
        this.metadata = metadata;
        this.tasks = {
            "AddMarker": new Task({
                name: "AddMarker",
                type: Task.TYPE_ACTION,
                skipUserMessage: true,
                skipBotMessage: true
            })
        };
    }

    async generateReply(thread, host_utils) {
        const { threadRepository } = host_utils;
        const messagesAfterLastMarker = threadRepository.getMessagesAfterLastMarker(thread);
        const summary = this.summarizeMessages(messagesAfterLastMarker);
        return new Response(`Summary of conversation since last marker:\n\n${summary}`);
    }

    async executeTask(task, thread) {
        const { threadRepository, postMessage } = task.host_utils;
        let response;

        if (task.name === "AddMarker") {
            const markerId = threadRepository.addMarker(thread);
            response = new Response("Marker added successfully.");
            postMessage({
                type: 'markerAdded',
                thread: thread,
                markerId
            });
        } else {
            response = new Response(`Task ${task.name} has been executed successfully.`);
        }

        return response;
    }

    summarizeMessages(messages) {
        // 这里可以实现一个简单的摘要逻辑
        // 在实际应用中，您可能会使用更复杂的摘要算法或调用 AI 服务
        const messageCount = messages.length;
        const userMessages = messages.filter(msg => msg.sender === 'user').length;
        const botMessages = messages.filter(msg => msg.sender === 'bot').length;

        let lastMessagePreview = "No messages yet.";
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            lastMessagePreview = `${lastMessage.sender}: "${lastMessage.text.substring(0, 50)}..."`;
        }

        return `Total messages: ${messageCount}\n\nUser messages: ${userMessages}\n\nBot messages: ${botMessages}\n\nLast message: ${lastMessagePreview}`;
    }
}

module.exports = OperationButtonAgent;