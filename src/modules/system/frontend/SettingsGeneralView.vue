<template>
  <div class="system-settings-general-view">
    <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">Cấu hình các thông số chung áp dụng cho toàn bộ nền tảng. Khi lưu cài đặt, hệ thống sẽ tự động tải lại trang để áp dụng.</p>

    <!-- Error/Loading states -->
    <div v-if="loading" class="text-center py-10">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      <p class="mt-4 text-sm text-gray-500">Đang tải cấu hình...</p>
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
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tên hệ thống hiển thị</label>
            <input 
              v-model="form.system_name" 
              type="text" 
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none dark:bg-black/20 dark:border-[#252540] dark:text-white transition-all"
              placeholder="VD: Libe Move Logistics"
              required
            >
            <p class="text-xs text-gray-400 mt-2">Dùng cho tiêu đề trình duyệt (browser title) và hiển thị góc trên bên trái menu.</p>
          </div>

          <!-- Default Theme -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Giao diện (Theme) mặc định</label>
            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2.5 cursor-pointer group">
                <input type="radio" v-model="form.default_theme" value="light" class="w-4 h-4 text-blue-600 focus:ring-blue-500/50 border-gray-300 dark:bg-black/20 dark:border-gray-600">
                <span class="text-[14px] text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Giao diện sáng (Light Mode)</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer group">
                <input type="radio" v-model="form.default_theme" value="dark" class="w-4 h-4 text-blue-600 focus:ring-blue-500/50 border-gray-300 dark:bg-black/20 dark:border-gray-600">
                <span class="text-[14px] text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Giao diện tối (Dark Mode)</span>
              </label>
            </div>
            <p class="text-xs text-gray-400 mt-2">Được áp dụng khi người dùng mở trang lần đầu hoặc chưa lưu sở thích theme.</p>
          </div>

          <!-- Log Level -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Mức độ ghi log (Log Level)</label>
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
            <p class="text-xs text-gray-400 mt-2">Áp dụng ngay lập tức, không cần khởi động lại server.</p>
          </div>

          <!-- MFA Enforcement -->
          <div class="border-t border-gray-100 dark:border-[#252540] pt-6">
            <div class="flex items-center justify-between mb-3">
              <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300">Bắt buộc xác thực hai yếu tố (MFA)</label>
                <p class="text-xs text-gray-400 mt-1">Khi bật, người dùng chưa enroll MFA sẽ bị chặn sau thời gian ân hạn.</p>
              </div>
              <button type="button" @click="mfa.enabled = !mfa.enabled"
                :class="['relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
                  mfa.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600']">
                <span :class="['pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200',
                  mfa.enabled ? 'translate-x-5' : 'translate-x-0']" />
              </button>
            </div>
            <div v-if="mfa.enabled" class="flex items-center gap-3 mt-3">
              <label class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Thời gian ân hạn:</label>
              <input v-model.number="mfa.grace_days" type="number" min="0" max="90"
                class="w-20 px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none dark:bg-black/20 dark:border-[#252540] dark:text-white transition-all" />
              <span class="text-sm text-gray-400">ngày kể từ khi tạo tài khoản</span>
            </div>
          </div>

          <!-- Logo -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Đường dẫn Logo (URL)</label>
            <div class="flex flex-col sm:flex-row gap-4 sm:items-start">
              <div class="flex-1">
                <input 
                  v-model="form.logo_url" 
                  type="text" 
                  class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none dark:bg-black/20 dark:border-[#252540] dark:text-white transition-all"
                  placeholder="VD: /favicon.ico hoặc https://..."
                >
                <p class="text-xs text-gray-400 mt-2">Dùng URL tương đối (static folder) hoặc URL tuyệt đối.</p>
              </div>
              
              <div class="w-20 h-20 shrink-0 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-[#252540] rounded-xl flex items-center justify-center p-2 mt-4 sm:mt-0 shadow-inner">
                <img v-if="form.logo_url" :src="form.logo_url" alt="Logo Preview" class="max-w-full max-h-full object-contain" @error="handleImageError">
                <span v-else class="text-[10px] text-gray-400 text-center uppercase tracking-wider font-semibold">No Logo</span>
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
            <span v-if="saving">Đang lưu...</span>
            <span v-else>Lưu cấu hình</span>
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from '@/composables/useToast.js';
import { apiFetch } from '@/utils/api.js';

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

const mfa = ref({ enabled: false, grace_days: 7 });

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
      if (dbSettings.mfa_enforcement) {
        try {
          const p = JSON.parse(dbSettings.mfa_enforcement);
          mfa.value.enabled = !!p.enabled;
          mfa.value.grace_days = p.grace_days ?? 7;
        } catch { /* keep defaults */ }
      }
    } else {
      error.value = 'Không thể kết nối đến máy chủ cài đặt';
    }
  } catch (err) {
    error.value = err.message || 'Lỗi mạng khi tải cài đặt';
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
      body: JSON.stringify({
        ...form.value,
        mfa_enforcement: JSON.stringify({ enabled: mfa.value.enabled, grace_days: mfa.value.grace_days }),
      })
    });
    
    if (res.ok) {
      success('Lưu cài đặt thành công. Trang sẽ tự tải lại...');
      localStorage.removeItem('theme'); // Xóa theme cũ trong bộ nhớ để áp dụng theme hệ thống mới
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      const data = await res.json();
      showError(data.error || data.message || 'Có lỗi xảy ra khi lưu.');
    }
  } catch (err) {
    showError(err.message || 'Lỗi mạng khi lưu cài đặt.');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadSettings();
});
</script>
