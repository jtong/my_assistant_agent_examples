// AgentUtility.js
const fs = require('fs');
const fs_promose = require('fs').promises
const path = require('path');
const Handlebars = require('handlebars');
const { handleKnowledgeSpaceOperation } = require('@jtong/knowledge_query');
const yaml = require('js-yaml');
var { parseStringPromise } = require('xml2js');
const { setGlobalDispatcher, ProxyAgent } = require("undici");



module.exports = {
    setupProxy(proxyUrl = "http://127.0.0.1:7890") {
        const dispatcher = new ProxyAgent({ uri: new URL(proxyUrl).toString() });
        setGlobalDispatcher(dispatcher);
    },

    loadPromptTemplate(current_agent__dirname, templatePath) {
        const resolvedPath = path.resolve(current_agent__dirname, templatePath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Template file not found: ${resolvedPath}`);
        }
        const templateContent = fs.readFileSync(resolvedPath, 'utf8');
        return Handlebars.compile(templateContent);
    },


    loadKnowledgeSpace(current_agent__dirname, knowledgeSpacePath) {
        const resolvedPath = path.resolve(current_agent__dirname, knowledgeSpacePath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Knowledge space file not found: ${resolvedPath}`);
        }
        return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    },

    getContext(dsl, knowledgeSpace, knowledgeSpaceConfig) {
        return handleKnowledgeSpaceOperation(dsl, knowledgeSpace, knowledgeSpaceConfig);
    },

    // 使用 async/await 读取指定路径下的所有 md 文件名（不含扩展名）
    async getMdFileNames(dirPath) {
        try {
            // 异步读取目录内容
            const files = await fs_promose.readdir(dirPath);

            // 过滤出 .md 文件并去除扩展名
            const mdFileNames = files
                .filter(file => path.extname(file).toLowerCase() === '.md')
                .map(file => path.basename(file, '.md'));

            return mdFileNames;
        } catch (err) {
            console.error('读取目录出错:', err);
            throw err;
        }
    },

    initializeAgent(agent, options) {
        agent.metadata = options.metadata;
        agent.settings = options.settings;
        agent.llmConfig = {
            apiKey: agent.settings[agent.metadata.llm.apiKey],
            model: agent.metadata.llm.model
        };
        agent.promptTemplate = AgentUtility.loadPromptTemplate(agent.metadata.agent.templatePath);
        agent.knowledgeSpace = AgentUtility.loadKnowledgeSpace(agent.metadata.agent.repoFilePath);
        agent.knowledgeSpaceConfig = {
            repoFilePath: path.resolve(__dirname, agent.metadata.agent.repoFilePath)
        };
    },

    isTagClosed(text, tag) {
        const openTags = text.match(new RegExp(`<${tag}>`, 'g'));
        const closeTags = text.match(new RegExp(`<\/${tag}>`, 'g'));

        const openCount = openTags ? openTags.length : 0;
        const closeCount = closeTags ? closeTags.length : 0;

        const firstOpen = text.indexOf(`<${tag}>`);
        const firstClose = text.indexOf(`</${tag}>`);

        return openCount === closeCount &&
            openCount > 0 &&
            firstOpen < firstClose;
    },

    isDataTagClosed(text) {
        const openTags = text.match(/<data>/g);
        const closeTags = text.match(/<\/data>/g);

        const openCount = openTags ? openTags.length : 0;
        const closeCount = closeTags ? closeTags.length : 0;

        const firstOpen = text.indexOf('<data>');
        const firstClose = text.indexOf('</data>');

        return openCount === closeCount &&
            openCount > 0 &&
            firstOpen < firstClose;
    },

    getContent_ExcludeTag(str, tagName) {
        const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 'g');
        const matches = [];
        let match;

        while ((match = regex.exec(str)) !== null) {
            matches.push(match[1]);
        }

        return matches;
    },

    getContentIncludeTag(str, tagName) {
        const openTag = `<${tagName}>`;
        const closeTag = `</${tagName}>`;
        const startIndex = str.indexOf(openTag);
        const endIndex = str.indexOf(closeTag) + closeTag.length;

        return str.slice(startIndex, endIndex);
    },

    async parse_xml_data(responseText) {
        const match = responseText.match(/<data>[\s\S]*?<\/data>/);
        const xmlContent = match ? match[0] : '';
        const result = await parseStringPromise(xmlContent);
        return result.data;
    },

    parse_yaml_string(responseText) {
        return yaml.load(responseText);
    },

    async *createStream(stream) {
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            yield chunkText;
        }
    },

    /**
     * 为线程中特定索引的消息添加背景色元数据
     * @param {Object} thread - 线程对象
     * @param {number} messageIndex - 要修改的消息索引
     * @param {string} backgroundColor - CSS颜色值
     * @returns {boolean} 操作是否成功
     */
    setMessageBackgroundColor(thread, messageIndex, backgroundColor, threadRepository) {
        // 验证索引是否有效
        if (messageIndex >= 0 && messageIndex < thread.messages.length) {
            // 获取需要修改的消息
            const message = thread.messages[messageIndex];

            // 初始化meta对象(如果不存在)
            if (!message.meta) {
                message.meta = {};
            }

            // 添加或更新_webview属性
            message.meta._webview = {
                ...(message.meta._webview || {}), // 保留已有的_webview属性
                message_bg_color: backgroundColor
            };

            // 通常你还需要保存更新后的线程
            threadRepository.updateMessage(thread, message.id, { meta: message.meta });

            return true;
        }

        return false; // 索引无效
    },

    openai: {
        /**
         * 调用 OpenAI API 并获取完整响应文本
         * @param {Object} openai OpenAI 客户端实例
         * @param {Object} options 请求配置选项
         * @returns {Promise<string>} 完整的响应文本
         */
        async getCompletion(openai, options) {
            try {
                if (options.stream) {
                    const stream = await openai.chat.completions.create(options);
                    let fullText = '';
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        fullText += content;
                    }
                    return fullText;
                } else {
                    const response = await openai.chat.completions.create(options);
                    return response.choices[0]?.message?.content || '';
                }
            } catch (error) {
                console.error('Error calling OpenAI API:', error);
                throw error;
            }
        },

        convertMessagesToHistory(messages, startIndex = 0) {
            return messages.slice(startIndex).map(message => ({
                role: message.sender === 'user' ? 'user' : 'assistant',
                content: message.text
            }));
        }
    },

    gemini: {

        initModel(agent, llmConfig, systemInstruction) {
            return agent.genAI.getGenerativeModel({
                model: llmConfig.model,
                systemInstruction,
            });
        },

        convertThreadToHistory(thread) {
            return thread.messages.map(message => ({
                role: message.sender === 'user' ? 'user' : 'model',
                parts: [{ text: message.text }]
            }));
        },

        convertThreadToHistory_WithoutLastMessage(thread) {
            return thread.messages.slice(0, -1).map(message => ({
                role: message.sender === 'user' ? 'user' : 'model',
                parts: [{ text: message.text }]
            }));
        },

        getLastMessageFromThread(thread) {
            if (thread.messages.length === 0) {
                return null;
            }
            return thread.messages[thread.messages.length - 1];
        },

        convertMessageToHistoryItem(message) {
            return {
                role: message.sender === 'user' ? 'user' : 'model',
                parts: [{ text: message.text }]
            }
        }
    }
};