// SmartShift Module - Manufacturing Execution System (MES)
// Purpose: Optimize machines, people, and time
// Role: Floor Manager
// NOT: Gig marketplace or worker discovery platform

import db, { STORES } from '../db/index.js';

class SmartShift {
  constructor(aiEngine, pocketBooks) {
    this.aiEngine = aiEngine;
    this.pocketBooks = pocketBooks;
  }

  // Create production order
  async createProductionOrder(data) {
    const order = {
      orderNumber: data.orderNumber || `PO-${Date.now()}`,
      product: data.product,
      quantity: data.quantity,
      unit: data.unit,
      dueDate: data.dueDate,
      priority: data.priority || 5, // 1-10, 10 is highest
      requiredCapability: data.requiredCapability,
      requiredSkill: data.requiredSkill,
      estimatedTime: data.estimatedTime, // in hours
      status: 'pending', // pending, scheduled, in_progress, completed, cancelled
      progress: 0,
      notes: data.notes,
      createdAt: Date.now()
    };

    const id = await db.add(STORES.productionOrders, order);
    console.log('✅ Production order created:', id);

    return { id, ...order };
  }

  // Get production orders
  async getProductionOrders(filters = {}) {
    let orders = await db.getAll(STORES.productionOrders);

    if (filters.status) {
      orders = orders.filter(o => o.status === filters.status);
    }

    if (filters.priority) {
      orders = orders.filter(o => o.priority >= filters.priority);
    }

    // Sort by priority and due date
    orders.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.dueDate - b.dueDate;
    });

    return orders;
  }

  // Add/Update machine
  async updateMachine(data) {
    const machine = {
      id: data.id,
      name: data.name,
      type: data.type,
      capabilities: data.capabilities || [], // ['cutting', 'welding', 'assembly']
      throughput: data.throughput, // units per hour
      status: data.status || 'operational', // operational, maintenance, broken, idle
      utilization: data.utilization || 0, // percentage
      location: data.location,
      lastMaintenance: data.lastMaintenance,
      nextMaintenance: data.nextMaintenance,
      notes: data.notes,
      lastUpdated: Date.now()
    };

    if (machine.id) {
      await db.update(STORES.machines, machine);
    } else {
      const id = await db.add(STORES.machines, machine);
      machine.id = id;
    }

    console.log('✅ Machine updated:', machine.name);
    return machine;
  }

  // Get all machines
  async getMachines(filters = {}) {
    let machines = await db.getAll(STORES.machines);

    if (filters.status) {
      machines = machines.filter(m => m.status === filters.status);
    }

    if (filters.capability) {
      machines = machines.filter(m => m.capabilities.includes(filters.capability));
    }

    return machines;
  }

  // Add/Update worker
  async updateWorker(data) {
    const worker = {
      id: data.id,
      name: data.name,
      skills: data.skills || [], // ['machinist', 'welder', 'quality_control']
      availability: data.availability || 'available', // available, busy, off_duty
      shiftPreference: data.shiftPreference, // day, night, flexible
      hourlyRate: data.hourlyRate,
      performance: data.performance || 100, // percentage
      notes: data.notes,
      lastUpdated: Date.now()
    };

    if (worker.id) {
      await db.update(STORES.workers, worker);
    } else {
      const id = await db.add(STORES.workers, worker);
      worker.id = id;
    }

    console.log('✅ Worker updated:', worker.name);
    return worker;
  }

  // Get all workers
  async getWorkers(filters = {}) {
    let workers = await db.getAll(STORES.workers);

    if (filters.availability) {
      workers = workers.filter(w => w.availability === filters.availability);
    }

    if (filters.skill) {
      workers = workers.filter(w => w.skills.includes(filters.skill));
    }

    return workers;
  }

  // Create shift
  async createShift(data) {
    const shift = {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      machineId: data.machineId,
      workerId: data.workerId,
      orderId: data.orderId,
      plannedHours: data.plannedHours,
      standardHours: 8, // standard shift
      actualHours: null,
      status: 'scheduled', // scheduled, in_progress, completed, cancelled
      output: null,
      notes: data.notes,
      createdAt: Date.now()
    };

    const id = await db.add(STORES.shifts, shift);
    console.log('✅ Shift created:', id);

    // Update production order status
    if (data.orderId) {
      const order = await db.get(STORES.productionOrders, data.orderId);
      if (order && order.status === 'pending') {
        order.status = 'scheduled';
        await db.update(STORES.productionOrders, order);
      }
    }

    return { id, ...shift };
  }

  // Get all shifts
  async getShifts(filters = {}) {
    let shifts = await db.getAll(STORES.shifts);

    if (filters.status) {
      shifts = shifts.filter(s => s.status === filters.status);
    }

    if (filters.machineId) {
      shifts = shifts.filter(s => s.machineId === filters.machineId);
    }

    // Sort by date/time descending
    shifts.sort((a, b) => {
      return b.startTime - a.startTime;
    });

    // Enhance with related data names for UI
    const machines = await this.getMachines();
    const workers = await this.getWorkers();

    return shifts.map(s => ({
      ...s,
      machineName: machines.find(m => m.id === s.machineId)?.name || 'Unknown',
      workerName: workers.find(w => w.id === s.workerId)?.name || 'Unknown'
    }));
  }

  // Start shift
  async startShift(shiftId) {
    const shift = await db.get(STORES.shifts, shiftId);

    if (!shift) {
      throw new Error('Shift not found');
    }

    shift.status = 'in_progress';
    shift.actualStartTime = Date.now();
    await db.update(STORES.shifts, shift);

    // Update production order
    if (shift.orderId) {
      const order = await db.get(STORES.productionOrders, shift.orderId);
      if (order) {
        order.status = 'in_progress';
        await db.update(STORES.productionOrders, order);
      }
    }

    // Update machine utilization
    const machine = await db.get(STORES.machines, shift.machineId);
    if (machine) {
      machine.status = 'operational';
      await db.update(STORES.machines, machine);
    }

    // Update worker availability
    const worker = await db.get(STORES.workers, shift.workerId);
    if (worker) {
      worker.availability = 'busy';
      await db.update(STORES.workers, worker);
    }

    console.log('✅ Shift started:', shiftId);

    // Check materials (Integration)
    if (shift.orderId) {
      const order = await db.get(STORES.productionOrders, shift.orderId);
      if (order) {
        const hasMaterials = await this.checkMaterials(order.product, 1);
        if (!hasMaterials) {
          console.warn('⚠️ Warning: Starting shift with low raw materials!');
        }
      }
    }

    return shift;
  }

  // Complete shift
  async completeShift(shiftId, output, params = {}) {
    const shift = await db.get(STORES.shifts, shiftId);

    if (!shift) {
      throw new Error('Shift not found');
    }

    shift.status = 'completed';
    shift.actualEndTime = Date.now();
    shift.actualHours = (shift.actualEndTime - shift.actualStartTime) / (1000 * 60 * 60);
    shift.output = output;

    // Traceability: Log raw material batches used
    shift.consumedBatches = params.consumedBatches || [];

    await db.update(STORES.shifts, shift);

    // Update production order progress
    if (shift.orderId) {
      const order = await db.get(STORES.productionOrders, shift.orderId);
      if (order) {
        order.progress = Math.min(100, order.progress + (output / order.quantity * 100));

        if (order.progress >= 100) {
          order.status = 'completed';
          order.completedAt = Date.now();
        }

        await db.update(STORES.productionOrders, order);

        // Deduct materials (Integration)
        await this.deductMaterials(order.product, output);
      }
    }

    // Update machine utilization (simplified)
    const machine = await db.get(STORES.machines, shift.machineId);
    if (machine) {
      machine.status = 'idle';
      await db.update(STORES.machines, machine);
    }

    // Update worker availability
    const worker = await db.get(STORES.workers, shift.workerId);
    if (worker) {
      worker.availability = 'available';
      await db.update(STORES.workers, worker);

      // Integration: Record Labor Cost
      if (this.pocketBooks && shift.actualHours > 0) {
        const cost = shift.actualHours * worker.hourlyRate;
        await this.pocketBooks.recordTransaction({
          type: 'expense',
          category: 'Labor',
          amount: cost,
          description: `Shift Labor: ${worker.name} on ${shift.machineName} (${shift.actualHours.toFixed(2)} hrs)`,
          date: Date.now(),
          reference: `SHIFT-${shiftId}`
        });
      }
    }

    console.log('✅ Shift completed:', shiftId);
    return shift;
  }

  // The Moat: Deep Traceability & QC Genealogy
  // Fetch full manufacturing history for an order to assist with QC audits
  async traceProduct(orderId) {
    const order = await db.get(STORES.productionOrders, orderId);
    if (!order) throw new Error('Order not found');

    const allShifts = await db.getAll(STORES.shifts);
    const orderShifts = allShifts.filter(s => s.orderId === orderId && s.status === 'completed');

    const [machines, workers] = await Promise.all([
      db.getAll(STORES.machines),
      db.getAll(STORES.workers)
    ]);

    const genealogyTree = {
      orderNumber: order.orderNumber,
      product: order.product,
      quantityProduced: orderShifts.reduce((sum, s) => sum + (s.output || 0), 0),
      totalLaborHours: orderShifts.reduce((sum, s) => sum + (s.actualHours || 0), 0),
      shifts: orderShifts.map(s => {
        const machine = machines.find(m => m.id === s.machineId);
        const worker = workers.find(w => w.id === s.workerId);
        return {
          shiftId: s.id,
          date: new Date(s.actualStartTime).toLocaleString(),
          durationHours: s.actualHours.toFixed(2),
          machineEmployed: machine ? machine.name : 'Unknown',
          workerEmployed: worker ? worker.name : 'Unknown',
          outputGenerated: s.output,
          rawMaterialBatches: s.consumedBatches || [] // Critical Traceability point
        };
      })
    };

    return genealogyTree;
  }

  // The Moat: Document Generation
  // Generates a verifiable Certificate of Conformance (CoC)
  async generateCoC(orderId) {
    try {
      const genealogy = await this.traceProduct(orderId);
      const currentUser = JSON.parse(localStorage.getItem('erp_session')) || {};
      const businessName = currentUser.businessName || 'Industrial ERP Co.';

      const printWindow = window.open('', '_blank');

      const shiftsHtml = genealogy.shifts.map(s => `
        <div class="shift-block">
          <strong>Process Date:</strong> ${s.date} <br>
          <strong>Machine:</strong> ${s.machineEmployed} <br>
          <strong>Operator:</strong> ${s.workerEmployed} <br>
          <strong>Hours Logged:</strong> ${s.durationHours} hrs <br>
          <strong>Yield:</strong> ${s.outputGenerated} units <br>
          <strong>Traceable Materials Consumed:</strong>
          <ul>
            ${s.rawMaterialBatches.length > 0
          ? s.rawMaterialBatches.map(b => `<li><code>${b}</code></li>`).join('')
          : '<li><em>No raw material batches explicitly logged.</em></li>'}
          </ul>
        </div>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Certificate of Conformance - ${genealogy.orderNumber}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; max-width: 800px; margin: auto; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-placeholder { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
            .cert-title { text-align: right; }
            .cert-title h1 { margin: 0; font-size: 28px; text-transform: uppercase; color: #000; }
            .cert-title p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
            h2 { font-size: 18px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 30px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .data-box { background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .data-box label { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px; }
            .data-box val { display: block; font-size: 16px; font-weight: 500; color: #0f172a; }
            .shift-block { border-left: 3px solid #000; padding-left: 15px; margin-bottom: 20px; background: #fafafa; padding: 15px 15px 15px 20px; }
            .shift-block ul { margin-top: 8px; margin-bottom: 0; padding-left: 20px; }
            .shift-block code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
            
            /* The Mock 2D Barcode (CSS Representation) */
            .compliance-footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #000; display: flex; justify-content: space-between; align-items: flex-end; }
            .qr-mock { width: 80px; height: 80px; background: 
              linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000),
              linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000); 
              background-size: 10px 10px; background-position: 0 0, 5px 5px; border: 4px solid #000; border-radius: 4px; padding: 4px; box-sizing: content-box; position:relative; }
            .qr-mock::after { content: ''; position:absolute; inset: 10px; background: #fff; z-index:1; }
            .qr-mock::before { content: ''; position:absolute; inset: 15px; background: repeating-linear-gradient(90deg, #000, #000 4px, transparent 4px, transparent 8px); z-index:2; }
            
            .signature { text-align: center; }
            .sig-line { width: 250px; border-bottom: 1px solid #000; margin-bottom: 5px; height: 40px; }
            .sig-text { font-size: 12px; color: #666; text-transform: uppercase; }
            
            .print-btn-wrap { text-align: center; margin-top: 40px; }
            .print-btn { background: #000; color: #fff; border: none; padding: 12px 24px; font-size: 16px; border-radius: 8px; cursor: pointer; font-family: 'Inter', sans-serif; font-weight: 500; }
            @media print { .print-btn-wrap { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-placeholder">${businessName}</div>
            <div class="cert-title">
              <h1>Certificate of Conformance</h1>
              <p>ISO/SABS Compliance Traceability Document</p>
            </div>
          </div>

          <div class="grid-2">
            <div class="data-box">
              <label>Production Order No.</label>
              <val>${genealogy.orderNumber}</val>
            </div>
            <div class="data-box">
              <label>Product Issued</label>
              <val>${genealogy.product}</val>
            </div>
            <div class="data-box">
              <label>Total Yield / Quantity</label>
              <val>${genealogy.quantityProduced} units</val>
            </div>
            <div class="data-box">
              <label>Date of Issue</label>
              <val>${new Date().toLocaleDateString('en-ZA')}</val>
            </div>
          </div>

          <h2>Statement of Compliance</h2>
          <p style="font-size: 13px; color: #444; text-align: justify;">
            This document certifies that the aforementioned product was manufactured, inspected, and tested in accordance 
            with all applicable quality assurance protocols and engineering specifications governed by ${businessName}. 
            The materials and processes used comply with standard regulatory requirements.
          </p>

          <h2>Manufacturing Genealogy</h2>
          ${shiftsHtml || '<p style="color:#666;font-style:italic;">No recorded production shifts.</p>'}

          <div class="compliance-footer">
            <div style="display:flex; gap:15px; align-items:center;">
              <div class="qr-mock" title="Scannable Asset Tag"></div>
              <div style="font-size:11px; color:#666; max-width: 200px;">
                <strong>Verifiable Asset</strong><br>
                Scan code or reference <code>${genealogy.orderNumber.split('-')[1] || '0000'}</code> in QA portal.
              </div>
            </div>
            
            <div class="signature">
              <div class="sig-line"><img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 30'><path d='M10 20 Q 30 5 50 25 T 90 10' stroke='black' fill='transparent' stroke-width='2'/></svg>" height="30" style="opacity:0.6; transform:translateY(10px);"/></div>
              <div class="sig-text">Authorized QA Manager</div>
            </div>
          </div>

          <div class="print-btn-wrap">
            <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      return true;
    } catch (err) {
      console.error('Failed to generate CoC:', err);
      throw err;
    }
  }

  // Integration: Check materials
  async checkMaterials(product, quantity) {
    try {
      const inventory = await db.getAll(STORES.inventory);

      // Simple mapped BOM mapping (mocked for demo)
      const bom = {
        'Steel Pipes': [{ rawCode: 'RM-STEEL', qtyPerUnit: 2.5 }],
        'Widget A': [{ rawCode: 'RM-PLASTIC', qtyPerUnit: 0.5 }, { rawCode: 'RM-SCREWS', qtyPerUnit: 4 }],
      };

      const required = bom[product];
      if (!required) return true; // No BOM defined, assume ok

      for (const req of required) {
        // We use string match since sku/names might vary in demo data
        const item = inventory.find(i => i.sku === req.rawCode || i.name.toLowerCase().includes(req.rawCode.toLowerCase().replace('rm-', '')));
        if (!item || item.quantity < (req.qtyPerUnit * quantity)) {
          return false;
        }
      }
      return true;
    } catch (e) {
      return true;
    }
  }

  // Integration: Deduct consumed materials
  async deductMaterials(product, quantityProduced) {
    try {
      const inventory = await db.getAll(STORES.inventory);
      const bom = {
        'Steel Pipes': [{ rawCode: 'RM-STEEL', qtyPerUnit: 2.5 }],
        'Widget A': [{ rawCode: 'RM-PLASTIC', qtyPerUnit: 0.5 }, { rawCode: 'RM-SCREWS', qtyPerUnit: 4 }],
      };

      const required = bom[product];
      if (!required) return;

      for (const req of required) {
        const item = inventory.find(i => i.sku === req.rawCode || i.name.toLowerCase().includes(req.rawCode.toLowerCase().replace('rm-', '')));
        if (item) {
          item.quantity = Math.max(0, item.quantity - (req.qtyPerUnit * quantityProduced));
          await db.update(STORES.inventory, item);
        }
      }
    } catch (e) {
      console.error("Failed to deduct materials", e);
    }
  }

  // AI: Optimize production schedule
  async optimizeSchedule() {
    if (!this.aiEngine) {
      console.warn('AI Engine not available');
      return null;
    }

    const orders = await this.getProductionOrders({ status: 'pending' });
    const machines = await this.getMachines({ status: 'operational' });
    const workers = await this.getWorkers({ availability: 'available' });

    if (orders.length === 0) {
      return {
        schedule: [],
        insights: {
          message: 'No pending orders to schedule'
        }
      };
    }

    const result = await this.aiEngine.optimizeSchedule(orders, machines, workers);

    console.log('🤖 AI Schedule optimization complete');
    return result;
  }

  // Proprietary Heuristic Scheduler: Local job-shop scheduling
  async localOptimizeSchedule(orders, machines) {
    if (machines.length === 0) return 0;

    const unassigned = orders.filter(o => !o.assignedMachineId);
    if (unassigned.length === 0) return 0;

    // Sort by priority (descending) and due date (ascending)
    unassigned.sort((a, b) => {
      if (a.priority !== b.priority) return (b.priority || 0) - (a.priority || 0);
      return (a.dueDate || Infinity) - (b.dueDate || Infinity);
    });

    // Track when each machine is next available.
    // Start scheduling from the next whole hour.
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const baseTime = now.getTime();

    const machineAvailability = {};
    machines.forEach(m => { machineAvailability[m.id] = baseTime; });

    let scheduledCount = 0;

    for (const order of unassigned) {
      // Find eligible machines (match capability if required)
      let eligibleMachines = machines;
      if (order.requiredCapability) {
        eligibleMachines = machines.filter(m => m.capabilities?.includes(order.requiredCapability));
      }

      // If no machine has the specific capability, fallback to all machines
      // (in a strict environment we'd skip, but we fallback for robustness)
      if (eligibleMachines.length === 0) eligibleMachines = machines;

      // Pick machine with the earliest available time
      let selectedMachine = eligibleMachines[0];
      let earliestTime = machineAvailability[selectedMachine.id];

      for (let i = 1; i < eligibleMachines.length; i++) {
        const m = eligibleMachines[i];
        if (machineAvailability[m.id] < earliestTime) {
          selectedMachine = m;
          earliestTime = machineAvailability[m.id];
        }
      }

      // Calculate duration
      const throughput = selectedMachine.throughput || 50; // default 50 units/hr
      const durationHours = Math.max(1, Math.ceil((order.quantity || 1) / throughput));

      // Only schedule during working hours (8 AM to 8 PM) - simple heuristic
      let scheduledStart = new Date(earliestTime);
      if (scheduledStart.getHours() >= 20 || scheduledStart.getHours() < 8) {
        // Move to 8 AM next day
        if (scheduledStart.getHours() >= 20) {
          scheduledStart.setDate(scheduledStart.getDate() + 1);
        }
        scheduledStart.setHours(8, 0, 0, 0);
      }

      // Assign order
      order.assignedMachineId = selectedMachine.id;
      order.scheduledStartTime = scheduledStart.getTime();
      order.estimatedDuration = durationHours;
      order.status = 'scheduled';

      // Update machine availability
      const nextAvailable = new Date(scheduledStart.getTime());
      nextAvailable.setHours(nextAvailable.getHours() + durationHours);
      machineAvailability[selectedMachine.id] = nextAvailable.getTime();

      await db.update(STORES.productionOrders, order);
      scheduledCount++;
    }

    console.log(`⏱️ Proprietary Scheduler: Assigned ${scheduledCount} orders locally.`);
    return scheduledCount;
  }

  // Apply AI-generated schedule
  async applySchedule(schedule) {
    const createdShifts = [];

    for (const item of schedule) {
      if (item.status === 'scheduled') {
        const shift = await this.createShift({
          date: new Date(item.startTime).toISOString().split('T')[0],
          startTime: item.startTime,
          endTime: item.startTime + (item.duration * 3600000),
          machineId: item.machineId,
          workerId: item.workerId,
          orderId: item.orderId,
          plannedHours: item.duration,
          notes: 'AI-optimized schedule'
        });

        createdShifts.push(shift);
      }
    }

    console.log(`✅ Applied schedule: ${createdShifts.length} shifts created`);
    return createdShifts;
  }

  // Get production metrics
  async getProductionMetrics(period = 30) {
    const startDate = Date.now() - (period * 24 * 60 * 60 * 1000);

    const orders = await this.getProductionOrders();
    const shifts = await db.getAll(STORES.shifts);
    const machines = await this.getMachines();

    const periodOrders = orders.filter(o => o.createdAt >= startDate);
    const periodShifts = shifts.filter(s => s.date >= startDate);

    const completed = periodOrders.filter(o => o.status === 'completed').length;
    const inProgress = periodOrders.filter(o => o.status === 'in_progress').length;
    const pending = periodOrders.filter(o => o.status === 'pending').length;

    // Calculate machine utilization
    const totalMachineHours = machines.length * period * 24;
    const actualMachineHours = periodShifts.reduce((sum, s) => sum + (s.actualHours || 0), 0);
    // Fix: Handle division by zero if no machines
    const machineUtilization = totalMachineHours > 0 ? (actualMachineHours / totalMachineHours) * 100 : 0;

    // Calculate on-time delivery
    const completedWithDueDate = periodOrders.filter(o =>
      o.status === 'completed' && o.dueDate && o.completedAt
    );
    const onTime = completedWithDueDate.filter(o => o.completedAt <= o.dueDate).length;
    const onTimeRate = completedWithDueDate.length > 0
      ? (onTime / completedWithDueDate.length) * 100
      : 0;

    return {
      period: `${period} days`,
      orders: {
        total: periodOrders.length,
        completed,
        inProgress,
        pending
      },
      machineUtilization: Math.round(machineUtilization),
      onTimeDeliveryRate: Math.round(onTimeRate),
      shifts: periodShifts.length,
      insights: this.generateProductionInsights(machineUtilization, onTimeRate, pending)
    };
  }

  generateProductionInsights(utilization, onTimeRate, pendingOrders) {
    const insights = [];

    if (utilization < 50) {
      insights.push({
        type: 'warning',
        message: 'Low machine utilization detected',
        action: 'Consider taking on more orders or performing maintenance'
      });
    } else if (utilization > 85) {
      insights.push({
        type: 'info',
        message: 'High machine utilization',
        action: 'Monitor for capacity constraints'
      });
    }

    if (onTimeRate < 70) {
      insights.push({
        type: 'warning',
        message: 'Low on-time delivery rate',
        action: 'Review scheduling and capacity planning'
      });
    } else if (onTimeRate > 90) {
      insights.push({
        type: 'success',
        message: 'Excellent on-time delivery rate',
        action: null
      });
    }

    if (pendingOrders > 10) {
      insights.push({
        type: 'info',
        message: `${pendingOrders} orders pending`,
        action: 'Use AI schedule optimizer to plan production'
      });
    }

    return insights;
  }
}

export default SmartShift;
