# My Assistant Agent Examples

这个项目包含了一系列助手代理（Agent）的示例实现，用于演示不同类型的 AI 交互和任务处理。

## 初始化步骤

在某文件夹下打开vscode，在terminal执行初始化命令：

```
git clone https://github.com/jtong/my_assistant_agent_examples.git ai_helper/agent
cd ai_helper/agent
npm install
```

重启vscode 或 重新打开当前文件夹 或 点击 Chat List 上的刷新按钮，即可开始使用。

## 示例代理（Agents）

### 1. TestAgent (TestAgent.js)
一个基本的测试代理，简单地回复用户的最后一条消息。

### 2. FakeStreamAgent (FakeStreamAgent.js)
模拟流式响应的代理，可以设置延迟时间来模拟实时生成效果。

### 3. TestTaskButtonsAgent (TestTaskButtonsAgent.js)
展示任务按钮功能的代理，可以生成可选择的任务列表供用户交互。

### 4. TestGeminiSyncAgent (TestGeminiSyncAgent.js)
使用 Google 的 Gemini AI 模型的同步代理，用于生成非流式响应。

### 5. TestGeminiStreamAgent (TestGeminiStreamAgent.js)
使用 Google 的 Gemini AI 模型的流式代理，用于生成实时流式响应。

### 6. TestOpenAIAgent (TestOpneAIAgent.js)
使用 OpenAI 的 GPT 模型的流式代理，用于生成实时流式响应。

### 7. TestOpenAISyncAgent (TestOpneAISyncAgent.js)
使用 OpenAI 的 GPT 模型的同步代理，用于生成非流式响应。

### 8. TestJobAgent (TestJobAgent.js)
展示任务执行流程的代理，可以模拟多步骤任务的处理过程。

## 使用说明

每个代理都可以在 `agents.json` 文件中配置，包括名称、路径和元数据。要使用特定的代理，请确保在 `agents.json` 中正确配置，并在使用时提供必要的API密钥和其他设置。

## 注意事项

- 使用 Gemini 和 OpenAI 的代理需要相应的 API 密钥。请确保在环境变量中设置了正确的 API 密钥。
- 某些代理可能需要网络代理才能正常工作，特别是在某些地区访问这些 AI 服务时。
- 测试代理时，可能需要调整超时时间，因为 AI 模型的响应可能需要几秒钟。

## 贡献

欢迎对这个项目进行贡献！如果你有新的代理实现或改进建议，请提交 Pull Request 或开启 Issue。

## 许可证

此项目遵循 ISC 许可证。详情请查看 LICENSE 文件。
