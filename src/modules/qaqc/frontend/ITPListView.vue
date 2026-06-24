<template>
  <div class="space-y-4">
    <PageHeader title="Inspection Test Plan">
      <template #actions>
        <button v-can="'qaqc.itp.write'" @click="openCreate" class="btn btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Tạo ITP
        </button>
      </template>
    </PageHeader>

    <!-- Filters -->
    <UiCard body-class="card-body">
      <div class="flex flex-wrap gap-3">
        <select v-model="projectId" @change="load(1)"
          class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
          <option value="">Tất cả dự án</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
        </select>
        <select v-model="status" @change="load(1)"
          class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">DRAFT</option>
          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
          <option value="MANAGER_APPROVED">MANAGER_APPROVED</option>
          <option value="DIRECTOR_APPROVED">DIRECTOR_APPROVED</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUPERSEDED">SUPERSEDED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <button @click="load(1)" class="btn btn-primary">Lọc</button>
      </div>
    </UiCard>

    <UiCard body-class="p-0">
      <div class="overflow-x-auto">
        <table class="qc-table">
          <thead>
            <tr>
              <th>Loại sản phẩm</th>
              <th>Phiên bản</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th class="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="5" class="text-center text-slate-500 py-8">Đang tải...</td></tr>
            <tr v-else-if="!plans.length"><td colspan="5" class="text-center text-slate-500 py-8">Không có ITP nào</td></tr>
            <tr v-for="p in plans" :key="p.id">
              <td class="font-medium">{{ p.product_type }}</td>
              <td>v{{ p.version }}</td>
              <td>
                <StatusTag :type="statusTagType(p.status)" :label="p.status" />
              </td>
              <td class="text-slate-500 text-xs">{{ new Date(p.created_at).toLocaleDateString('vi-VN') }}</td>
              <td class="text-right">
                <router-link :to="`/qaqc/itp/${p.id}`" class="btn btn-outline btn-sm">
                  Chi tiết
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-1">
      <button v-for="p in pagination.totalPages" :key="p" @click="load(p)"
        :class="p === pagination.page ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
        class="px-3 py-1.5 rounded text-sm font-medium transition-colors">{{ p }}</button>
    </div>

    <!-- Create Modal -->
    <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="modal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">Tạo ITP mới</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Dự án *</label>
          <select v-model="createForm.project_id" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
            <option value="">-- Chọn dự án --</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Loại sản phẩm *</label>
          <input v-model="createForm.product_type" placeholder="VD: PIPE, FLANGE, VESSEL" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div class="flex justify-end gap-2">
          <button @click="modal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">Hủy</button>
          <button @click="createITP" :disabled="creating" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
            {{ creating ? 'Đang tạo...' : 'Tạo ITP' }}
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
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';

const router = useRouter();
const { projects } = useProjects();
const plans = ref([]);
const loading = ref(false);
const projectId = ref('');
const status = ref('');
const pagination = ref({ page: 1, totalPages: 1 });
const modal = ref(false);
const creating = ref(false);
const createForm = ref({ project_id: '', product_type: '' });
const toast = ref({ show: false, ok: true, message: '' });

const STATUS_TAG_TYPES = {
  DRAFT: 'gray',
  UNDER_REVIEW: 'amber',
  MANAGER_APPROVED: 'blue',
  DIRECTOR_APPROVED: 'blue',
  ACTIVE: 'green',
  SUPERSEDED: 'amber',
  ARCHIVED: 'gray',
};
function statusTagType(s) { return STATUS_TAG_TYPES[s] ?? 'gray'; }

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(projectId.value && { projectId: projectId.value }), ...(status.value && { status: status.value }) });
    const res = await apiFetch(`/api/qaqc/itp?${params}`);
    const json = await res.json();
    plans.value = json.data ?? [];
    pagination.value = json.pagination;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  createForm.value = { project_id: '', product_type: '' };
  modal.value = true;
}

async function createITP() {
  if (!createForm.value.project_id || !createForm.value.product_type) {
    showToast(false, 'Project ID và Loại sản phẩm là bắt buộc');
    return;
  }
  creating.value = true;
  try {
    const res = await apiFetch('/api/qaqc/itp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm.value),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    modal.value = false;
    router.push(`/qaqc/itp/${json.data.id}`);
  } catch (e) {
    showToast(false, e.message || 'Lỗi tạo ITP');
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
