<template>
  <div class="max-w-4xl mx-auto space-y-6">

    <div v-if="loading" class="card p-12 text-center text-slate-500 dark:text-gray-500 animate-pulse">
      Đang tải thông tin hệ thống...
    </div>

    <div v-else-if="info" class="space-y-6">
      <!-- General Info -->
      <div class="card p-6 border-l-4 border-l-blue-500">
        <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-6">Thông Tin Phiên Bản</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-1">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Phiên Bản Phát Hành</span>
            <div class="text-base font-medium text-slate-800 dark:text-gray-200">v{{ info.version }}</div>
          </div>
          <div class="space-y-1">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Git Hash (Revision)</span>
            <div class="text-base font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md inline-block">{{ info.git_hash }}</div>
          </div>
          <div class="space-y-1">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Thời Gian Cập Nhật</span>
            <div class="text-base font-medium text-slate-800 dark:text-gray-200">{{ formatTime(info.build_time) }}</div>
          </div>
        </div>
      </div>

      <!-- Dependencies -->
      <div class="card overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-[#252540] bg-slate-50/50 dark:bg-transparent">
          <h3 class="text-base font-bold text-slate-800 dark:text-white relative pl-3">
            <span class="absolute left-0 top-1.5 bottom-1.5 w-1 bg-indigo-500 rounded-full"></span>
            Thư Viện (Dependencies)
          </h3>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
             <div v-for="(ver, name) in info.dependencies" :key="name" class="flex justify-between items-center border-b border-gray-100 dark:border-[#252540]/60 pb-2 border-dotted">
                <span class="text-sm text-slate-700 dark:text-gray-300">{{ name }}</span>
                <span class="text-xs font-mono text-slate-500 dark:text-gray-500 bg-slate-100 dark:bg-[#1a1a2e] px-2 py-1 rounded">{{ ver }}</span>
             </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';

const info = ref(null);
const loading = ref(true);

const loadData = async () => {
  loading.value = true;
  try {
    const res = await apiFetch('/api/system/info');
    if (res.ok) {
      info.value = await res.json();
    }
  } catch(e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const formatTime = (isoString) => {
  if (!isoString) return 'N/A';
  const d = new Date(isoString);
  return d.toLocaleString('vi-VN', { 
    hour: '2-digit', minute: '2-digit', second: '2-digit', 
    day: '2-digit', month: '2-digit', year: 'numeric' 
  });
};

onMounted(() => {
  loadData();
});
</script>
