// ai_helper/agent/TestTaskButtonsAgent.js
const { Response, AvailableTask, Task } = require('ai-agent-response');

class TestTaskButtonsAgent {
    constructor(metadata, settings) {
        this.metadata = metadata;
        this.settings = settings;
    }

    async generateReply(thread) {
        const lastMessage = thread.messages[thread.messages.length - 1];
        let response = new Response('');

        if (lastMessage.sender === 'user') {
            if (lastMessage.text.toLowerCase() === 'show tasks') {
                response = new Response("Here are some test tasks for you:");
                response.addAvailableTask(new AvailableTask("Task 1", new Task({
                    name: "Task 1",
                    type: Task.TYPE_ACTION,
                    message: "Executing Task 1"
                })));
                response.addAvailableTask(new AvailableTask("Task 2", new Task({
                    name: "Task 2",
                    type: Task.TYPE_ACTION,
                    message: "Executing Task 2"
                })));
                response.addAvailableTask(new AvailableTask("Task 3", new Task({
                    name: "Task 3",
                    type: Task.TYPE_ACTION,
                    message: "Executing Task 3"
                })));
            } else if (lastMessage.text.startsWith('动作执行:')) {
                const taskExecuted = lastMessage.text.split(':')[1].trim();
                response = new Response(`You executed ${taskExecuted}. Task completed.`);
            } else {
                response = new Response("To see test tasks, please say 'show tasks'.");
            }
        } else {
            response = new Response("I'm ready to show you some tasks. Just say 'show tasks'.");
        }

        return response;
    }

    async executeTask(task, thread) {
        const response = new Response(`Task ${task.name} has been executed successfully.`);
        return response;
    }
}

module.exports = TestTaskButtonsAgent;