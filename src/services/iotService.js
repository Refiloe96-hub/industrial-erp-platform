import db, { STORES } from '../db/index.js';

/**
 * IoTService - Simulated bridge between factory floor hardware sensors and SmartShift.
 * In a real environment, this would receive MQTT or Webhook payloads from ESP32/Raspberry Pi sensors.
 */
class IoTService {
    constructor(smartShiftModule) {
        this.smartShift = smartShiftModule;
    }

    /**
     * Ingest telemetry data from a hardware sensor attached to a machine.
     * @param {string} machineId - The ID of the machine emitting telemetry
     * @param {object} telemetry - The telemetry payload (e.g. { current: 15.2, vibration: 0.8 })
     */
    async ingestTelemetry(machineId, telemetry) {
        console.log(`📡 [IoT] Telemetry received from machine ${machineId}:`, telemetry);

        const machine = await db.get(STORES.machines, machineId);
        if (!machine) {
            console.warn(`[IoT] Unknown machine ID: ${machineId}`);
            return;
        }

        // Determine state purely based on physical sensor thresholds
        // Example: Amperage > 5A or Vibration > 0.5G indicates the machine is running
        const isRunning = (telemetry.current || 0) > 5.0 || (telemetry.vibration || 0) > 0.5;

        const previousStatus = machine.status;
        const newStatus = isRunning ? 'running' : 'idle';

        // Fast return if no state change
        if (previousStatus === newStatus && newStatus !== 'running') {
            return;
        }

        // Acknowledge State Change
        if (previousStatus !== newStatus) {
            machine.status = newStatus;
            machine.lastUpdated = Date.now();
            await db.update(STORES.machines, machine);
            console.log(`🤖 [IoT] Machine ${machineId} transitioned to ${newStatus.toUpperCase()}`);

            window.dispatchEvent(new CustomEvent('iot-state-change', {
                detail: { machineId, status: newStatus }
            }));
        }

        // --- The Moat: Auto-translating physical state into ERP workflows ---

        // Find today's shifts for this machine
        const allShifts = await this.smartShift.getShifts({ machineId });

        if (newStatus === 'running') {
            // Find a scheduled shift to auto-start if it isn't started yet
            const pendingShift = allShifts.find(s => s.status === 'scheduled');

            if (pendingShift && previousStatus !== 'running') {
                console.log(`[IoT] Auto-starting scheduled shift ${pendingShift.id}`);
                await this.smartShift.startShift(pendingShift.id);

                window.dispatchEvent(new CustomEvent('notification', {
                    detail: { type: 'success', message: `Hardware sensor automatically started shift for ${machine.name}` }
                }));
            }
        }
        else if (newStatus === 'idle' && previousStatus === 'running') {
            // The machine was turned off. Find the in-progress shift and auto-complete it.
            const activeShift = allShifts.find(s => s.status === 'in_progress');

            if (activeShift) {
                // Calculate estimated output based on machine throughput and actual time ran (for simulation)
                // In real life, an optical counter sensor would provide the exact `telemetry.unitsProduced`.
                const hoursRan = (Date.now() - activeShift.actualStartTime) / (1000 * 60 * 60);
                const output = telemetry.unitsProduced || Math.floor(hoursRan * (machine.throughput || 50));

                console.log(`[IoT] Auto-completing active shift ${activeShift.id} with output ${output}`);
                await this.smartShift.completeShift(activeShift.id, output > 0 ? output : 1);

                window.dispatchEvent(new CustomEvent('notification', {
                    detail: { type: 'info', message: `Hardware sensor automatically completed shift for ${machine.name}` }
                }));
            }
        }
    }

    // Helper method for the UI to attach generic demo simulated sensors
    attachSimulatedSensor(machineId) {
        console.log(`🔌 Attached simulated IoT sensor to ${machineId}`);
        return {
            triggerOn: () => this.ingestTelemetry(machineId, { current: 12.5, vibration: 0.8 }),
            triggerOff: (unitsProduced) => this.ingestTelemetry(machineId, { current: 1.0, vibration: 0.1, unitsProduced })
        };
    }
}

export default IoTService;
