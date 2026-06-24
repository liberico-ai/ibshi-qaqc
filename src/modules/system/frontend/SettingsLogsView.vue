<template>
  <div class="system-settings-logs-view">
    <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">
      Cấu hình tính năng ghi log thao tác database (insert, update, delete).
      Log giúp truy vết ai đã làm gì, khi nào với bản ghi nào.
    </p>

    <div v-if="loading" class="text-center py-10">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      <p class="mt-4 text-sm text-gray-500">{{ $t('settings.loading') }}</p>
    </div>

    <div v-else class="bg-white dark:bg-[#1a1a2e] rounded-xl shadow-sm border border-gray-100 dark:border-[#252540] overflow-hidden">
      <form @submit.prevent="save">
        <div class="p-6 space-y-6">

          <!-- Toggle bật/tắt -->
          <div class="flex items-center justify-between">
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300">{{ $t('settings.logs_enable') }}</label>
              <p class="text-xs text-gray-400 mt-1">{{ $t('settings.logs_enable_hint') }}</p>
            </div>
            <button type="button" @click="form.sys_log_enabled = !form.sys_log_enabled"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              :class="form.sys_log_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                :class="form.sys_log_enabled ? 'translate-x-6' : 'translate-x-1'">
              </span>
            </button>
          </div>

          <!-- Thời gian lưu -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {{ $t('settings.logs_retention') }}
            </label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="form.sys_log_retention_days"
                type="number"
                min="0"
                max="3650"
                class="w-40 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none dark:bg-black/20 dark:border-[#252540] dark:text-white transition-all"
              >
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.logs_days') }}</span>
            </div>
            <p class="text-xs text-gray-400 mt-2">{{ $t('settings.logs_retention_hint') }}</p>
          </div>

        </div>

        <div class="px-6 py-4 bg-gray-50 dark:bg-[#1a1a2e] border-t border-gray-100 dark:border-[#252540] flex justify-end">
          <button type="submit" :disabled="saving"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm">
            <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
            </svg>
            <span>{{ saving ? $t('settings.saving') : $t('settings.save_config') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiFetch } from '@/utils/api.js';
import { useToast } from '@/composables/useToast.js';

const { t } = useI18n();
const { success, error: showError } = useToast();

const loading = ref(true);
const saving  = ref(false);
const form = ref({ sys_log_enabled: true, sys_log_retention_days: 90 });

const load = async () => {
  loading.value = true;
  try {
    const res  = await apiFetch('/api/system/settings');
    const data = await res.json();
    const s    = data.data || {};
    if (s.sys_log_enabled !== undefined) {
      form.value.sys_log_enabled = s.sys_log_enabled !== 'false' && s.sys_log_enabled !== '0';
    }
    if (s.sys_log_retention_days !== undefined) {
      form.value.sys_log_retention_days = parseInt(s.sys_log_retention_days, 10) || 90;
    }
  } catch (err) {
    showError(t('settings.logs_load_failed'));
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  saving.value = true;
  try {
    const body = {
      sys_log_enabled: String(form.value.sys_log_enabled),
      sys_log_retention_days: String(form.value.sys_log_retention_days),
    };
    const res = await apiFetch('/api/system/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      success(t('settings.logs_save_success'));
    } else {
      const d = await res.json();
      showError(d.error || t('settings.error_occurred'));
    }
  } catch (err) {
    showError(err.message || t('settings.network_error'));
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>
