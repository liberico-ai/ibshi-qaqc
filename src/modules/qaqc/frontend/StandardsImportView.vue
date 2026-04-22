<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Import Tiêu Chuẩn PDF</h2>
    </div>

    <!-- Drop zone -->
    <div class="card p-6"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop">
      <div class="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
        :class="dragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700'">
        <svg class="mx-auto mb-3 w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        <p class="text-slate-600 dark:text-slate-400 text-sm mb-1">Kéo thả file PDF hoặc</p>
        <label class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Chọn file
          <input type="file" multiple accept=".pdf" class="hidden" @change="onFileInput">
        </label>
        <p class="mt-2 text-xs text-slate-400">Tối đa 20 file · 50MB/file · Chỉ PDF</p>
      </div>

      <!-- Selected files queue -->
      <div v-if="pending.length" class="mt-4 space-y-2">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ pending.length }} file sẵn sàng</span>
          <button @click="pending = []" class="text-xs text-red-500 hover:text-red-700">Xóa tất cả</button>
        </div>

        <!-- Metadata fields -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nhóm tiêu chuẩn</label>
            <input v-model="meta.family" placeholder="VD: ASTM, TCVN, ISO"
              class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Năm ban hành</label>
            <input v-model="meta.year" type="number" placeholder="VD: 2023"
              class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Ngôn ngữ</label>
            <select v-model="meta.language"
              class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
              <option value="EN">English</option>
              <option value="VI">Tiếng Việt</option>
            </select>
          </div>
        </div>

        <div v-for="(f, i) in pending" :key="i"
          class="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-sm">
          <svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
          </svg>
          <span class="flex-1 truncate text-slate-700 dark:text-slate-300">{{ f.name }}</span>
          <span class="text-slate-400 flex-shrink-0">{{ (f.size / 1024).toFixed(0) }} KB</span>
          <button @click="pending.splice(i, 1)" class="text-slate-400 hover:text-red-500">✕</button>
        </div>

        <button @click="startImport" :disabled="uploading"
          class="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {{ uploading ? 'Đang gửi...' : `Bắt đầu import ${pending.length} file` }}
        </button>
      </div>
    </div>

    <!-- Jobs table -->
    <div class="card p-0 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Lịch sử Import</h3>
        <div class="flex items-center gap-2">
          <select v-model="filterStatus" @change="loadJobs" class="text-xs border border-gray-200 dark:border-[#252540] rounded-lg px-2 py-1 bg-white dark:bg-[#12122a] text-gray-700 dark:text-gray-300">
            <option value="">Tất cả</option>
            <option value="QUEUED">QUEUED</option>
            <option value="EXTRACTING">EXTRACTING</option>
            <option value="CHUNKING">CHUNKING</option>
            <option value="EMBEDDING">EMBEDDING</option>
            <option value="DONE">DONE</option>
            <option value="FAILED">FAILED</option>
          </select>
          <button @click="loadJobs" class="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">
            Làm mới
          </button>
        </div>
      </div>

      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-slate-50 dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-slate-800">
            <th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">File</th>
            <th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Trạng thái</th>
            <th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Tiến độ</th>
            <th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Chunks</th>
            <th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Tiêu chuẩn</th>
            <th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Thời gian</th>
            <th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="jobsLoading">
            <td colspan="7" class="px-4 py-8 text-center text-slate-500">Đang tải...</td>
          </tr>
          <tr v-else-if="!jobs.length">
            <td colspan="7" class="px-4 py-8 text-center text-slate-500">Chưa có import nào</td>
          </tr>
          <tr v-for="job in jobs" :key="job.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="px-4 py-3 max-w-xs truncate text-slate-700 dark:text-slate-300 font-mono text-xs">{{ job.filename }}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="statusClass(job.status)">
                {{ job.status }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 min-w-[60px]">
                  <div class="bg-blue-500 h-1.5 rounded-full transition-all" :style="`width:${job.progress}%`"></div>
                </div>
                <span class="text-xs text-slate-500">{{ job.progress }}%</span>
              </div>
            </td>
            <td class="px-4 py-3 text-xs text-slate-500">
              {{ job.indexed_chunks ?? 0 }}<span v-if="job.total_chunks"> / {{ job.total_chunks }}</span>
            </td>
            <td class="px-4 py-3">
              <span v-if="job.standard_code" class="font-mono text-xs text-blue-600 dark:text-blue-400">{{ job.standard_code }}</span>
              <span v-else class="text-slate-400 text-xs">—</span>
            </td>
            <td class="px-4 py-3 text-xs text-slate-400">{{ fmtDate(job.created_at) }}</td>
            <td class="px-4 py-3 text-right">
              <button v-if="job.status === 'FAILED'" @click="retryJob(job.id)"
                class="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-800/60 text-amber-700 dark:text-amber-400 rounded font-medium">
                Thử lại
              </button>
              <span v-if="job.status === 'FAILED' && job.error_msg" class="ml-2 text-xs text-red-500" :title="job.error_msg">⚠</span>
              <span v-if="job.status === 'DONE' && job.standard_id"
                class="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded">
                ✓ Indexed
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <span>Tổng: {{ total }} jobs</span>
        <div class="flex gap-2">
          <button :disabled="offset === 0" @click="offset = Math.max(0, offset - limit); loadJobs()"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800">
            ← Trước
          </button>
          <button :disabled="offset + limit >= total" @click="offset += limit; loadJobs()"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800">
            Sau →
          </button>
        </div>
      </div>
    </div>

    <!-- Auto-refresh when active jobs -->
    <div v-if="hasActiveJobs" class="text-center text-xs text-slate-400">
      Đang xử lý — tự động làm mới sau {{ countdown }}s
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { apiFetch } from '@/utils/api.js';

async function apiGet(url) {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
  return res.json();
}

async function apiPost(url, body) {
  const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
  return res.json();
}

async function apiPostForm(url, form) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { method: 'POST', body: form, headers });
  if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
  return res.json();
}

const dragging = ref(false);
const pending = ref([]);
const meta = ref({ family: '', year: '', language: 'EN' });
const uploading = ref(false);

const jobs = ref([]);
const total = ref(0);
const jobsLoading = ref(false);
const filterStatus = ref('');
const limit = 20;
const offset = ref(0);

const countdown = ref(10);
let refreshTimer = null;
let countdownTimer = null;

const hasActiveJobs = computed(() =>
  jobs.value.some(j => ['QUEUED', 'EXTRACTING', 'CHUNKING', 'EMBEDDING'].includes(j.status))
);

function onDrop(e) {
  dragging.value = false;
  addFiles(Array.from(e.dataTransfer.files));
}

function onFileInput(e) {
  addFiles(Array.from(e.target.files));
  e.target.value = '';
}

function addFiles(files) {
  const pdfs = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
  pending.value = [...pending.value, ...pdfs].slice(0, 20);
}

async function startImport() {
  if (!pending.value.length) return;
  uploading.value = true;
  try {
    const form = new FormData();
    pending.value.forEach(f => form.append('files', f));
    if (meta.value.family) form.append('family', meta.value.family);
    if (meta.value.year) form.append('year', meta.value.year);
    form.append('language', meta.value.language);

    await apiPostForm('/api/qaqc/standards/import', form);
    pending.value = [];
    meta.value = { family: '', year: '', language: 'EN' };
    await loadJobs();
    startAutoRefresh();
  } catch (e) {
    alert(e.message ?? 'Upload thất bại');
  } finally {
    uploading.value = false;
  }
}

async function loadJobs() {
  jobsLoading.value = true;
  try {
    const params = new URLSearchParams({ limit, offset: offset.value });
    if (filterStatus.value) params.set('status', filterStatus.value);
    const data = await apiGet(`/api/qaqc/standards/import/jobs?${params}`);
    jobs.value = data.data ?? [];
    total.value = data.total ?? 0;
  } finally {
    jobsLoading.value = false;
  }
}

async function retryJob(jobId) {
  await apiPost(`/api/qaqc/standards/import/jobs/${jobId}/retry`, {});
  await loadJobs();
}

function startAutoRefresh() {
  stopAutoRefresh();
  countdown.value = 10;
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) countdown.value = 10;
  }, 1000);
  refreshTimer = setInterval(async () => {
    await loadJobs();
    if (!hasActiveJobs.value) stopAutoRefresh();
  }, 10000);
}

function stopAutoRefresh() {
  clearInterval(refreshTimer);
  clearInterval(countdownTimer);
  refreshTimer = null;
  countdownTimer = null;
}

function statusClass(status) {
  const map = {
    QUEUED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    EXTRACTING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    CHUNKING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
    EMBEDDING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
    DONE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  };
  return map[status] ?? 'bg-slate-100 text-slate-600';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

onMounted(async () => {
  await loadJobs();
  if (hasActiveJobs.value) startAutoRefresh();
});

onUnmounted(stopAutoRefresh);
</script>
