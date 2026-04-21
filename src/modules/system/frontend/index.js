import SystemBaseView from './SystemBaseView.vue';
import UsersView from './UsersView.vue';
import RolesView from './RolesView.vue';
import RolePermissionsView from './RolePermissionsView.vue';
import SettingsView from './SettingsView.vue';
import SettingsGeneralView from './SettingsGeneralView.vue';
import SettingsLogsView from './SettingsLogsView.vue';
import CronjobsView from './CronjobsView.vue';
import SysLogsView from './SysLogsView.vue';
import AboutView from './AboutView.vue';
import ProvidersView from './ProvidersView.vue';

export default function registerSystemModule(app, router) {
  router.addRoute({
    path: '/system',
    component: SystemBaseView,
    children: [
      { path: 'users', name: 'SystemUsers', component: UsersView },
      {
        path: 'settings',
        name: 'SystemSettingsBase',
        component: SettingsView,
        redirect: '/system/settings/general',
        children: [
          { path: 'general', name: 'SystemSettingsGeneral', component: SettingsGeneralView, meta: { tabLabel: 'Cài Đặt Chung', tabOrder: 1 } },
          { path: 'logs',    name: 'SystemSettingsLogs',    component: SettingsLogsView,    meta: { tabLabel: 'Ghi Log',         tabOrder: 2 } },
          { path: 'roles',   name: 'SystemRoles',           component: RolesView,            meta: { tabLabel: 'Vai Trò & Phân Quyền', tabOrder: 3 } },
          { path: 'roles/:id/permissions', name: 'RolePermissions', component: RolePermissionsView }
        ]
      },
      { path: 'cronjobs', name: 'SystemCronjobs', component: CronjobsView },
      { path: 'logs',     name: 'SystemLogs',     component: SysLogsView },
      { path: 'profile',  name: 'ProfileSettings', component: () => import('./ProfileView.vue') },
      { path: 'mfa',     name: 'MFASetup',        component: () => import('./MFASetupView.vue') },
      { path: 'about',     name: 'SystemAbout',     component: AboutView },
      { path: 'providers', name: 'SystemProviders', component: ProvidersView }
    ]
  });
}
