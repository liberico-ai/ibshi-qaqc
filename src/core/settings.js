import crypto from 'crypto';
import { pool, transaction } from './db.js';
import { AppError } from './errors.js';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'libe-move-fallback-secret', 'salt', 32);
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(text) {
  if (!text) return text;
  const parts = text.split(':');
  if (parts.length !== 2) return text; // Probably unencrypted or invalid format
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // If decryption fails, return original text (might be plain text that happens to have a colon)
    return text;
  }
}

export class SettingsService {
  static _encrypt(text) { return encrypt(text); }
  static _decrypt(text) { return decrypt(text); }

  /**
   * Lấy tất cả cài đặt, tự động giải mã các field mã hoá
   */
  static async getAllSettings() {
    const { rows } = await pool.query('SELECT key, value, description, is_encrypted FROM sys_settings');
    const settings = {};
    const raw = [];
    
    rows.forEach(row => {
      let value = row.value;
      if (row.is_encrypted) {
        value = decrypt(value);
      }
      settings[row.key] = value;
      // return formatted for frontend/API
      raw.push({
        ...row,
        value: value // send plain value out (frontend or controller will handle it)
      });
    });
    
    return { data: settings, raw };
  }

  /**
   * Lấy 1 cài đặt cụ thể
   */
  static async getSetting(key) {
    const { rows } = await pool.query('SELECT key, value, is_encrypted FROM sys_settings WHERE key = $1', [key]);
    if (rows.length === 0) return null;
    const row = rows[0];
    if (row.is_encrypted) {
      return decrypt(row.value);
    }
    return row.value;
  }

  /**
   * Cập nhật nhiều cài đặt cùng lúc
   * @param {Object} settingsObj - Object chứa các setting cần update
   * @param {Array} encryptedKeys - Danh sách các key cần được mã hoá (do caller quyết định)
   */
  static async updateSettings(settingsObj, encryptedKeys = []) {
    if (!settingsObj || typeof settingsObj !== 'object') {
      throw new AppError(400, 'Invalid settings format');
    }

    await transaction(async (client) => {
      // Fetch current encryption states to preserve if not in encryptedKeys but existing as encrypted
      const keys = Object.keys(settingsObj);
      if (keys.length === 0) return;
      
      const { rows } = await client.query('SELECT key, is_encrypted FROM sys_settings WHERE key = ANY($1)', [keys]);
      const currentEncryptionMap = {};
      rows.forEach(r => currentEncryptionMap[r.key] = r.is_encrypted);

      for (const [k, v] of Object.entries(settingsObj)) {
        // Enforce encryption if explicitly required by caller, or keep DB state if previously encrypted
        let isEncrypted = encryptedKeys.includes(k) || (currentEncryptionMap[k] === true);

        let valueToSave = String(v);
        
        // Only encrypt if it actually has length to bypass empty strings
        if (isEncrypted && valueToSave.length > 0) {
          valueToSave = encrypt(valueToSave);
        }

        await client.query(`
          INSERT INTO sys_settings (key, value, is_encrypted, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET 
            value = EXCLUDED.value, 
            is_encrypted = EXCLUDED.is_encrypted,
            updated_at = EXCLUDED.updated_at
        `, [k, valueToSave, isEncrypted]);
      }
    });
  }
}
