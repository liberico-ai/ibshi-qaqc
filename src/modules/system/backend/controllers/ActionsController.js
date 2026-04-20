import { actionRegistry } from '../../../../core/action-registry.js';

export class ActionsController {
  static getGrouped(req, res) {
    res.json(actionRegistry.getGroupedActions());
  }
}
