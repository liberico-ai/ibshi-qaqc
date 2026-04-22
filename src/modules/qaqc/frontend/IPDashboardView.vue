<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Dashboard — IP × Dự Án</h2>
      <span v-if="pendingHoldsCount > 0"
        class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-500/30">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0-6v2m-6 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
        {{ pendingHoldsCount }} Hold Point{{ pendingHoldsCount > 1 ? 's' : '' }} Pending
      </span>
    </div>

    <div v-if="loading" class="card p-8 text-center text-slate-500">Đang tải...</div>
    <div v-else-if="!rows.length" class="card p-8 text-center text-slate-500">Chưa có dữ liệu kiểm tra</div>
    <div v-else class="card p-0 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-slate-50 dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-slate-800">
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Dự án</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">IP Code</th>
            <th class="px-4 py-3 text-center font-semibold text-green-600 dark:text-green-400">Hoàn thành</th>
            <th class="px-4 py-3 text-center font-semibold text-amber-600 dark:text-amber-400">Đang chờ</th>
            <th class="px-4 py-3 text-center font-semibold text-red-600 dark:text-red-400">Lỗi</th>
            <th class="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-400">Tổng</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Tỷ lệ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="r in rows" :key="`${r.project_code}-${r.ip_code}`" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{{ r.project_name }}</td>
            <td class="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{{ r.ip_code ?? '—' }}</td>
            <td class="px-4 py-3 text-center text-green-700 dark:text-green-400 font-medium">{{ r.completed }}</td>
            <td class="px-4 py-3 text-center text-amber-700 dark:text-amber-400 font-medium">{{ r.pending }}</td>
            <td class="px-4 py-3 text-center text-red-700 dark:text-red-400 font-medium">{{ r.failed }}</td>
            <td class="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{{ r.total }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div class="bg-green-500 h-2 rounded-full" :style="{ width: completionPct(r) + '%' }"></div>
                </div>
                <span class="text-xs text-slate-500 w-10 text-right">{{ completionPct(r) }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';

const rows = ref([]);
const loading = ref(false);
const pendingHoldsCount = ref(0);

function completionPct(r) {
  if (!r.total) return 0;
  return Math.round((Number(r.completed) / Number(r.total)) * 100);
}

onMounted(async () => {
  loading.value = true;
  try {
    const [dashRes, holdsRes] = await Promise.all([
      apiFetch('/api/qaqc/inspections/dashboard'),
      apiFetch('/api/qaqc/itp/pending-holds').catch(() => null),
    ]);
    rows.value = (await dashRes.json()).data ?? [];
    if (holdsRes?.ok) pendingHoldsCount.value = ((await holdsRes.json()).data ?? []).length;
  } finally {
    loading.value = false;
  }
});
</script>
