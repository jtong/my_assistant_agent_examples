// ai_helper/agent/TestJobAgent.js

const { Response, Task, AvailableTask } = require('ai-agent-response');

class TestJobAgent {
    constructor(metadata, settings) {
        this.metadata = metadata;
        this.settings = settings;
    }

    async executeTask(task, thread) {
        // 模拟任务执行
        switch (task.name) {
            case "Initialize Job":
                return this.initializeJob(thread);
            case "Process Step":
                return this.processStep(task, thread);
            default:
                return new Response(`Unknown task: ${task.name}`);
        }
    }

    async initializeJob(thread) {
        const response = new Response("Job initialized successfully.");
        const tasks = [
            { name: "Step 1", description: "This is the first step" },
            { name: "Step 2", description: "This is the second step" },
            { name: "Step 3", description: "This is the third step" },
            { name: "Finalize", description: "This is the final step" }
        ];

        // 为每个任务创建 AvailableTask，包含状态
        const availableTasks = tasks.map(taskInfo => {
            const task = new Task({
                name: taskInfo.name,
                type: Task.TYPE_ACTION,
                message: taskInfo.description
            });
            const availableTask = new AvailableTask(taskInfo.name, task);
            availableTask.status = 'pending'; // 设置初始状态
            return availableTask;
        });

        // 将 AvailableTasks 添加到响应中
        response.availableTasks = availableTasks;
        return response;
    }

    async processStep(task, thread) {
        const response = new Response(`Executed ${task.name} successfully.`);
        // Agent 不维护状态，由插件在调用时更新 AvailableTask 的状态
        return response;
    }
}

module.exports = TestJobAgent;