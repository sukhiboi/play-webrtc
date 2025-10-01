// ui.js - UI interaction handling

export class UIManager {
    constructor() {
        this.elements = {};
        this.initElements();
    }

    // Initialize DOM elements
    initElements() {
        this.elements = {
            // Setup section
            username: document.getElementById('username'),
            createOfferBtn: document.getElementById('create-offer-btn'),
            scanOfferBtn: document.getElementById('scan-offer-btn'),
            setupSection: document.getElementById('setup-section'),

            // QR display
            qrContainer: document.getElementById('qr-container'),
            qrTitle: document.getElementById('qr-title'),
            qrcode: document.getElementById('qrcode'),
            toggleJson: document.getElementById('toggle-json'),
            jsonDisplay: document.getElementById('json-display'),

            // Scan answer
            scanAnswerSection: document.getElementById('scan-answer-section'),
            scanAnswerBtn: document.getElementById('scan-answer-btn'),

            // Status
            status: document.getElementById('status'),

            // Chat
            chatContainer: document.getElementById('chat-container'),
            peerName: document.getElementById('peer-name'),
            messages: document.getElementById('messages'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),

            // Scanner
            scannerContainer: document.getElementById('scanner-container'),
            scanner: document.getElementById('scanner'),
            closeScanner: document.getElementById('close-scanner')
        };
    }

    // Get username from input
    getUsername() {
        const username = this.elements.username.value.trim();
        if (!username) {
            this.showStatus('Please enter your username', 'error');
            return null;
        }
        return username;
    }

    // Show QR code with data
    showQR(title, data) {
        this.elements.qrTitle.textContent = title;
        this.elements.qrContainer.classList.add('active');
        this.elements.jsonDisplay.textContent = JSON.stringify(data, null, 2);
        this.elements.jsonDisplay.classList.remove('active');
        this.elements.toggleJson.textContent = 'Show JSON';
    }

    // Hide QR code
    hideQR() {
        this.elements.qrContainer.classList.remove('active');
        this.elements.qrcode.innerHTML = '';
    }

    // Toggle JSON display
    toggleJsonDisplay() {
        const isActive = this.elements.jsonDisplay.classList.toggle('active');
        this.elements.toggleJson.textContent = isActive ? 'Hide JSON' : 'Show JSON';
    }

    // Show scanner
    showScanner() {
        this.elements.scannerContainer.classList.add('active');
    }

    // Hide scanner
    hideScanner() {
        this.elements.scannerContainer.classList.remove('active');
    }

    // Show status message
    showStatus(message, type = 'info') {
        this.elements.status.textContent = message;
        this.elements.status.className = `status ${type}`;
        this.elements.status.classList.remove('hidden');
    }

    // Hide status message
    hideStatus() {
        this.elements.status.classList.add('hidden');
    }

    // Show scan answer button (for Peer 1)
    showScanAnswerButton() {
        this.elements.scanAnswerSection.classList.remove('hidden');
    }

    // Hide scan answer button
    hideScanAnswerButton() {
        this.elements.scanAnswerSection.classList.add('hidden');
    }

    // Hide setup section
    hideSetupSection() {
        this.elements.setupSection.style.display = 'none';
    }

    // Show chat interface
    showChat(peerUsername) {
        this.elements.peerName.textContent = peerUsername;
        this.elements.chatContainer.classList.add('active');
        this.elements.messageInput.focus();
    }

    // Hide chat interface
    hideChat() {
        this.elements.chatContainer.classList.remove('active');
    }

    // Get message input value
    getMessageInput() {
        return this.elements.messageInput.value.trim();
    }

    // Clear message input
    clearMessageInput() {
        this.elements.messageInput.value = '';
    }

    // Disable buttons
    disableButtons() {
        this.elements.createOfferBtn.disabled = true;
        this.elements.scanOfferBtn.disabled = true;
    }

    // Enable buttons
    enableButtons() {
        this.elements.createOfferBtn.disabled = false;
        this.elements.scanOfferBtn.disabled = false;
    }

    // Add event listener helper
    on(elementKey, event, handler) {
        if (this.elements[elementKey]) {
            this.elements[elementKey].addEventListener(event, handler);
        }
    }

    // Show loading state
    showLoading(message) {
        this.showStatus(message, 'info');
    }

    // Show success state
    showSuccess(message) {
        this.showStatus(message, 'success');
    }

    // Show error state
    showError(message) {
        this.showStatus(message, 'error');
    }
}
