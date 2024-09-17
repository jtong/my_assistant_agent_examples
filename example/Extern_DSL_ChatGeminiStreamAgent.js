const { Response, Task } = require('ai-agent-response');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { setGlobalDispatcher, ProxyAgent } = require("undici");
const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');
const { handleKnowledgeSpaceOperation } = require('@jtong/knowledge_query');
const logger = require('../logger');
// Set up the proxy if needed
const dispatcher = new ProxyAgent({ uri: new URL("http://10.37.129.2:7890").toString() });
setGlobalDispatcher(dispatcher);

class ChatGeminiStreamAgent {
    constructor(metadata, settings) {
        this.metadata = metadata;
        this.settings = settings;
        this.llmConfig = {
            apiKey: this.settings[this.metadata.llm.apiKey],
            model: this.metadata.llm.model
        }
        this.genAI = new GoogleGenerativeAI(this.llmConfig.apiKey);
        this.promptTemplate = this.loadPromptTemplate();
        this.knowledgeSpace = this.loadKnowledgeSpace();
        this.knowledge_space_Config = {
            repoFilePath: path.resolve(__dirname, this.metadata.agent.repoFilePath)
        };
        this.dsl = this.metadata.dsl;
        this.initModel();
    }

    loadPromptTemplate() {
        const templatePath = path.resolve(__dirname, this.metadata.agent.templatePath);
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template file not found: ${templatePath}`);
        }
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        return Handlebars.compile(templateContent);
    }

    loadKnowledgeSpace() {
        const knowledgeSpacePath = path.resolve(__dirname, this.metadata.agent.repoFilePath);
        if (!fs.existsSync(knowledgeSpacePath)) {
            throw new Error(`Knowledge space file not found: ${knowledgeSpacePath}`);
        }
        return JSON.parse(fs.readFileSync(knowledgeSpacePath, 'utf8'));
    }

    initModel() {
        const context = this.getContext();
        logger.log(context);
        const initialPrompt = this.promptTemplate(context);
        logger.log(initialPrompt);
        this.model = this.genAI.getGenerativeModel({
            model: this.llmConfig.model,
            systemInstruction: initialPrompt,
        });
        this.systemInstruction = initialPrompt;
    }

    async generateReply(thread, host_utils) {
        const lastMessage = thread.messages[thread.messages.length - 1];
        return this.executeTask(new Task({
            name: 'Process Message',
            type: Task.TYPE_MESSAGE,
            message: lastMessage,
            meta: {
                threadId: thread.id,
                timestamp: Date.now()
            },
            host_utils: host_utils
        }), thread);
    }

    async executeTask(task, thread) {
        const history = this.convertThreadToHistory(thread);
        history.pop();
        const chat = this.model.startChat({
            history: history
        });

        const lastMessage = thread.messages[thread.messages.length - 1];
        const result = await chat.sendMessageStream(lastMessage.text);

        const response = new Response('');
        response.setStream(this.createStream(result.stream));

        return response;
    }

    convertThreadToHistory(thread) {
        return thread.messages.map(message => ({
            role: message.sender === 'user' ? 'user' : 'model',
            parts: [{ text: message.text }]
        }));
    }

    getContext() {
        const result = handleKnowledgeSpaceOperation(this.dsl, this.knowledgeSpace, this.knowledge_space_Config);
        return result;
    }

    async *createStream(stream) {
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            yield chunkText;
        }
    }
}

module.exports = ChatGeminiStreamAgent;