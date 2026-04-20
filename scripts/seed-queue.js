import { pool } from '../src/core/db.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('seed-queue');

async function seedOrdersQueue() {
  try {
    log.info('--- Seeding 100 Orders into Queue (trp_orders) ---');
    
    // Get all regions, routes, and members for randomization
    const { rows: regions } = await pool.query('SELECT id FROM rou_regions');
    const regionIds = regions.map(r => r.id);

    const { rows: routes } = await pool.query('SELECT id FROM rou_routes');
    const routeIds = routes.map(r => r.id);

    const { rows: members } = await pool.query('SELECT id FROM mem_members');
    const memberIds = members.map(m => m.id);

    const { rows: users } = await pool.query('SELECT id FROM sys_users LIMIT 1');
    const createdBy = users.length > 0 ? users[0].id : null;

    await pool.query('BEGIN');

    for (let i = 1; i <= 100; i++) {
        const orderCode = `ORD-Q-${Date.now()}-${String(i).padStart(3, '0')}`;
        const weight = Math.floor(Math.random() * 50) + 10; // 10-60 kg
        const value = Math.floor(Math.random() * 5000000) + 500000; // 500k - 5.5M
        
        // Randomly set the delivery date to today, tomorrow, or the day after
        const daysAdd = Math.floor(Math.random() * 3);
        const date = new Date();
        date.setDate(date.getDate() + daysAdd);
        const requestedDeliveryDate = date.toISOString().split('T')[0];

        // Randomly assign to an existing route, region, and member
        const routeId = routeIds.length > 0 ? routeIds[Math.floor(Math.random() * routeIds.length)] : null;
        const regionId = regionIds.length > 0 ? regionIds[Math.floor(Math.random() * regionIds.length)] : null;
        const memberId = memberIds.length > 0 ? memberIds[Math.floor(Math.random() * memberIds.length)] : 'ORD-MEMBER-TEST';

        await pool.query(`
            INSERT INTO trp_orders (order_code, member_id, route_id, region_id, weight_kg, value, status, requested_delivery_date, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)
        `, [orderCode, memberId, routeId, regionId, weight, value, requestedDeliveryDate, createdBy]);
    }

    await pool.query('COMMIT');
    log.info('✅ Successfully seeded 100 orders into trp_orders!');

  } catch (err) {
    await pool.query('ROLLBACK');
    log.error('❌ Error seeding order queue:', err);
  } finally {
    pool.end();
  }
}

seedOrdersQueue();
