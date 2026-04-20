<template>
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Dashboard — IP × Dự Án</h2>

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

function completionPct(r) {
  if (!r.total) return 0;
  return Math.round((Number(r.completed) / Number(r.total)) * 100);
}

onMounted(async () => {
  loading.value = true;
  try {
    const res = await apiFetch('/api/qaqc/inspections/dashboard');
    rows.value = (await res.json()).data ?? [];
  } finally {
    loading.value = false;
  }
});
</script>
