import { createI18n } from 'vue-i18n';
import vi from '../locales/vi.json';
import en from '../locales/en.json';

const SUPPORTED = ['vi', 'en'];
const FALLBACK = 'vi';

function detectLocale() {
  if (typeof window === 'undefined') return FALLBACK;
  const saved = localStorage.getItem('locale');
  if (saved && SUPPORTED.includes(saved)) return saved;
  const nav = (navigator.language ?? '').toLowerCase();
  return nav.startsWith('en') ? 'en' : FALLBACK;
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true, // cho phép dùng $t(...) trực tiếp trong template (không cần useI18n)
  locale: detectLocale(),
  fallbackLocale: FALLBACK,
  messages: { vi, en },
  missingWarn: false,
  fallbackWarn: false,
});

export function setLocale(locale) {
  if (!SUPPORTED.includes(locale)) return;
  i18n.global.locale.value = locale;
  if (typeof window !== 'undefined') localStorage.setItem('locale', locale);
  if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', locale);
}

export function getLocale() {
  return i18n.global.locale.value;
}

export function formatDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  const loc = getLocale() === 'en' ? 'en-US' : 'vi-VN';
  return new Intl.DateTimeFormat(loc, { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

export function formatNumber(value) {
  if (value == null || value === '') return '';
  const loc = getLocale() === 'en' ? 'en-US' : 'vi-VN';
  return new Intl.NumberFormat(loc).format(value);
}

/** Map backend error code → translated string. Returns code itself if no translation. */
export function translateErrorCode(code, params = {}) {
  if (!code) return '';
  const key = `errors.${code}`;
  const t = i18n.global.t;
  const translated = t(key, params);
  return translated === key ? code : translated;
}
