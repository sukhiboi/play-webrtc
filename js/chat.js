// chat.js - Chat message handling

export class ChatManager {
    constructor(messagesContainerId) {
        this.messagesContainer = document.getElementById(messagesContainerId);
        this.messages = [];
        this.localUsername = '';
    }

    // Set local username
    setLocalUsername(username) {
        this.localUsername = username;
    }

    // Add a sent message (from local user)
    addSentMessage(message) {
        const messageData = {
            type: 'sent',
            username: this.localUsername,
            content: message,
            timestamp: Date.now()
        };
        this.messages.push(messageData);
        this.renderMessage(messageData);
        this.scrollToBottom();
    }

    // Add a received message (from remote user)
    addReceivedMessage(messageData) {
        const fullMessageData = {
            type: 'received',
            username: messageData.username,
            content: messageData.message,
            timestamp: messageData.timestamp
        };
        this.messages.push(fullMessageData);
        this.renderMessage(fullMessageData);
        this.scrollToBottom();
    }

    // Render a single message
    renderMessage(messageData) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${messageData.type}`;

        const senderDiv = document.createElement('div');
        senderDiv.className = 'message-sender';
        senderDiv.textContent = messageData.username;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = messageData.content;

        messageDiv.appendChild(senderDiv);
        messageDiv.appendChild(contentDiv);

        this.messagesContainer.appendChild(messageDiv);
    }

    // Scroll to bottom of messages
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    // Clear all messages
    clearMessages() {
        this.messages = [];
        this.messagesContainer.innerHTML = '';
    }

    // Get all messages
    getMessages() {
        return this.messages;
    }

    // Format timestamp
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}
