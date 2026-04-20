export class ActionRegistry {
  constructor() {
    // Array of { name, description, module }
    this.actions = [];
  }

  /**
   * Đăng ký một hành động phân quyền
   * @param {Object} actionConfig
   * @param {string} actionConfig.name Tên kỹ thuật của action, ví dụ: "users.create"
   * @param {string} actionConfig.description Mô tả cho UI
   * @param {string} actionConfig.module Gom nhóm action thuộc về hệ thống nào
   */
  register({ name, description, module = 'core' }) {
    // Prevent duplicate registration
    const existing = this.actions.find(a => a.name === name);
    if (!existing) {
      this.actions.push({ name, description, module });
    }
  }

  /**
   * Lấy danh sách toàn bộ actions (Dùng cho API frontend phân quyền)
   */
  getAllActions() {
    return this.actions;
  }

  /**
   * Lấy danh sách actions gom nhóm theo module
   */
  getGroupedActions() {
    return this.actions.reduce((acc, action) => {
      if (!acc[action.module]) {
        acc[action.module] = [];
      }
      acc[action.module].push(action);
      return acc;
    }, {});
  }
}

export const actionRegistry = new ActionRegistry();
