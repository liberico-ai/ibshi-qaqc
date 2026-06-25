import { ndtRequestRepo, ndtVendorRepo, ndtResultRepo } from '../repositories/NDTRepository.js';
import { AppError } from '../../../../core/errors.js';
import { hooks } from '../../../../core/hooks.js';
import { NDTVendorTokenService, syncInspectionFromResult } from './NDTVendorTokenService.js';

export class NDTRequestService {
  /**
   * Tạo yêu cầu NDT (ILS-QAC-F11) và gửi email cho nhà thầu qua notification hook.
   */
  static async createAndNotify(data, userId) {
    const record = await ndtRequestRepo.create({
      request_no: data.request_no,
      project_id: data.project_id ?? null,
      method: data.method,
      inspection_id: data.inspection_id ?? null,
      weld_joint_ref: data.weld_joint_ref ?? null,
      vendor_id: data.vendor_id ?? null,
      status: 'REQUESTED',
      requested_by: userId ?? null,
    });

    // Gửi email cho nhà thầu (nếu đã chọn) qua notification hook channel-agnostic
    if (record.vendor_id) {
      const vendor = await ndtVendorRepo.findOne(record.vendor_id);
      if (vendor?.contact_email) {
        // Sinh token phạm vi để nhà thầu nộp kết quả mà không cần đăng nhập đầy đủ.
        const tk = await NDTVendorTokenService.generate(record.id, record.vendor_id);

        await hooks.doAction('qaqc.notification.event', {
          eventType: 'NDT_REQUEST_SENT',
          payload: {
            title:   `Yêu cầu NDT mới: ${record.request_no} (${record.method})`,
            message: `Đề nghị thực hiện kiểm tra ${record.method} theo yêu cầu ${record.request_no} (ILS-QAC-F11). Nộp kết quả qua liên kết token đính kèm.`,
            email:   vendor.contact_email,
            link:    `/ndt/vendor/submit?token=${tk.token}`,
            vendorToken: tk.token,
            vendorTokenExpiresAt: tk.expires_at,
            requestId: record.id,
          },
          userIds: [],
        });
        await ndtRequestRepo.update(record.id, { status: 'SENT' });
        record.status = 'SENT';
        record.vendor_token = tk.token; // trả về cho FE hiển thị/copy
      }
    }

    return record;
  }

  static async updateStatus(id, status) {
    const req = await ndtRequestRepo.findOne(id);
    if (!req) throw new AppError(404, 'Không tìm thấy yêu cầu NDT');
    return ndtRequestRepo.update(id, { status });
  }

  /**
   * Upload kết quả NDT (F08/F15), liên kết ngược về inspection/mối hàn,
   * và đặt trạng thái yêu cầu thành COMPLETED.
   */
  static async uploadResult(requestId, data, userId) {
    const reqRow = await ndtRequestRepo.findOne(requestId);
    if (!reqRow) throw new AppError(404, 'Không tìm thấy yêu cầu NDT');

    const result = await ndtResultRepo.create({
      request_id: requestId,
      result: data.result,
      report_no: data.report_no ?? null,
      file_link: data.file_link ?? null,
      recorded_by: userId ?? null,
    });

    await ndtRequestRepo.update(requestId, { status: 'COMPLETED' });

    // Đồng bộ ngược trạng thái về inspection liên kết (IP05): accept→PASSED, reject→FAILED.
    await syncInspectionFromResult(requestId, reqRow.inspection_id, data.result, reqRow.request_no);

    // Thông báo kết quả về liên kết inspection/mối hàn
    await hooks.doAction('qaqc.notification.event', {
      eventType: data.result === 'reject' ? 'NDT_RESULT_REJECTED' : 'NDT_RESULT_ACCEPTED',
      payload: {
        title:   `Kết quả NDT ${reqRow.request_no}: ${data.result === 'reject' ? 'Không đạt' : 'Đạt'}`,
        message: `Báo cáo ${data.report_no ?? ''} đã được cập nhật cho yêu cầu ${reqRow.request_no}.`,
        link:    `/ndt/requests/${requestId}`,
        inspectionId: reqRow.inspection_id,
        weldJointRef: reqRow.weld_joint_ref,
      },
      userIds: [reqRow.requested_by].filter(Boolean),
    });

    return result;
  }
}
