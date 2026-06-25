import { CalibrationController } from './controllers/CalibrationController.js';
import { requireAction } from '../../../core/permission.js';
import { asyncHandler } from '../../../core/errors.js';
import { validateSchema } from '../../../core/validate.js';
import {
  createMasterSchema, createDeviceSchema, updateDeviceSchema, createRecordSchema,
} from './schemas/calibration.schema.js';

export function registerCalibrationRoutes(app) {
  // Master list
  app.get( '/api/calibration/masters', requireAction('calibration.read'),  asyncHandler(CalibrationController.getMasters));
  app.post('/api/calibration/masters', requireAction('calibration.write'), validateSchema(createMasterSchema), asyncHandler(CalibrationController.createMaster));

  // Devices (Master Log)
  app.get( '/api/calibration/devices',           requireAction('calibration.read'),  asyncHandler(CalibrationController.getDevices));
  // Thiết bị còn hiệu lực hiệu chuẩn — phải đứng TRƯỚC route :id
  app.get( '/api/calibration/devices/available', requireAction('calibration.read'),  asyncHandler(CalibrationController.getAvailableDevices));
  app.get( '/api/calibration/devices/:id',       requireAction('calibration.read'),  asyncHandler(CalibrationController.getDevice));
  app.post('/api/calibration/devices',      requireAction('calibration.write'), validateSchema(createDeviceSchema), asyncHandler(CalibrationController.createDevice));
  app.put( '/api/calibration/devices/:id',  requireAction('calibration.write'), validateSchema(updateDeviceSchema), asyncHandler(CalibrationController.updateDevice));

  // Calibration records
  app.post('/api/calibration/records', requireAction('calibration.write'), validateSchema(createRecordSchema), asyncHandler(CalibrationController.createRecord));
}
