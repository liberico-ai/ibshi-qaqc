<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Dự Án</h2>
      <button v-can="'qaqc.projects.sync'" @click="sync" :disabled="syncing"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
        <svg class="w-4 h-4" :class="{ 'animate-spin': syncing }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        {{ syncing ? 'Đang đồng bộ...' : 'Đồng bộ ERP' }}
      </button>
    </div>

    <div class="card p-0 overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-slate-50 dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-slate-800">
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Mã</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Tên dự án</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Khách hàng</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Trạng thái</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Đồng bộ lần cuối</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="loading"><td colspan="5" class="px-4 py-8 text-center text-slate-500">Đang tải...</td></tr>
          <tr v-else-if="!projects.length"><td colspan="5" class="px-4 py-8 text-center text-slate-500">Chưa có dự án. Nhấn "Đồng bộ ERP" để tải về.</td></tr>
          <tr v-for="p in projects" :key="p.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="px-4 py-3 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{{ p.code }}</td>
            <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{{ p.name }}</td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-400">{{ p.customer ?? '—' }}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="p.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'">
                {{ p.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
              {{ p.synced_at ? new Date(p.synced_at).toLocaleString('vi-VN') : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';

const projects = ref([]);
const loading = ref(false);
const syncing = ref(false);
const toast = ref({ show: false, ok: true, message: '' });

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch('/api/qaqc/projects');
    projects.value = (await res.json()).data ?? [];
  } finally {
    loading.value = false;
  }
}

async function sync() {
  syncing.value = true;
  try {
    const res = await apiFetch('/api/qaqc/projects/sync', { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    showToast(true, `Đã đồng bộ ${json.synced} dự án`);
    await load();
  } catch (e) {
    showToast(false, e.message || 'Lỗi đồng bộ');
  } finally {
    syncing.value = false;
  }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(load);
</script>
