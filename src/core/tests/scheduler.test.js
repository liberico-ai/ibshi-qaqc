import test from 'node:test';
import assert from 'node:assert';
import { runBatchOrdersForRouting, runEodReconciliation } from '../scheduler.js';
import { pool } from '../db.js';
import { CostingService } from '../../modules/costing/backend/services/CostingService.js';

test('Core: Scheduler Jobs', async (t) => {
  const originalQuery = pool.query;
  const originalCalculateCost = CostingService.calculateDeliveryCost;

  t.after(() => {
    pool.query = originalQuery;
    CostingService.calculateDeliveryCost = originalCalculateCost;
  });

  await t.test('runBatchOrdersForRouting triggers batch generation correctly', async () => {
    let mockQueryCalled = false;
    let batchAssignReqPayload = null;

    pool.query = async (sql, params) => {
      // Mock acquire lock
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ got_lock: true }] };
      if (sql.includes('pg_advisory_unlock')) return { rows: [] };
      
      if (sql.includes('SELECT id FROM trp_orders WHERE status')) {
        mockQueryCalled = true;
        return { rows: [{ id: 1 }, { id: 2 }] };
      }
      return { rows: [] };
    };


    await runBatchOrdersForRouting();

    assert.strictEqual(mockQueryCalled, true);
    assert.deepStrictEqual(batchAssignReqPayload.order_ids, [1, 2]);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    assert.strictEqual(batchAssignReqPayload.requested_delivery_date, tomorrow.toISOString().split('T')[0]);
  });

  await t.test('runEodReconciliation handles trip query and calculates cost correctly', async () => {
    let reconciliationLogArgs = null;
    let costCalculatedTrips = [];

    pool.query = async (sql, params) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ got_lock: true }] };
      if (sql.includes('pg_advisory_unlock')) return { rows: [] };

      if (sql.includes('SELECT id, trip_code,')) {
        return { rows: [
          { id: 101, total_value: 500000, total_collected: 500000 },
          { id: 102, total_value: 300000, total_collected: 280000 }
        ]};
      }

      if (sql.includes('INSERT INTO trp_reconciliation_logs')) {
        reconciliationLogArgs = params;
        return { rows: [] };
      }

      return { rows: [] };
    };

    CostingService.calculateDeliveryCost = async (tripId) => {
      costCalculatedTrips.push(tripId);
      return { success: true };
    };

    await runEodReconciliation();

    assert.deepStrictEqual(costCalculatedTrips, [101, 102]);
    
    // Check inserted logs
    assert.ok(reconciliationLogArgs);
    assert.strictEqual(reconciliationLogArgs[1], 2); // 2 trips
    assert.strictEqual(reconciliationLogArgs[2], 800000); // 500k + 300k
    assert.strictEqual(reconciliationLogArgs[3], 780000); // 500k + 280k
    assert.strictEqual(reconciliationLogArgs[4], -20000); // discrepancy = collected - value
    assert.strictEqual(reconciliationLogArgs[5], 'DISCREPANCY'); // status
  });
});
