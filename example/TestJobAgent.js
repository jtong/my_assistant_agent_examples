// ai_helper/agent/TestJobAgent.js
const { Response, Task } = require('ai-agent-response');

class TestJobAgent {
    constructor(metadata, settings) {
        this.metadata = metadata;
        this.settings = settings;
    }

    async executeTask(task, thread) {
        // 模拟任务执行
        switch (task.name) {
            case "Initialize Job":
                return this.initializeJob();
            case "Process Step 1":
                return this.processStep1();
            case "Process Step 2":
                return this.processStep2();
            case "Finalize Job":
                return this.finalizeJob();
            default:
                return new Response(`Unknown task: ${task.name}`);
        }
    }

    async initializeJob() {
        const response = new Response("Job initialized successfully.");
        const jobs = [
            { name: "Process Step 1", description: "This is the first step" },
            { name: "Process Step 2", description: "This is the second step" },
            { name: "Process Step 3", description: "This is the third step" },
            { name: "Finalize Job", description: "This is the final step" }
        ];
        response.meta = { generatedJobs: jobs };
        return response;
    }

    async processStep1() {
        const response = new Response("Step 1 processed successfully.");
        response.addTask(new Task({
            name: "Process Step 2",
            type: Task.TYPE_ACTION,
            message: "Ready to process step 2"
        }));
        return response;
    }

    async processStep2() {
        const response = new Response("Step 2 processed successfully.");
        response.addTask(new Task({
            name: "Finalize Job",
            type: Task.TYPE_ACTION,
            message: "Ready to finalize the job"
        }));
        return response;
    }

    async finalizeJob() {
        return new Response("Job completed successfully.");
    }
}

module.exports = TestJobAgent;