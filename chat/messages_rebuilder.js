const cloneMessages = function (messages) {
    return JSON.parse(JSON.stringify(messages));
}

const filterMessagesContent = function(messages, skipCount = 0) {
    const copiedMessages = cloneMessages(messages);
    
    let lastBotIndex = -1;
    let lastStatusIndex = -1;
    
    // Find the last bot message and last message with status
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].sender === 'bot') {
            if (lastBotIndex === -1) {
                lastBotIndex = i;
            }
            if (lastStatusIndex === -1 && messages[i].text.includes('</status>')) {
                lastStatusIndex = i;
            }
            if (lastBotIndex !== -1 && lastStatusIndex !== -1) {
                break;
            }
        }
    }
    
    return copiedMessages.map((msg, index) => {
        if (msg.sender === 'bot' && msg.meta?.type !== "init" && index >= skipCount) {
            if (index !== lastBotIndex) {
                // For non-last bot messages, remove everything before "||content>"
                const parts = msg.text.split('||content>');
                msg.text = parts.length > 1 ? parts[1] : msg.text;
            }
            
            // Remove status section for all messages except the last one with status
            if (index !== lastStatusIndex) {
                const statusParts = msg.text.split('<status>');
                msg.text = statusParts[0];
            }
        }
        return msg;
    });
}


const appendToLastBot = function(messages, appendStr) {
    const copiedMessages = cloneMessages(messages);
    let lastBotIndex = -1;
    
    // Find the last bot message
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].sender === 'bot' && 
            (messages[i].text.includes('<status>') || messages[i].text.includes('</status>'))) {
            lastBotIndex = i;
            break;
        }
    }

    if (lastBotIndex !== -1 ) {
        const targetMessage = copiedMessages[lastBotIndex];
        if(targetMessage.meta?.type !== "init"){
            targetMessage.text += appendStr;
        }
    }

    return copiedMessages;
}

function convertMessagesToHistory(messages, startIndex = 0) {
    return messages.slice(startIndex).map(message => ({
        role: message.sender === 'user' ? 'user' : 'assistant',
        content: message.text
    }));
}

module.exports = {
    cloneMessages,
    filterMessagesContent,
    convertMessagesToHistory,
    appendToLastBot
};