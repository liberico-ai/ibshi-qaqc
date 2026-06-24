import { i18n } from '../../../plugins/i18n.js';
import PortalBaseView from './PortalBaseView.vue';
import PortalProjectView from './PortalProjectView.vue';

i18n.global.mergeLocaleMessage('vi', {
  portal: {
    title: 'Cổng khách hàng',
    readOnlyNote: 'Chế độ chỉ đọc — bạn chỉ xem được các dự án được phân quyền.',
    client: 'Khách hàng',
    inspectionCompleted: 'Kiểm tra hoàn thành',
    inspectionPending: 'Đang chờ',
    inspectionFailed: 'Không đạt',
    openNcr: 'NCR đang mở',
    mdrCompletion: 'Tiến độ MDR',
    inspectionProgress: 'Tiến độ kiểm tra',
    passRate: 'Tỷ lệ đạt',
    metric: 'Chỉ tiêu',
    count: 'Số lượng',
    status: 'Trạng thái',
    completed: 'Hoàn thành',
    pending: 'Đang chờ',
    failed: 'Không đạt',
    total: 'Tổng',
    noAccess: 'Bạn chưa được phân quyền dự án nào.',
    loading: 'Đang tải...',
  },
});

i18n.global.mergeLocaleMessage('en', {
  portal: {
    title: 'Client Portal',
    readOnlyNote: 'Read-only — you can only view assigned projects.',
    client: 'Client',
    inspectionCompleted: 'Inspections completed',
    inspectionPending: 'Pending',
    inspectionFailed: 'Failed',
    openNcr: 'Open NCRs',
    mdrCompletion: 'MDR completion',
    inspectionProgress: 'Inspection progress',
    passRate: 'Pass rate',
    metric: 'Metric',
    count: 'Count',
    status: 'Status',
    completed: 'Completed',
    pending: 'Pending',
    failed: 'Failed',
    total: 'Total',
    noAccess: 'You have not been granted access to any project.',
    loading: 'Loading...',
  },
});

export default function registerPortalFrontend(app, router) {
  router.addRoute({
    path: '/portal',
    component: PortalBaseView,
    children: [
      { path: 'projects', name: 'PortalProjects', component: PortalProjectView },
    ],
  });
}
