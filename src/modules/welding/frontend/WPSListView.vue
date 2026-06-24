<template>
  <div>
    <PageHeader title="WPS / PQR — Quy trình hàn" subtitle="Quy trình hàn & chứng nhận quy trình">
      <template #actions>
        <button v-can="'welding.wps.write'" @click="openCreate" class="btn btn-primary">+ Tạo WPS</button>
      </template>
    </PageHeader>

    <UiCard class="mb-4" body-class="card-body flex flex-wrap gap-3 items-center">
      <select v-model="status" @change="load(1)" class="form-control max-w-[220px]">
        <option value="">Tất cả trạng thái</option>
        <option value="DRAFT">Bản nháp</option>
        <option value="APPROVED">Đã duyệt</option>
        <option value="OBSOLETE">Hết hiệu lực</option>
      </select>
      <button @click="load(1)" class="btn btn-outline">🔍 Lọc</button>
    </UiCard>

    <UiCard body-class="p-0 overflow-x-auto">
      <table class="qc-table">
        <thead>
          <tr>
            <th>Số WPS</th>
            <th>Phương pháp</th>
            <th>Vị trí</th>
            <th>Dải chiều dày</th>
            <th>Trạng thái</th>
            <th class="text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="text-center text-slate-500 py-8">Đang tải...</td></tr>
          <tr v-else-if="!records.length"><td colspan="6" class="text-center text-slate-400 py-8">Chưa có WPS nào</td></tr>
          <tr v-for="r in records" :key="r.id">
            <td class="font-semibold text-slate-800 dark:text-slate-200">{{ r.wps_no }}</td>
            <td>{{ r.process ?? '—' }}</td>
            <td>{{ r.position ?? '—' }}</td>
            <td>{{ r.thickness_range ?? '—' }}</td>
            <td><StatusTag :type="statusType(r.status)" :label="statusLabel(r.status)" /></td>
            <td class="text-right">
              <button v-if="r.status !== 'APPROVED'" v-can="'welding.wps.write'" @click="approve(r)"
                class="btn btn-success btn-sm">Duyệt</button>
            </td>
          </tr>
        </tbody>
      </table>
    </UiCard>

    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-1 mt-4">
      <button v-for="p in pagination.totalPages" :key="p" @click="load(p)"
        :class="p === pagination.page ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
        class="px-3 py-1.5 rounded text-sm font-medium transition-colors">{{ p }}</button>
    </div>

    <!-- Create Modal -->
    <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="modal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">Tạo WPS mới</h3>
        <div>
          <label class="form-label">Số WPS *</label>
          <input v-model="form.wps_no" class="form-control">
        </div>
        <div>
          <label class="form-label">Phương pháp hàn</label>
          <input v-model="form.process" placeholder="SMAW, GTAW, GMAW..." class="form-control">
        </div>
        <div>
          <label class="form-label">Kim loại cơ bản</label>
          <input v-model="form.base_metal" class="form-control">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="form-label">Vị trí</label>
            <input v-model="form.position" placeholder="1G, 6G..." class="form-control">
          </div>
          <div>
            <label class="form-label">Dải chiều dày</label>
            <input v-model="form.thickness_range" placeholder="3-20 mm" class="form-control">
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="modal=false" class="btn btn-outline">Hủy</button>
          <button @click="createWps" :disabled="creating" class="btn btn-primary disabled:opacity-50">
            {{ creating ? 'Đang tạo...' : 'Tạo WPS' }}
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
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';

const records = ref([]);
const loading = ref(false);
const status = ref('');
const pagination = ref({ page: 1, totalPages: 1 });
const modal = ref(false);
const creating = ref(false);
const form = ref({ wps_no: '', process: '', base_metal: '', position: '', thickness_range: '' });
const toast = ref({ show: false, ok: true, message: '' });

const STATUS = {
  DRAFT:    { label: 'Bản nháp',      type: 'gray' },
  APPROVED: { label: 'Đã duyệt',      type: 'green' },
  OBSOLETE: { label: 'Hết hiệu lực',  type: 'red' },
};
function statusLabel(s) { return STATUS[s]?.label ?? s; }
function statusType(s) { return STATUS[s]?.type ?? 'gray'; }

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(status.value && { status: status.value }) });
    const res = await apiFetch(`/api/welding/wps?${params}`);
    const json = await res.json();
    records.value = json.data ?? [];
    pagination.value = json.pagination ?? { page: 1, totalPages: 1 };
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  form.value = { wps_no: '', process: '', base_metal: '', position: '', thickness_range: '' };
  modal.value = true;
}

async function createWps() {
  if (!form.value.wps_no) { showToast(false, 'Số WPS là bắt buộc'); return; }
  creating.value = true;
  try {
    const res = await apiFetch('/api/welding/wps', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Lỗi tạo WPS');
    modal.value = false;
    showToast(true, 'Đã tạo WPS');
    load(1);
  } catch (e) {
    showToast(false, e.message);
  } finally {
    creating.value = false;
  }
}

async function approve(r) {
  try {
    const res = await apiFetch(`/api/welding/wps/${r.id}/approve`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json()).error || 'Lỗi duyệt');
    showToast(true, 'Đã duyệt WPS');
    load(pagination.value.page);
  } catch (e) {
    showToast(false, e.message);
  }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(() => load());
</script>

<style scoped>
.form-label { @apply block text-xs font-semibold text-slate-500 mb-1.5; }
.form-control {
  @apply w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 outline-none
         transition-colors focus:border-blue-400
         dark:border-[#252540] dark:bg-[#12122a] dark:text-slate-100;
}
</style>
