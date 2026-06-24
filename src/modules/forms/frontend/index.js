import { i18n } from '../../../plugins/i18n.js';
import FormsBaseView from './FormsBaseView.vue';
import RfiListView from './RfiListView.vue';
import PaintingListView from './PaintingListView.vue';
import PressureListView from './PressureListView.vue';

i18n.global.mergeLocaleMessage('vi', {
  forms: {
    rfiTitle: 'RFI — Yêu cầu kiểm tra (ILS-QAC-F06)',
    paintingTitle: 'Kiểm tra sơn / DFT (ILS-QAC-F12)',
    pressureTitle: 'Chứng chỉ thử áp lực (ILS-QAC-F14)',
    addRfi: 'Tạo RFI',
    addPainting: 'Thêm kiểm tra sơn',
    addPressure: 'Thêm thử áp lực',
    rfiNo: 'Số RFI',
    type: 'Loại',
    internal: 'Nội bộ',
    external: 'Bên ngoài',
    allTypes: 'Tất cả loại',
    allStatus: 'Tất cả trạng thái',
    inspectionPoint: 'Điểm kiểm tra',
    status: 'Trạng thái',
    scheduledAt: 'Lịch hẹn',
    area: 'Khu vực',
    dftReading: 'Giá trị DFT',
    dftRange: 'Ngưỡng DFT',
    surfacePrep: 'Chuẩn bị bề mặt',
    min: 'Min', max: 'Max',
    dftHint: 'Kết quả PASS/FAIL được hệ thống tự tính theo ngưỡng DFT.',
    readOnlyNoteHint: 'Yêu cầu kiểm tra 2 chiều: nội bộ & bên ngoài (chủ đầu tư).',
    pressureNote: 'Chứng chỉ thử áp lực — in trực tiếp để lưu hồ sơ.',
    testNo: 'Số thử',
    medium: 'Môi chất',
    hydro: 'Thủy lực', pneumatic: 'Khí nén',
    pressureValue: 'Áp suất',
    holdTime: 'Thời gian giữ',
    certificateNo: 'Số chứng chỉ',
    result: 'Kết quả',
    print: 'In', save: 'Lưu', saving: 'Đang lưu...', cancel: 'Hủy',
    loading: 'Đang tải...', empty: 'Chưa có dữ liệu',
    requiredFields: 'Vui lòng nhập đủ thông tin bắt buộc',
    saved: 'Đã lưu', saveError: 'Lỗi khi lưu',
  },
});

i18n.global.mergeLocaleMessage('en', {
  forms: {
    rfiTitle: 'RFI — Request For Inspection (ILS-QAC-F06)',
    paintingTitle: 'Painting / DFT (ILS-QAC-F12)',
    pressureTitle: 'Pressure Test Certificate (ILS-QAC-F14)',
    addRfi: 'New RFI',
    addPainting: 'Add painting check',
    addPressure: 'Add pressure test',
    rfiNo: 'RFI No.',
    type: 'Type',
    internal: 'Internal',
    external: 'External',
    allTypes: 'All types',
    allStatus: 'All status',
    inspectionPoint: 'Inspection point',
    status: 'Status',
    scheduledAt: 'Scheduled at',
    area: 'Area',
    dftReading: 'DFT reading',
    dftRange: 'DFT range',
    surfacePrep: 'Surface prep',
    min: 'Min', max: 'Max',
    dftHint: 'PASS/FAIL is computed automatically from the DFT thresholds.',
    readOnlyNoteHint: '2-way request for inspection: internal & external (client).',
    pressureNote: 'Pressure test certificate — print directly for records.',
    testNo: 'Test No.',
    medium: 'Medium',
    hydro: 'Hydro', pneumatic: 'Pneumatic',
    pressureValue: 'Pressure',
    holdTime: 'Hold time',
    certificateNo: 'Certificate No.',
    result: 'Result',
    print: 'Print', save: 'Save', saving: 'Saving...', cancel: 'Cancel',
    loading: 'Loading...', empty: 'No data',
    requiredFields: 'Please fill in required fields',
    saved: 'Saved', saveError: 'Save error',
  },
});

export default function registerFormsFrontend(app, router) {
  router.addRoute({
    path: '/forms',
    component: FormsBaseView,
    children: [
      { path: 'rfi',      name: 'FormsRfi',      component: RfiListView },
      { path: 'painting', name: 'FormsPainting', component: PaintingListView },
      { path: 'pressure', name: 'FormsPressure', component: PressureListView },
    ],
  });
}
