import db from '../db/index.js';

/**
 * 🛠️ HardwareService
 * The Physical Moat.
 * 
 * African industrial and informal sectors use rugged, legacy hardware. 
 * Instead of forcing them to buy new smart-scales or network printers, 
 * we use Web API standards to connect their browser directly to serial scales,
 * barcode scanners, and thermal printers.
 */
class HardwareService {
    constructor() {
        this.scalePort = null;
        this.printerDevice = null;
        this.scaleReader = null;
        this.scaleStreamClosed = null;
        this.simulatorMode = true; // Default to simulator if no physical hardware is present
        this.simulatedWeight = 0;
    }

    // ==========================================
    // ⚖️ DIGITAL SCALE INTEGRATION (Web Serial)
    // ==========================================

    /**
     * Connect to a standard RS232 Serial Weighing Scale via USB adapter.
     */
    async connectScale() {
        if (!('serial' in navigator)) {
            console.warn('Web Serial API not supported in this browser. Falling back to Simulator.');
            this.simulatorMode = true;
            return true;
        }

        try {
            // Prompt user to select a serial port
            this.scalePort = await navigator.serial.requestPort();

            // Standard scale baud rate (often 9600)
            await this.scalePort.open({ baudRate: 9600 });
            this.simulatorMode = false;
            console.log('✅ Connected to Physical Scale via Web Serial');

            // Start reading loop
            this.startScaleReader();
            return true;
        } catch (err) {
            console.error('Failed to connect to scale:', err);
            // Fallback to simulator if user cancels or port fails
            this.simulatorMode = true;
            alert('Scale connection failed or unsupported. Using Simulator Mode.');
            return false;
        }
    }

    async startScaleReader() {
        if (!this.scalePort) return;

        const textDecoder = new TextDecoderStream();
        this.scaleStreamClosed = this.scalePort.readable.pipeTo(textDecoder.writable);
        this.scaleReader = textDecoder.readable.getReader();

        try {
            while (true) {
                const { value, done } = await this.scaleReader.read();
                if (done) {
                    this.scaleReader.releaseLock();
                    break;
                }
                if (value) {
                    // Typical scale output: "ST,GS,+  12.50 kg"
                    this.parseScaleData(value);
                }
            }
        } catch (err) {
            console.error('Error reading from scale:', err);
        }
    }

    parseScaleData(rawString) {
        // Extract numeric weight using regex
        const match = rawString.match(/([-+]?[0-9]*\.?[0-9]+)/);
        if (match) {
            const weight = parseFloat(match[1]);
            if (!isNaN(weight)) {
                // Dispatch event to UI so POS can update live
                window.dispatchEvent(new CustomEvent('scale-reading', {
                    detail: { weight, unit: 'kg', raw: rawString }
                }));
            }
        }
    }

    // Mock generic weight generation for debugging UI
    async getSimulatedWeight() {
        // Generate a random stable weight between 1kg and 50kg
        const target = Math.random() * 50;
        this.simulatedWeight = parseFloat(target.toFixed(2));
        console.log(`[Hardware Simulator] Scale reads ${this.simulatedWeight} kg`);

        window.dispatchEvent(new CustomEvent('scale-reading', {
            detail: { weight: this.simulatedWeight, unit: 'kg', simulator: true }
        }));
        return this.simulatedWeight;
    }

    async disconnectScale() {
        if (this.simulatorMode) return;

        if (this.scaleReader) {
            await this.scaleReader.cancel();
            await this.scaleStreamClosed.catch(() => { });
        }
        if (this.scalePort) {
            await this.scalePort.close();
            this.scalePort = null;
        }
        console.log('🔌 Disconnected from Scale');
    }


    // ==========================================
    // 🖨️ THERMAL PRINTER INTEGRATION (Web Bluetooth)
    // ==========================================

    /**
     * Connect to a cheap generic Bluetooth Thermal Printer (ESC/POS)
     */
    async connectPrinter() {
        if (!('bluetooth' in navigator)) {
            console.warn('Web Bluetooth API not supported. Falling back to default browser print.');
            this.simulatorMode = true;
            return true;
        }

        try {
            this.printerDevice = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // Generic printer service UUID
            });

            console.log('✅ Connected to Bluetooth Printer:', this.printerDevice.name);
            this.simulatorMode = false;
            return true;
        } catch (err) {
            console.error('Failed to connect to printer:', err);
            this.simulatorMode = true;
            return false;
        }
    }

    /**
     * Mock ESC/POS printing capability
     */
    async printReceipt(transactionDetails) {
        if (this.simulatorMode || !this.printerDevice) {
            console.log('[Hardware Simulator] Printing Receipt to Browser Console log:');
            console.log(`
================================
       INDUSTRIAL ERP POS       
================================
Date: ${new Date().toLocaleString()}
TxID: ${transactionDetails.id || 'N/A'}
--------------------------------
${(transactionDetails.items || []).map(i => `${i.name.padEnd(20)} R${i.price.toFixed(2)}`).join('\n')}
--------------------------------
TOTAL:               R${(transactionDetails.total || 0).toFixed(2)}
================================
            `);

            // Fallback to standard browser print if no BT printer
            // window.print();
            return;
        }

        try {
            const server = await this.printerDevice.gatt.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            // Construct minimal ESC/POS byte array
            const encoder = new TextEncoder();
            const text = encoder.encode(`
ERP Receipt
----------------
Total: R${transactionDetails.total}
----------------
\n\n\n
            `);

            await characteristic.writeValue(text);
            console.log('🖨️ Receipt sent to BT Printer');
        } catch (err) {
            console.error('Bluetooth printing failed:', err);
            alert('Printing failed. See console.');
        }
    }
}

export default new HardwareService();
