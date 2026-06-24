import { WPSController }      from './controllers/WPSController.js';
import { WelderController }    from './controllers/WelderController.js';
import { WeldMapController }   from './controllers/WeldMapController.js';
import { requireAction }       from '../../../core/permission.js';
import { asyncHandler }        from '../../../core/errors.js';
import { validateSchema }      from '../../../core/validate.js';
import {
  createWpsSchema, updateWpsSchema, createPqrSchema,
  createWelderSchema, updateWelderSchema, addQualSchema,
  createWeldMapSchema, addJointSchema, updateJointSchema,
} from './schemas/welding.schema.js';

export function registerWeldingRoutes(app) {
  // ── WPS / PQR ────────────────────────────────────────────────
  app.get( '/api/welding/wps',             requireAction('welding.wps.read'),  asyncHandler(WPSController.getAll));
  app.get( '/api/welding/wps/:id',         requireAction('welding.wps.read'),  asyncHandler(WPSController.getOne));
  app.post('/api/welding/wps',             requireAction('welding.wps.write'), validateSchema(createWpsSchema), asyncHandler(WPSController.create));
  app.put( '/api/welding/wps/:id',         requireAction('welding.wps.write'), validateSchema(updateWpsSchema), asyncHandler(WPSController.update));
  app.post('/api/welding/wps/:id/approve', requireAction('welding.wps.write'), asyncHandler(WPSController.approve));
  app.post('/api/welding/wps/:id/pqr',     requireAction('welding.wps.write'), validateSchema(createPqrSchema), asyncHandler(WPSController.addPqr));

  // ── Welders ──────────────────────────────────────────────────
  app.get( '/api/welding/welders',            requireAction('welding.welder.read'),  asyncHandler(WelderController.getAll));
  app.get( '/api/welding/welders/:id',        requireAction('welding.welder.read'),  asyncHandler(WelderController.getOne));
  app.get( '/api/welding/welders/:id/card',   requireAction('welding.welder.read'),  asyncHandler(WelderController.qualificationCard));
  app.post('/api/welding/welders',            requireAction('welding.welder.write'), validateSchema(createWelderSchema), asyncHandler(WelderController.create));
  app.put( '/api/welding/welders/:id',        requireAction('welding.welder.write'), validateSchema(updateWelderSchema), asyncHandler(WelderController.update));
  app.post('/api/welding/welders/:id/quals',  requireAction('welding.welder.write'), validateSchema(addQualSchema),      asyncHandler(WelderController.addQual));

  // ── Weld maps & joints ───────────────────────────────────────
  app.get( '/api/welding/weldmaps',                 requireAction('welding.weldmap.read'),  asyncHandler(WeldMapController.getAll));
  app.get( '/api/welding/weldmaps/:id',             requireAction('welding.weldmap.read'),  asyncHandler(WeldMapController.getOne));
  app.post('/api/welding/weldmaps',                 requireAction('welding.weldmap.write'), validateSchema(createWeldMapSchema), asyncHandler(WeldMapController.create));
  app.post('/api/welding/weldmaps/:id/joints',      requireAction('welding.weldmap.write'), validateSchema(addJointSchema),      asyncHandler(WeldMapController.addJoint));
  app.put( '/api/welding/weldmaps/joints/:jointId', requireAction('welding.weldmap.write'), validateSchema(updateJointSchema),   asyncHandler(WeldMapController.updateJoint));
}
