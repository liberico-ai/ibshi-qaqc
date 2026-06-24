<template>
  <div class="system-settings-general-view">
    <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">{{ $t('settings.general_subtitle') }}</p>

    <!-- Error/Loading states -->
    <div v-if="loading" class="text-center py-10">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      <p class="mt-4 text-sm text-gray-500">{{ $t('settings.loading') }}</p>
    </div>

    <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100 flex items-center">
      <svg class="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      {{ error }}
    </div>

    <!-- Main Form -->
    <div v-else class="bg-white dark:bg-[#1a1a2e] rounded-xl shadow-sm border border-gray-100 dark:border-[#252540] overflow-hidden">
      <form @submit.prevent="saveSettings">
        
        <div class="p-6 space-y-6">
          <!-- System Name -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{{ $t('settings.system_name') }}</label>
            <input 
              v-model="form.system_name" 
              type="text" 
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none dark:bg-black/20 dark:border-[#252540] dark:text-white transition-all"
              :placeholder="$t('settings.system_name_placeholder')"
              required
            >
            <p class="text-xs text-gray-400 mt-2">{{ $t('settings.system_name_hint') }}</p>
          </div>

          <!-- Default Theme -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{{ $t('settings.default_theme') }}</label>
            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2.5 cursor-pointer group">
                <input type="radio" v-model="form.default_theme" value="light" class="w-4 h-4 text-blue-600 focus:ring-blue-500/50 border-gray-300 dark:bg-black/20 dark:border-gray-600">
                <span class="text-[14px] text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{{ $t('settings.light_mode') }}</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer group">
                <input type="radio" v-model="form.default_theme" value="dark" class="w-4 h-4 text-blue-600 focus:ring-blue-500/50 border-gray-300 dark:bg-black/20 dark:border-gray-600">
                <span class="text-[14px] text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{{ $t('settings.dark_mode') }}</span>
              </label>
            </div>
            <p class="text-xs text-gray-400 mt-2">{{ $t('settings.theme_hint') }}</p>
          </div>

          <!-- Log Level -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{{ $t('settings.log_level') }}</label>
            <div class="relative">
              <select
                v-model="form.log_level"
                class="w-full appearance-none px-4 py-2 pr-10 border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all cursor-pointer"
              >
                <option value="trace">trace — Rất chi tiết (debug sâu)</option>
                <option value="debug">debug — Chi tiết (phát triển)</option>
                <option value="info">info — Thông tin chung (khuyến nghị)</option>
                <option value="warn">warn — Chỉ cảnh báo trở lên</option>
                <option value="error">error — Chỉ lỗi</option>
                <option value="fatal">fatal — Chỉ lỗi nghiêm trọng</option>
                <option value="silent">silent — Tắt hoàn toàn</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-2">{{ $t('settings.log_level_hint') }}</p>
          </div>

          <!-- Logo -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{{ $t('settings.logo_url') }}</label>
            <div class="flex flex-col sm:flex-row gap-4 sm:items-start">
              <div class="flex-1">
                <input 
                  v-model="form.logo_url" 
                  type="text" 
                  class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none dark:bg-black/20 dark:border-[#252540] dark:text-white transition-all"
                  :placeholder="$t('settings.logo_url_placeholder')"
                >
                <p class="text-xs text-gray-400 mt-2">{{ $t('settings.logo_url_hint') }}</p>
              </div>
              
              <div class="w-20 h-20 shrink-0 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-[#252540] rounded-xl flex items-center justify-center p-2 mt-4 sm:mt-0 shadow-inner">
                <img v-if="form.logo_url" :src="form.logo_url" alt="Logo Preview" class="max-w-full max-h-full object-contain" @error="handleImageError">
                <span v-else class="text-[10px] text-gray-400 text-center uppercase tracking-wider font-semibold">{{ $t('settings.no_logo') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit actions -->
        <div class="px-6 py-4 bg-gray-50 dark:bg-[#1a1a2e] border-t border-gray-100 dark:border-[#252540] flex justify-end">
          <button 
            type="submit" 
            :disabled="saving"
            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            <svg v-if="saving" class="w-4 h-4 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
            <span v-if="saving">{{ $t('settings.saving') }}</span>
            <span v-else>{{ $t('settings.save_config') }}</span>
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast.js';
import { apiFetch } from '@/utils/api.js';

const { t } = useI18n();
const { success, error: showError } = useToast();

const loading = ref(true);
const error = ref(null);
const saving = ref(false);

const form = ref({
  system_name: '',
  default_theme: 'light',
  logo_url: '',
  log_level: 'info'
});

const loadSettings = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await apiFetch('/api/system/settings');
    if (res.ok) {
      const data = await res.json();
      const dbSettings = data.data || {};
      if (dbSettings.system_name !== undefined) form.value.system_name = dbSettings.system_name;
      if (dbSettings.default_theme !== undefined) form.value.default_theme = dbSettings.default_theme;
      if (dbSettings.logo_url !== undefined) form.value.logo_url = dbSettings.logo_url;
      if (dbSettings.log_level !== undefined) form.value.log_level = dbSettings.log_level;
    } else {
      error.value = t('settings.load_failed');
    }
  } catch (err) {
    error.value = err.message || t('settings.network_error');
  } finally {
    loading.value = false;
  }
};

const handleImageError = (e) => {
  e.target.style.display = 'none'; // hide broken image
};

const saveSettings = async () => {
  saving.value = true;
  try {
    const res = await apiFetch('/api/system/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...form.value })
    });
    
    if (res.ok) {
      success(t('settings.save_success'));
      localStorage.removeItem('theme'); // Xóa theme cũ trong bộ nhớ để áp dụng theme hệ thống mới
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      const data = await res.json();
      showError(data.error || data.message || t('settings.save_failed'));
    }
  } catch (err) {
    showError(err.message || t('settings.network_error'));
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadSettings();
});
</script>
