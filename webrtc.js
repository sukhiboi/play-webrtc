console.log("webrtc.js loaded");

// URL encoding utilities
function encodeToURL(json, type) {
    const compressed = LZString.compressToEncodedURIComponent(json);
    const baseUrl = window.location.href.split('#')[0];
    return `${baseUrl}#${type}=${compressed}`;
}

function decodeFromURL() {
    const hash = window.location.hash;
    if (!hash) return null;

    const match = hash.match(/#(offer|answer)=(.+)/);
    if (!match) return null;

    const type = match[1];
    const compressed = match[2];
    const json = LZString.decompressFromEncodedURIComponent(compressed);

    return { type, json };
}

class WebRTCChat {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.isOfferer = false;
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };
    }

    updateStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        if (type === 'connected') {
            statusDiv.style.backgroundColor = '#c8e6c9';
            statusDiv.style.borderLeftColor = '#4CAF50';
        } else if (type === 'error') {
            statusDiv.style.backgroundColor = '#ffcdd2';
            statusDiv.style.borderLeftColor = '#f44336';
        } else {
            statusDiv.style.backgroundColor = '#e3f2fd';
            statusDiv.style.borderLeftColor = '#2196F3';
        }
    }

    generateQRCode(elementId, data) {
        const container = document.getElementById(elementId);
        container.innerHTML = ''; // Clear previous QR code
        new QRCode(container, {
            text: data,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
    }

    addChatMessage(message, type) {
        const messagesDiv = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const textDiv = document.createElement('div');
        textDiv.textContent = message;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'time';
        timeDiv.textContent = new Date().toLocaleTimeString();

        messageDiv.appendChild(textDiv);
        messageDiv.appendChild(timeDiv);
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    initPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.config);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE candidate gathered');
            } else {
                console.log('All ICE candidates gathered');
                if (this.isOfferer) {
                    const offer = JSON.stringify(this.peerConnection.localDescription);
                    document.getElementById('offerOutput').value = offer;
                    document.getElementById('copyOfferBtn').disabled = false;

                    // Create shareable URL
                    const shareableURL = encodeToURL(offer, 'offer');
                    document.getElementById('offerLink').textContent = shareableURL;
                    document.getElementById('offerLinkSection').style.display = 'block';
                    document.getElementById('offerTabs').style.display = 'flex';

                    // Generate QR code with URL
                    this.generateQRCode('offerQR', shareableURL);
                    this.updateStatus('Offer created! Share the link with Person B.');
                }
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log(`Connection state: ${state}`);

            if (state === 'connected') {
                this.updateStatus('Connected! You can now chat.', 'connected');
                document.getElementById('messageInput').disabled = false;
                document.getElementById('sendBtn').disabled = false;
            } else if (state === 'connecting') {
                this.updateStatus('Connecting...', 'info');
            } else if (state === 'disconnected' || state === 'failed') {
                this.updateStatus('Connection lost.', 'error');
                document.getElementById('messageInput').disabled = true;
                document.getElementById('sendBtn').disabled = true;
            }
        };

        this.peerConnection.ondatachannel = (event) => {
            console.log('Data channel received');
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };
    }

    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('Data channel open');
            this.updateStatus('Connected! You can now chat.', 'connected');
            document.getElementById('messageInput').disabled = false;
            document.getElementById('sendBtn').disabled = false;
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this.updateStatus('Connection closed.', 'error');
            document.getElementById('messageInput').disabled = true;
            document.getElementById('sendBtn').disabled = true;
        };

        this.dataChannel.onmessage = (event) => {
            this.addChatMessage(event.data, 'received');
        };
    }

    async createOffer() {
        try {
            this.updateStatus('Creating offer...');
            this.isOfferer = true;
            this.initPeerConnection();

            // Create data channel
            this.dataChannel = this.peerConnection.createDataChannel('chat');
            this.setupDataChannel();

            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            this.updateStatus('Gathering connection info...');
        } catch (error) {
            this.updateStatus('Error creating offer: ' + error.message, 'error');
            console.error(error);
        }
    }

    async processOffer(offerJson) {
        try {
            if (!offerJson || offerJson.trim() === '') {
                throw new Error('Please paste an offer');
            }

            const data = JSON.parse(offerJson);

            if (data.type !== 'offer') {
                throw new Error('Invalid data: expected an offer');
            }

            this.updateStatus('Processing offer and creating answer...');
            this.isOfferer = false;
            this.initPeerConnection();

            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // Wait for ICE gathering to complete
            await new Promise((resolve) => {
                if (this.peerConnection.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    this.peerConnection.addEventListener('icegatheringstatechange', () => {
                        if (this.peerConnection.iceGatheringState === 'complete') {
                            resolve();
                        }
                    });
                }
            });

            const answerStr = JSON.stringify(this.peerConnection.localDescription);
            document.getElementById('answerOutput').value = answerStr;
            document.getElementById('copyAnswerBtn').disabled = false;

            // Create shareable URL
            const shareableURL = encodeToURL(answerStr, 'answer');
            document.getElementById('answerLink').textContent = shareableURL;
            document.getElementById('answerLinkSection').style.display = 'block';
            document.getElementById('answerTabs').style.display = 'flex';

            // Generate QR code with URL
            this.generateQRCode('answerQR', shareableURL);
            this.updateStatus('Answer created! Share the link with Person A.');
        } catch (error) {
            this.updateStatus('Error: ' + error.message, 'error');
            alert('Error processing offer: ' + error.message);
            console.error(error);
        }
    }

    async applyAnswer(answerJson) {
        try {
            if (!answerJson || answerJson.trim() === '') {
                throw new Error('Please paste an answer');
            }

            const data = JSON.parse(answerJson);

            if (data.type !== 'answer') {
                throw new Error('Invalid data: expected an answer');
            }

            this.updateStatus('Applying answer and connecting...');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        } catch (error) {
            this.updateStatus('Error: ' + error.message, 'error');
            alert('Error applying answer: ' + error.message);
            console.error(error);
        }
    }

    sendChatMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(message);
            this.addChatMessage(message, 'sent');
        } else {
            this.updateStatus('Cannot send: not connected', 'error');
        }
    }

    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        element.select();
        element.setSelectionRange(0, 99999); // For mobile
        document.execCommand('copy');

        // Visual feedback
        const originalBg = element.style.backgroundColor;
        element.style.backgroundColor = '#c8e6c9';
        setTimeout(() => {
            element.style.backgroundColor = originalBg;
        }, 200);
    }
}

// Tab switching function
function switchTab(section, view) {
    // Update tab buttons
    const buttons = event.target.parentElement.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Update tab content
    document.getElementById(`${section}-qr`).classList.remove('active');
    document.getElementById(`${section}-json`).classList.remove('active');
    document.getElementById(`${section}-${view}`).classList.add('active');
}

// Initialize on DOM load
const chat = new WebRTCChat();

document.addEventListener('DOMContentLoaded', () => {
    // Auto-detect and process URL hash
    const urlData = decodeFromURL();
    if (urlData) {
        if (urlData.type === 'offer') {
            chat.updateStatus('Detected offer in URL. Processing automatically...');
            document.getElementById('offerInput').value = urlData.json;
            // Auto-process after a short delay
            setTimeout(() => {
                chat.processOffer(urlData.json);
            }, 500);
        } else if (urlData.type === 'answer') {
            chat.updateStatus('Detected answer in URL. Applying automatically...');
            document.getElementById('answerInput').value = urlData.json;
            // Auto-apply after a short delay
            setTimeout(() => {
                chat.applyAnswer(urlData.json);
            }, 500);
        }
        // Clear the URL hash after processing to prevent reprocessing
        setTimeout(() => {
            history.replaceState(null, null, ' ');
        }, 1000);
    }

    // Person A: Create Offer
    document.getElementById('createOfferBtn').addEventListener('click', async () => {
        await chat.createOffer();
    });

    document.getElementById('copyOfferBtn').addEventListener('click', () => {
        chat.copyToClipboard('offerOutput');
    });

    document.getElementById('copyOfferLinkBtn').addEventListener('click', () => {
        const linkText = document.getElementById('offerLink').textContent;
        navigator.clipboard.writeText(linkText).then(() => {
            const btn = document.getElementById('copyOfferLinkBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = originalText; }, 2000);
        });
    });

    // Person A: Apply Answer
    document.getElementById('applyAnswerBtn').addEventListener('click', async () => {
        const answerJson = document.getElementById('answerInput').value.trim();
        await chat.applyAnswer(answerJson);
    });

    // Person B: Process Offer
    document.getElementById('processOfferBtn').addEventListener('click', async () => {
        const offerJson = document.getElementById('offerInput').value.trim();
        await chat.processOffer(offerJson);
    });

    document.getElementById('copyAnswerBtn').addEventListener('click', () => {
        chat.copyToClipboard('answerOutput');
    });

    document.getElementById('copyAnswerLinkBtn').addEventListener('click', () => {
        const linkText = document.getElementById('answerLink').textContent;
        navigator.clipboard.writeText(linkText).then(() => {
            const btn = document.getElementById('copyAnswerLinkBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = originalText; }, 2000);
        });
    });

    // Chat functionality
    document.getElementById('sendBtn').addEventListener('click', () => {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        if (message) {
            chat.sendChatMessage(message);
            input.value = '';
        }
    });

    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('sendBtn').click();
        }
    });
});
