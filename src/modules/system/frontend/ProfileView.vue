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

const { success, error } = useToast();

const currentUser = ref(null);
const form = ref({ full_name: '' });
const pass = ref({ current: '', new: '', confirm: '' });

const savingProfile = ref(false);
const savingPassword = ref(false);

onMounted(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  currentUser.value = user;
  form.value.full_name = user.full_name || '';
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
