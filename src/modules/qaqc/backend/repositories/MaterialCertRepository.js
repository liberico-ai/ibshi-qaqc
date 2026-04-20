import { pool } from '../../../../core/db.js';

class MaterialCertRepository {
  async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM qaqc_material_certs WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  }

  async updateOcrExtracted(id, ocrData) {
    await pool.query(
      'UPDATE qaqc_material_certs SET ocr_extracted = $1 WHERE id = $2',
      [JSON.stringify(ocrData), id]
    );
  }
}

export const materialCertRepo = new MaterialCertRepository();
