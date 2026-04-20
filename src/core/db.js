import pg from 'pg';
import 'dotenv/config';
import { createLogger } from './logger.js';
import { hooks } from './hooks.js'; // static import — no circular dep
import { auditLog } from './audit-log.js';
import { getRequestContext } from './request-context.js';

const log = createLogger('db');

const COLUMN_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
function validateColumns(keys) {
  for (const key of keys) {
    if (!COLUMN_REGEX.test(key)) {
      throw new Error(`Invalid column name: ${key}`);
    }
  }
}

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || '';
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

// ── Transaction helper ──────────────────────────────────────────
/**
 * Run a callback inside a DB transaction (BEGIN / COMMIT / ROLLBACK).
 *
 * @param {(client: pg.PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 *
 * Usage:
 *   const user = await transaction(async (client) => {
 *     const { rows } = await client.query('INSERT INTO ... RETURNING *', [...]);
 *     await client.query('INSERT INTO ...', [...]);
 *     return rows[0];
 *   });
 */
export async function transaction(callback) {
  const client = await pool.connect();
  const ctx = getRequestContext();
  const isOutermost = ctx && !ctx.txClient;

  if (isOutermost) {
    ctx.txClient = client;
    ctx.auditBuffer = [];
  }

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');

    if (isOutermost) {
      const buffer = ctx.auditBuffer;
      ctx.txClient = null;
      ctx.auditBuffer = null;
      for (const entry of buffer) auditLog._write(entry);
    }

    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    if (isOutermost) {
      ctx.txClient = null;
      ctx.auditBuffer = null;
    }
    throw e;
  } finally {
    client.release();
  }
}

// ── Repository (mini-ORM) ────────────────────────────────────────
export class Repository {

  /**
   * @param {string} tableName
   * @param {Object}  [options]
   * @param {string[]} [options.sensitiveFields] - Fields to strip in sanitize()
   * @param {boolean}  [options.trackActor]      - Auto-fill created_by/updated_by from request context
   */
  constructor(tableName, options = {}) {
    this.tableName = tableName;
    this.sensitiveFields = options.sensitiveFields || [];
    this.trackActor = options.trackActor === true;
  }

  // ── Actor injection (created_by / updated_by) ────────────────
  _actorId() {
    if (!this.trackActor) return null;
    const ctx = getRequestContext();
    return ctx?.userId ?? null;
  }

  _withCreatedBy(data) {
    const actor = this._actorId();
    if (actor === null) return data;
    const out = { ...data };
    if (out.created_by === undefined) out.created_by = actor;
    if (out.updated_by === undefined) out.updated_by = actor;
    return out;
  }

  _withUpdatedBy(data) {
    const actor = this._actorId();
    if (actor === null) return data;
    if (data.updated_by !== undefined) return data;
    return { ...data, updated_by: actor };
  }

  // ── Sanitize (strip sensitive fields) ───────────────────────
  /**
   * Remove sensitive fields from a single record before sending to client.
   */
  sanitize(record) {
    if (!record || this.sensitiveFields.length === 0) return record;
    const copy = { ...record };
    for (const field of this.sensitiveFields) {
      delete copy[field];
    }
    return copy;
  }

  /**
   * Sanitize an array of records.
   */
  sanitizeAll(records) {
    return records.map(r => this.sanitize(r));
  }

  // ── Query ───────────────────────────────────────────────────
  async query(text, params) {
    const ctx = getRequestContext();
    const executor = ctx?.txClient ?? pool;   // join active transaction if any

    const start = Date.now();
    const res = await executor.query(text, params);
    const duration = Date.now() - start;
    const summary = text.trim().substring(0, 80);
    if (/^\s*DELETE/i.test(text)) {
      log.info({ duration, rows: res.rowCount, params }, `DELETE: ${summary}`);
    } else {
      log.debug({ duration, rows: res.rowCount }, summary);
    }
    return res;
  }

  // ── Query Builder Helper ────────────────────────────────────
  _buildWhereClause(conditions, options) {
    const params = [];
    const whereParts = [];

    const keys = Object.keys(conditions);
    validateColumns(keys);
    for (const key of keys) {
      params.push(conditions[key]);
      whereParts.push(`${key} = $${params.length}`);
    }

    if (options.search && options.searchFields && options.searchFields.length > 0) {
      validateColumns(options.searchFields);
      params.push(`%${options.search}%`);
      const searchClause = options.searchFields.map(field => `CAST(${field} AS TEXT) ILIKE $${params.length}`).join(' OR ');
      whereParts.push(`(${searchClause})`);
    }

    return { params, clause: whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '' };
  }

  // ── Find (with pagination) ─────────────────────────────────
  async find(conditions = {}, options = {}) {
    let text = `SELECT * FROM ${this.tableName}`;
    const { params, clause } = this._buildWhereClause(conditions, options);
    
    if (clause) {
      text += ` ${clause}`;
    }

    if (options.orderBy) {
      const parts = options.orderBy.trim().split(/\s+/);
      const column = parts[0];
      validateColumns([column]);
      const direction = parts[1]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      text += ` ORDER BY ${column} ${direction}`;
    }

    if (options.limit) {
      params.push(options.limit);
      text += ` LIMIT $${params.length}`;
    }

    if (options.offset) {
      params.push(options.offset);
      text += ` OFFSET $${params.length}`;
    }

    const { rows } = await this.query(text, params);
    return rows;
  }

  // ── Find One ───────────────────────────────────────────────
  async findOne(id) {
    const { rows } = await this.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return rows[0];
  }

  // ── Find And Count ─────────────────────────────────────────
  async findAndCount(conditions = {}, options = {}) {
    // 1. Fetch data
    const rows = await this.find(conditions, options);
    
    // 2. Count total
    const { params, clause } = this._buildWhereClause(conditions, options);
    const countText = `SELECT COUNT(*) as exact_count FROM ${this.tableName} ${clause}`;
    
    const countRes = await this.query(countText, params);
    const total = parseInt(countRes.rows[0].exact_count, 10);
    
    return { 
      data: rows, 
      meta: {
        total,
        page: options.page || 1,
        limit: options.limit || total,
        totalPages: options.limit ? Math.ceil(total / options.limit) : 1
      }
    };
  }

  // ── Create ─────────────────────────────────────────────────
  async create(data) {
    const withActor = this._withCreatedBy(data);
    const modifiedData = await hooks.applyFilters(`before_create_${this.tableName}`, withActor);

    const keys = Object.keys(modifiedData);
    validateColumns(keys);
    const values = Object.values(modifiedData);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const text = `
      INSERT INTO ${this.tableName} (
        ${keys.join(', ')}
      ) VALUES (${placeholders})
      RETURNING *
    `;

    const { rows } = await this.query(text, values);
    const createdRecord = rows[0];

    await hooks.doAction(`after_create_${this.tableName}`, createdRecord);

    auditLog.log({ action: 'insert', tableName: this.tableName, entityId: createdRecord?.id, newData: createdRecord });

    return createdRecord;
  }

  // ── Update ─────────────────────────────────────────────────
  async update(id, data) {
    const withActor = this._withUpdatedBy(data);
    const modifiedData = await hooks.applyFilters(`before_update_${this.tableName}`, withActor, id);
    delete modifiedData.updated_at; // Prevent "multiple assignments to same column"

    const keys = Object.keys(modifiedData);
    validateColumns(keys);
    const values = Object.values(modifiedData);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    // ID is the last param
    values.push(id);

    const text = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;

    const { rows } = await this.query(text, values);
    const updatedRecord = rows[0];

    await hooks.doAction(`after_update_${this.tableName}`, updatedRecord);

    auditLog.log({ action: 'update', tableName: this.tableName, entityId: id, newData: updatedRecord });

    return updatedRecord;
  }

  // ── Delete ─────────────────────────────────────────────────
  async delete(id) {
    await hooks.doAction(`before_delete_${this.tableName}`, id);

    const { rows } = await this.query(`DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`, [id]);
    const deletedRecord = rows[0];

    await hooks.doAction(`after_delete_${this.tableName}`, deletedRecord);

    auditLog.log({ action: 'delete', tableName: this.tableName, entityId: id });

    return deletedRecord;
  }

  // ── Bulk Create ────────────────────────────────────────────
  /**
   * INSERT nhiều rows trong 1 câu lệnh. Tất cả rows phải cùng bộ keys.
   * @param {object[]} rows
   * @returns {Promise<object[]>} inserted records
   */
  async bulkCreate(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const withActor = rows.map(r => this._withCreatedBy(r));
    const keys = Object.keys(withActor[0]);
    validateColumns(keys);

    const params = [];
    const valueGroups = withActor.map(row => {
      const placeholders = keys.map(k => {
        params.push(row[k]);
        return `$${params.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    const text = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES ${valueGroups.join(', ')}
      RETURNING *
    `;

    const { rows: inserted } = await this.query(text, params);

    for (const rec of inserted) {
      auditLog.log({ action: 'insert', tableName: this.tableName, entityId: rec?.id, newData: rec });
    }

    return inserted;
  }

  // ── Update Where ───────────────────────────────────────────
  /**
   * UPDATE với điều kiện tùy ý (không chỉ theo id).
   * @param {object} conditions - { column: value } pairs (equality only)
   * @param {object} data - fields to update
   * @returns {Promise<object[]>} updated records
   */
  async updateWhere(conditions, data) {
    const withActor = this._withUpdatedBy(data);
    const setKeys = Object.keys(withActor);
    const whereKeys = Object.keys(conditions);
    if (setKeys.length === 0) throw new Error('updateWhere: empty data');
    if (whereKeys.length === 0) throw new Error('updateWhere: empty conditions (use updateAll if intentional)');
    validateColumns(setKeys);
    validateColumns(whereKeys);

    const values = [];
    const setClause = setKeys.map(k => { values.push(withActor[k]); return `${k} = $${values.length}`; }).join(', ');
    const whereClause = whereKeys.map(k => { values.push(conditions[k]); return `${k} = $${values.length}`; }).join(' AND ');

    const text = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE ${whereClause}
      RETURNING *
    `;

    const { rows } = await this.query(text, values);

    for (const rec of rows) {
      auditLog.log({ action: 'update', tableName: this.tableName, entityId: rec?.id, newData: rec });
    }

    return rows;
  }

  // ── Delete Where ───────────────────────────────────────────
  /**
   * DELETE với điều kiện tùy ý.
   * @param {object} conditions - { column: value } pairs
   * @returns {Promise<object[]>} deleted records
   */
  async deleteWhere(conditions) {
    const whereKeys = Object.keys(conditions);
    if (whereKeys.length === 0) throw new Error('deleteWhere: empty conditions');
    validateColumns(whereKeys);

    const values = whereKeys.map(k => conditions[k]);
    const whereClause = whereKeys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');

    const { rows } = await this.query(
      `DELETE FROM ${this.tableName} WHERE ${whereClause} RETURNING *`,
      values
    );

    for (const rec of rows) {
      auditLog.log({ action: 'delete', tableName: this.tableName, entityId: rec?.id });
    }

    return rows;
  }

  // ── Upsert ─────────────────────────────────────────────────
  /**
   * INSERT ... ON CONFLICT (conflictColumns) DO UPDATE SET ...
   * @param {object} data
   * @param {string[]} conflictColumns - unique/PK columns gây conflict
   * @param {string[]} [mergeColumns] - columns được update khi conflict (default: tất cả keys của data, trừ conflictColumns)
   * @returns {Promise<object>} inserted/updated record
   */
  async upsert(data, conflictColumns, mergeColumns) {
    const withActor = this._withCreatedBy(data);
    const keys = Object.keys(withActor);
    validateColumns(keys);
    validateColumns(conflictColumns);

    const values = Object.values(withActor);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    // On conflict, never overwrite created_by — only updated_by changes
    const setCols = mergeColumns ?? keys.filter(k => !conflictColumns.includes(k) && k !== 'created_by');
    validateColumns(setCols);
    const setClause = setCols.length > 0
      ? setCols.map(k => `${k} = EXCLUDED.${k}`).join(', ') + ', updated_at = NOW()'
      : 'updated_at = NOW()';

    const text = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (${conflictColumns.join(', ')})
      DO UPDATE SET ${setClause}
      RETURNING *, (xmax = 0) AS _inserted
    `;

    const { rows } = await this.query(text, values);
    const record = rows[0];
    const isInsert = record?._inserted;
    delete record._inserted;

    auditLog.log({
      action: isInsert ? 'insert' : 'update',
      tableName: this.tableName,
      entityId: record?.id,
      newData: record,
    });

    return record;
  }

  // ── Count / Exists ─────────────────────────────────────────
  async count(conditions = {}) {
    const { params, clause } = this._buildWhereClause(conditions, {});
    const { rows } = await this.query(`SELECT COUNT(*)::int AS c FROM ${this.tableName} ${clause}`, params);
    return rows[0].c;
  }

  async exists(conditions = {}) {
    const { params, clause } = this._buildWhereClause(conditions, {});
    const { rows } = await this.query(`SELECT 1 FROM ${this.tableName} ${clause} LIMIT 1`, params);
    return rows.length > 0;
  }

  // ── Increment ──────────────────────────────────────────────
  /**
   * UPDATE SET field = field + delta WHERE id = ?
   * Dùng cho counter fields: failed_login_count, view_count, ...
   */
  async increment(id, field, delta = 1) {
    validateColumns([field]);
    const actor = this._actorId();

    const text = actor !== null
      ? `UPDATE ${this.tableName}
           SET ${field} = COALESCE(${field}, 0) + $1, updated_at = NOW(), updated_by = $2
         WHERE id = $3 RETURNING *`
      : `UPDATE ${this.tableName}
           SET ${field} = COALESCE(${field}, 0) + $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`;
    const params = actor !== null ? [delta, actor, id] : [delta, id];

    const { rows } = await this.query(text, params);
    const rec = rows[0];
    auditLog.log({ action: 'update', tableName: this.tableName, entityId: id, newData: rec });
    return rec;
  }

  // ── Pool close (for test scripts) ──────────────────────────
  static async end() {
    await pool.end();
  }
}

// ── Pagination helper ────────────────────────────────────────────
/**
 * Extract pagination params from Express request query string.
 * 
 * @param {import('express').Request} req
 * @param {{ maxLimit?: number, defaultLimit?: number }} opts
 * @returns {{ limit: number, offset: number, page: number }}
 */
export function paginate(req, { maxLimit = 100, defaultLimit = 50 } = {}) {
  let page = Math.max(1, parseInt(req.query.page, 10) || 1);
  let limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;
  const search = req.query.search;
  return { limit, offset, page, search };
}
