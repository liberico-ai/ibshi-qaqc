import { Repository, pool } from '../../../../core/db.js';

class MDRRepository extends Repository {
  constructor() {
    super('mdr_dossiers', {});
  }

  async findAndCountList(filter, options) {
    const where = [];
    const params = [];
    if (filter.project_id) { params.push(filter.project_id); where.push(`d.project_id = $${params.length}`); }
    if (filter.status)     { params.push(filter.status);     where.push(`d.status = $${params.length}`); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM mdr_dossiers d ${whereClause}`, params
    );
    const total = countRes.rows[0].total;

    const dataParams = [...params, options.limit, options.offset];
    const { rows } = await pool.query(`
      SELECT d.*, p.code AS project_code, p.name AS project_name
      FROM mdr_dossiers d
      LEFT JOIN qaqc_projects p ON p.id = d.project_id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `, dataParams);

    return { data: rows, meta: { total, totalPages: options.limit ? Math.ceil(total / options.limit) : 1 } };
  }

  async findDetail(dossierId) {
    const [dossier, categories, documents] = await Promise.all([
      pool.query(`
        SELECT d.*, p.code AS project_code, p.name AS project_name
        FROM mdr_dossiers d
        LEFT JOIN qaqc_projects p ON p.id = d.project_id
        WHERE d.id = $1
      `, [dossierId]),
      pool.query('SELECT * FROM mdr_categories WHERE dossier_id = $1 ORDER BY order_no', [dossierId]),
      pool.query('SELECT * FROM mdr_documents WHERE dossier_id = $1 ORDER BY created_at', [dossierId]),
    ]);
    if (!dossier.rows[0]) return null;
    return { ...dossier.rows[0], categories: categories.rows, documents: documents.rows };
  }

  /** Lấy danh mục template 16 nhóm tiêu chuẩn. */
  async getCatalog() {
    const { rows } = await pool.query('SELECT * FROM mdr_category_catalog ORDER BY order_no');
    return rows;
  }

  async bulkInsertCategories(dossierId, catalog) {
    if (!catalog.length) return [];
    const params = [];
    const groups = catalog.map((c) => {
      params.push(dossierId, c.code, c.name_vi, c.order_no, c.required);
      const i = params.length;
      return `($${i - 4}, $${i - 3}, $${i - 2}, $${i - 1}, $${i})`;
    });
    const { rows } = await pool.query(
      `INSERT INTO mdr_categories (dossier_id, code, name_vi, order_no, required)
       VALUES ${groups.join(', ')} RETURNING *`,
      params
    );
    return rows;
  }

  async addDocument(doc) {
    const { rows } = await pool.query(
      `INSERT INTO mdr_documents (dossier_id, category_id, doc_name, file_link, source_module, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [doc.dossier_id, doc.category_id, doc.doc_name, doc.file_link ?? null,
       doc.source_module ?? 'manual', doc.status ?? (doc.file_link ? 'present' : 'missing')]
    );
    return rows[0];
  }

  async findDocument(docId) {
    const { rows } = await pool.query('SELECT * FROM mdr_documents WHERE id = $1', [docId]);
    return rows[0];
  }

  async updateDocument(docId, fields) {
    const sets = [];
    const params = [];
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue;
      params.push(v);
      sets.push(`${k} = $${params.length}`);
    }
    if (!sets.length) return this.findDocument(docId);
    sets.push('updated_at = now()');
    params.push(docId);
    const { rows } = await pool.query(
      `UPDATE mdr_documents SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0];
  }

  async updateCompletion(dossierId, pct, status) {
    const { rows } = await pool.query(
      `UPDATE mdr_dossiers SET completion_pct = $1, status = COALESCE($2, status), updated_at = now()
       WHERE id = $3 RETURNING *`,
      [pct, status ?? null, dossierId]
    );
    return rows[0];
  }

  /** Tài liệu thiếu thuộc các nhóm bắt buộc. */
  async missingDocuments(dossierId) {
    const { rows } = await pool.query(`
      SELECT c.id AS category_id, c.code, c.name_vi, c.required
      FROM mdr_categories c
      WHERE c.dossier_id = $1 AND c.required = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM mdr_documents d
          WHERE d.category_id = c.id AND d.status = 'present'
        )
      ORDER BY c.order_no
    `, [dossierId]);
    return rows;
  }

  async nextTransmittalNo(dossierId) {
    const year = new Date().getFullYear();
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM mdr_transmittals WHERE transmittal_no LIKE $1`,
      [`ILS-QAC-F13-${year}-%`]
    );
    const seq = String(rows[0].c + 1).padStart(4, '0');
    return `ILS-QAC-F13-${year}-${seq}`;
  }

  async addTransmittal(t) {
    const { rows } = await pool.query(
      `INSERT INTO mdr_transmittals (dossier_id, transmittal_no, client, purpose, doc_count, remarks, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [t.dossier_id, t.transmittal_no, t.client ?? null, t.purpose ?? null,
       t.doc_count ?? 0, t.remarks ?? null, t.issued_by ?? null]
    );
    return rows[0];
  }

  async listTransmittals(dossierId) {
    const { rows } = await pool.query(
      `SELECT t.*, u.full_name AS issuer_name
       FROM mdr_transmittals t
       LEFT JOIN sys_users u ON u.id = t.issued_by
       WHERE t.dossier_id = $1 ORDER BY t.issued_at DESC`,
      [dossierId]
    );
    return rows;
  }
}

export const mdrRepo = new MDRRepository();
