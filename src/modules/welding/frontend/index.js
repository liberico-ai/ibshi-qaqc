import { i18n } from '../../../plugins/i18n.js';
import WeldingBaseView from './WeldingBaseView.vue';
import WPSListView     from './WPSListView.vue';
import WeldersView     from './WeldersView.vue';
import WeldMapView     from './WeldMapView.vue';

// ── Decentralized i18n: merge module messages, never touch src/locales ──
i18n.global.mergeLocaleMessage('vi', {
  welding: {
    title: 'Quản lý hàn',
    wps: 'WPS / PQR',
    welders: 'Thợ hàn',
    weldmaps: 'Bản đồ mối hàn',
    certValid: 'hợp lệ',
    certExpiring: 'sắp hết hạn',
    certExpired: 'hết hạn',
    qualificationCard: 'Thẻ chứng nhận thợ hàn',
  },
});
i18n.global.mergeLocaleMessage('en', {
  welding: {
    title: 'Welding Management',
    wps: 'WPS / PQR',
    welders: 'Welders',
    weldmaps: 'Weld Maps',
    certValid: 'valid',
    certExpiring: 'expiring',
    certExpired: 'expired',
    qualificationCard: 'Welder Qualification Card',
  },
});

export default function registerWeldingFrontend(app, router) {
  router.addRoute({
    path: '/welding',
    component: WeldingBaseView,
    children: [
      { path: '',         redirect: '/welding/wps' },
      { path: 'wps',      name: 'WeldingWPS',      component: WPSListView },
      { path: 'welders',  name: 'WeldingWelders',  component: WeldersView },
      { path: 'weldmaps', name: 'WeldingWeldMaps', component: WeldMapView },
    ],
  });
}
