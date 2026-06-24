<template>
  <div>
    <PageHeader title="Danh bạ thợ hàn" subtitle="Chứng chỉ & trạng thái hiệu lực thợ hàn">
      <template #actions>
        <button v-can="'welding.welder.write'" @click="openCreate" class="btn btn-primary">+ Thêm thợ hàn</button>
      </template>
    </PageHeader>

    <UiCard body-class="p-0 overflow-x-auto">
      <table class="qc-table">
        <thead>
          <tr>
            <th>Mã thợ hàn</th>
            <th>Họ tên</th>
            <th>Số dấu</th>
            <th>Chứng chỉ</th>
            <th class="text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="text-center text-slate-500 py-8">Đang tải...</td></tr>
          <tr v-else-if="!records.length"><td colspan="5" class="text-center text-slate-400 py-8">Chưa có thợ hàn nào</td></tr>
          <tr v-for="r in records" :key="r.id">
            <td class="font-semibold text-slate-800 dark:text-slate-200">{{ r.welder_code }}</td>
            <td>{{ r.full_name }}</td>
            <td>{{ r.stamp_no ?? '—' }}</td>
            <td>
              <StatusTag v-if="r.cert?.status" :type="certType(r.cert?.status)" :label="r.cert?.label ?? '—'" />
              <span v-else class="text-slate-400">—</span>
              <StatusTag v-if="r.cert?.continuityWarning" type="amber" label="gián đoạn" class="ml-1" />
            </td>
            <td class="text-right">
              <button @click="openCard(r.id)" class="btn btn-outline btn-sm">Thẻ chứng nhận</button>
            </td>
          </tr>
        </tbody>
      </table>
    </UiCard>

    <!-- Create Welder Modal -->
    <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="modal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">Thêm thợ hàn</h3>
        <div>
          <label class="form-label">Mã thợ hàn *</label>
          <input v-model="form.welder_code" class="form-control">
        </div>
        <div>
          <label class="form-label">Họ tên *</label>
          <input v-model="form.full_name" class="form-control">
        </div>
        <div>
          <label class="form-label">Số dấu</label>
          <input v-model="form.stamp_no" class="form-control">
        </div>
        <div class="flex justify-end gap-2">
          <button @click="modal=false" class="btn btn-outline">Hủy</button>
          <button @click="createWelder" :disabled="creating" class="btn btn-primary disabled:opacity-50">
            {{ creating ? 'Đang lưu...' : 'Lưu' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Welder Qualification Card (printable) -->
    <div v-if="cardModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0">
      <div class="absolute inset-0 bg-black/50 print:hidden" @click="cardModal=false"></div>
      <div class="relative bg-white text-slate-900 rounded-xl shadow-2xl w-full max-w-2xl p-6 print:shadow-none print:rounded-none" id="welder-card">
        <div v-if="card" class="space-y-4">
          <div class="flex items-center justify-between border-b border-slate-300 pb-3">
            <div>
              <div class="text-xs text-slate-500">IBS HEAVY INDUSTRY</div>
              <h3 class="text-lg font-bold">THẺ CHỨNG NHẬN THỢ HÀN</h3>
              <div class="text-xs text-slate-500">Welder Qualification Card</div>
            </div>
            <StatusTag :type="certType(card.cert?.status)" :label="card.cert?.label" />
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-slate-500">Mã thợ hàn:</span> <b>{{ card.welder_code }}</b></div>
            <div><span class="text-slate-500">Họ tên:</span> <b>{{ card.full_name }}</b></div>
            <div><span class="text-slate-500">Số dấu:</span> <b>{{ card.stamp_no ?? '—' }}</b></div>
            <div><span class="text-slate-500">Trạng thái:</span> <b>{{ card.status }}</b></div>
          </div>
          <div>
            <div class="text-sm font-semibold mb-1">Phạm vi chứng chỉ</div>
            <table class="w-full text-xs border border-slate-300">
              <thead class="bg-slate-100">
                <tr>
                  <th class="px-2 py-1 text-left border-b border-slate-300">Phương pháp</th>
                  <th class="px-2 py-1 text-left border-b border-slate-300">Vị trí</th>
                  <th class="px-2 py-1 text-left border-b border-slate-300">Chiều dày (mm)</th>
                  <th class="px-2 py-1 text-left border-b border-slate-300">Số chứng chỉ</th>
                  <th class="px-2 py-1 text-left border-b border-slate-300">Ngày cấp</th>
                  <th class="px-2 py-1 text-left border-b border-slate-300">Hết hạn</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="q in card.qualifications" :key="q.id">
                  <td class="px-2 py-1 border-b border-slate-200">{{ q.process ?? '—' }}</td>
                  <td class="px-2 py-1 border-b border-slate-200">{{ q.position ?? '—' }}</td>
                  <td class="px-2 py-1 border-b border-slate-200">{{ fmtRange(q.thickness_min, q.thickness_max) }}</td>
                  <td class="px-2 py-1 border-b border-slate-200">{{ q.cert_no ?? '—' }}</td>
                  <td class="px-2 py-1 border-b border-slate-200">{{ fmtDate(q.qualified_date) }}</td>
                  <td class="px-2 py-1 border-b border-slate-200">{{ fmtDate(q.expiry_date) }}</td>
                </tr>
                <tr v-if="!card.qualifications?.length"><td colspan="6" class="px-2 py-2 text-center text-slate-400">Chưa có chứng chỉ</td></tr>
              </tbody>
            </table>
          </div>
          <div class="flex justify-end gap-2 print:hidden">
            <button @click="cardModal=false" class="btn btn-outline">Đóng</button>
            <button @click="printCard" class="btn btn-primary">🖨️ In thẻ</button>
          </div>
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
const form = ref({ welder_code: '', full_name: '', stamp_no: '' });
const cardModal = ref(false);
const card = ref(null);
const toast = ref({ show: false, ok: true, message: '' });

const CERT = { VALID: 'green', EXPIRING: 'amber', EXPIRED: 'red' };
function certType(s) { return CERT[s] ?? 'gray'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }
function fmtRange(a, b) {
  if (a == null && b == null) return '—';
  return `${a ?? '?'} – ${b ?? '?'}`;
}

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch('/api/welding/welders?limit=200');
    records.value = (await res.json()).data ?? [];
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  form.value = { welder_code: '', full_name: '', stamp_no: '' };
  modal.value = true;
}

async function createWelder() {
  if (!form.value.welder_code || !form.value.full_name) { showToast(false, 'Mã và họ tên là bắt buộc'); return; }
  creating.value = true;
  try {
    const res = await apiFetch('/api/welding/welders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Lỗi lưu thợ hàn');
    modal.value = false;
    showToast(true, 'Đã thêm thợ hàn');
    load();
  } catch (e) {
    showToast(false, e.message);
  } finally {
    creating.value = false;
  }
}

async function openCard(id) {
  try {
    const res = await apiFetch(`/api/welding/welders/${id}/card`);
    if (!res.ok) throw new Error('Không tải được thẻ');
    card.value = (await res.json()).data;
    cardModal.value = true;
  } catch (e) {
    showToast(false, e.message);
  }
}

function printCard() { window.print(); }

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
