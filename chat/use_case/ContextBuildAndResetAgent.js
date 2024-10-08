const { Response, Task } = require('ai-agent-response');
const fs = require('fs/promises');
const path = require('path');

class ContextBuildAndResetAgent {
    constructor(metadata) {
        this.metadata = metadata;
        // 获取当前 agent 的文件夹名
        this.agentFolderName = path.basename(__dirname);
    }

    generateReply(thread, host_utils) {
        const { threadRepository } = host_utils;
        const messagesAfterLastMarker = threadRepository.getMessagesAfterLastMarker(thread);
        const summary = this.summarizeMessages(messagesAfterLastMarker);
        return new Response(`Summary of conversation since last marker:\n\n${summary}`);
    }

    async executeTask(task, thread) {
        const { threadRepository, postMessage } = task.host_utils;
        const config = task.host_utils.getConfig();

        if (task.name === "ResetContext") {
            try {
                const markerId = threadRepository.addMarker(thread);
                postMessage({
                    type: 'markerAdded',
                    thread: thread,
                    markerId
                });

                const newContext = this.generateNewContext(config);
                const contextFilePath = await this.saveContextFile(newContext, config);

                // 发送 fileSelected 事件给 webview
                postMessage({
                    type: 'fileSelected',
                    filePath: contextFilePath,
                    fileName: path.basename(contextFilePath)
                });

                return new Response();
            } catch (error) {
                console.error('Error in ResetContext task:', error);
                return new Response();
            }
        }
        return new Response();
    }

    generateNewContext(config) {
        return `新的上下文内容 - 生成时间: ${new Date().toISOString()}\n项目名称: ${config.projectName}`;
    }

    async saveContextFile(content, config) {
        const fileName = `context_${Date.now()}.txt`;
        const agentWorkingPath = path.join(config.chatWorkingSpaceRoot, this.agentFolderName);
        const filePath = path.join(agentWorkingPath, fileName);

        // 确保目录存在
        await fs.mkdir(agentWorkingPath, { recursive: true });

        // 写入文件
        await fs.writeFile(filePath, content);

        return filePath;
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

module.exports = ContextBuildAndResetAgent;