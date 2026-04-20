import argon2 from 'argon2';
import { pool } from '../src/core/db.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('seed');

const hashPassword = async (password) => {
  return await argon2.hash(password);
};

async function seedSystem() {
  log.info('--- Seeding System Module ---');
  const passwordHash = await hashPassword('123456');
  
  const insertUser = `
    INSERT INTO sys_users (full_name, username, password_hash, is_active)
    VALUES ($1, $2, $3, true)
    ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id
  `;
  
  const driverQuery = await pool.query(insertUser, ['Tài Xế A', 'driver01', passwordHash]);
  const adminQuery = await pool.query(insertUser, ['Quản lý B', 'manager01', passwordHash]);

  return {
    driverId: driverQuery.rows[0].id,
    adminId: adminQuery.rows[0].id
  };
}

async function seedRoutingAndMembers(driverId) {
  log.info('--- Seeding Routing & Members Modules ---');

  const regionQuery = await pool.query(`
    INSERT INTO rou_regions (region_code, region_name)
    VALUES ('HN', 'Hà Nội'), ('HCM', 'Hồ Chí Minh')
    ON CONFLICT (region_code) DO UPDATE SET region_name = EXCLUDED.region_name
    RETURNING id, region_code
  `);
  
  const hnId = regionQuery.rows.find(r => r.region_code === 'HN').id;

  const whQuery = await pool.query(`
    INSERT INTO rou_warehouses (warehouse_code, warehouse_name, region_id, capacity_pallets)
    VALUES ('WH-HN-01', 'Kho Tổng HN', $1, 1000)
    ON CONFLICT (warehouse_code) DO UPDATE SET warehouse_name = EXCLUDED.warehouse_name
    RETURNING id
  `, [hnId]);
  const whId = whQuery.rows[0].id;

  const vehicleQuery = await pool.query(`
    INSERT INTO rou_vehicles (vehicle_code, license_plate, vehicle_type, max_weight_kg, warehouse_id, driver_id)
    VALUES ('V-TRUCK-01', '29C-12345', 'TRUCK_5T', 5000, $1, $2)
    ON CONFLICT (vehicle_code) DO UPDATE SET license_plate = EXCLUDED.license_plate
    RETURNING id
  `, [whId, driverId]);
  const vId = vehicleQuery.rows[0].id;

  const routeQuery = await pool.query(`
    INSERT INTO rou_routes (route_code, route_name, region_id, vehicle_type, estimated_km)
    VALUES ('RT-HN-01', 'Tuyến Nội Thành HN', $1, 'TRUCK_5T', 50.5)
    ON CONFLICT (route_code) DO UPDATE SET route_name = EXCLUDED.route_name
    RETURNING id
  `, [hnId]);
  const rId = routeQuery.rows[0].id;

  const memberQuery = await pool.query(`
    INSERT INTO mem_members (phone_number, full_name, address, tier)
    VALUES ('0901234567', 'Đại lý Cấp 1 HN', 'Thanh Xuân, HN', 'T1'),
           ('0909876543', 'Nhà phân phối B', 'Cầu Giấy, HN', 'T2')
    ON CONFLICT (phone_number) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id, phone_number
  `);

  return { routeId: rId, vehicleId: vId, members: memberQuery.rows };
}

async function seedCostingAndLoyalty(members) {
  log.info('--- Seeding Costing & Loyalty Modules (100+ Rows) ---');
  
  await pool.query(`TRUNCATE loy_points CASCADE`);
  await pool.query(`TRUNCATE cst_sku_cost_components CASCADE`);
  
  if (members.length > 0) {
    for (let m = 0; m < members.length; m++) {
      const memberId = members[m].id;
      for (let i = 1; i <= 55; i++) { // ~110 rows sum
        const randomPoints = Math.floor(Math.random() * 50) + 10;
        await pool.query(`
          INSERT INTO loy_points (member_id, points_earned, action_type)
          VALUES ($1, $2, 'GROUP_ORDER')
        `, [memberId, randomPoints]);
      }

      await pool.query(`
        INSERT INTO loy_member_stats (member_id, avg_order_value, avg_frequency_days)
        VALUES ($1, 5000000, 7)
        ON CONFLICT (member_id) DO UPDATE SET avg_order_value = EXCLUDED.avg_order_value
      `, [memberId]);
    }
  }

  for (let i = 1; i <= 105; i++) {
    const cost_inbound_pct = parseFloat((Math.random() * 0.05).toFixed(4));
    const cost_storage_pct = parseFloat((Math.random() * 0.02).toFixed(4));
    const cost_pickpack_pct = parseFloat((Math.random() * 0.03).toFixed(4));
    const cost_loading_pct = parseFloat((Math.random() * 0.01).toFixed(4));
    const cost_lastmile_pct = parseFloat((Math.random() * 0.05).toFixed(4));
    const cost_collection_pct = parseFloat((Math.random() * 0.01).toFixed(4));
    
    const total_cts = cost_inbound_pct + cost_storage_pct + cost_pickpack_pct + cost_loading_pct + cost_lastmile_pct + cost_collection_pct;
    const total_cts_pct = parseFloat(total_cts.toFixed(4));
    const gross_margin_pct = parseFloat((0.2 + Math.random() * 0.2).toFixed(4));
    const net_margin_pct = parseFloat((gross_margin_pct - total_cts_pct).toFixed(4));

    await pool.query(`
      INSERT INTO cst_sku_cost_components (
        sku_id, sku_tier, period, 
        cost_inbound_pct, cost_storage_pct, cost_pickpack_pct, 
        cost_loading_pct, cost_lastmile_pct, cost_collection_pct, 
        total_cts_pct, gross_margin_pct, net_margin_pct
      )
      VALUES (gen_random_uuid(), 'T1', CURRENT_DATE, $1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      cost_inbound_pct, cost_storage_pct, cost_pickpack_pct, 
      cost_loading_pct, cost_lastmile_pct, cost_collection_pct, 
      total_cts_pct, gross_margin_pct, net_margin_pct
    ]);
  }
}

async function seedQAQC() {
  log.info('--- Seeding QAQC Module ---');

  // Projects
  await pool.query(`
    INSERT INTO qaqc_projects (code, name, customer, status, erp_source_id)
    VALUES
      ('IBS-2024-001', 'Offshore Platform Alpha', 'PetroVN',   'ACTIVE', 'ERP-001'),
      ('IBS-2024-002', 'Pipeline Extension Beta',  'GasVN',    'ACTIVE', 'ERP-002'),
      ('IBS-2024-003', 'Storage Tank Gamma',        'OilCorp',  'ACTIVE', 'ERP-003')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, synced_at = now()
  `);

  // Standards
  const { rows: stdRows } = await pool.query(`
    INSERT INTO qaqc_standards (code, title, grp, tier, version, issued_date, status, full_text)
    VALUES
      ('ASTM-A36', 'Standard Specification for Carbon Structural Steel', 'ASTM', 1, 'A36/A36M-19', '2019-01-01', 'ACTIVE',
       'carbon structural steel plates shapes bars hot rolled'),
      ('ASTM-A53', 'Standard Specification for Pipe Steel, Black and Hot-Dipped Zinc-Coated Welded and Seamless', 'ASTM', 1, 'A53/A53M-20', '2020-01-01', 'ACTIVE',
       'pipe steel welded seamless zinc galvanized')
    ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title
    RETURNING id, code
  `);

  const a36Id = stdRows.find(r => r.code === 'ASTM-A36')?.id;
  if (a36Id) {
    await pool.query(`
      INSERT INTO qaqc_chemical_specs (standard_id, grade, element, min_val, max_val, unit)
      VALUES
        ($1, 'A36', 'C',  NULL, 0.26, '%'),
        ($1, 'A36', 'Mn', NULL, NULL, '%'),
        ($1, 'A36', 'P',  NULL, 0.04, '%'),
        ($1, 'A36', 'S',  NULL, 0.05, '%')
      ON CONFLICT DO NOTHING
    `, [a36Id]);

    await pool.query(`
      INSERT INTO qaqc_mechanical_specs (standard_id, grade, property, min_val, max_val, unit)
      VALUES
        ($1, 'A36', 'Tensile Strength',      400, 550,  'MPa'),
        ($1, 'A36', 'Yield Strength',         250, NULL, 'MPa'),
        ($1, 'A36', 'Elongation in 8 inches',  20, NULL, '%')
      ON CONFLICT DO NOTHING
    `, [a36Id]);
  }

  // Provider instances (mock mode)
  await pool.query(`
    INSERT INTO sys_providers (name, class_name, module, config, is_active, description)
    VALUES
      ('ibshi ERP Projects (Mock)', 'ibshi-erp-projects', 'qaqc', '{}', true, 'Mock ERP project sync for dev'),
      ('ibshi ERP Webhook (Mock)',  'ibshi-erp-webhook',  'qaqc', '{}', true, 'Mock ERP outbound webhook for dev'),
      ('AI Standards Lookup (Rule-based)', 'ai-standards-lookup', 'qaqc', '{}', true, 'Rule-based FTS, no LLM'),
      ('AI MTC Cross-Check (Rule-based)',  'ai-mtc-crosscheck',  'qaqc', '{}', true, 'Rule-based range compare, no LLM')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  `);
}

async function run() {
  try {
    await pool.query('BEGIN');

    const { driverId } = await seedSystem();
    const { routeId, vehicleId, members } = await seedRoutingAndMembers(driverId);
    await seedCostingAndLoyalty(members);
    await seedQAQC();

    await pool.query('COMMIT');
    log.info('✅ Seed data mẫu thành công!');
  } catch (error) {
    await pool.query('ROLLBACK');
    log.error(error, '❌ Có lỗi trong quá trình seed, Rollback!');
  } finally {
    await pool.end();
  }
}

run();
