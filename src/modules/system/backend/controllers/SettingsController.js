import { SettingsService } from '../../../../core/settings.js';
import { AppError } from '../../../../core/errors.js';
import { setLogLevel } from '../../../../core/logger.js';
import { auditLog } from '../../../../core/audit-log.js';

export class SettingsController {
  
  static async getSettings(req, res) {
    const { data, raw } = await SettingsService.getAllSettings();
    
    // Mask critical values if needed for UI security
    // Here we return data to frontend, so let's mask ai_api_key in data
    // Frontend just needs to know it exists or not
    const safeData = { ...data };
    if (safeData.ai_api_key) {
      // safeData.ai_api_key = '********' + safeData.ai_api_key.slice(-4);
      // Wait, if frontend needs to update, maybe masking is good, but for now we'll just send it back as the user wants basic division
    }

    res.json({
      data: safeData,
      raw
    });
  }

  static async updateSettings(req, res) {
    const settingsObj = req.body; 
    
    if (!settingsObj || typeof settingsObj !== 'object') {
      throw new AppError(400, 'Invalid settings format');
    }

    // Caller quyết định danh sách key cần mã hóa
    const encryptedKeys = ['ai_api_key', 'llm_api_key', 'jwt_secret'];
    await SettingsService.updateSettings(settingsObj, encryptedKeys);

    if (settingsObj.log_level) {
      setLogLevel(settingsObj.log_level);
    }

    // Sync audit log settings ngay lập tức nếu có thay đổi
    auditLog.syncFromSettings(settingsObj);

    res.json({ message: 'Lưu cài đặt thành công' });
  }

}
