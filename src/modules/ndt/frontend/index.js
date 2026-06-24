import { i18n } from '../../../plugins/i18n.js';
import NDTBaseView          from './NDTBaseView.vue';
import NDTRequestListView   from './NDTRequestListView.vue';
import NDTRequestFormView   from './NDTRequestFormView.vue';
import NDTVendorListView    from './NDTVendorListView.vue';

// ── Decentralized i18n: merge module messages, never touch src/locales ──
i18n.global.mergeLocaleMessage('vi', {
  ndt: {
    title: 'Kiểm tra không phá huỷ (NDT)',
    requests: 'Yêu cầu NDT',
    vendors: 'Nhà thầu NDT',
    methods: { RT: 'Chụp ảnh phóng xạ', UT: 'Siêu âm', MT: 'Hạt từ', PT: 'Thẩm thấu' },
    resultAccept: 'Đạt',
    resultReject: 'Không đạt',
  },
});
i18n.global.mergeLocaleMessage('en', {
  ndt: {
    title: 'Non-Destructive Testing (NDT)',
    requests: 'NDT Requests',
    vendors: 'NDT Vendors',
    methods: { RT: 'Radiographic', UT: 'Ultrasonic', MT: 'Magnetic Particle', PT: 'Penetrant' },
    resultAccept: 'Accept',
    resultReject: 'Reject',
  },
});

export default function registerNDTFrontend(app, router) {
  router.addRoute({
    path: '/ndt',
    component: NDTBaseView,
    children: [
      { path: '',             redirect: '/ndt/requests' },
      { path: 'requests',     name: 'NDTRequests',    component: NDTRequestListView },
      { path: 'requests/new', name: 'NDTRequestForm', component: NDTRequestFormView },
      { path: 'vendors',      name: 'NDTVendors',     component: NDTVendorListView },
    ],
  });
}
