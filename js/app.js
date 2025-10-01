// app.js - Main application coordinator

import { WebRTCManager } from './webrtc.js';
import { QRManager } from './qr.js';
import { ChatManager } from './chat.js';
import { UIManager } from './ui.js';

class App {
    constructor() {
        this.webrtc = new WebRTCManager();
        this.qr = new QRManager();
        this.chat = new ChatManager('messages');
        this.ui = new UIManager();

        this.isPeer1 = false; // Track if this is the offer creator (Peer 1)
        this.currentData = null; // Store current offer/answer data

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupWebRTCCallbacks();
    }

    setupEventListeners() {
        // Create Offer button (Peer 1)
        this.ui.on('createOfferBtn', 'click', () => this.handleCreateOffer());

        // Scan Offer button (Peer 2)
        this.ui.on('scanOfferBtn', 'click', () => this.handleScanOffer());

        // Scan Answer button (Peer 1)
        this.ui.on('scanAnswerBtn', 'click', () => this.handleScanAnswer());

        // Toggle JSON display
        this.ui.on('toggleJson', 'click', () => this.ui.toggleJsonDisplay());

        // Close scanner
        this.ui.on('closeScanner', 'click', () => this.handleCloseScanner());

        // Send message
        this.ui.on('sendBtn', 'click', () => this.handleSendMessage());
        this.ui.on('messageInput', 'keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSendMessage();
            }
        });
    }

    setupWebRTCCallbacks() {
        // Handle incoming messages
        this.webrtc.onDataChannelMessage = (data) => {
            if (data.type === 'message') {
                this.chat.addReceivedMessage(data);
            }
        };

        // Handle connection state changes
        this.webrtc.onConnectionStateChange = (state) => {
            console.log('Connection state changed:', state);
            if (state === 'connected') {
                this.ui.hideStatus();
                this.ui.hideQR();
                this.ui.hideScanAnswerButton();
                this.ui.hideSetupSection();
                this.ui.showChat(this.webrtc.remoteUsername);
            } else if (state === 'failed' || state === 'disconnected') {
                this.ui.showError('Connection failed or disconnected');
            }
        };
    }

    // Handle Create Offer (Peer 1)
    async handleCreateOffer() {
        const username = this.ui.getUsername();
        if (!username) return;

        this.isPeer1 = true;
        this.chat.setLocalUsername(username);
        this.ui.disableButtons();
        this.ui.showLoading('Creating offer...');

        try {
            // Create WebRTC offer
            const offerData = await this.webrtc.createOffer(username);
            this.currentData = offerData;

            // Generate QR code
            this.qr.generateQR('qrcode', offerData);
            this.ui.showQR('Your Offer QR Code', offerData);
            this.ui.showScanAnswerButton();
            this.ui.showSuccess('Show this QR code to Peer 2');

        } catch (error) {
            console.error('Error creating offer:', error);
            this.ui.showError('Failed to create offer: ' + error.message);
            this.ui.enableButtons();
        }
    }

    // Handle Scan Offer (Peer 2)
    async handleScanOffer() {
        const username = this.ui.getUsername();
        if (!username) return;

        this.isPeer1 = false;
        this.chat.setLocalUsername(username);
        this.ui.disableButtons();
        this.ui.showLoading('Preparing scanner...');

        // Show scanner UI
        this.ui.showScanner();

        // Start QR scanner
        await this.qr.startScanner(
            'scanner',
            async (offerData) => {
                console.log('Offer scanned:', offerData);
                this.ui.hideScanner();

                // Validate offer data
                if (!offerData || offerData.type !== 'offer') {
                    this.ui.showError('Invalid offer QR code');
                    this.ui.enableButtons();
                    return;
                }

                this.ui.showLoading('Processing offer and creating answer...');

                try {
                    // Process offer and create answer
                    const answerData = await this.webrtc.processOfferAndCreateAnswer(offerData, username);
                    this.currentData = answerData;

                    // Generate answer QR code
                    this.qr.generateQR('qrcode', answerData);
                    this.ui.showQR('Your Answer QR Code', answerData);
                    this.ui.showSuccess('Show this QR code to Peer 1');

                } catch (error) {
                    console.error('Error processing offer:', error);
                    this.ui.showError('Failed to process offer: ' + error.message);
                    this.ui.enableButtons();
                }
            },
            (error) => {
                console.error('Scanner error:', error);
                this.ui.showError('Scanner error: ' + error);
                this.ui.hideScanner();
                this.ui.enableButtons();
            }
        );
    }

    // Handle Scan Answer (Peer 1)
    async handleScanAnswer() {
        this.ui.showLoading('Preparing scanner...');
        this.ui.hideQR();
        this.ui.hideScanAnswerButton();

        // Show scanner UI
        this.ui.showScanner();

        // Start QR scanner
        await this.qr.startScanner(
            'scanner',
            async (answerData) => {
                console.log('Answer scanned:', answerData);
                this.ui.hideScanner();

                // Validate answer data
                if (!answerData || answerData.type !== 'answer') {
                    this.ui.showError('Invalid answer QR code');
                    this.ui.showScanAnswerButton();
                    return;
                }

                this.ui.showLoading('Processing answer and connecting...');

                try {
                    // Process answer
                    await this.webrtc.processAnswer(answerData);
                    this.ui.showSuccess('Connection established!');

                } catch (error) {
                    console.error('Error processing answer:', error);
                    this.ui.showError('Failed to process answer: ' + error.message);
                    this.ui.showScanAnswerButton();
                }
            },
            (error) => {
                console.error('Scanner error:', error);
                this.ui.showError('Scanner error: ' + error);
                this.ui.hideScanner();
                this.ui.showScanAnswerButton();
            }
        );
    }

    // Handle close scanner
    async handleCloseScanner() {
        await this.qr.stopScanner();
        this.ui.hideScanner();
        this.ui.enableButtons();
        this.ui.hideStatus();

        // Restore previous state
        if (this.isPeer1 && this.currentData) {
            this.ui.showScanAnswerButton();
        }
    }

    // Handle send message
    handleSendMessage() {
        const message = this.ui.getMessageInput();
        if (!message) return;

        const sent = this.webrtc.sendMessage(message);
        if (sent) {
            this.chat.addSentMessage(message);
            this.ui.clearMessageInput();
        } else {
            this.ui.showError('Failed to send message. Connection may be lost.');
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}
