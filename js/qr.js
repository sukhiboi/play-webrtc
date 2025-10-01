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

        // Use URI-safe compression (more compact than Base64)
        const compressed = LZString.compressToEncodedURIComponent(jsonString);

        // Use a large fixed size - CSS will scale it to fit the container
        // This ensures QR generation works even when container is hidden
        const qrSize = 800;

        // Create new QR code with settings optimized for scanning
        this.qrCodeInstance = new QRCode(element, {
            text: compressed,
            width: qrSize,
            height: qrSize,
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

            // Configure scanner with larger scan box for better detection
            const config = {
                fps: 10,
                qrbox: { width: 300, height: 300 },
                aspectRatio: 1.0
            };

            // Use facingMode for more reliable camera access
            try {
                // Try environment (back) camera first for mobile
                await this.html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText, decodedResult) => {
                        console.log('QR Code scanned:', decodedText);
                        // Stop scanner before processing
                        this.stopScanner().then(() => {
                            try {
                                // Decompress the data first (URI-safe decompression)
                                const decompressed = LZString.decompressFromEncodedURIComponent(decodedText);
                                const data = JSON.parse(decompressed);
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
            } catch (envError) {
                console.warn('Back camera failed, trying any camera:', envError);
                // Fallback to any available camera
                try {
                    await this.html5QrCode.start(
                        { facingMode: "user" },
                        config,
                        (decodedText, decodedResult) => {
                            console.log('QR Code scanned:', decodedText);
                            this.stopScanner().then(() => {
                                try {
                                    const decompressed = LZString.decompressFromEncodedURIComponent(decodedText);
                                    const data = JSON.parse(decompressed);
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
                        }
                    );
                } catch (userError) {
                    throw new Error('Camera access denied or not available. Please allow camera permissions.');
                }
            }
        } catch (error) {
            console.error('Error starting scanner:', error);
            this.isScanning = false;
            if (onError) {
                onError(error.message || 'Failed to start camera. Please check permissions.');
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
