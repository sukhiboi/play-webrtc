// webrtc.js - WebRTC connection management

export class WebRTCManager {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.iceCandidates = [];
        this.onDataChannelMessage = null;
        this.onConnectionStateChange = null;
        this.localUsername = '';
        this.remoteUsername = '';

        // STUN servers for NAT traversal
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    // Initialize peer connection
    initPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.configuration);
        this.iceCandidates = [];

        // Listen for ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.iceCandidates.push(event.candidate);
            }
        };

        // Listen for connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(this.peerConnection.connectionState);
            }
        };

        // Listen for ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };

        return this.peerConnection;
    }

    // Create data channel (for the offerer)
    createDataChannel(username) {
        this.localUsername = username;
        this.dataChannel = this.peerConnection.createDataChannel('chat');
        this.setupDataChannel(this.dataChannel);
        return this.dataChannel;
    }

    // Setup data channel event handlers
    setupDataChannel(channel) {
        channel.onopen = () => {
            console.log('Data channel opened');
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange('connected');
            }
        };

        channel.onclose = () => {
            console.log('Data channel closed');
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange('disconnected');
            }
        };

        channel.onmessage = (event) => {
            if (this.onDataChannelMessage) {
                const data = JSON.parse(event.data);
                this.onDataChannelMessage(data);
            }
        };
    }

    // Create offer with username metadata
    async createOffer(username) {
        this.initPeerConnection();
        this.createDataChannel(username);

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        // Wait briefly for initial ICE candidates (smaller QR codes)
        await this.waitForInitialCandidates(500);

        // Package offer with metadata (minimal data for smaller QR)
        return {
            type: 'offer',
            username: username,
            sdp: this.peerConnection.localDescription
        };
    }

    // Process offer and create answer (for the answerer)
    async processOfferAndCreateAnswer(offerData, username) {
        this.initPeerConnection();
        this.localUsername = username;
        this.remoteUsername = offerData.username;

        // Listen for data channel from remote peer
        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannel(this.dataChannel);
        };

        // Set remote description
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerData.sdp));

        // Create answer
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        // Wait briefly for initial ICE candidates (smaller QR codes)
        await this.waitForInitialCandidates(500);

        // Package answer with metadata (minimal data for smaller QR)
        return {
            type: 'answer',
            username: username,
            sdp: this.peerConnection.localDescription
        };
    }

    // Process answer (for the offerer)
    async processAnswer(answerData) {
        this.remoteUsername = answerData.username;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerData.sdp));
    }

    // Wait for initial ICE candidates (with timeout for smaller QR codes)
    waitForInitialCandidates(timeoutMs = 500) {
        return new Promise((resolve) => {
            // If already complete, resolve immediately
            if (this.peerConnection.iceGatheringState === 'complete') {
                resolve();
                return;
            }

            // Wait for either completion or timeout
            let resolved = false;

            const checkState = () => {
                if (!resolved && this.peerConnection.iceGatheringState === 'complete') {
                    resolved = true;
                    this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }
            };

            this.peerConnection.addEventListener('icegatheringstatechange', checkState);

            // Timeout to generate QR code early (smaller QR, faster UX)
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
                    console.log('Generating QR with partial ICE candidates for smaller size');
                    resolve();
                }
            }, timeoutMs);
        });
    }

    // Send message through data channel
    sendMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            const data = {
                type: 'message',
                username: this.localUsername,
                message: message,
                timestamp: Date.now()
            };
            this.dataChannel.send(JSON.stringify(data));
            return true;
        }
        return false;
    }

    // Get connection stats
    getConnectionState() {
        if (!this.peerConnection) return 'not-initialized';
        return this.peerConnection.connectionState;
    }

    // Close connection
    close() {
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.iceCandidates = [];
    }
}
