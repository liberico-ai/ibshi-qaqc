import { ncrRepo } from '../repositories/NCRRepository.js';
import { AppError } from '../../../../core/errors.js';
import { hooks } from '../../../../core/hooks.js';

// 7-state workflow: OPEN → ASSIGNED → ROOT_CAUSE → CAPA_PLAN → IN_PROGRESS → VERIFY → CLOSED (+ REOPEN)
const TRANSITIONS = {
  OPEN:        ['ASSIGNED'],
  ASSIGNED:    ['ROOT_CAUSE'],
  ROOT_CAUSE:  ['CAPA_PLAN'],
  CAPA_PLAN:   ['IN_PROGRESS'],
  IN_PROGRESS: ['VERIFY'],
  VERIFY:      ['CLOSED', 'IN_PROGRESS'],   // VERIFY can bounce back if rejected
  CLOSED:      ['REOPEN'],
  REOPEN:      ['ASSIGNED'],
};

export class NCRWorkflowService {
  static canTransition(from, to) {
    return (TRANSITIONS[from] ?? []).includes(to);
  }

  static async create(data, userId) {
    const ncrNo = await ncrRepo.nextNcrNo();
    const record = await ncrRepo.create({
      ncr_no:              ncrNo,
      project_id:          data.project_id ?? null,
      title:               data.title,
      description:         data.description ?? null,
      source_type:         data.source_type ?? 'manual',
      source_ref_id:       data.source_ref_id ?? null,
      severity:            data.severity ?? 'minor',
      status:              data.assigned_to ? 'ASSIGNED' : 'OPEN',
      root_cause_category: data.root_cause_category ?? null,
      assigned_to:         data.assigned_to ?? null,
      due_date:            data.due_date ?? null,
      hold_flag:           data.hold_flag ?? false,
      created_by:          userId ?? null,
    });

    await ncrRepo.addHistory({
      ncr_id: record.id, event_type: 'created',
      to_status: record.status, note: `NCR ${ncrNo} được tạo`, actor_id: userId,
    });

    await hooks.doAction('ncr.created', { ncrId: record.id });
    return record;
  }

  static async transition(ncrId, toStatus, userId, opts = {}) {
    const ncr = await ncrRepo.findOne(ncrId);
    if (!ncr) throw new AppError(404, 'Không tìm thấy NCR');

    if (!this.canTransition(ncr.status, toStatus)) {
      throw new AppError(400, `Chuyển trạng thái không hợp lệ: ${ncr.status} → ${toStatus}`);
    }

    const extra = {};
    if (opts.assigned_to !== undefined)         extra.assigned_to = opts.assigned_to;
    if (opts.root_cause_category !== undefined)  extra.root_cause_category = opts.root_cause_category;
    if (toStatus === 'CLOSED')                 { extra.hold_flag = false; extra.closed_at = new Date(); }
    if (toStatus === 'REOPEN')                   extra.closed_at = null;   // re-open resets close timestamp

    const updated = await ncrRepo.updateStatus(ncrId, toStatus, extra);

    await ncrRepo.addHistory({
      ncr_id: ncrId, event_type: toStatus === 'REOPEN' ? 'reopened' : 'transition',
      from_status: ncr.status, to_status: toStatus, note: opts.note ?? null, actor_id: userId,
    });

    await hooks.doAction('ncr.transition', { ncrId, from: ncr.status, to: toStatus });

    if (ncr.project_id || ncr.assigned_to) {
      await hooks.doAction('qaqc.notification.event', {
        eventType: 'ncr.transition',
        payload: {
          title: `NCR ${ncr.ncr_no}: ${toStatus}`,
          message: `NCR ${ncr.ncr_no} chuyển sang trạng thái ${toStatus}${opts.note ? ' — ' + opts.note : ''}`,
          ncrId, link: `/ncr/${ncrId}`,
        },
        userIds: [updated.assigned_to ?? ncr.assigned_to, ncr.created_by, userId].filter(Boolean),
      });
    }

    return ncrRepo.findDetail(ncrId);
  }

  static async assign(ncrId, assignedTo, dueDate, userId, note) {
    const ncr = await ncrRepo.findOne(ncrId);
    if (!ncr) throw new AppError(404, 'Không tìm thấy NCR');

    const nextStatus = ncr.status === 'OPEN' || ncr.status === 'REOPEN' ? 'ASSIGNED' : ncr.status;
    const updated = await ncrRepo.updateStatus(ncrId, nextStatus, {
      assigned_to: assignedTo, due_date: dueDate ?? ncr.due_date,
    });

    await ncrRepo.addHistory({
      ncr_id: ncrId, event_type: 'assigned',
      from_status: ncr.status, to_status: nextStatus,
      note: note ?? `Giao xử lý cho người dùng #${assignedTo}`, actor_id: userId,
    });

    await hooks.doAction('qaqc.notification.event', {
      eventType: 'ncr.assigned',
      payload: {
        title: `NCR ${ncr.ncr_no} được giao cho bạn`,
        message: `Bạn được giao xử lý NCR ${ncr.ncr_no}${dueDate ? ' — hạn ' + dueDate : ''}`,
        ncrId, link: `/ncr/${ncrId}`,
      },
      userIds: [assignedTo].filter(Boolean),
    });

    return updated;
  }

  static async addAction(ncrId, payload, userId) {
    const ncr = await ncrRepo.findOne(ncrId);
    if (!ncr) throw new AppError(404, 'Không tìm thấy NCR');

    const action = await ncrRepo.addAction({ ncr_id: ncrId, ...payload });
    await ncrRepo.addHistory({
      ncr_id: ncrId, event_type: 'action_added',
      to_status: ncr.status, note: `Thêm hành động ${payload.action_type}: ${payload.description}`,
      actor_id: userId,
    });
    return action;
  }

  static async verifyAction(ncrId, actionId, status, userId, note) {
    const action = await ncrRepo.findAction(actionId);
    if (!action || action.ncr_id !== ncrId) throw new AppError(404, 'Không tìm thấy hành động CAPA');

    const updated = await ncrRepo.updateAction(actionId, status, userId);
    await ncrRepo.addHistory({
      ncr_id: ncrId, event_type: 'action_verified',
      note: note ?? `Hành động chuyển trạng thái: ${status}`, actor_id: userId,
    });
    return updated;
  }

  static async close(ncrId, userId, note) {
    const ncr = await ncrRepo.findOne(ncrId);
    if (!ncr) throw new AppError(404, 'Không tìm thấy NCR');
    if (ncr.status !== 'VERIFY') {
      throw new AppError(400, 'Chỉ có thể đóng NCR khi đang ở trạng thái VERIFY');
    }
    const updated = await ncrRepo.updateStatus(ncrId, 'CLOSED', { hold_flag: false, closed_at: new Date() });
    await ncrRepo.addHistory({
      ncr_id: ncrId, event_type: 'closed',
      from_status: ncr.status, to_status: 'CLOSED', note: note ?? 'Đóng NCR', actor_id: userId,
    });
    await hooks.doAction('ncr.closed', { ncrId });
    return updated;
  }

  /**
   * Quét NCR quá hạn / sắp tới hạn (2 ngày) → bắn thông báo escalation.
   * Gọi bởi cronjob.
   */
  static async runEscalation() {
    const rows = await ncrRepo.findDueSoonOrOverdue();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let escalated = 0;
    for (const ncr of rows) {
      const due = new Date(ncr.due_date);
      due.setHours(0, 0, 0, 0);
      const overdue = due < today;
      const userIds = [ncr.assigned_to, ncr.created_by].filter(Boolean);
      if (!userIds.length) continue;

      await hooks.doAction('qaqc.notification.event', {
        eventType: overdue ? 'ncr.overdue' : 'ncr.due_soon',
        payload: {
          title: overdue ? `NCR ${ncr.ncr_no} ĐÃ QUÁ HẠN` : `NCR ${ncr.ncr_no} sắp tới hạn`,
          message: overdue
            ? `NCR ${ncr.ncr_no} đã quá hạn xử lý (hạn ${ncr.due_date}). Vui lòng xử lý ngay.`
            : `NCR ${ncr.ncr_no} sẽ tới hạn vào ${ncr.due_date}.`,
          ncrId: ncr.id, link: `/ncr/${ncr.id}`, severity: ncr.severity,
        },
        userIds,
      });

      await ncrRepo.addHistory({
        ncr_id: ncr.id, event_type: 'escalated',
        note: overdue ? 'Tự động cảnh báo: quá hạn' : 'Tự động cảnh báo: sắp tới hạn',
        actor_id: null,
      });
      escalated++;
    }
    return { scanned: rows.length, escalated };
  }
}
