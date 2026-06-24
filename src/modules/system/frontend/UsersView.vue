<template>
  <div class="card flex flex-col transition-colors relative">
    <!-- Toolbar -->
    <div class="px-6 py-5 border-b border-gray-200 dark:border-[#252540] flex flex-wrap justify-between items-center gap-4 transition-colors">
      <div class="flex gap-3 items-center">
        <!-- Searchbox -->
        <div class="relative group">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg class="w-4 h-4 text-slate-400 dark:text-gray-600 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="$t('users.search_placeholder')"
            class="bg-slate-50 border border-gray-200 text-slate-800 placeholder-slate-400 focus:bg-white dark:bg-white/[0.03] dark:border-[#252540] text-[13px] rounded-lg pl-10 pr-4 py-2.5 w-72 dark:text-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500/50 dark:focus:bg-white/[0.05] transition-all"
          >
        </div>
      </div>

      <button @click="openModal()" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        <span>{{ $t('users.add_user') }}</span>
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto min-h-[300px]">
      <table class="w-full text-left text-[13px] whitespace-nowrap">
        <thead>
          <tr class="border-b border-gray-200 dark:border-[#252540] transition-colors bg-slate-50/50 dark:bg-transparent">
            <th class="px-6 py-4 text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{{ $t('users.col_user') }}</th>
            <th class="px-6 py-4 text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{{ $t('users.col_status') }}</th>
            <th class="px-6 py-4 text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{{ $t('users.col_roles') }}</th>
            <th class="px-6 py-4 text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{{ $t('users.col_joined') }}</th>
            <th class="px-6 py-4 w-32 text-right text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading" class="border-b border-gray-100 dark:border-[#252540]/60"><td colspan="5" class="p-12 text-center text-slate-500 dark:text-gray-500">{{ $t('users.loading') }}</td></tr>
          
          <tr v-else-if="!filteredUsers.length" class="border-b border-gray-100 dark:border-[#252540]/60">
             <td colspan="5" class="p-12 text-center text-slate-500 dark:text-gray-600 flex flex-col items-center justify-center">
                 <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center mb-4 transition-colors">
                   <svg class="w-8 h-8 text-slate-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                 </div>
                 <span class="text-sm font-medium text-slate-600 dark:text-gray-500">{{ $t('users.empty') }}</span>
                 <span class="text-xs text-slate-500 dark:text-gray-600 mt-1">{{ $t('users.empty_hint') }}</span>
             </td>
          </tr>

          <tr 
            v-else
            v-for="user in filteredUsers" 
            :key="user.id"
            class="border-b border-gray-100 hover:bg-slate-50 dark:border-[#252540]/60 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
          >
            <!-- User -->
            <td class="px-6 py-4">
              <div class="flex items-center gap-3.5">
                <div 
                  class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white/5"
                  :class="avatarColors[user.id % avatarColors.length]"
                >
                  {{ (user.full_name || user.username).charAt(0).toUpperCase() }}
                </div>
                <div class="flex flex-col max-w-[200px] sm:max-w-[300px]">
                  <div class="text-[13.5px] font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors flex items-center gap-2 truncate">
                     <span class="truncate">{{ user.full_name || $t('users.no_name') }}</span>
                     <span v-if="user.is_admin" class="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 uppercase tracking-widest shadow-sm">{{ $t('users.sysadmin') }}</span>
                  </div>
                  <div class="text-slate-500 dark:text-gray-500 text-[11.5px] mt-0.5 font-medium truncate">@{{ user.username }}</div>
                </div>
              </div>
            </td>
            <!-- Status -->
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full" :class="user.is_active ? 'bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]'"></div>
                <span class="font-medium text-[12px]" :class="user.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">{{ user.is_active ? $t('users.active') : $t('users.inactive') }}</span>
              </div>
            </td>
            <!-- Roles -->
            <td class="px-6 py-4 whitespace-normal min-w-[250px]">
              <div class="flex items-center flex-wrap gap-1.5">
                 <span v-if="user.is_admin" class="px-2 py-1 rounded bg-slate-100 dark:bg-white/[0.04] text-[11px] font-semibold text-slate-600 dark:text-gray-400 border border-gray-200 dark:border-[#252540] shadow-sm">{{ $t('users.bypass_roles') }}</span>
                 <template v-else>
                   <span v-for="r in user.roles" :key="r.id" class="px-2 py-1 rounded bg-blue-50 dark:bg-blue-500/10 text-[11px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 shadow-sm">
                     {{ r.name || r.id }}
                   </span>
                   <span v-if="!user.roles || !user.roles.length" class="text-slate-400 dark:text-gray-600 text-xs italic">{{ $t('users.no_roles') }}</span>
                 </template>
              </div>
            </td>
            <!-- Joined -->
            <td class="px-6 py-4 text-slate-500 dark:text-gray-400 text-[12px] whitespace-nowrap">{{ formatDate(user.created_at) }}</td>
            <!-- Actions -->
            <td class="px-6 py-4 text-right flex items-center justify-end gap-1 relative z-10 w-32">
               <button @click.stop="openModal(user)" class="text-slate-500 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition" :title="$t('users.edit_user')">
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
               </button>
               <button @click.stop="toggleStatus(user)" :class="user.is_active ? 'text-slate-500 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400' : 'text-slate-500 hover:text-emerald-600 dark:text-gray-500 dark:hover:text-emerald-400'" class="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition" :title="user.is_active ? 'Deactivate User' : 'Activate User'">
                 <svg v-if="user.is_active" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                 <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    
    <!-- Pagination -->
    <div v-if="meta" class="px-6 py-4 border-t border-gray-200 dark:border-[#252540] flex justify-between items-center bg-slate-50 dark:bg-transparent transition-colors">
      <span class="text-xs text-slate-500 dark:text-gray-400">{{ $t('users.page_of', { page: meta.page, total: meta.totalPages }) }}</span>
      <div class="flex gap-2">
        <button :disabled="meta.page <= 1" @click="loadData(meta.page - 1)" class="px-3 py-1.5 rounded-md border border-gray-200 dark:border-[#252540] text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-50 text-xs transition">{{ $t('common.previous') }}</button>
        <button :disabled="meta.page >= meta.totalPages" @click="loadData(meta.page + 1)" class="px-3 py-1.5 rounded-md border border-gray-200 dark:border-[#252540] text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-50 text-xs transition">{{ $t('common.next') }}</button>
      </div>
    </div>
  
    <!-- Edit/Add Modal Overlay -->
    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm transition-opacity">
      <div class="bg-white dark:bg-[#151521] border border-gray-200 dark:border-[#252540] rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-[#252540] flex justify-between items-center bg-slate-50 dark:bg-[#1a1a2e]">
          <h3 class="text-lg font-bold text-slate-800 dark:text-white">{{ isEditing ? $t('users.edit_user') : $t('users.create_user') }}</h3>
          <button @click="closeModal" class="text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-white p-1 rounded-md transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <!-- Body -->
        <div class="p-6 flex-1 overflow-y-auto">
          <form @submit.prevent="saveUser" class="space-y-5">
            <div>
              <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">{{ $t('users.full_name') }} <span class="text-red-500">*</span></label>
              <input v-model="form.full_name" required type="text" class="w-full bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white focus:border-blue-500 dark:focus:border-blue-500 dark:focus:bg-[#151521] shadow-sm transition-all" :placeholder="$t('users.full_name_placeholder')">
            </div>
            <div>
              <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">{{ $t('profile.username') }} <span class="text-red-500">*</span></label>
              <input v-model="form.username" required type="text" class="w-full bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white focus:border-blue-500 dark:focus:border-blue-500 dark:focus:bg-[#151521] shadow-sm transition-all" :placeholder="$t('users.username_placeholder')">
            </div>
            <div>
              <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">{{ $t('auth.password') }} <span v-if="!isEditing" class="text-red-500">*</span></label>
              <div class="relative flex items-center">
                <input v-model="form.password" :required="!isEditing" :type="showPassword ? 'text' : 'password'" class="w-full bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-lg pl-4 pr-20 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white focus:border-blue-500 dark:focus:border-blue-500 dark:focus:bg-[#151521] shadow-sm transition-all" :placeholder="isEditing ? $t('users.password_placeholder') : $t('users.password_placeholder')">
                
                <div class="absolute right-2 flex items-center gap-1">
                  <!-- Show/Hide -->
                  <button type="button" @click="showPassword = !showPassword" class="text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition" :title="showPassword ? $t('users.hide_password') : $t('users.show_password')">
                    <svg v-if="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                  </button>
                  <!-- Generate -->
                  <button type="button" @click="generatePassword" class="text-slate-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10 transition" :title="$t('users.generate_password')">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div v-if="!form.is_admin">
              <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-2 mt-4 border-t border-gray-200 dark:border-[#252540] pt-4">{{ $t('users.assign_roles') }}</label>
              <div class="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2">
                 <label v-for="r in allRoles" :key="r.id" class="flex items-start gap-2.5 cursor-pointer group">
                   <div class="relative flex items-center mt-0.5">
                     <input type="checkbox" :value="r.id" v-model="form.roles" class="w-[18px] h-[18px] rounded-[4px] appearance-none border border-slate-300 dark:border-gray-600 checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition group-hover:border-blue-400 bg-white dark:bg-[#1a1a2e]">
                     <svg class="absolute top-[3px] left-[3px] w-3 h-3 text-white pointer-events-none hidden" :class="{'!block': form.roles.includes(r.id)}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                   </div>
                   <span class="text-[13px] text-slate-800 dark:text-gray-300 font-medium group-hover:text-blue-600 dark:group-hover:text-white transition leading-tight mt-0.5">{{ r.name }}</span>
                 </label>
              </div>
            </div>
            <div v-else class="text-[12.5px] p-4 mt-4 rounded-xl bg-orange-50 text-orange-700 dark:bg-amber-500/10 dark:text-amber-400 flex items-start gap-3 border border-orange-200 dark:border-amber-500/20">
               <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
               <span class="font-medium">{{ $t('users.is_sysadmin_warning') }}</span>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 dark:border-[#252540] flex justify-end gap-3 bg-slate-50 dark:bg-[#1a1a2e]">
          <button type="button" @click="closeModal" class="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-gray-200 hover:bg-slate-50 dark:text-gray-300 dark:bg-white/[0.04] dark:border-transparent dark:hover:bg-white/[0.08] shadow-sm transition-all focus:outline-none">{{ $t('common.cancel') }}</button>
          <button @click="saveUser" :disabled="saving" class="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-500/20 focus:outline-none flex items-center gap-2">
            <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ saving ? $t('common.loading') : $t('users.save_user') }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useToast } from '@/composables/useToast.js';
import { useI18n } from 'vue-i18n';
import { apiFetch } from "@/utils/api.js";

const { success, error } = useToast();
const { t } = useI18n();

const dbUsers = ref([]);
const allRoles = ref([]);
const searchQuery = ref('');
const loading = ref(true);
const meta = ref({ page: 1, total: 0, totalPages: 1 });

const modalOpen = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const showPassword = ref(false);

const form = ref({
  id: null,
  full_name: '',
  username: '',
  password: '',
  roles: [],
  is_admin: false
});

const generatePassword = () => {
    let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let result = '';
    for (let i = 0; i < 14; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.value.password = result;
    showPassword.value = true;
};

const avatarColors = [
  'bg-gradient-to-br from-blue-500 to-indigo-600',
  'bg-gradient-to-br from-emerald-400 to-teal-600',
  'bg-gradient-to-br from-violet-500 to-purple-600',
  'bg-gradient-to-br from-amber-400 to-orange-500',
  'bg-gradient-to-br from-rose-400 to-pink-600',
  'bg-gradient-to-br from-cyan-400 to-blue-500',
  'bg-gradient-to-br from-fuchsia-400 to-purple-500',
];

const formatDate = (ds) => {
  if (!ds) return '-';
  return new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const filteredUsers = computed(() => dbUsers.value);

let searchTimeout;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadData(1), 500);
});

const loadData = async (page = 1) => {
  loading.value = true;
  try {
    const [usersRes, rolesRes] = await Promise.all([
      apiFetch(`/api/system/users?page=${page}&search=${encodeURIComponent(searchQuery.value)}`),
      apiFetch('/api/system/roles')
    ]);
    if (rolesRes.ok) {
       const rolesBody = await rolesRes.json();
       allRoles.value = rolesBody.data || rolesBody;
    }
    if (usersRes.ok) {
       const usersBody = await usersRes.json();
       if (usersBody.meta) meta.value = usersBody.meta;
       const uList = usersBody.data || usersBody;
       dbUsers.value = uList.map(u => {
          let parsedRoles = [];
          if (typeof u.roles === 'string') {
             try { parsedRoles = JSON.parse(u.roles); } catch(e){}
          } else if (Array.isArray(u.roles)) {
             parsedRoles = u.roles;
          }
          return { ...u, roles: parsedRoles };
       });
    }
  } catch(e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const openModal = (user = null) => {
  showPassword.value = false;
  if (user) {
    isEditing.value = true;
    form.value = { 
      id: user.id, 
      full_name: user.full_name || '', 
      username:  user.username || '',
      password: '',
      roles: user.roles ? user.roles.map(r => r.id) : [],
      is_admin: user.is_admin
    };
  } else {
    isEditing.value = false;
    form.value = { id: null, full_name: '', username: '', password: '', roles: [], is_admin: false };
  }
  modalOpen.value = true;
};

const closeModal = () => {
  modalOpen.value = false;
};

const saveUser = async () => {
  if (!form.value.username.trim()) return error("Username is required");
  if (!isEditing.value && !form.value.password) return error("Password is required for new users");
  
  saving.value = true;
  const payload = {
    full_name: form.value.full_name,
    username: form.value.username,
    roles: form.value.roles
  };
  if (form.value.password) {
     payload.password = form.value.password;
  }

  try {
    const method = isEditing.value ? 'PUT' : 'POST';
    const url = isEditing.value ? `/api/system/users/${form.value.id}` : `/api/system/users`;
    
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeModal();
      await loadData();
      success(t('users.save_success'));
    } else {
      const err = await res.json();
      error(err.error || t('users.save_failed'));
    }
  } catch (e) {
    error(t('users.save_failed'));
    console.error(e);
  } finally {
    saving.value = false;
  }
};

const toggleStatus = async (user) => {
  const newStatusText = user.is_active ? 'deactivate' : 'activate';
  if (!confirm(`Are you sure you want to ${newStatusText} this user?`)) return;
  
  try {
    const res = await apiFetch(`/api/system/users/${user.id}`, { 
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ is_active: !user.is_active })
    });
    if (res.ok) {
      await loadData();
      success(`User ${newStatusText}d successfully!`);
    } else {
      const err = await res.json();
      error(err.error || `Failed to ${newStatusText} user`);
    }
  } catch(e) {
    error("Error updating user status");
  }
};

onMounted(loadData);
</script>
