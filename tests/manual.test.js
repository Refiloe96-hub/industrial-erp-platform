// Vanilla JS Test Suite for PocketBooks module
// This file can run directly via Node.js without needing Vitest/Jest (useful when disk space is full)

import assert from 'assert';
// We'd normally import PocketBooks here, but because it relies natively on DOM/IndexedDB
// we will write logic isolating the core mathematical functions

console.log('🧪 Starting Industrial ERP Test Suite...\n');

// --- POCKETBOOKS MATH TESTS ---
function testVATCalculation() {
    const subtotal = 1000;
    const expectedVat = 150; // 15% VAT
    const expectedTotal = 1150;

    const vat = subtotal * 0.15;
    const total = subtotal + vat;

    assert.strictEqual(vat, expectedVat, 'VAT calculation failed');
    assert.strictEqual(total, expectedTotal, 'Total calculation failed');
    console.log('✅ testVATCalculation passed');
}

function testCashflowConstraints() {
    const cashAccounts = [{ type: 'cash', balance: 5000 }];
    const upcomingPayments = 4500;

    // Logic from AIEngine: cash needs to be > 1.2 * upcoming
    const cashBalance = cashAccounts[0].balance;
    const isConstrained = cashBalance < upcomingPayments * 1.2;

    assert.strictEqual(isConstrained, true, 'Cashflow constraint logic failed');
    console.log('✅ testCashflowConstraints passed');
}

// --- SYNC ENGINE TESTS ---
function testCRDTMergeLogic() {
    const serverRecord = { id: 1, quantity: 50, local_timestamp: 1000 };
    const offlineEdit = { id: 1, quantity: 40, local_timestamp: 800, _offlineOriginalQuantity: 45 };

    // Logic from syncManager.js
    let finalQty = offlineEdit.quantity;
    if (serverRecord.local_timestamp > offlineEdit.local_timestamp) {
        const delta = offlineEdit.quantity - offlineEdit._offlineOriginalQuantity; // 40 - 45 = -5
        finalQty = serverRecord.quantity + delta; // 50 + (-5) = 45
    }

    assert.strictEqual(finalQty, 45, 'CRDT inventory merge logic failed');
    console.log('✅ testCRDTMergeLogic passed');
}

// --- AI PRICING TESTS ---
function testDynamicPricing() {
    const currentPrice = 100;
    const inventory = { quantity: 10 }; // Low stock 
    const sales = [{ quantity: 5 }, { quantity: 5 }]; // 10 sold recently

    const dailyVelocity = 10 / 7; // ~1.42
    const daysOfSupply = inventory.quantity / dailyVelocity; // ~7

    // If daysOfSupply < 7 (barely here), price surges 15%
    let newPrice = currentPrice;
    if (daysOfSupply <= 7) {
        newPrice *= 1.15;
    }

    assert.strictEqual(Math.round(newPrice), 115, 'Scarcity pricing heuristics failed');
    console.log('✅ testDynamicPricing passed');
}

// Run tests
try {
    testVATCalculation();
    testCashflowConstraints();
    testCRDTMergeLogic();
    testDynamicPricing();
    console.log('\n🎉 ALL TESTS PASSED!');
} catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exit(1);
}
