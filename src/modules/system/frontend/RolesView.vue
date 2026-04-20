<template>
  <div class="card flex flex-col transition-colors relative">
    <!-- Toolbar -->
    <div class="px-6 py-5 border-b border-gray-200 dark:border-[#252540] flex flex-wrap justify-between items-center gap-4 transition-colors">
      <div class="flex gap-3 items-center">
        <h2 class="text-lg font-semibold text-slate-800 dark:text-white">Roles Management</h2>
      </div>

      <button @click="openModal()" class="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        <span>Thêm Quyền</span>
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto min-h-[300px]">
      <table class="w-full text-left text-[13px] whitespace-nowrap">
        <thead>
          <tr class="border-b border-gray-200 dark:border-[#252540] transition-colors bg-slate-50/50 dark:bg-transparent">
            <th class="px-6 py-4 text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider w-16"># ID</th>
            <th class="px-6 py-4 text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Tên Phân Quyền</th>
            <th class="px-6 py-4 text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider w-1/3">Mô Tả</th>
            <th class="px-6 py-4 text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Permissions</th>
            <th class="px-6 py-4 w-32 text-right text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading" class="border-b border-gray-100 dark:border-[#252540]/60"><td colspan="5" class="p-12 text-center text-slate-500 dark:text-gray-500">Loading roles...</td></tr>
          <tr v-else-if="!roles.length" class="border-b border-gray-100 dark:border-[#252540]/60">
             <td colspan="5" class="p-12 text-center text-slate-500 dark:text-gray-600 flex flex-col items-center">
                 <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center mb-4">
                   <svg class="w-8 h-8 text-slate-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
                 </div>
                 <span class="text-sm font-medium text-slate-600 dark:text-gray-500">0 roles found</span>
             </td>
          </tr>
          <tr 
            v-else
            v-for="role in roles" 
            :key="role.id"
            class="border-b border-gray-100 hover:bg-slate-50 dark:border-[#252540]/60 dark:hover:bg-white/[0.02] transition-colors group"
          >
            <td class="px-6 py-4 font-semibold text-slate-700 dark:text-gray-400">{{ role.id }}</td>
            <td class="px-6 py-4">
              <span class="px-2.5 py-1 rounded-md text-[12px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">{{ role.name }}</span>
            </td>
            <td class="px-6 py-4 text-slate-600 dark:text-gray-400 truncate max-w-[300px]">{{ role.description }}</td>
            <td class="px-6 py-4">
              <span class="text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-400/20 shadow-sm">
                {{ role.actions?.length || 0 }} actions
              </span>
            </td>
            <td class="px-6 py-4 flex items-center justify-end gap-1">
               <router-link :to="'/system/settings/roles/' + role.id + '/permissions'" class="text-slate-500 hover:text-emerald-600 dark:text-gray-500 dark:hover:text-emerald-400 p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition" title="Manage Permissions">
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
               </router-link>
               <button @click="openModal(role, true)" class="text-slate-500 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition" title="Clone Role">
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
               </button>
               <button @click="openModal(role)" class="text-slate-500 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition" title="Edit Role Info">
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
               </button>
               <button @click="deleteRole(role.id)" class="text-slate-500 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition" title="Delete Role">
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
               </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    
    <!-- Pagination -->
    <div v-if="meta" class="px-6 py-4 border-t border-gray-200 dark:border-[#252540] flex justify-between items-center bg-slate-50 dark:bg-transparent transition-colors">
      <span class="text-xs text-slate-500 dark:text-gray-400">Showing page {{ meta.page }} of {{ meta.totalPages }} ({{ meta.total }} items)</span>
      <div class="flex gap-2">
        <button :disabled="meta.page <= 1" @click="loadData(meta.page - 1)" class="px-3 py-1.5 rounded-md border border-gray-200 dark:border-[#252540] text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-50 text-xs transition">Prev</button>
        <button :disabled="meta.page >= meta.totalPages" @click="loadData(meta.page + 1)" class="px-3 py-1.5 rounded-md border border-gray-200 dark:border-[#252540] text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-50 text-xs transition">Tới</button>
      </div>
    </div>
  
    <!-- Edit/Add Modal Overlay -->
    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm transition-opacity">
      <div class="bg-white dark:bg-[#151521] border border-gray-200 dark:border-[#252540] rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-[#252540] flex justify-between items-center bg-slate-50 dark:bg-[#1a1a2e]">
          <h3 class="text-lg font-bold text-slate-800 dark:text-white">{{ isEditing ? 'Edit Role' : (form.actions?.length ? 'Clone Role' : 'Create New Role') }}</h3>
          <button @click="closeModal" class="text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-white p-1 rounded-md transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <!-- Modal Body -->
        <div class="p-6">
          <form @submit.prevent="saveRole" class="space-y-5">
            <div>
              <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Role Name <span class="text-red-500">*</span></label>
              <input v-model="form.name" required type="text" class="w-full bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white focus:border-blue-500 dark:focus:border-blue-500 dark:focus:bg-[#151521] shadow-sm transition-all" placeholder="e.g. Sales Manager">
            </div>
            <div>
              <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Mô Tả</label>
              <textarea v-model="form.description" rows="3" class="w-full bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white focus:border-blue-500 dark:focus:border-blue-500 dark:focus:bg-[#151521] shadow-sm transition-all" placeholder="Brief description of responsibilities"></textarea>
            </div>
            
            <div v-if="form.actions?.length" class="text-[12.5px] p-3 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 flex items-start gap-2 border border-blue-100 dark:border-blue-500/20">
               <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               <span>This new role will inherit <b>{{ form.actions.length }}</b> permissions from the cloned role.</span>
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-gray-200 dark:border-[#252540] flex justify-end gap-3 bg-slate-50 dark:bg-[#1a1a2e]">
          <button type="button" @click="closeModal" class="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-gray-200 hover:bg-slate-50 dark:text-gray-300 dark:bg-white/[0.04] dark:border-transparent dark:hover:bg-white/[0.08] shadow-sm transition-all focus:outline-none">Hủy</button>
          <button @click="saveRole" :disabled="saving" class="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-500/20 focus:outline-none flex items-center gap-2">
            <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ saving ? 'Saving...' : 'Save Role' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from '@/composables/useToast.js';
import { apiFetch } from "@/utils/api.js";

const { success, error } = useToast();

const roles = ref([]);
const loading = ref(true);
const meta = ref({ page: 1, total: 0, totalPages: 1 });

const modalOpen = ref(false);
const isEditing = ref(false);
const saving = ref(false);

const form = ref({
  id: null,
  name: '',
  description: '',
  actions: []
});

const loadData = async (page = 1) => {
  loading.value = true;
  try {
    const rolesRes = await apiFetch(`/api/system/roles?page=${page}`);
    if (rolesRes.ok) {
      const body = await rolesRes.json();
      if (body.meta) meta.value = body.meta;
      roles.value = body.data || body;
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const openModal = (role = null, isClone = false) => {
  if (role && !isClone) {
    isEditing.value = true;
    form.value = { 
      id: role.id, 
      name: role.name, 
      description: role.description || ''
    };
  } else if (role && isClone) {
    isEditing.value = false;
    let parsedActions = [];
    if (typeof role.actions === 'string') {
       try { parsedActions = JSON.parse(role.actions); } catch(e) {}
    } else if (Array.isArray(role.actions)) {
       parsedActions = role.actions;
    }
    
    form.value = { 
      id: null, 
      name: role.name + ' (Copy)', 
      description: role.description || '',
      actions: parsedActions
    };
  } else {
    isEditing.value = false;
    form.value = { id: null, name: '', description: '', actions: [] };
  }
  modalOpen.value = true;
};

const closeModal = () => {
  modalOpen.value = false;
};

const saveRole = async () => {
  if (!form.value.name.trim()) return error("Role Name is required");
  
  saving.value = true;
  const payload = {
    name: form.value.name,
    description: form.value.description
  };

  // Assign actions explicitly if we are creating a new clone
  if (!isEditing.value && form.value.actions?.length) {
    payload.actions = form.value.actions;
  }

  try {
    const method = isEditing.value ? 'PUT' : 'POST';
    const url = isEditing.value ? `/api/system/roles/${form.value.id}` : `/api/system/roles`;
    
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeModal();
      await loadData();
      success(isEditing.value ? "Role updated successfully!" : "Role created successfully!");
    } else {
      const err = await res.json();
      error(err.error || "Failed to process request");
    }
  } catch (e) {
    error("Error saving role");
    console.error(e);
  } finally {
    saving.value = false;
  }
};

const deleteRole = async (id) => {
  if (!confirm("Are you sure you want to delete this role permanently?")) return;
  
  try {
    const res = await apiFetch(`/api/system/roles/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadData();
      success("Role deleted successfully");
    } else {
      const err = await res.json();
      error(err.error || "Failed to delete role");
    }
  } catch(e) {
    error("Error deleting role");
  }
};

onMounted(loadData);
</script>
