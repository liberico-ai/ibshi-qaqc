import { Repository, pool } from '../../../../core/db.js';

class StandardsRepository extends Repository {
  constructor() {
    super('qaqc_standards', {});
  }

  async search({ query, grp, tier, status, limit = 20, offset = 0 }) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) { conditions.push(`status = $${idx++}`); values.push(status); }
    if (grp)    { conditions.push(`grp = $${idx++}`);    values.push(grp); }
    if (tier)   { conditions.push(`tier = $${idx++}`);   values.push(tier); }

    let whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : 'WHERE TRUE';
    let orderClause = 'ORDER BY created_at DESC';

    if (query) {
      const tsQuery = `to_tsquery('english', $${idx++})`;
      const safeQ = query.trim().replace(/\s+/g, ' & ');
      values.push(safeQ);
      whereClause += ` AND to_tsvector('english', coalesce(full_text,'')||' '||coalesce(title,'')||' '||coalesce(code,'')) @@ ${tsQuery}`;
      orderClause = `ORDER BY ts_rank(to_tsvector('english', coalesce(full_text,'')||' '||coalesce(title,'')||' '||coalesce(code,'')), ${tsQuery}) DESC`;
    }

    const countResult = await pool.query(
      `SELECT count(*) FROM qaqc_standards ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query(
      `SELECT id, code, title, grp, tier, version, issued_date, status, created_at, updated_at
       FROM qaqc_standards ${whereClause} ${orderClause} LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return { data: dataResult.rows, total };
  }

  async getWithSpecs(id) {
    const [standards, chemical, mechanical, dimensional] = await Promise.all([
      pool.query('SELECT * FROM qaqc_standards WHERE id = $1', [id]),
      pool.query('SELECT * FROM qaqc_chemical_specs WHERE standard_id = $1', [id]),
      pool.query('SELECT * FROM qaqc_mechanical_specs WHERE standard_id = $1', [id]),
      pool.query('SELECT * FROM qaqc_dimensional_specs WHERE standard_id = $1', [id]),
    ]);
    if (!standards.rows[0]) return null;
    return {
      ...standards.rows[0],
      specs: { chemical: chemical.rows, mechanical: mechanical.rows, dimensional: dimensional.rows },
    };
  }

  async createWithSpecs({ standard, specs = {} }) {
    const record = await this.create(standard);
    const inserts = [];
    for (const row of specs.chemical ?? [])    inserts.push(pool.query('INSERT INTO qaqc_chemical_specs   (standard_id,grade,element,min_val,max_val,unit) VALUES ($1,$2,$3,$4,$5,$6)', [record.id, row.grade, row.element, row.min_val, row.max_val, row.unit]));
    for (const row of specs.mechanical ?? [])  inserts.push(pool.query('INSERT INTO qaqc_mechanical_specs  (standard_id,grade,property,min_val,max_val,unit) VALUES ($1,$2,$3,$4,$5,$6)', [record.id, row.grade, row.property, row.min_val, row.max_val, row.unit]));
    for (const row of specs.dimensional ?? []) inserts.push(pool.query('INSERT INTO qaqc_dimensional_specs (standard_id,grade,property,min_val,max_val,unit) VALUES ($1,$2,$3,$4,$5,$6)', [record.id, row.grade, row.property, row.min_val, row.max_val, row.unit]));
    await Promise.all(inserts);
    return record;
  }
}

export const standardsRepo = new StandardsRepository();
