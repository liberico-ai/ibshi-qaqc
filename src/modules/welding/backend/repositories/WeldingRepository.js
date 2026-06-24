import { Repository, pool } from '../../../../core/db.js';

// ── WPS ───────────────────────────────────────────────────────────
class WPSRepository extends Repository {
  constructor() { super('wld_wps', {}); }

  async findWithPqr(id) {
    const wps = await this.findOne(id);
    if (!wps) return null;
    const { rows } = await pool.query(
      'SELECT * FROM wld_pqr WHERE wps_id = $1 ORDER BY created_at',
      [id]
    );
    return { ...wps, pqrs: rows };
  }
}

// ── PQR ───────────────────────────────────────────────────────────
class PQRRepository extends Repository {
  constructor() { super('wld_pqr', {}); }
}

// ── Welders ───────────────────────────────────────────────────────
class WelderRepository extends Repository {
  constructor() { super('wld_welders', {}); }

  async findWithQuals(id) {
    const welder = await this.findOne(id);
    if (!welder) return null;
    const { rows } = await pool.query(
      'SELECT * FROM wld_welder_quals WHERE welder_id = $1 ORDER BY expiry_date NULLS LAST',
      [id]
    );
    return { ...welder, qualifications: rows };
  }

  async addQual(qual) {
    const { rows } = await pool.query(
      `INSERT INTO wld_welder_quals
        (welder_id, process, position, thickness_min, thickness_max,
         cert_no, qualified_date, expiry_date, continuity_last_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [qual.welder_id, qual.process ?? null, qual.position ?? null,
       qual.thickness_min ?? null, qual.thickness_max ?? null,
       qual.cert_no ?? null, qual.qualified_date ?? null,
       qual.expiry_date ?? null, qual.continuity_last_date ?? null]
    );
    return rows[0];
  }

  // Trả về các qualification sắp hết hạn trong `days` ngày tới (chưa hết hạn)
  async findExpiringQuals(days) {
    const { rows } = await pool.query(
      `SELECT q.*, w.welder_code, w.full_name
       FROM wld_welder_quals q
       JOIN wld_welders w ON w.id = q.welder_id
       WHERE q.expiry_date IS NOT NULL
         AND q.expiry_date >= CURRENT_DATE
         AND q.expiry_date <= CURRENT_DATE + ($1 || ' days')::interval
       ORDER BY q.expiry_date`,
      [String(days)]
    );
    return rows;
  }

  // Trạng thái chứng chỉ tổng hợp của 1 thợ hàn:
  // hết hạn nếu MỌI qual đều hết hạn (hoặc không có qual);
  // hợp lệ nếu có ít nhất 1 qual còn hiệu lực.
  async certStatus(welderId) {
    const { rows } = await pool.query(
      'SELECT expiry_date, continuity_last_date FROM wld_welder_quals WHERE welder_id = $1',
      [welderId]
    );
    return rows;
  }
}

// ── Weld maps ─────────────────────────────────────────────────────
class WeldMapRepository extends Repository {
  constructor() { super('wld_weld_maps', {}); }

  async findWithJoints(id) {
    const map = await this.findOne(id);
    if (!map) return null;
    const { rows } = await pool.query(
      `SELECT j.*, w.welder_code, w.full_name AS welder_name, ws.wps_no
       FROM wld_weld_joints j
       LEFT JOIN wld_welders w ON w.id = j.welder_id
       LEFT JOIN wld_wps ws ON ws.id = j.wps_id
       WHERE j.weld_map_id = $1
       ORDER BY j.joint_no`,
      [id]
    );
    return { ...map, joints: rows };
  }

  async addJoint(joint) {
    const { rows } = await pool.query(
      `INSERT INTO wld_weld_joints
        (weld_map_id, joint_no, wps_id, welder_id, ndt_required, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [joint.weld_map_id, joint.joint_no, joint.wps_id ?? null,
       joint.welder_id ?? null, joint.ndt_required ?? false,
       joint.status ?? 'PLANNED']
    );
    return rows[0];
  }
}

class WeldJointRepository extends Repository {
  constructor() { super('wld_weld_joints', {}); }
}

export const wpsRepo      = new WPSRepository();
export const pqrRepo      = new PQRRepository();
export const welderRepo   = new WelderRepository();
export const weldMapRepo  = new WeldMapRepository();
export const weldJointRepo = new WeldJointRepository();
