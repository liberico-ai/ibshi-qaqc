<template>
  <button @click="toggle"
    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#12122a] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    :title="locale === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-3 0a9 9 0 00-18 0M3 12c0-4.97 4.03-9 9-9m0 18c-4.97 0-9-4.03-9-9m9 9a9 9 0 009-9m-9 9V3"/>
    </svg>
    <span class="font-semibold uppercase">{{ locale === 'vi' ? 'VI' : 'EN' }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale } from '@/plugins/i18n.js';
import { apiFetch } from '@/utils/api.js';

const { locale: i18nLocale } = useI18n();
const locale = computed(() => i18nLocale.value);

async function toggle() {
  const next = i18nLocale.value === 'vi' ? 'en' : 'vi';
  setLocale(next);
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      await apiFetch('/api/system/users/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: next }),
      });
    }
  } catch {
    // ignore — localStorage already updated
  }
}
</script>
