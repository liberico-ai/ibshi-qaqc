import { materialCertRepo } from '../repositories/MaterialCertRepository.js';
import { pool } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';

export class MIRCrossCheckService {
  static async crossCheck(mtcId, standardId) {
    const cert = await materialCertRepo.findById(mtcId);
    if (!cert) throw new AppError(404, 'MTC not found');

    const stdId = standardId ?? cert.standard_id;
    if (!stdId) throw new AppError(400, 'No standard_id associated with this MTC');

    const [chemSpecs, mechSpecs] = await Promise.all([
      pool.query('SELECT * FROM qaqc_chemical_specs WHERE standard_id=$1', [stdId]),
      pool.query('SELECT * FROM qaqc_mechanical_specs WHERE standard_id=$1', [stdId]),
    ]);

    const ocr = cert.ocr_extracted ?? {};
    const results = [];

    for (const spec of chemSpecs.rows) {
      const actual = _findValue(ocr.chemical, spec.element);
      results.push(_compare('chemical', spec.element, actual, spec.min_val, spec.max_val, spec.unit));
    }

    for (const spec of mechSpecs.rows) {
      const actual = _findValue(ocr.mechanical, spec.property);
      results.push(_compare('mechanical', spec.property, actual, spec.min_val, spec.max_val, spec.unit));
    }

    const failed  = results.filter(r => r.status === 'FAIL').length;
    const warned  = results.filter(r => r.status === 'WARN').length;
    const passed  = results.filter(r => r.status === 'PASS').length;
    const missing = results.filter(r => r.status === 'MISSING').length;

    return {
      results,
      summary: { total: results.length, passed, failed, warned, missing },
      confidence: 1.0,
      ok: failed === 0,
    };
  }
}

function _findValue(section, key) {
  if (!section || typeof section !== 'object') return null;
  const k = key.toLowerCase();
  for (const [prop, val] of Object.entries(section)) {
    if (prop.toLowerCase() === k) return parseFloat(val);
  }
  return null;
}

function _compare(category, property, actual, minVal, maxVal, unit) {
  if (actual === null || actual === undefined || isNaN(actual)) {
    return { category, property, actual: null, min_val: minVal, max_val: maxVal, unit, status: 'MISSING' };
  }
  const min = minVal != null ? parseFloat(minVal) : null;
  const max = maxVal != null ? parseFloat(maxVal) : null;

  let status = 'PASS';
  if (min !== null && actual < min) status = 'FAIL';
  else if (max !== null && actual > max) status = 'FAIL';

  return { category, property, actual, min_val: minVal, max_val: maxVal, unit, status };
}
