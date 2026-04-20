<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Material Inspection Records</h2>
      <button v-can="'qaqc.mir.write'" @click="openCreate"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Tạo MIR
      </button>
    </div>

    <!-- Filters -->
    <div class="card p-4 flex flex-wrap gap-3">
      <select v-model="projectId" @change="load(1)"
        class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        <option value="">Tất cả dự án</option>
        <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
      </select>
      <select v-model="stage" @change="load(1)"
        class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        <option value="">Tất cả giai đoạn</option>
        <option value="EXPECTED">EXPECTED</option>
        <option value="DOC_RECEIVED">DOC_RECEIVED</option>
        <option value="PHYSICAL_INSPECTED">PHYSICAL_INSPECTED</option>
        <option value="MTC_VERIFIED">MTC_VERIFIED</option>
        <option value="DECIDED">DECIDED</option>
        <option value="INSTOCK">INSTOCK</option>
      </select>
      <input v-model="supplierId" @keyup.enter="load(1)" placeholder="Supplier ID"
        class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
      <button @click="load(1)" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">Lọc</button>
    </div>

    <div class="card p-0 overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-slate-50 dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-slate-800">
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">PO Ref</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Supplier</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Giai đoạn</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Ngày tạo</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="loading"><td colspan="5" class="px-4 py-8 text-center text-slate-500">Đang tải...</td></tr>
          <tr v-else-if="!records.length"><td colspan="5" class="px-4 py-8 text-center text-slate-500">Không có MIR nào</td></tr>
          <tr v-for="r in records" :key="r.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{{ r.po_ref ?? '—' }}</td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-400">{{ r.supplier_id ?? '—' }}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="stageClass(r.stage)">{{ r.stage }}</span>
            </td>
            <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{{ new Date(r.created_at).toLocaleDateString('vi-VN') }}</td>
            <td class="px-4 py-3 text-right">
              <router-link :to="`/qaqc/mir/${r.id}`"
                class="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 transition-colors">
                Chi tiết
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
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">Tạo MIR mới</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Dự án *</label>
          <select v-model="createForm.project_id" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
            <option value="">-- Chọn dự án --</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">PO Ref</label>
          <input v-model="createForm.po_ref" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Supplier ID</label>
          <input v-model="createForm.supplier_id" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div class="flex justify-end gap-2">
          <button @click="modal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">Hủy</button>
          <button @click="createMIR" :disabled="creating" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
            {{ creating ? 'Đang tạo...' : 'Tạo MIR' }}
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
import { useProjects } from './useProjects.js';

const router = useRouter();
const { projects } = useProjects();
const records = ref([]);
const loading = ref(false);
const projectId = ref('');
const stage = ref('');
const supplierId = ref('');
const pagination = ref({ page: 1, totalPages: 1 });
const modal = ref(false);
const creating = ref(false);
const createForm = ref({ project_id: '', po_ref: '', supplier_id: '' });
const toast = ref({ show: false, ok: true, message: '' });

const STAGE_COLORS = {
  EXPECTED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  DOC_RECEIVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  PHYSICAL_INSPECTED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  MTC_VERIFIED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  DECIDED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  INSTOCK: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
};
function stageClass(s) { return STAGE_COLORS[s] ?? ''; }

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(projectId.value && { projectId: projectId.value }), ...(stage.value && { stage: stage.value }), ...(supplierId.value && { supplierId: supplierId.value }) });
    const res = await apiFetch(`/api/qaqc/mir?${params}`);
    const json = await res.json();
    records.value = json.data ?? [];
    pagination.value = json.pagination;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  createForm.value = { project_id: '', po_ref: '', supplier_id: '' };
  modal.value = true;
}

async function createMIR() {
  if (!createForm.value.project_id) { showToast(false, 'Project ID là bắt buộc'); return; }
  creating.value = true;
  try {
    const res = await apiFetch('/api/qaqc/mir', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm.value),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    modal.value = false;
    router.push(`/qaqc/mir/${json.data.id}`);
  } catch (e) {
    showToast(false, e.message || 'Lỗi tạo MIR');
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
