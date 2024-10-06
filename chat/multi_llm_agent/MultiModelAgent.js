const { Response } = require('ai-agent-response');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 如果需要代理使用下面的代码，使用之前要安装相关依赖： `npm install -s undici` 
const { setGlobalDispatcher, ProxyAgent } = require("undici");
const dispatcher = new ProxyAgent({ uri: new URL("http://127.0.0.1:7890").toString() });
setGlobalDispatcher(dispatcher);

class MultiModelAgent {
    constructor(metadata, settings) {
        this.metadata = metadata;
        this.settings = settings;
        
        // 直接使用 settings.currentModel
        // const currentModel = JSON.parse(this.settings.currentModel);
        const currentModel = this.settings.currentModel;
        this.currentApiKey = currentModel.apiKey;
        this.currentModelName = currentModel.model;

        // 初始化各个模型客户端
        this.openai = new OpenAI({ apiKey: this.settings.openai });
        this.gemini = new GoogleGenerativeAI(this.settings.gemini);
        this.localLLM = new OpenAI({
            apiKey: 'not-needed',
            baseURL: "http://localhost:1234/v1",
        });
    }

    async generateReply(thread) {
        let response;

        switch (this.currentApiKey) {
            case 'openai':
                response = await this.generateOpenAIReply(thread);
                break;
            case 'gemini':
                response = await this.generateGeminiReply(thread);
                break;
            case 'localLLM':
                response = await this.generateLocalLLMReply(thread);
                break;
            default:
                throw new Error('Invalid API key selected');
        }

        return new Response(response);
    }

    convertThreadToOpenAIHistory(thread) {
        return thread.messages.map(message => ({
            role: message.sender === 'user' ? 'user' : 'assistant',
            content: message.text
        }));
    }

    convertThreadToGeminiHistory(thread) {
        return thread.messages.slice(0, -1).map(message => ({
            role: message.sender === 'user' ? 'user' : 'model',
            parts: [{ text: message.text }]
        }));
    }

    async generateOpenAIReply(thread) {
        const history = this.convertThreadToOpenAIHistory(thread);
        const completion = await this.openai.chat.completions.create({
            model: this.currentModelName,
            messages: history,
        });
        return completion.choices[0].message.content;
    }

    async generateGeminiReply(thread) {
        const history = this.convertThreadToGeminiHistory(thread);
        const model = this.gemini.getGenerativeModel({ model: this.currentModelName });
        const chat = model.startChat({ history: history });
        const lastMessage = thread.messages[thread.messages.length - 1].text;
        const result = await chat.sendMessage(lastMessage);
        return result.response.text();
    }

    async generateLocalLLMReply(thread) {
        const history = this.convertThreadToOpenAIHistory(thread);
        const completion = await this.localLLM.chat.completions.create({
            model: this.currentModelName,
            messages: history,
        });
        return completion.choices[0].message.content;
    }
}

module.exports = MultiModelAgent;