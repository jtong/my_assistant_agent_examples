const { Response, Task } = require('ai-agent-response');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');
const { handleKnowledgeSpaceOperation, updateCondition } = require('@jtong/knowledge_query');
const logger = require('../logger.js');
// Set up the proxy if needed
// const { setGlobalDispatcher, ProxyAgent } = require("undici");
// const dispatcher = new ProxyAgent({ uri: new URL("http://10.37.129.2:7890").toString() });
// setGlobalDispatcher(dispatcher);

const messages_rebuilder = require('../messages_rebuilder.js');
const my_assitant_agnet_util = require("../my_assistant_agent_util");
const my_assistant_agent_util = require('../my_assistant_agent_util');


class EntryAgent {
    constructor(metadata, settings) {
        this.metadata = metadata;
        this.settings = settings;
        const default_llm_profile = this.metadata.default_llm_profile;
        let apiKey = this.metadata.llm_profile[default_llm_profile].apiKey;
        let baseURL = this.metadata.llm_profile[default_llm_profile].baseURL;
        let model = this.metadata.default_llm_model;
        if (this.settings.llm_profile) {
            const llm_profile = this.settings.llm_profile;
            apiKey = this.metadata.llm_profile[llm_profile].apiKey;
            baseURL = this.metadata.llm_profile[llm_profile].baseURL;
        }

        if (this.settings.model) {
            model = this.settings.model;
        }

        this.openai = new OpenAI({
            apiKey,
            baseURL
        });
        this.model = model;

        // this.genAI = new GoogleGenerativeAI(this.llmConfig.apiKey);
        this.promptTemplate = this.loadPromptTemplate();
        this.knowledgeSpace = this.loadKnowledgeSpace();
        this.knowledge_space_Config = {
            repoFilePath: path.resolve(__dirname, this.metadata.agent.repoFilePath)
        };

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

    static async create(metadata, settings) {
        const agent = new this(metadata, settings);

        // 执行异步初始化操作
        await agent.initialize();
        return agent;
    }

    async initialize() {
        // 初始化阶段处理器
        await this._initializeMessageHandlers();
    }

    async _initializeMessageHandlers() {
        const apply_if_not_init = async (messages, text) => {
            // 如果消息列表为空，直接返回
            if (!messages || messages.length === 0) {
                return messages;
            }

            let offset = 0;
            if (messages[messages.length - 1 - offset].text.indexOf("继续") === 0) {
                offset += 2;
            }

            let lastMessage = messages[messages.length - 1 - offset];


            // 如果最后一条消息没有meta.type='init'标记，则在其后追加文本
            if (!lastMessage.meta?.type || lastMessage.meta.type !== 'init') {
                return messages_rebuilder.appendToLastBot(messages, text, offset);
            }

            return messages;
        }

        const direct = async (messages) => {
            return messages;
        }


        const handleParseData = async (thread, task, agentSelf) => {
            const { host_utils } = task;
            const prompt_template = my_assitant_agent_util.loadPromptTemplate(__dirname, "prompt/topic_select.md");

            // 将消息历史转换为LLM对话格式
            const history = my_assitant_agent_util.openai.convertMessagesToHistory(thread.messages);
            history.unshift({
                role: 'system',
                content: this.systemInstruction
            });

            const lastMessageText = history.pop().content;
            // 基于task构建提示
            const userMessage = prompt_template({
                userInput: lastMessageText
            });

            logger.log(userMessage);

            history.push({
                role: "user",
                content: userMessage
            });

            // 调用LLM获取响应
            const llmResponseText = await my_assitant_agent_util.openai.getCompletion(this.openai, {
                model: this.model,
                messages: history,
                stream: true
            });

            try {
                // 提取并解析XML数据部分
                const data = await my_assitant_agent_util.parse_yaml_string(
                    await my_assitant_agent_util.parse_xml_data(llmResponseText)
                );

                // 构造响应
                const response = new Response(llmResponseText + "\n\n```json\n" + JSON.stringify(data, null, 2) + "\n```");
                response.meta = data;
                return response;

            } catch (error) {
                console.error('Error parsing LLM response:', error);
                return new Response('Error: Failed to parse the response data structure.');
            }
        }


        const memory_summary = async (messages, settings, host_utils, thread) => {
            // 从thread settings获取上次总结的消息索引
            const threadSettings = settings || {};
            const lastSummaryIndex = threadSettings.lastSummaryIndex || 4;

            // 找出所有未总结的bot消息的索引
            const botMessageIndices = messages
                .map((msg, index) => msg.sender === 'bot' ? index : -1)
                .filter(index => index !== -1)
                .filter(index => index > lastSummaryIndex);

            // 获取前两轮的结束位置（整个消息列表中的前两轮，留前两轮增加各种设置）
            const firstTwoRoundsEndIndex = messages
                .map((msg, index) => msg.sender === 'bot' ? index : -1)
                .filter(index => index !== -1)
                .slice(0, 2)
                .pop();


            // 获取前两轮消息
            const firstTwoRounds = messages.slice(0, firstTwoRoundsEndIndex + 1);

            let appliedMessages = messages;

            appliedMessages = [...firstTwoRounds, ...messages.slice(lastSummaryIndex)];

            // 如果未总结的bot消息少于8轮，直接返回全部消息
            if (botMessageIndices.length >= 6 && this.settings.summary_turn_on) {
                // 在未总结消息中，获取要总结的中间4轮的起始和结束位置
                const middleMessagesStartIndex = lastSummaryIndex;
                const middleMessagesEndIndex = botMessageIndices[botMessageIndices.length - 2] - 1; // 倒数第2轮的user开始，含还没生成bot message的user message，所以应该是2.5轮

                const lastTwoRounds = messages.slice(middleMessagesEndIndex);

                // 获取中间需要总结的消息
                const middleMessages = messages.slice(middleMessagesStartIndex, middleMessagesEndIndex);

                // 将中间消息转换为历史对话格式
                const historyForSummary = middleMessages.map(msg =>
                    `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
                ).join('\n\n');

                // 加载并使用总结模板
                const memory_generate_template = my_assitant_agnet_util.loadPromptTemplate(__dirname, "prompt/shorten.md");
                const promptText = memory_generate_template({
                    history: historyForSummary
                });

                // 构建历史消息列表供LLM使用
                const history = messages_rebuilder.convertMessagesToHistory(middleMessages, 0, host_utils, thread.id);
                history.unshift({
                    role: 'system',
                    content: this.systemInstruction
                });
                history.push({
                    role: 'user',
                    content: promptText
                });

                // 获取LLM对话记忆总结
                let attemptCount = 1;
                const MEMORY_TAG = "shorten";
                const MAX_RETRY_ATTEMPTS = 3;

                let summary = await my_assitant_agnet_util.openai.getCompletion(this.openai, {
                    model: this.model,
                    messages: history,
                    stream: true
                });

                while (!my_assitant_agnet_util.isTagClosed(summary, MEMORY_TAG)
                    && attemptCount < MAX_RETRY_ATTEMPTS) {
                    attemptCount++;
                    summary = await my_assitant_agnet_util.openai.getCompletion(this.openai, {
                        model: this.model,
                        messages: history,
                        stream: true
                    });
                }

                if (!my_assitant_agnet_util.isTagClosed(summary, MEMORY_TAG)) {
                    throw new Error("shorten memory failed");
                }
                //todo 需要截取shorten，如果没有shorten，那么重试最多三次，每次都打印。三次后报错。
                // 将总结添加到第二轮对话bot回复的末尾
                const lastBotMessage = firstTwoRounds[firstTwoRounds.length - 1];
                if (lastBotMessage && lastBotMessage.sender === 'bot') {
                    lastBotMessage.text += `\n\n前序对话记忆: ${my_assitant_agnet_util.getContentIncludeTag(summary, MEMORY_TAG)}`;
                }
                host_utils.threadRepository.updateMessage(thread, lastBotMessage.id, {
                    text: lastBotMessage.text
                });

                // 注释掉settings更新来debug
                // 更新thread settings中的总结索引
                const newSettings = {
                    ...threadSettings,
                    lastSummaryIndex: middleMessagesEndIndex,
                    prev_lastSummaryIndex: lastSummaryIndex
                };
                host_utils.threadRepository.updateThreadSettings(thread, newSettings);

                my_assistant_agent_util.setMessageBackgroundColor(thread, newSettings.lastSummaryIndex, "#FFEBEE", host_utils.threadRepository);  // 错误消息(浅红色)

                // 合并消息并返回
                appliedMessages = [...firstTwoRounds, ...lastTwoRounds];
            }
            const filterContentMessage = messages_rebuilder.filterMessagesContent(appliedMessages);
            const apply_prompt_file = `prompt/apply/${this.settings.apply_to_last_message}.md`;

            const intention_detect_tempalte = my_assitant_agnet_util.loadPromptTemplate(__dirname, apply_prompt_file);
            const userMessage = intention_detect_tempalte();
            const appended_messages = apply_if_not_init(filterContentMessage, userMessage);

            return appended_messages;
        }

        this.messageHandlers = {
            direct,
            memory_summary,

        }
    }

    async loadOperations(agent) {
        const result = [
            {
                "name": "选择追加",
                "type": "setting",
                "control": "select",
                "settingKey": "apply_to_last_message",
                "options": [
                    "none"
                ],
                "default": "none"
            },
            {
                "name": "系统提示",
                "type": "setting",
                "control": "select",
                "settingKey": "system_prompt",
                "options": [],
                "default": "default"
            },
            {
                "name": "问答对",
                "type": "task",
                "control": "button",
                "task": {
                    "name": "chatPair",
                    "type": "action",
                    "message": "提问",
                    "meta": {
                        "bot": "回答"
                    },
                    "skipUserMessage": false,
                    "skipBotMessage": false
                }
            },
            {
                "name": "续写",
                "type": "task",
                "control": "button",
                "task": {
                    "name": "message",
                    "type": "message",
                    "message": "继续，从最后一个字开始追加，不输出前面已生成的。",
                    "meta": {
                    },
                    "skipUserMessage": false,
                    "skipBotMessage": false
                }
            },
            {
                "type": "setting",
                "control": "select",
                "name": "handlers",
                "settingKey": "messageHandler",
                "options": [
                    {
                        "label": "direct",
                        "value": "direct"
                    },
                    {
                        "label": "memory_summary",
                        "value": "memory_summary"
                    }
                ],
                "default": "direct"
            },
            {
                "name": "启动总结",
                "type": "setting",
                "control": "select",
                "settingKey": "summary_turn_on",
                "options": [
                    {
                        "label": "是",
                        "value": true
                    },
                    {
                        "label": "否",
                        "value": false
                    },
                ],
                "default": true
            },
            {
                "name": "AI profile",
                "type": "setting",
                "control": "select",
                "settingKey": "llm_profile",
                "options": [
                    "profile1",
                    "profile2",
                    "profile_anyhow"

                ],
                "default": "profile1"
            },
            {
                "name": "model",
                "type": "setting",
                "control": "select",
                "settingKey": "model",
                "options": [
                    "claude-opus-4-20250514",
                    "claude-sonnet-4-20250514",
                    "claude-3-7-sonnet-20250219",
                    "gemini-2.5-flash-preview-04-17",
                    "gemini-2.5-pro-preview-06-05",
                    "gemini-2.5-pro-preview-05-06",
                    "gemini-2.5-pro-exp-03-25",
                    "grok-3",
                    "chatgpt-4o-latest",
                    "gpt-4o",
                    "deepseek-r1",
                    "deepseek-reasoner",
                    "gemini-2.0-pro-exp-02-05",
                    "gemini-2.0-flash-thinking-exp",
                    "gemini-exp-1206",
                    "gemini-2.0-flash-exp",
                    "gemini-exp-1114",
                    "gpt-4o-mini",
                    "gemini-1.5-flash",
                    "claude-3-5-haiku-20241022",
                    "gemini-1.5-pro",
                    "gpt-4-32k-0613"

                ],
                "default": "gemini-2.5-pro-exp-03-25"
            },
            {
                "name": "保存历史记录",
                "type": "setting",
                "control": "select",
                "settingKey": "saveHistory",
                "options": [
                    {
                        "label": "是",
                        "value": true
                    },
                    {
                        "label": "否",
                        "value": false
                    },
                ],
                "default": false
            },
        ];


        const apply_options = await my_assistant_agent_util.getMdFileNames(path.resolve(__dirname, "prompt/apply/"));
        result[0].options = apply_options;

        // **读取系统提示文件**
        const system_prompt_options = await my_assistant_agent_util.getMdFileNames(path.resolve(__dirname, "prompt/system_prompt/"));
        result[1].options = system_prompt_options;

        return result;
    }


    async executeTask(task, thread) {
        if (task.name === 'chatPair') {
            return new Response(task.meta.bot);
        } else {
            const threadRepository = task.host_utils.threadRepository;
            const knowledgeSpace = threadRepository.getKnowledgeSpace(thread.id);


            const context = {};
            // logger.log(JSON.stringify(context, null, 2));
            let initialPrompt;
            if (this.settings?.system_prompt && this.settings.system_prompt !== 'default') {
                // 使用选中的系统提示文件
                const systemPromptTemplate = my_assistant_agent_util.loadPromptTemplate(
                    __dirname,
                    `prompt/system_prompt/${this.settings.system_prompt}.md`
                );
                initialPrompt = systemPromptTemplate(context);
            } else {
                // 使用默认的模板
                initialPrompt = this.promptTemplate(context);
            }

            logger.log(initialPrompt);
            this.systemInstruction = initialPrompt;

            // const queryResult = handleKnowledgeSpaceOperation(queryDSL, knowledgeSpace);

            const cutMessages = thread.messages.filter(message => !message.isVirtual);
            const newMessages = await this.messageHandlers[this.settings?.messageHandler](cutMessages, thread.settings, task.host_utils, thread);

            const history = messages_rebuilder.convertMessagesToHistory(newMessages, 0, task.host_utils, thread.id);

            history.unshift({
                role: 'system',
                content: this.systemInstruction
            });
            logger.log(JSON.stringify(history, null, 2));

            const stream = await this.openai.chat.completions.create({
                model: this.model,
                temperature: 1.4,
                messages: history,
                stream: true,
            });

            const lastMessage = thread.messages[thread.messages.length - 1];
            logger.log(lastMessage.text);

            const response = new Response(' ');
            response.setStream(this.createStream(stream, thread, task.host_utils));


            return response;
        }

    }


    
    async *createStream(stream, thread, host_utils) {
        let fullResponse = '';

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullResponse += content;
                yield content;
            }
        }

        logger.log(fullResponse);


        // 检查设置中的 saveHistory 值
        const shouldSave = this.settings?.saveHistory !== false;

        // 只有当 saveHistory 为 true 时才保存历史记录
        if (shouldSave) {
            await this.saveMessageHistory(thread, host_utils);
        }
    }

    async saveMessageHistory(thread, host_utils) {
        const config = host_utils.getConfig();
        const studioDir = path.join(config.chatWorkingSpaceRoot, 'studio', thread.name + "" + thread.id);

        // 确保目录存在
        if (!fs.existsSync(studioDir)) {
            fs.mkdirSync(studioDir, { recursive: true });
        }

        // 生成文件名（使用时间戳）
        const filename = `history_${Date.now()}.json`;
        const filePath = path.join(studioDir, filename);

        // 保存到文件
        fs.writeFileSync(filePath, JSON.stringify(thread, null, 2));
    }

}

module.exports = EntryAgent;