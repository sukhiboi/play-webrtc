// qr.js - QR code generation and scanning

export class QRManager {
    constructor() {
        this.qrCodeInstance = null;
        this.html5QrCode = null;
        this.isScanning = false;
    }

    // Generate QR code from data
    generateQR(elementId, data) {
        // Clear previous QR code if exists
        const element = document.getElementById(elementId);
        element.innerHTML = '';

        // Convert data to JSON string (minified, no spaces)
        const jsonString = JSON.stringify(data);

        // Create new QR code with settings optimized for scanning
        this.qrCodeInstance = new QRCode(element, {
            text: jsonString,
            width: 500,  // Larger size for better scanning
            height: 500,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.L  // Low error correction = bigger bars
        });

        return jsonString;
    }

    // Start QR code scanner
    async startScanner(elementId, onSuccess, onError) {
        if (this.isScanning) {
            console.log('Scanner already running');
            return;
        }

        try {
            this.html5QrCode = new Html5Qrcode(elementId);
            this.isScanning = true;

            // Get camera devices
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length) {
                // Prefer back camera for mobile
                const backCamera = devices.find(device =>
                    device.label.toLowerCase().includes('back') ||
                    device.label.toLowerCase().includes('rear') ||
                    device.label.toLowerCase().includes('environment')
                );

                const cameraId = backCamera ? backCamera.id : devices[0].id;

                // Configure scanner
                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                // Start scanning
                await this.html5QrCode.start(
                    cameraId,
                    config,
                    (decodedText, decodedResult) => {
                        console.log('QR Code scanned:', decodedText);
                        // Stop scanner before processing
                        this.stopScanner().then(() => {
                            try {
                                const data = JSON.parse(decodedText);
                                if (onSuccess) {
                                    onSuccess(data);
                                }
                            } catch (e) {
                                console.error('Failed to parse QR data:', e);
                                if (onError) {
                                    onError('Invalid QR code format');
                                }
                            }
                        });
                    },
                    (errorMessage) => {
                        // Scanning errors (usually just "no QR code found")
                        // Don't log these as they're expected
                    }
                );
            } else {
                throw new Error('No camera devices found');
            }
        } catch (error) {
            console.error('Error starting scanner:', error);
            this.isScanning = false;
            if (onError) {
                onError(error.message || 'Failed to start camera');
            }
        }
    }

    // Stop QR code scanner
    async stopScanner() {
        if (this.html5QrCode && this.isScanning) {
            try {
                await this.html5QrCode.stop();
                await this.html5QrCode.clear();
                this.html5QrCode = null;
                this.isScanning = false;
                console.log('Scanner stopped');
            } catch (error) {
                console.error('Error stopping scanner:', error);
            }
        }
    }

    // Check if scanner is running
    isScannerRunning() {
        return this.isScanning;
    }

    // Clear QR code
    clearQR(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '';
        }
        this.qrCodeInstance = null;
    }
}
