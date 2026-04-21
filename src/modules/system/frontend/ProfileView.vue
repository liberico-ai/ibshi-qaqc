<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="card p-6 border-b border-gray-200 dark:border-[#252540]">
      <h2 class="text-xl font-bold text-slate-800 dark:text-white">Account Settings</h2>
      <p class="text-sm text-slate-500 dark:text-gray-400 mt-1">Manage your personal information and security preferences.</p>
    </div>

    <!-- Personal Info Card -->
    <div class="card p-6 md:p-8">
      <h3 class="text-base font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        Personal Information
      </h3>

      <div class="flex flex-col md:flex-row gap-8 items-start">
        <!-- Avatar -->
        <div class="flex flex-col items-center gap-3">
          <div class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-blue-500/20 ring-4 ring-white dark:ring-[#1a1a2e]">
            {{ form.full_name ? form.full_name.charAt(0).toUpperCase() : 'U' }}
          </div>
          <span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-white/[0.05] dark:text-gray-400 border border-gray-200 dark:border-[#252540]">Avatar auto-generated</span>
        </div>

        <!-- Form -->
        <div class="flex-1 w-full space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Họ và Tên</label>
              <input v-model="form.full_name" type="text" class="w-full bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-[#252540] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white focus:border-blue-500 dark:focus:border-blue-500 dark:focus:bg-[#151521] shadow-sm transition-all" placeholder="Your brand new name">
            </div>
            <div>
              <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Tài Khoản</label>
              <input :value="currentUser?.username" disabled type="text" class="w-full bg-gray-100 dark:bg-[#0a0b0e] border border-gray-200 dark:border-[#252540] rounded-lg px-4 py-2.5 text-sm text-slate-500 dark:text-gray-600 cursor-not-allowed" placeholder="username">
              <p class="text-[11px] text-slate-400 dark:text-gray-600 mt-1">Username determines your identity and cannot be altered.</p>
            </div>
          </div>
          
          <div class="pt-2 flex justify-end">
            <button @click="saveProfile" :disabled="savingProfile" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2 text-[13.5px] disabled:opacity-50">
              <svg v-if="savingProfile" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>{{ savingProfile ? 'Saving Changes...' : 'Save Profile' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MFA Card -->
    <div class="card p-6 md:p-8">
      <h3 class="text-base font-semibold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        Xác thực hai yếu tố (MFA)
      </h3>
      <p class="text-xs text-slate-400 dark:text-gray-500 mb-5">Quản lý các phương thức xác thực bổ sung cho tài khoản.</p>

      <!-- Active factors -->
      <div v-if="mfaFactors.length" class="space-y-2 mb-5">
        <div v-for="f in mfaFactors" :key="f.id"
             class="flex items-center justify-between px-4 py-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
          <div class="flex items-center gap-2.5">
            <span class="text-xs font-mono font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">{{ f.factor_type.toUpperCase() }}</span>
            <span class="text-sm text-slate-700 dark:text-gray-300">{{ f.factor_name }}</span>
            <span class="text-xs text-slate-400 dark:text-gray-500">Đã kích hoạt {{ f.enrolled_at ? new Date(f.enrolled_at).toLocaleDateString('vi-VN') : '' }}</span>
          </div>
          <button @click="mfaDisable(f.id)" class="text-xs text-red-500 hover:text-red-700 transition-colors">Tắt</button>
        </div>
      </div>
      <div v-else class="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500 mb-5 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-[#252540]">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        Chưa có phương thức MFA nào được kích hoạt.
      </div>

      <!-- Backup codes -->
      <div v-if="mfaFactors.length" class="mb-5">
        <button @click="mfaGenBackup" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">Tạo lại backup codes</button>
        <div v-if="backupCodes.length" class="mt-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
          <p class="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Lưu lại các backup codes — chỉ hiển thị một lần</p>
          <div class="grid grid-cols-2 gap-1 font-mono text-sm text-slate-700 dark:text-gray-300">
            <span v-for="c in backupCodes" :key="c">{{ c }}</span>
          </div>
          <button @click="backupCodes = []" class="mt-2 text-xs text-slate-500 hover:underline">Đã lưu, đóng</button>
        </div>
      </div>

      <!-- Add new factor button → route to MFA setup -->
      <router-link to="/system/mfa"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-500/40 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Thêm phương thức MFA
      </router-link>
    </div>

    <!-- Security Card -->
    <div class="card p-6 md:p-8">
      <h3 class="text-base font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
        <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        Change Password
      </h3>

      <div class="space-y-5 max-w-xl">
        <div class="relative">
          <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Current Password <span class="text-red-500">*</span></label>
          <input v-model="pass.current" type="password" class="w-full bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-[#252540] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white focus:border-blue-500 dark:focus:border-blue-500 dark:focus:bg-[#151521] shadow-sm transition-all" placeholder="Enter current password to authorize switch">
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">New Password <span class="text-red-500">*</span></label>
            <input v-model="pass.new" type="password" class="w-full bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-[#252540] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white focus:border-blue-500 dark:focus:border-blue-500 dark:focus:bg-[#151521] shadow-sm transition-all" placeholder="New secure password">
          </div>
          <div>
            <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Confirm Password <span class="text-red-500">*</span></label>
            <input v-model="pass.confirm" type="password" class="w-full bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-[#252540] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white focus:border-blue-500 dark:focus:border-blue-500 dark:focus:bg-[#151521] shadow-sm transition-all" placeholder="Repeat new password">
          </div>
        </div>

        <div class="pt-2 flex justify-start">
          <button @click="changePassword" :disabled="savingPassword" class="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 dark:from-white/10 dark:to-white/5 dark:hover:from-white/20 dark:hover:to-white/10 text-white font-semibold px-6 py-2.5 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 text-[13.5px] disabled:opacity-50">
            <svg v-if="savingPassword" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>{{ savingPassword ? 'Verifying...' : 'Update Password' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useToast } from '@/composables/useToast.js';
import { useRouter } from 'vue-router';

const { success, error } = useToast();
const router = useRouter();

const currentUser = ref(null);
const form = ref({ full_name: '' });
const pass = ref({ current: '', new: '', confirm: '' });

const savingProfile = ref(false);
const savingPassword = ref(false);

// MFA
const mfaFactors = ref([]);
const backupCodes = ref([]);

const loadMFA = async () => {
  try {
    const res = await apiFetch('/api/system/mfa/factors');
    if (res.ok) mfaFactors.value = (await res.json()).factors ?? [];
  } catch { /* silent */ }
};

const mfaDisable = async (id) => {
  if (!confirm('Tắt factor này?')) return;
  await apiFetch(`/api/system/mfa/factors/${id}`, { method: 'DELETE' });
  await loadMFA();
};

const mfaGenBackup = async () => {
  if (!confirm('Tạo bộ backup codes mới sẽ xóa bộ cũ. Tiếp tục?')) return;
  const res = await apiFetch('/api/system/mfa/backup-codes');
  if (res.ok) backupCodes.value = (await res.json()).codes ?? [];
};

onMounted(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  currentUser.value = user;
  form.value.full_name = user.full_name || '';
  loadMFA();
});

const saveProfile = async () => {
  if (!form.value.full_name.trim()) return error("Tên hiển thị không được để trống");
  
  savingProfile.value = true;
  try {
    const res = await apiFetch('/api/system/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: form.value.full_name })
    });
    
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('user', JSON.stringify(data.user));
      currentUser.value = data.user;
      
      success("Profile information verified and updated!");
    } else {
      const err = await res.json();
      error(err.error || "Cập nhật thất bại");
    }
  } catch (e) {
    error("Lỗi kết nối");
  } finally {
     savingProfile.value = false;
  }
};

const changePassword = async () => {
  if (!pass.value.current || !pass.value.new || !pass.value.confirm) return error("Vui lòng điền đủ các trường mật khẩu");
  if (pass.value.new !== pass.value.confirm) return error("Mật khẩu xác nhận không khớp!");
  
  savingPassword.value = true;
  try {
    const res = await apiFetch('/api/system/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
         current_password: pass.value.current, 
         new_password: pass.value.new 
      })
    });
    
    if (res.ok) {
      success("Security credentials securely upgraded!");
      pass.value = { current: '', new: '', confirm: '' };
    } else {
      const err = await res.json();
      error(err.error || "Đổi mật khẩu thất bại");
    }
  } catch (e) {
    error("Lỗi kết nối");
  } finally {
     savingPassword.value = false;
  }
};
</script>
