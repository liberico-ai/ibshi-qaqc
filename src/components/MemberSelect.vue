<template>
  <div class="relative">
    <input 
       type="text" 
       v-model="searchKeyword" 
       @focus="showDropdown = true" 
       @blur="hideDropdownDelay" 
       class="w-full bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-[#252540] rounded-lg px-4 py-2.5 text-sm dark:text-white" 
       :placeholder="placeholder || 'Type to search member name or phone...'"
    >
    <div v-if="showDropdown && membersList.length > 0" class="absolute z-10 w-full mt-1 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#252540] rounded-lg shadow-xl max-h-48 overflow-y-auto">
       <div 
         v-for="m in membersList" 
         :key="m.id" 
         @mousedown="selectMember(m)" 
         class="px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#252540] text-sm dark:text-gray-300 border-b border-gray-100 dark:border-[#202035] last:border-0"
       >
         <div class="font-semibold">{{ m.full_name }}</div>
         <div class="text-[11px] text-slate-500">{{ m.phone_number }}</div>
       </div>
    </div>
    <div v-if="modelValue" class="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium break-all flex items-center justify-between">
      <span>Selected ID: {{ modelValue }}</span>
      <button type="button" @click="clearSelection" class="text-red-500 hover:text-red-700 ml-2" title="Clear">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const membersList = ref([]);
const searchKeyword = ref('');
const showDropdown = ref(false);
let searchTimeout;

watch(searchKeyword, (val) => {
  if (!val && props.modelValue) {
     emit('update:modelValue', '');
  }
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadMembers(val);
  }, 400);
});

watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    searchKeyword.value = '';
  }
});

const loadMembers = async (search = '') => {
  try {
    const res = await apiFetch(`/api/members?limit=20&search=${encodeURIComponent(search)}`);
    const result = await res.json();
    membersList.value = result.data || [];
  } catch(e) {
    console.error("Failed to load members", e);
  }
};

const selectMember = (m) => {
  emit('update:modelValue', m.id);
  emit('change', m);
  searchKeyword.value = `${m.full_name} (${m.phone_number})`;
  showDropdown.value = false;
};

const clearSelection = () => {
  emit('update:modelValue', '');
  searchKeyword.value = '';
  showDropdown.value = false;
};

const hideDropdownDelay = () => {
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
};

onMounted(() => {
  loadMembers('');
});
</script>
