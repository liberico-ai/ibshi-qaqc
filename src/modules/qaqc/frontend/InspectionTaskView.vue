<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Nhiệm Vụ Kiểm Tra Của Tôi</h2>
    </div>

    <!-- Filters -->
    <div class="card p-4 flex flex-wrap gap-3">
      <select v-model="status" @change="load(1)"
        class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        <option value="PENDING">Chờ thực hiện</option>
        <option value="IN_PROGRESS">Đang thực hiện</option>
        <option value="">Tất cả</option>
      </select>
      <select v-model="projectId" @change="load(1)"
        class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        <option value="">Tất cả dự án</option>
        <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
      </select>
      <button @click="load(1)" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">Lọc</button>
    </div>

    <div v-if="pendingHolds.length" class="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl text-sm text-amber-800 dark:text-amber-300">
      <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
      <span>Có <strong>{{ pendingHolds.length }}</strong> Hold Point chưa được release.
        IP tiếp theo sẽ bị chặn cho đến khi release:
        {{ pendingHolds.map(h => h.ip_code).join(', ') }}
      </span>
    </div>

    <div class="card p-0 overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-slate-50 dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-slate-800">
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">IP Code</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Unit</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Trạng thái</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Ngày tạo</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="loading"><td colspan="5" class="px-4 py-8 text-center text-slate-500">Đang tải...</td></tr>
          <tr v-else-if="!items.length"><td colspan="5" class="px-4 py-8 text-center text-slate-500">Không có nhiệm vụ nào</td></tr>
          <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="px-4 py-3 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{{ item.ip_code ?? '—' }}</td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-400">{{ item.unit_id ?? '—' }}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="item.status === 'PENDING' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  : item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                  : item.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'">
                {{ item.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-500 text-xs">{{ new Date(item.created_at).toLocaleDateString('vi-VN') }}</td>
            <td class="px-4 py-3 text-right">
              <router-link :to="`/qaqc/inspections/${item.id}/form`"
                class="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 transition-colors">
                {{ item.status === 'PENDING' ? 'Bắt đầu' : 'Tiếp tục' }}
              </router-link>
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
import { useProjects } from './useProjects.js';

const { projects } = useProjects();
const items = ref([]);
const loading = ref(false);
const status = ref('PENDING');
const projectId = ref('');
const pagination = ref({ page: 1, totalPages: 1 });
const pendingHolds = ref([]);

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(status.value && { status: status.value }), ...(projectId.value && { projectId: projectId.value }) });
    const [inspRes, holdsRes] = await Promise.all([
      apiFetch(`/api/qaqc/inspections?${params}`),
      apiFetch(`/api/qaqc/itp/pending-holds${projectId.value ? `?projectId=${projectId.value}` : ''}`).catch(() => null),
    ]);
    const json = await inspRes.json();
    items.value = json.data ?? [];
    pagination.value = json.pagination;
    if (holdsRes?.ok) pendingHolds.value = (await holdsRes.json()).data ?? [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => load());
</script>
