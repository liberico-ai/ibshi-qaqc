import { mirRepo } from '../repositories/MIRRepository.js';
import { AppError } from '../../../../core/errors.js';
import { hooks } from '../../../../core/hooks.js';

const STAGES = ['EXPECTED', 'DOC_RECEIVED', 'PHYSICAL_INSPECTED', 'MTC_VERIFIED', 'DECIDED', 'INSTOCK'];

function nextStage(current) {
  const idx = STAGES.indexOf(current);
  return idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
}

export class MIRWorkflowService {
  static async advance(mirId, targetStage) {
    const mir = await mirRepo.findOne(mirId);
    if (!mir) throw new AppError(404, 'MIR not found');

    if (!STAGES.includes(targetStage)) throw new AppError(400, `Invalid stage: ${targetStage}`);

    const currentIdx = STAGES.indexOf(mir.stage);
    const targetIdx = STAGES.indexOf(targetStage);
    if (targetIdx !== currentIdx + 1) {
      throw new AppError(400, `Must advance stages in order. Current: ${mir.stage}, Requested: ${targetStage}`);
    }

    await mirRepo.transition(mirId, targetStage);

    await hooks.doAction('qaqc.mir.stage_changed', { mirId, from: mir.stage, to: targetStage });

    return mirRepo.findOne(mirId);
  }

  static async decide(mirId, decision, userId, waiverNote, aiResult) {
    const mir = await mirRepo.findOne(mirId);
    if (!mir) throw new AppError(404, 'MIR not found');
    if (mir.stage !== 'MTC_VERIFIED') {
      throw new AppError(400, 'MIR must be at MTC_VERIFIED stage before decision');
    }

    const validDecisions = ['ACCEPT', 'CONDITIONAL', 'REJECT'];
    if (!validDecisions.includes(decision)) throw new AppError(400, `Invalid decision: ${decision}`);

    await mirRepo.saveAcceptance({
      mir_id: mirId,
      decision,
      decided_by: userId,
      waiver_note: waiverNote ?? null,
      ai_confidence: aiResult?.confidence ?? null,
      ai_result: aiResult ?? {},
    });

    await mirRepo.transition(mirId, 'DECIDED');
    await hooks.doAction('qaqc.mir.decided', { mirId, decision, userId });

    if (mir.project_id) {
      await hooks.doAction('qaqc.notification.event', {
        eventType: decision === 'REJECT' ? 'MIR_REJECTED' : 'MIR_DECIDED',
        payload: {
          title: `MIR quyết định: ${decision}`,
          message: `MIR ${mir.po_ref ?? mirId} đã được quyết định ${decision}${waiverNote ? ' — ' + waiverNote : ''}`,
          mirId,
          decision,
          link: `/qaqc/mir/${mirId}`,
        },
        userIds: [userId, mir.created_by].filter(Boolean),
      });
    }

    return mirRepo.findDetail(mirId);
  }
}
