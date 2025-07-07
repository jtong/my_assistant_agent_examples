// AIAdapter.js
const OpenAI = require('openai');

class AIAdapter {
    constructor() {
        this.profile = null;
        this.openaiClient = null;
    }
    
    static getInstance() {
        if (!AIAdapter.instance) {
            AIAdapter.instance = new AIAdapter();
        }
        return AIAdapter.instance;
    }
    
    // 从 metadata 和 settings 初始化适配器
    initialize(metadata, settings) {
        const default_llm_profile = metadata.default_llm_profile;
        let apiKey = metadata.llm_profile[default_llm_profile].apiKey;
        let baseURL = metadata.llm_profile[default_llm_profile].baseURL;
        let model = metadata.default_llm_model;

        if (settings && settings.llm_profile) {
            const llm_profile = settings.llm_profile;
            apiKey = metadata.llm_profile[llm_profile].apiKey;
            baseURL = metadata.llm_profile[llm_profile].baseURL;
        }

        if (settings && settings.model) {
            model = settings.model;
        }

        this.profile = {
            apiKey,
            baseURL,
            model
        };
        
        // 创建 OpenAI 客户端
        this.openaiClient = new OpenAI({
            apiKey,
            baseURL
        });
        
        return this;
    }
    
    // 更新 profile 配置
    setProfile(profile) {
        this.profile = {...this.profile, ...profile};
        
        // 如果 API 密钥或基础 URL 发生变化，重新创建客户端
        if (profile.apiKey || profile.baseURL) {
            this.openaiClient = new OpenAI({
                apiKey: this.profile.apiKey,
                baseURL: this.profile.baseURL
            });
        }
        
        return this;
    }
    
    // 核心方法：接受消息数组
    async chat(messages, options = {}) {
        if (!this.profile || !this.openaiClient) {
            throw new Error('AIAdapter not initialized');
        }
        
        // 转换为 OpenAI 格式
        const formattedMessages = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
        }));
        
        // 添加系统消息（如果有）
        if (options.systemMessage) {
            formattedMessages.unshift({
                role: 'system',
                content: options.systemMessage
            });
        }
        
        // 调用 OpenAI API
        return await this.openaiClient.chat.completions.create({
            model: options.model || this.profile.model,
            messages: formattedMessages,
            ...options
        });
    }
}

// 导出单例
module.exports = AIAdapter.getInstance();
