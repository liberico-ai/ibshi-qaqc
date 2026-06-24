import { Repository } from '../../../../core/db.js';

class RfiRepository extends Repository {
  constructor() { super('frm_rfi', { trackActor: false }); }
}
class PaintingRepository extends Repository {
  constructor() { super('frm_painting', {}); }
}
class PressureRepository extends Repository {
  constructor() { super('frm_pressure_test', {}); }
}

export const rfiRepo = new RfiRepository();
export const paintingRepo = new PaintingRepository();
export const pressureRepo = new PressureRepository();
