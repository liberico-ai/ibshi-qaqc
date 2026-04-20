import { paginate } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';
import argon2 from 'argon2';
import { usersRepo } from '../repositories/UsersRepository.js';

export class UsersController {

  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const { rows, total } = await usersRepo.findAllWithRoles({ limit, offset });

    res.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  static async create(req, res) {
    const { full_name, username, password, roles } = req.body;

    if (!username || !password) {
      throw new AppError(400, 'Username and password required');
    }

    const password_hash = await argon2.hash(password);
    const user = await usersRepo.createWithRoles({ full_name, username, password_hash, roles });

    res.json(usersRepo.sanitize(user));
  }

  static async update(req, res) {
    const { id } = req.params;
    const { full_name, username, password, roles, is_active } = req.body;

    // Check target user exists
    const target = await usersRepo.findStatusById(id);
    if (!target) throw new AppError(404, 'User not found');

    // Rule: prevent non-superadmin from disabling a superadmin
    if (is_active === false && target.is_admin) {
      const caller = await usersRepo.findStatusById(req.user?.id);
      if (!caller?.is_admin) {
        throw new AppError(403, 'Forbidden: Only a Super Admin can deactivate another Super Admin.');
      }
    }

    const data = {};
    if (full_name !== undefined) data.full_name = full_name;
    if (username !== undefined) data.username = username;
    if (is_active !== undefined) data.is_active = is_active;
    if (password) data.password_hash = await argon2.hash(password);

    const user = await usersRepo.updateWithRoles(id, data, roles);

    res.json(usersRepo.sanitize(user));
  }

  static async delete(_req, _res) {
    throw new AppError(403, "User accounts cannot be permanently deleted. Please use 'Set Inactive' instead to preserve system audit logs.");
  }
}
