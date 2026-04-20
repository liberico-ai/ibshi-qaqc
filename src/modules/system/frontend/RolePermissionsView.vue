<template>
  <div class="card flex flex-col transition-colors relative h-full"> 
    <!-- Header -->
    <div class="px-6 py-5 border-b border-gray-200 dark:border-[#252540] flex justify-between items-center bg-slate-50 dark:bg-transparent transition-colors">
      <div>
         <h2 class="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-3">
            <router-link to="/system/settings/roles" class="text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#252540] p-1.5 rounded-lg shadow-sm">
               <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </router-link>
            Permission Management <span v-if="roleName" class="text-blue-600 dark:text-blue-400 ml-1">- {{ roleName }}</span>
         </h2>
         <p class="text-[13px] text-slate-500 dark:text-gray-400 mt-1.5">Configure action-level access control for this role.</p>
      </div>

      <button @click="savePermissions" :disabled="saving" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[13px] font-semibold px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50 border border-blue-400/20">
         <svg v-if="saving" class="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
         <svg v-else class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
         {{ saving ? 'Saving...' : 'Save Permissions' }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 dark:text-gray-500">
       <svg class="w-8 h-8 animate-spin mb-3 text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
       Loading permissions map...
    </div>

    <!-- Grid content -->
    <div v-else class="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#1a1a2e] transition-colors rounded-b-xl">
       <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div v-for="(acts, moduleName) in availableActions" :key="moduleName" class="p-5 rounded-xl border border-gray-200 dark:border-[#252540] bg-slate-50/50 dark:bg-white/[0.01]">
             <h4 class="text-[13px] font-bold text-slate-800 dark:text-gray-300 uppercase tracking-widest mb-4 flex items-center justify-between border-b border-gray-200 dark:border-[#252540] pb-3">
               <div class="flex items-center gap-2">
                 <div class="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/50 flex flex-shrink-0 items-center justify-center">
                    <div class="w-1.5 h-1.5 rounded-sm bg-blue-500"></div>
                 </div>
                 {{ moduleName }}
               </div>
               <button @click="toggleModule(acts)" class="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none transition-colors">
                 {{ isAllSelected(acts) ? 'Deselect All' : 'Select All' }}
               </button>
             </h4>
             <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label v-for="act in acts" :key="act.name" class="flex items-start gap-3 cursor-pointer group">
                  <div class="relative flex items-center mt-0.5 flex-shrink-0">
                    <input type="checkbox" :value="act.name" v-model="selectedActions" class="w-5 h-5 rounded-[5px] appearance-none border border-slate-300 dark:border-gray-600 checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition group-hover:border-blue-400 bg-white dark:bg-[#151521]">
                    <svg class="absolute top-[4px] left-[4px] w-3 h-3 text-white pointer-events-none hidden" :class="{'!block': selectedActions.includes(act.name)}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-[13.5px] text-slate-800 dark:text-gray-200 font-medium group-hover:text-blue-600 dark:group-hover:text-white transition leading-tight mt-0.5">{{ act.description || act.name }}</span>
                    <span class="text-[11.5px] text-slate-500 dark:text-gray-500 mt-1">{{ act.name }}</span>
                  </div>
                </label>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast.js';
import { apiFetch } from "@/utils/api.js";

const route = useRoute();
const router = useRouter();
const { success, error } = useToast();

const roleId = route.params.id;
const roleName = ref('');
const availableActions = ref({});
const selectedActions = ref([]);
const loading = ref(true);
const saving = ref(false);

const loadData = async () => {
   loading.value = true;
   try {
     const [rolesRes, actionsRes] = await Promise.all([
       apiFetch('/api/system/roles'),
       apiFetch('/api/system/actions')
     ]);

     if (!rolesRes.ok || !actionsRes.ok) throw new Error("Failed to load initial data");

     const rolesBody = await rolesRes.json();
     const actions = await actionsRes.json();

     const rolesList = rolesBody.data || rolesBody;
     const currentRole = rolesList.find(r => r.id == roleId);
     if (!currentRole) {
        error("Role not found");
        router.push('/system/settings/roles');
        return;
     }

     roleName.value = currentRole.name;
     let acts = currentRole.actions;
     if (typeof acts === 'string') {
        try { acts = JSON.parse(acts); } catch(e) { acts = []; }
     }
     selectedActions.value = Array.isArray(acts) ? acts : [];
     availableActions.value = actions;

   } catch(e) {
     error("Failed to load permissions");
     console.error(e);
   } finally {
     loading.value = false;
   }
};

const savePermissions = async () => {
   saving.value = true;
   try {
      const res = await apiFetch(`/api/system/roles/${roleId}/actions`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ actions: selectedActions.value })
      });

      if (res.ok) {
         success("Permissions saved successfully!");
      } else {
         const err = await res.json();
         error(err.error || "Failed to save permissions");
      }
   } catch(e) {
      error("Network error saving permissions");
   } finally {
      saving.value = false;
   }
};

onMounted(loadData);

const isAllSelected = (acts) => {
   if (!acts || !acts.length) return false;
   return acts.every(act => selectedActions.value.includes(act.name));
};

const toggleModule = (acts) => {
   if (isAllSelected(acts)) {
      const actNames = acts.map(a => a.name);
      selectedActions.value = selectedActions.value.filter(name => !actNames.includes(name));
   } else {
      acts.forEach(act => {
         if (!selectedActions.value.includes(act.name)) {
            selectedActions.value.push(act.name);
         }
      });
   }
};

</script>
