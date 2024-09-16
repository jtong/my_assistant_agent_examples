const { expect } = require('chai');
const TestAgent = require('../example/testAgent');

describe('TestAgent', function() {
    let agent;

    beforeEach(function() {
        agent = new TestAgent({});
    });

    it('should generate a reply based on the last message in the thread', function() {
        const thread = {
            id: "thread_1",
            name: "thread 1",
            agent: "testAgent",
            messages: [
                {
                    id: "msg_1",
                    sender: "user",
                    text: "你好",
                    isHtml: false,
                    timestamp: 1615000000000,
                    formSubmitted: false,
                    threadId: "thread_1"
                }
            ]
        };
        
        const response = agent.generateReply(thread);
        
        expect(response.getFullMessage()).to.equal('回复: 你好');
    });

    it('should handle multiple messages in the thread', function() {
        const thread = {
            id: "thread_1",
            name: "thread 1",
            agent: "testAgent",
            messages: [
                {
                    id: "msg_1",
                    sender: "user",
                    text: "第一条消息",
                    isHtml: false,
                    timestamp: 1615000000000,
                    formSubmitted: false,
                    threadId: "thread_1"
                },
                {
                    id: "msg_2",
                    sender: "bot",
                    text: "回复: 第一条消息",
                    isHtml: false,
                    timestamp: 1615000020000,
                    threadId: "thread_1"
                },
                {
                    id: "msg_3",
                    sender: "user",
                    text: "第三条消息",
                    isHtml: false,
                    timestamp: 1615000040000,
                    formSubmitted: false,
                    threadId: "thread_1"
                }
            ]
        };
        
        const response = agent.generateReply(thread);
        
        expect(response.getFullMessage()).to.equal('回复: 第三条消息');
    });
});