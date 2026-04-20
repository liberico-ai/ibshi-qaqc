<template>
  <div class="space-y-6">
    <div class="flex justify-end items-center mb-2">
      <button @click="loadCronjobs" class="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-[#0f1117] disabled:opacity-60 disabled:cursor-not-allowed" :disabled="loading">
        <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        <svg v-else class="-ml-1 mr-2 h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        <span>Làm mới</span>
      </button>
    </div>

    <!-- Danh sách Cronjobs -->
    <div class="card p-0 overflow-hidden">
      <table class="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr class="bg-slate-50 dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-slate-800">
            <th class="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Tên Job</th>
            <th class="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Lịch trình (Cron)</th>
            <th class="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Mô tả</th>
            <th class="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Trạng thái (Chạy cuối)</th>
            <th class="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Lần chạy tiếp theo</th>
            <th class="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="loading && jobs.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-slate-500">Đang tải dữ liệu...</td>
          </tr>
          <tr v-else-if="jobs.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-slate-500">Chưa có job nào được tạo</td>
          </tr>
          <tr v-for="job in jobs" :key="job.name" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
            <td class="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{{ job.name }}</td>
            <td class="px-6 py-4 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded inline-block mt-3">{{ job.cron }}</td>
            <td class="px-6 py-4 text-slate-600 dark:text-slate-400">{{ job.description }}</td>
            <td class="px-6 py-4">
              <div v-if="job.last_run">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getStatusColor(job.last_run.status)">
                  {{ job.last_run.status }}
                </span>
                <div class="text-xs text-slate-500 mt-1">
                  {{ formatDate(job.last_run.started_at) }}
                  <span v-if="job.last_run.duration_ms">({{ job.last_run.duration_ms }}ms)</span>
                </div>
              </div>
              <span v-else class="text-slate-400 italic text-xs">Chưa chạy</span>
            </td>
            <td class="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
              {{ job.next_run ? formatDate(job.next_run) : '-' }}
            </td>
            <td class="px-6 py-4 text-right space-x-3">
              <button @click="runJob(job.name)" class="text-emerald-600 hover:text-emerald-900 font-medium text-sm">Chạy ngay</button>
              <button @click="viewLogs(job.name)" class="text-blue-600 hover:text-blue-900 font-medium text-sm">Xem Log</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Lịch sử -->
    <div v-if="showLogModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-[#13131e] rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 class="text-xl font-bold text-slate-800 dark:text-white">Lịch sử chạy: {{ selectedJob }}</h3>
          <button @click="showLogModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div class="p-0 overflow-y-auto flex-1">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="sticky top-0 bg-slate-50 dark:bg-[#1a1a2e] z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Thời gian bắt đầu</th>
                <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Trạng thái</th>
                <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Thời gian chạy</th>
                <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 max-w-sm">Kết quả</th>
                <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 max-w-xs">Lỗi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-if="loadingLogs" class="bg-white dark:bg-transparent">
                <td colspan="5" class="px-4 py-8 text-center text-slate-500">Đang tải lịch sử...</td>
              </tr>
              <tr v-else-if="logs.length === 0" class="bg-white dark:bg-transparent">
                <td colspan="5" class="px-4 py-8 text-center text-slate-500">Chưa có lịch sử chạy</td>
              </tr>
              <tr v-for="log in logs" :key="log.id" class="bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td class="px-4 py-3 text-slate-600 dark:text-slate-400">{{ formatDate(log.started_at) }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium" :class="getStatusColor(log.status)">
                    {{ log.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-600 dark:text-slate-400">{{ log.duration_ms ? log.duration_ms + 'ms' : '-' }}</td>
                <td class="px-4 py-3 text-xs font-mono text-slate-500 max-w-sm truncate" :title="JSON.stringify(log.result_details)">
                  {{ JSON.stringify(log.result_details) }}
                </td>
                <td class="px-4 py-3 text-xs text-red-500 max-w-xs truncate" :title="log.error_message">
                  {{ log.error_message || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#1a1a2e]">
          <span class="text-sm text-slate-500">Trang {{ page }} / {{ totalPages }}</span>
          <div class="flex gap-2">
            <button @click="loadLogs(selectedJob, page - 1)" :disabled="page <= 1" class="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm disabled:opacity-50">Trước</button>
            <button @click="loadLogs(selectedJob, page + 1)" :disabled="page >= totalPages" class="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm disabled:opacity-50">Sau</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useToast } from '@/composables/useToast.js';

const toast = useToast();

const jobs = ref([]);
const loading = ref(false);

const showLogModal = ref(false);
const selectedJob = ref(null);
const logs = ref([]);
const loadingLogs = ref(false);
const page = ref(1);
const totalPages = ref(1);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN');
};

const getStatusColor = (status) => {
  if (status === 'SUCCESS') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (status === 'FAILED') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  if (status === 'RUNNING') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
};

const loadCronjobs = async () => {
  loading.value = true;
  try {
    const res = await apiFetch('/api/system/cronjobs');
    jobs.value = await res.json();
  } catch (err) {
    console.error('Failed to load cronjobs', err);
    toast.error('Không thể tải danh sách cronjobs.');
  } finally {
    loading.value = false;
  }
};

const runJob = async (jobName) => {
  if (!confirm(`Bạn có chắc muốn chạy thủ công job: ${jobName}?`)) return;
  try {
    await apiFetch(`/api/system/cronjobs/${jobName}/run`, { method: 'POST' });
    toast.success('Đã gửi lệnh chạy job. Hãy kiểm tra lại log sau vài giây.');
    setTimeout(loadCronjobs, 2000);
  } catch (err) {
    console.error('Failed to run job', err);
    toast.error('Lỗi khi chạy job.');
  }
};

const viewLogs = async (jobName) => {
  selectedJob.value = jobName;
  showLogModal.value = true;
  await loadLogs(jobName, 1);
};

const loadLogs = async (jobName, newPage) => {
  loadingLogs.value = true;
  try {
    const res = await apiFetch(`/api/system/cronjobs/${jobName}/logs?page=${newPage}&limit=15`);
    const data = await res.json();
    logs.value = data.data;
    page.value = data.pagination.page;
    totalPages.value = data.pagination.totalPages;
  } catch (err) {
    console.error('Failed to load logs', err);
    toast.error('Không thể tải lịch sử log.');
  } finally {
    loadingLogs.value = false;
  }
};

onMounted(() => {
  loadCronjobs();
});
</script>
