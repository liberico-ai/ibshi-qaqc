import { hooks } from '../../../core/hooks.js';

export function registerDashboardMenus() {
  hooks.addFilter('system.menus', (menus) => {
    menus.push({
      id: 'dashboard',
      section: 'Bảng điều khiển',
      permission: 'dashboard.qc.read',
      order: 5,
      items: [
        {
          label: 'KPI Chất lượng',
          to: '/dashboard/qc',
          permission: 'dashboard.qc.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>'
        },
        {
          label: 'Bảng điều khiển Dự án',
          to: '/dashboard/projects',
          permission: 'dashboard.qc.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>'
        },
        {
          label: 'Tổng quan Quản lý',
          to: '/dashboard/management',
          permission: 'dashboard.mgmt.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>'
        },
      ]
    });
    return menus;
  });
}
