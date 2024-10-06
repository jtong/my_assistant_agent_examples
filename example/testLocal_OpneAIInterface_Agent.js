// ai_helper/agent/testAgent.js
const { Response } = require('ai-agent-response');
const OpenAI = require('openai');

class TestLocal_OpneAIInterface_Agent {
    constructor(metadata, settings) {
        this.metadata = metadata;
        this.settings = settings;
        const model = "lmstudio-community/gemma-2-2b-it-GGUF/gemma-2-2b-it-Q4_K_M.gguf";
        let config = {
            apiKey: 'My API Key',
            baseURL: "http://localhost:1234/v1",
            model
        };
        // if (process.env.https_proxy) {
        //     config.httpAgent = new HttpsProxyAgent(process.env.https_proxy);
        // }
        this.openai = new OpenAI(config);
        this.model = model;
    }


    // 新增：创建单个消息实例
    createMessage(sender, text) {
        return { sender, text };
    }

    // 新增：向消息数组添加新消息
    addMessage(messages, sender, text) {
        messages.push(this.createMessage(sender, text));
        return messages;
    }

    // 将任意消息转换为 OpenAI messages 格式
    convertToOpenAIMessages(messages) {
        let openAIMessages = messages.map(message => ({
            role: message.sender === 'user' ? 'user' : 'assistant',
            content: message.text
        }));

        return openAIMessages;
    }

    async generateReply(thread, host_utils) {
        const finalResponse = await this.processMessages(this.convertToOpenAIMessages(thread.messages));
        return finalResponse;
    }

    // 处理多条消息
    async processMessages(messages) {
        try {
            const chatCompletion = await this.openai.chat.completions.create({
                messages: messages, // 直接使用传入的消息数组
                model: this.model,
            });

            // 提取并返回所有响应消息的内容
            let responses = chatCompletion.choices[0]?.message?.content;
            const response = new Response(responses.trim());

            return response;
        } catch (error) {
            console.error('An error occurred:', error);
            throw error;
        }
    }

    // 新增的流式处理方法
    async processMessagesStream(messages) {
        try {
            const stream = await this.openai.chat.completions.create({
                messages: messages,
                model: this.model,
                stream: true,
            });

            const response = new Response('');
            response.setStream(this.createStream(stream));

            return response;
        } catch (error) {
            console.error('An error occurred:', error);
            throw error;
        }
    }

    async *createStream(stream) {
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                yield content;
            }
        }
    }
}

module.exports = TestLocal_OpneAIInterface_Agent;