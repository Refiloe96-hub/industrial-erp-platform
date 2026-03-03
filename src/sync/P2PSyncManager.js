import db, { STORES } from '../db/index.js';

/**
 * 📶 P2PSyncManager (The Infrastructure Moat)
 * 
 * Allows devices on the same local network to sync their IndexedDB stores
 * peer-to-peer using WebRTC Data Channels, entirely completely offline.
 * 
 * Flow:
 * 1. Device A creates an "Offer" (QR code or local signaling).
 * 2. Device B reads the "Offer" and creates an "Answer".
 * 3. Connection is established.
 * 4. We exchange highest known timestamps for each Store.
 * 5. Missing records are synced over the data channel using our standard Sync engine logic.
 */
class P2PSyncManager {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.isConnected = false;

        // Ice servers (stun needed if traversing NATs, but for strict local offline, sometimes optional. 
        // We include public google stuns out of standard practice, but they will fail gracefully offline)
        this.configuration = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        };
    }

    /**
     * Initialize as the HOST (Device A)
     * Returns a connection string (Base64) that Device B needs to scan/paste.
     */
    async hostSession() {
        this.peerConnection = new RTCPeerConnection(this.configuration);

        // Create Data Channel for sending DB JSON objects
        this.dataChannel = this.peerConnection.createDataChannel('erp-sync-channel', {
            ordered: true
        });

        this.setupChannelListeners();

        // Wait for ICE candidates gathering to finish to create a complete single offer string
        return new Promise((resolve, reject) => {
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate === null) {
                    const offer = JSON.stringify(this.peerConnection.localDescription);
                    resolve(btoa(offer)); // Base64 encode for easier copying/QR
                }
            };

            this.peerConnection.createOffer()
                .then(offer => this.peerConnection.setLocalDescription(offer))
                .catch(reject);
        });
    }

    /**
     * Initialize as the CLIENT (Device B) by consuming Device A's offer.
     * Returns an Answer string that Device A needs to scan/paste.
     */
    async joinSession(base64Offer) {
        this.peerConnection = new RTCPeerConnection(this.configuration);

        // Listen for the data channel coming from the Host
        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupChannelListeners();
        };

        const offer = JSON.parse(atob(base64Offer));
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Create Answer
        return new Promise((resolve, reject) => {
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate === null) {
                    const answer = JSON.stringify(this.peerConnection.localDescription);
                    resolve(btoa(answer));
                }
            };

            this.peerConnection.createAnswer()
                .then(answer => this.peerConnection.setLocalDescription(answer))
                .catch(reject);
        });
    }

    /**
     * HOST (Device A) completes the handshake by accepting Device B's Answer.
     */
    async completeHandshake(base64Answer) {
        if (!this.peerConnection) throw new Error("No host session active.");
        const answer = JSON.parse(atob(base64Answer));
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("🤝 P2P Handshake Completed. Awaiting Data Channel Open...");
    }

    setupChannelListeners() {
        if (!this.dataChannel) return;

        this.dataChannel.onopen = () => {
            console.log("✅ WebRTC Data Channel OPEN");
            this.isConnected = true;
            window.dispatchEvent(new CustomEvent('p2p-status', { detail: 'connected' }));

            // Initiate Sync: Send our current database state summary to peer
            this.initiateSyncExchange();
        };

        this.dataChannel.onclose = () => {
            console.log("❌ WebRTC Data Channel CLOSED");
            this.isConnected = false;
            window.dispatchEvent(new CustomEvent('p2p-status', { detail: 'disconnected' }));
        };

        this.dataChannel.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            await this.handleIncomingMessage(message);
        };
    }

    // ==========================================
    // SYNC LOGIC OVER P2P
    // ==========================================

    async initiateSyncExchange() {
        // Find the newest timestamp we have for each store
        const stateSummary = {};
        for (const storeName of Object.values(STORES)) {
            // Simplified summary: Just grabbing the total count for the MVP example
            // In a full CRDT, we'd send a Merkle tree or high-water marks.
            const records = await db.getAll(storeName);
            stateSummary[storeName] = records.length;
        }

        this.sendMessage({
            type: 'SYNC_OFFER',
            data: stateSummary
        });
    }

    async handleIncomingMessage(message) {
        switch (message.type) {
            case 'SYNC_OFFER':
                console.log("📥 Received Sync Offer from peer");
                await this.processSyncOffer(message.data);
                break;
            case 'SYNC_DATA':
                console.log(`📥 Received ${message.data.records.length} records for ${message.data.store}`);
                await this.ingestPeerData(message.data.store, message.data.records);
                break;
        }
    }

    async processSyncOffer(peerSummary) {
        // Compare peer's summary to our actual data
        for (const storeName of Object.values(STORES)) {
            const localRecords = await db.getAll(storeName);

            // If we have records, just push them all to the peer (simplified "last write wins" merge for MVP)
            if (localRecords.length > 0) {
                this.sendMessage({
                    type: 'SYNC_DATA',
                    data: {
                        store: storeName,
                        records: localRecords
                    }
                });
            }
        }
    }

    async ingestPeerData(storeName, peerRecords) {
        // Upsert logic: Peer records overwrite local if they are newer
        for (const peerRecord of peerRecords) {
            const localRecord = await db.get(storeName, peerRecord.id);
            if (!localRecord || (peerRecord.updatedAt || 0) > (localRecord.updatedAt || 0)) {
                await db.update(storeName, peerRecord);
            }
        }
        console.log(`✅ Synced store: ${storeName}`);

        // Notify UI that a P2P sync just happened
        window.dispatchEvent(new CustomEvent('p2p-sync-complete', { detail: { store: storeName } }));
    }

    sendMessage(payload) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(payload));
        }
    }

    disconnect() {
        if (this.dataChannel) this.dataChannel.close();
        if (this.peerConnection) this.peerConnection.close();
        this.isConnected = false;
        console.log("🔌 P2P Session Disconnected");
    }
}

export default new P2PSyncManager();
