import { paginate } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';
import { rolesRepo } from '../repositories/RolesRepository.js';

export class RolesController {

  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const { rows, total } = await rolesRepo.findAllWithActions({ limit, offset });

    res.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  static async create(req, res) {
    const { name, description, actions } = req.body;

    if (!name) throw new AppError(400, 'Role name is required');

    const role = await rolesRepo.createWithActions({ name, description, actions });
    res.json(role);
  }

  static async update(req, res) {
    const { id } = req.params;
    const { name, description, actions } = req.body;

    const existing = await rolesRepo.findOne(id);
    if (!existing) throw new AppError(404, 'Role not found');

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    const role = await rolesRepo.updateWithActions(id, data, actions);
    res.json(role);
  }

  static async syncActions(req, res) {
    const { id } = req.params;
    const { actions } = req.body;

    if (!actions || !Array.isArray(actions)) {
      throw new AppError(400, 'Invalid actions array');
    }

    await rolesRepo.syncActions(id, actions);
    res.json({ success: true });
  }

  static async delete(req, res) {
    const { id } = req.params;
    await rolesRepo.delete(id);
    res.json({ success: true });
  }
}
