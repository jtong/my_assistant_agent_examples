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

    generateReply(thread, host_utils) {
        const lastMessage = thread.messages[thread.messages.length - 1];
        const replyText = `回复: ${lastMessage.text}`;
        return new Response(replyText);
    }

    async executeTask(task, thread) {
        let response;
        if (task.name === "AddMarker") {
            const {threadRepository, postMessage} = task.host_utils;
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
}

module.exports = OperationButtonAgent;