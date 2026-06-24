import { i18n } from '../../../plugins/i18n.js';
import DashboardBaseView from './DashboardBaseView.vue';
import OverviewView from './OverviewView.vue';
import QCKpiView from './QCKpiView.vue';
import ProjectDashboardView from './ProjectDashboardView.vue';
import ManagementOverviewView from './ManagementOverviewView.vue';

i18n.global.mergeLocaleMessage('vi', {
  dashboard: {
    qcKpiTitle: 'KPI Chất lượng (QC)',
    qcKpiSubtitle: 'Chỉ số chất lượng tổng hợp toàn hệ thống',
    projectTitle: 'Bảng điều khiển theo Dự án',
    projectSubtitle: 'Tiến độ đạt/không đạt, NCR và MDR theo từng dự án',
    mgmtTitle: 'Tổng quan Quản lý',
    mgmtSubtitle: 'Rollup toàn hệ thống cho cấp quản lý',
    items: 'hạng mục',
    firstPassRate: 'Tỷ lệ đạt lần đầu',
    ncrOpen: 'NCR đang mở',
    ncrCloseout: 'Thời gian đóng NCR (TB)',
    inspectionCycle: 'Chu kỳ kiểm tra (TB)',
    mdrCompletion: 'Tiến độ MDR trung bình',
    days: 'ngày',
    dossiers: 'Số hồ sơ',
    totalLabel: 'Tổng',
    exportWeekly: 'Xuất PDF tuần',
    exportMonthly: 'Xuất PDF tháng',
    project: 'Dự án',
    passFail: 'Đạt / Không đạt',
    openNcr: 'NCR mở',
    mdrPct: 'MDR %',
    noProjects: 'Chưa có dữ liệu dự án',
    totalProjects: 'Tổng dự án',
    avgMdr: 'MDR trung bình',
    passByProject: 'Tỷ lệ đạt theo dự án',
    loading: 'Đang tải...',
  },
});

i18n.global.mergeLocaleMessage('en', {
  dashboard: {
    qcKpiTitle: 'Quality KPIs (QC)',
    qcKpiSubtitle: 'Aggregated quality metrics across the system',
    projectTitle: 'Project Dashboard',
    projectSubtitle: 'Pass/fail progress, NCR and MDR per project',
    mgmtTitle: 'Management Overview',
    mgmtSubtitle: 'System-wide rollup for management',
    items: 'items',
    firstPassRate: 'First Pass Rate',
    ncrOpen: 'Open NCRs',
    ncrCloseout: 'Avg NCR Close-out',
    inspectionCycle: 'Avg Inspection Cycle',
    mdrCompletion: 'Avg MDR Completion',
    days: 'days',
    dossiers: 'Dossiers',
    totalLabel: 'Total',
    exportWeekly: 'Export weekly PDF',
    exportMonthly: 'Export monthly PDF',
    project: 'Project',
    passFail: 'Pass / Fail',
    openNcr: 'Open NCR',
    mdrPct: 'MDR %',
    noProjects: 'No project data',
    totalProjects: 'Total projects',
    avgMdr: 'Avg MDR',
    passByProject: 'Pass rate by project',
    loading: 'Loading...',
  },
});

export default function registerDashboardFrontend(app, router) {
  // Trang chủ sau đăng nhập = Dashboard Tổng quan (theo mockup)
  router.addRoute({ path: '/', name: 'Home', component: OverviewView });

  router.addRoute({
    path: '/dashboard',
    component: DashboardBaseView,
    children: [
      { path: '',           name: 'DashboardOverview',   component: OverviewView },
      { path: 'qc',         name: 'DashboardQCKpi',      component: QCKpiView },
      { path: 'projects',   name: 'DashboardProjects',   component: ProjectDashboardView },
      { path: 'management', name: 'DashboardManagement', component: ManagementOverviewView },
    ],
  });
}
