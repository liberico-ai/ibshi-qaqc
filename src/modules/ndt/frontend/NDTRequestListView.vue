<template>
  <div>
    <PageHeader title="Yêu cầu NDT — Kiểm tra không phá huỷ" subtitle="Quản lý yêu cầu & kết quả NDT theo phương pháp">
      <template #actions>
        <router-link v-can="'ndt.request.write'" to="/ndt/requests/new" class="btn btn-primary">+ Tạo yêu cầu (F11)</router-link>
      </template>
    </PageHeader>

    <UiCard class="mb-4" body-class="card-body flex flex-wrap gap-3 items-center">
      <select v-model="method" @change="load(1)" class="form-control max-w-[240px]">
        <option value="">Tất cả phương pháp</option>
        <option value="RT">RT — Chụp ảnh phóng xạ</option>
        <option value="UT">UT — Siêu âm</option>
        <option value="MT">MT — Hạt từ</option>
        <option value="PT">PT — Thẩm thấu</option>
      </select>
      <select v-model="status" @change="load(1)" class="form-control max-w-[220px]">
        <option value="">Tất cả trạng thái</option>
        <option value="REQUESTED">Đã yêu cầu</option>
        <option value="SENT">Đã gửi NCC</option>
        <option value="IN_PROGRESS">Đang thực hiện</option>
        <option value="COMPLETED">Hoàn thành</option>
        <option value="CANCELLED">Đã huỷ</option>
      </select>
      <button @click="load(1)" class="btn btn-outline">🔍 Lọc</button>
    </UiCard>

    <UiCard body-class="p-0 overflow-x-auto">
      <table class="qc-table">
        <thead>
          <tr>
            <th>Số yêu cầu</th>
            <th>Phương pháp</th>
            <th>Nhà thầu</th>
            <th>Trạng thái</th>
            <th>Ngày yêu cầu</th>
            <th class="text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="text-center text-slate-500 py-8">Đang tải...</td></tr>
          <tr v-else-if="!records.length"><td colspan="6" class="text-center text-slate-400 py-8">Chưa có yêu cầu NDT nào</td></tr>
          <tr v-for="r in records" :key="r.id">
            <td class="font-semibold text-slate-800 dark:text-slate-200">
              {{ r.request_no }}
              <span v-if="r.auto_from_inspection" class="ml-1 inline-block text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 align-middle">IP05</span>
            </td>
            <td><StatusTag :type="methodType(r.method)" :label="r.method" /></td>
            <td>{{ r.vendor_name ?? '—' }}</td>
            <td><StatusTag :type="statusType(r.status)" :label="statusLabel(r.status)" /></td>
            <td class="text-slate-500 dark:text-slate-400 text-xs">{{ new Date(r.requested_at).toLocaleDateString('vi-VN') }}</td>
            <td class="text-right">
              <button @click="openUpload(r)" v-can="'ndt.result.write'" class="btn btn-outline btn-sm">Tải kết quả</button>
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

    <NDTResultUploadView v-if="uploadFor" :request="uploadFor" @close="uploadFor=null" @saved="onSaved" />

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
import NDTResultUploadView from './NDTResultUploadView.vue';

const records = ref([]);
const loading = ref(false);
const method = ref('');
const status = ref('');
const pagination = ref({ page: 1, totalPages: 1 });
const uploadFor = ref(null);
const toast = ref({ show: false, ok: true, message: '' });

const STATUS = {
  REQUESTED:   { label: 'Đã yêu cầu',     type: 'gray' },
  SENT:        { label: 'Đã gửi NCC',     type: 'blue' },
  IN_PROGRESS: { label: 'Đang thực hiện', type: 'purple' },
  COMPLETED:   { label: 'Hoàn thành',     type: 'green' },
  CANCELLED:   { label: 'Đã huỷ',         type: 'red' },
};
function statusLabel(s) { return STATUS[s]?.label ?? s; }
function statusType(s) { return STATUS[s]?.type ?? 'gray'; }

// Màu tag theo phương pháp NDT (RT/UT/MT/PT)
const METHOD_TYPE = { RT: 'purple', UT: 'blue', MT: 'amber', PT: 'green' };
function methodType(m) { return METHOD_TYPE[m] ?? 'gray'; }

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(method.value && { method: method.value }), ...(status.value && { status: status.value }) });
    const res = await apiFetch(`/api/ndt/requests?${params}`);
    const json = await res.json();
    records.value = json.data ?? [];
    pagination.value = json.pagination ?? { page: 1, totalPages: 1 };
  } finally {
    loading.value = false;
  }
}

function openUpload(r) { uploadFor.value = r; }

function onSaved() {
  uploadFor.value = null;
  showToast(true, 'Đã lưu kết quả NDT');
  load(pagination.value.page);
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(() => load());
</script>

<style scoped>
.form-control {
  @apply w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 outline-none
         transition-colors focus:border-blue-400
         dark:border-[#252540] dark:bg-[#12122a] dark:text-slate-100;
}
</style>
