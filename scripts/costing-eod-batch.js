import { pool } from '../src/core/db.js';
import { CostingService } from '../src/modules/costing/backend/services/CostingService.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('costing:eod');

async function runBatch() {
  log.info('Starting Costing EOD Batch process...');
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Query COMPLETED trips for today
    // Or we could pass a date argument. For now, it defaults to today or any COMPLETED without costs.
    const { rows: trips } = await pool.query(`
      SELECT id FROM trp_delivery_trips 
      WHERE status = 'COMPLETED' AND DATE(trip_date) = $1
    `, [today]);

    log.info(\`Found \${trips.length} completed trips for \${today}\`);

    let successCount = 0;
    let failCount = 0;

    for (const trip of trips) {
      try {
        const result = await CostingService.calculateDeliveryCost(trip.id);
        if (result.success) {
          successCount++;
        } else {
          log.warn({ trip_id: trip.id, error: result.message }, 'Costing skipped for trip');
          failCount++;
        }
      } catch (err) {
        log.error({ trip_id: trip.id, error: err.message }, 'Failed to calculate cost for trip');
        failCount++;
      }
    }

    log.info(\`Costing EOD Batch completed. Success: \${successCount}, Failed: \${failCount}\`);
  } catch (err) {
    log.error({ error: err.message }, 'EOD Batch failed');
  } finally {
    await pool.end();
  }
}

runBatch();
