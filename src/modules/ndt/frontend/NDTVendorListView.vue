<template>
  <div>
    <PageHeader title="Nhà thầu NDT" subtitle="Danh sách nhà thầu kiểm tra không phá huỷ">
      <template #actions>
        <button v-can="'ndt.request.write'" @click="openCreate" class="btn btn-primary">+ Thêm nhà thầu</button>
      </template>
    </PageHeader>

    <UiCard body-class="p-0 overflow-x-auto">
      <table class="qc-table">
        <thead>
          <tr>
            <th>Tên nhà thầu</th>
            <th>Email liên hệ</th>
            <th>Trạng thái</th>
            <th class="text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="4" class="text-center text-slate-500 py-8">Đang tải...</td></tr>
          <tr v-else-if="!records.length"><td colspan="4" class="text-center text-slate-400 py-8">Chưa có nhà thầu nào</td></tr>
          <tr v-for="r in records" :key="r.id">
            <td class="font-semibold text-slate-800 dark:text-slate-200">{{ r.name }}</td>
            <td>{{ r.contact_email ?? '—' }}</td>
            <td><StatusTag :type="r.is_approved ? 'green' : 'gray'" :label="r.is_approved ? 'Đã duyệt' : 'Chưa duyệt'" /></td>
            <td class="text-right">
              <button v-if="!r.is_approved" v-can="'ndt.request.write'" @click="toggleApprove(r)" class="btn btn-success btn-sm">Duyệt</button>
            </td>
          </tr>
        </tbody>
      </table>
    </UiCard>

    <!-- Create Modal -->
    <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="modal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">Thêm nhà thầu NDT</h3>
        <div>
          <label class="form-label">Tên nhà thầu *</label>
          <input v-model="form.name" class="form-control">
        </div>
        <div>
          <label class="form-label">Email liên hệ</label>
          <input v-model="form.contact_email" type="email" class="form-control">
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" v-model="form.is_approved"> Đã được phê duyệt
        </label>
        <div class="flex justify-end gap-2">
          <button @click="modal=false" class="btn btn-outline">Hủy</button>
          <button @click="createVendor" :disabled="creating" class="btn btn-primary disabled:opacity-50">
            {{ creating ? 'Đang lưu...' : 'Lưu' }}
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
const modal = ref(false);
const creating = ref(false);
const form = ref({ name: '', contact_email: '', is_approved: false });
const toast = ref({ show: false, ok: true, message: '' });

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch('/api/ndt/vendors?limit=200');
    records.value = (await res.json()).data ?? [];
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  form.value = { name: '', contact_email: '', is_approved: false };
  modal.value = true;
}

async function createVendor() {
  if (!form.value.name) { showToast(false, 'Tên nhà thầu là bắt buộc'); return; }
  creating.value = true;
  try {
    const payload = { name: form.value.name, is_approved: form.value.is_approved, ...(form.value.contact_email && { contact_email: form.value.contact_email }) };
    const res = await apiFetch('/api/ndt/vendors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Lỗi lưu nhà thầu');
    modal.value = false;
    showToast(true, 'Đã thêm nhà thầu');
    load();
  } catch (e) {
    showToast(false, e.message);
  } finally {
    creating.value = false;
  }
}

async function toggleApprove(r) {
  try {
    const res = await apiFetch(`/api/ndt/vendors/${r.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved: true }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Lỗi duyệt');
    showToast(true, 'Đã duyệt nhà thầu');
    load();
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
