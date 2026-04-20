import { inspectionRepo } from '../repositories/InspectionRepository.js';
import { AppError } from '../../../../core/errors.js';
import { pool } from '../../../../core/db.js';

const VALID_TRANSITIONS = {
  PENDING:    ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'FAILED', 'PENDING'],
  COMPLETED:  [],
  FAILED:     ['IN_PROGRESS'],
};

export class InspectionService {
  static async sign(inspectionId, userId, pin) {
    const insp = await inspectionRepo.findOne(inspectionId);
    if (!insp) throw new AppError(404, 'Inspection not found');
    if (insp.status !== 'IN_PROGRESS' && insp.status !== 'COMPLETED') {
      throw new AppError(400, 'Inspection must be in progress before signing');
    }
    await pool.query(
      'UPDATE qaqc_inspections SET signed_by=$1, signed_at=now(), status=$2, completed_at=now(), updated_at=now() WHERE id=$3',
      [userId, 'COMPLETED', inspectionId]
    );
    return inspectionRepo.findOne(inspectionId);
  }

  static async transition(inspectionId, targetStatus) {
    const insp = await inspectionRepo.findOne(inspectionId);
    if (!insp) throw new AppError(404, 'Inspection not found');
    const allowed = VALID_TRANSITIONS[insp.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(400, `Cannot transition from ${insp.status} to ${targetStatus}`);
    }
    await pool.query(
      'UPDATE qaqc_inspections SET status=$1, updated_at=now() WHERE id=$2',
      [targetStatus, inspectionId]
    );
    return inspectionRepo.findOne(inspectionId);
  }
}
