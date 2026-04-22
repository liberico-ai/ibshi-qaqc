<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Tiêu Chuẩn KB</h2>
      <div class="flex items-center gap-2">
        <button v-can="'qaqc.standards.write'" @click="router.push('/qaqc/standards/import')"
          class="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Import PDF
        </button>
        <button v-can="'qaqc.standards.write'" @click="openCreate"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Thêm tiêu chuẩn
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="sm:col-span-2">
          <input v-model="q" @keyup.enter="load(1)" placeholder="Tìm theo mã, tiêu đề, nội dung..."
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
        </div>
        <div>
          <input v-model="grp" @keyup.enter="load(1)" placeholder="Nhóm (VD: ASTM)"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
        </div>
        <div>
          <select v-model="status" @change="load(1)"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
            <option value="ACTIVE">Đang hiệu lực</option>
            <option value="DEPRECATED">Lỗi thời</option>
            <option value="">Tất cả</option>
          </select>
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <button @click="load(1)" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">Tìm kiếm</button>
        <button @click="q='';grp='';status='ACTIVE';load(1)" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg">Đặt lại</button>
      </div>
    </div>

    <div class="card p-0 overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-slate-50 dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-slate-800">
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Mã</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Tiêu đề</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Nhóm</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Phiên bản</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Trạng thái</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Chi tiết</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="loading"><td colspan="6" class="px-4 py-8 text-center text-slate-500">Đang tải...</td></tr>
          <tr v-else-if="!standards.length"><td colspan="6" class="px-4 py-8 text-center text-slate-500">Không tìm thấy tiêu chuẩn nào</td></tr>
          <tr v-for="s in standards" :key="s.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="px-4 py-3 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{{ s.code }}</td>
            <td class="px-4 py-3 text-slate-800 dark:text-slate-200 max-w-xs truncate">{{ s.title }}</td>
            <td class="px-4 py-3 text-slate-500 dark:text-slate-400">{{ s.grp ?? '—' }}</td>
            <td class="px-4 py-3 text-slate-500 dark:text-slate-400">{{ s.version ?? '—' }}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="s.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'">
                {{ s.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <router-link :to="`/qaqc/standards/${s.id}`"
                class="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 transition-colors">
                Xem
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-1">
      <button v-for="p in pagination.totalPages" :key="p" @click="load(p)"
        :class="p === pagination.page ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
        class="px-3 py-1.5 rounded text-sm font-medium transition-colors">{{ p }}</button>
    </div>

    <!-- Create Modal -->
    <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="modal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">Thêm tiêu chuẩn mới</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Mã tiêu chuẩn *</label>
          <input v-model="createForm.code" placeholder="VD: ASTM A36" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Tiêu đề *</label>
          <input v-model="createForm.title" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Nhóm</label>
            <input v-model="createForm.grp" placeholder="ASTM, ISO, TCVN..." class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">Phiên bản</label>
            <input v-model="createForm.version" placeholder="2019, Rev.5..." class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="modal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">Hủy</button>
          <button @click="createStandard" :disabled="creating" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
            {{ creating ? 'Đang tạo...' : 'Tạo' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useRouter } from 'vue-router';

const router = useRouter();
const standards = ref([]);
const loading = ref(false);
const q = ref('');
const grp = ref('');
const status = ref('ACTIVE');
const pagination = ref({ page: 1, totalPages: 1 });
const modal = ref(false);
const creating = ref(false);
const createForm = ref({ code: '', title: '', grp: '', version: '' });
const toast = ref({ show: false, ok: true, message: '' });

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(q.value && { q: q.value }), ...(grp.value && { grp: grp.value }), ...(status.value && { status: status.value }) });
    const res = await apiFetch(`/api/qaqc/standards?${params}`);
    const json = await res.json();
    standards.value = json.data ?? [];
    pagination.value = json.pagination;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  createForm.value = { code: '', title: '', grp: '', version: '' };
  modal.value = true;
}

async function createStandard() {
  if (!createForm.value.code || !createForm.value.title) {
    showToast(false, 'Mã và tiêu đề là bắt buộc');
    return;
  }
  creating.value = true;
  try {
    const res = await apiFetch('/api/qaqc/standards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm.value),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    modal.value = false;
    router.push(`/qaqc/standards/${json.data.id}`);
  } catch (e) {
    showToast(false, e.message || 'Lỗi tạo tiêu chuẩn');
  } finally {
    creating.value = false;
  }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(() => load());
</script>
