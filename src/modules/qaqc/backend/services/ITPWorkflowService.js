import { itpRepo } from '../repositories/ITPRepository.js';
import { AppError } from '../../../../core/errors.js';
import { hooks } from '../../../../core/hooks.js';

const EVENT_BY_STATUS = {
  UNDER_REVIEW:      'ITP_SUBMITTED',
  MANAGER_APPROVED:  'ITP_APPROVED',
  DIRECTOR_APPROVED: 'ITP_APPROVED',
  DRAFT:             'ITP_REJECTED',
};

const TRANSITIONS = {
  DRAFT:              ['UNDER_REVIEW'],
  UNDER_REVIEW:       ['MANAGER_APPROVED', 'DRAFT'],
  MANAGER_APPROVED:   ['DIRECTOR_APPROVED', 'DRAFT'],
  DIRECTOR_APPROVED:  ['ACTIVE'],
  ACTIVE:             ['SUPERSEDED'],
  SUPERSEDED:         ['ARCHIVED'],
  ARCHIVED:           [],
};

export class ITPWorkflowService {
  static async transition(planId, targetStatus, userId) {
    const plan = await itpRepo.findOne(planId);
    if (!plan) throw new AppError(404, 'ITP not found');

    const allowed = TRANSITIONS[plan.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(400, `Cannot transition from ${plan.status} to ${targetStatus}`);
    }

    const snapshot = await itpRepo.findWithItems(planId);
    await itpRepo.saveHistory(planId, plan.version, userId, `Transition to ${targetStatus}`, snapshot);
    await itpRepo.transition(planId, targetStatus, userId);

    const eventType = EVENT_BY_STATUS[targetStatus];
    if (eventType) {
      await hooks.doAction('qaqc.notification.event', {
        eventType,
        payload: {
          title: `ITP ${targetStatus}`,
          message: `ITP ${plan.id} chuyển sang trạng thái ${targetStatus}`,
          planId,
          link: `/qaqc/itp/${planId}`,
        },
        userIds: [plan.created_by, userId].filter(Boolean),
      });
    }

    return itpRepo.findOne(planId);
  }

  static async copyPlan(planId, targetProjectId, userId) {
    const source = await itpRepo.findWithItems(planId);
    if (!source) throw new AppError(404, 'Source ITP not found');

    return itpRepo.createWithItems({
      plan: {
        project_id: targetProjectId,
        product_type: source.product_type,
        version: 1,
        status: 'DRAFT',
        template_id: planId,
        reason_for_change: `Copied from plan ${planId}`,
        created_by: userId,
      },
      items: source.items.map(item => ({
        seq: item.seq,
        ip_code: item.ip_code,
        description: item.description,
        standard_id: item.standard_id,
        hold_flag: item.hold_flag,
        witness_flag: item.witness_flag,
        acceptance_criteria: item.acceptance_criteria,
        sample_rule: item.sample_rule,
        checkpoints: item.checkpoints ?? [],
      })),
    });
  }
}
