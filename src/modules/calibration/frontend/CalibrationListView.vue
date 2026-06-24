<template>
  <div>
    <PageHeader :title="t('calibration.masterLog')" :subtitle="t('calibration.subtitle')">
      <template #actions>
        <button @click="window.print()" class="btn btn-outline print:hidden">📥 {{ t('calibration.print') }}</button>
        <button v-can="'calibration.write'" @click="openDevice()" class="btn btn-primary">+ {{ t('calibration.addDevice') }}</button>
      </template>
    </PageHeader>

    <!-- Summary -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 print:hidden">
      <StatCard icon="🧰" color="blue"  :label="t('calibration.totalDevices')" :value="summary.total" />
      <StatCard icon="⚠️" color="amber" :label="t('calibration.expiringSoon')" :value="summary.expiring" />
      <StatCard icon="⛔" color="red"   :label="t('calibration.expiredCount')" :value="summary.expired" />
    </div>

    <!-- Filters -->
    <UiCard class="mb-4" body-class="card-body flex flex-wrap gap-3 items-center print:hidden">
      <input v-model="search" @keyup.enter="load(1)" :placeholder="t('calibration.searchPlaceholder')" class="form-control max-w-[240px]">
      <select v-model="status" @change="load(1)" class="form-control max-w-[200px]">
        <option value="">{{ t('calibration.allStatus') }}</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="INACTIVE">INACTIVE</option>
        <option value="RETIRED">RETIRED</option>
      </select>
      <button @click="load(1)" class="btn btn-outline">🔍 {{ t('calibration.filter') }}</button>
      <div class="flex flex-wrap gap-3 text-xs ml-auto items-center">
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>{{ t('calibration.valid') }}</span>
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>{{ t('calibration.expiring') }}</span>
        <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>{{ t('calibration.expired') }}</span>
      </div>
    </UiCard>

    <UiCard body-class="p-0 overflow-x-auto">
      <table class="qc-table">
        <thead>
          <tr>
            <th>{{ t('calibration.deviceCode') }}</th>
            <th>{{ t('calibration.name') }}</th>
            <th>{{ t('calibration.type') }}</th>
            <th>{{ t('calibration.location') }}</th>
            <th>{{ t('calibration.dueDate') }}</th>
            <th>{{ t('calibration.statusHsd') }}</th>
            <th class="text-right print:hidden">{{ t('calibration.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="text-center text-slate-500 py-8">{{ t('calibration.loading') }}</td></tr>
          <tr v-else-if="!devices.length"><td colspan="7" class="text-center text-slate-400 py-8">{{ t('calibration.empty') }}</td></tr>
          <tr v-for="d in devices" :key="d.id">
            <td class="font-mono text-xs text-slate-800 dark:text-slate-200">{{ d.device_code }}</td>
            <td class="font-semibold text-slate-800 dark:text-slate-200">{{ d.name }}</td>
            <td>{{ d.type ?? '—' }}</td>
            <td>{{ d.location ?? '—' }}</td>
            <td :class="dueClass(d.status_hsd)">{{ d.due_date ? new Date(d.due_date).toLocaleDateString('vi-VN') : '—' }}</td>
            <td><StatusTag :type="hsdType(d.status_hsd)" :label="hsdLabel(d.status_hsd)" /></td>
            <td class="text-right print:hidden whitespace-nowrap">
              <button v-can="'calibration.write'" @click="openRecord(d)" class="btn btn-success btn-sm mr-1">{{ t('calibration.addRecord') }}</button>
              <button v-can="'calibration.write'" @click="openDevice(d)" class="btn btn-outline btn-sm">{{ t('calibration.edit') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </UiCard>

    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-1 mt-4 print:hidden">
      <button v-for="p in pagination.totalPages" :key="p" @click="load(p)"
        :class="p === pagination.page ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
        class="px-3 py-1.5 rounded text-sm font-medium transition-colors">{{ p }}</button>
    </div>

    <!-- Device Modal -->
    <div v-if="deviceModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div class="absolute inset-0 bg-black/50" @click="deviceModal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-3">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ deviceForm.id ? t('calibration.editDevice') : t('calibration.addDevice') }}</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ t('calibration.deviceCode') }} *</label>
          <input v-model="deviceForm.device_code" class="form-input">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ t('calibration.name') }} *</label>
          <input v-model="deviceForm.name" class="form-input">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ t('calibration.type') }}</label>
            <input v-model="deviceForm.type" class="form-input">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ t('calibration.location') }}</label>
            <input v-model="deviceForm.location" class="form-input">
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ t('calibration.status') }}</label>
          <select v-model="deviceForm.status" class="form-input">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="RETIRED">RETIRED</option>
          </select>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button @click="deviceModal=false" class="btn btn-outline">{{ t('calibration.cancel') }}</button>
          <button @click="saveDevice" :disabled="saving" class="btn btn-primary disabled:opacity-50">{{ saving ? t('calibration.saving') : t('calibration.save') }}</button>
        </div>
      </div>
    </div>

    <!-- Record Modal -->
    <div v-if="recordModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div class="absolute inset-0 bg-black/50" @click="recordModal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-3">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ t('calibration.addRecord') }} — {{ recordForm._deviceCode }}</h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ t('calibration.calibratedDate') }}</label>
            <input type="date" v-model="recordForm.calibrated_date" class="form-input">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ t('calibration.dueDate') }}</label>
            <input type="date" v-model="recordForm.due_date" class="form-input">
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ t('calibration.certificateNo') }}</label>
          <input v-model="recordForm.certificate_no" class="form-input">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ t('calibration.result') }}</label>
            <select v-model="recordForm.result" class="form-input">
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
              <option value="ADJUSTED">ADJUSTED</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ t('calibration.calibratedBy') }}</label>
            <input v-model="recordForm.calibrated_by" class="form-input">
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button @click="recordModal=false" class="btn btn-outline">{{ t('calibration.cancel') }}</button>
          <button @click="saveRecord" :disabled="saving" class="btn btn-success disabled:opacity-50">{{ saving ? t('calibration.saving') : t('calibration.save') }}</button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg print:hidden">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiFetch } from '@/utils/api.js';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import StatCard from '@/components/StatCard.vue';

const { t } = useI18n();
const window = globalThis.window;
const devices = ref([]);
const loading = ref(false);
const saving = ref(false);
const search = ref('');
const status = ref('');
const pagination = ref({ page: 1, totalPages: 1 });
const deviceModal = ref(false);
const recordModal = ref(false);
const deviceForm = ref({});
const recordForm = ref({});
const toast = ref({ show: false, ok: true, message: '' });

const HSD = {
  VALID:    { type: 'green', key: 'valid' },
  EXPIRING: { type: 'amber', key: 'expiring' },
  EXPIRED:  { type: 'red',   key: 'expired' },
  UNKNOWN:  { type: 'gray',  key: 'unknown' },
};
function hsdType(s) { return (HSD[s] ?? HSD.UNKNOWN).type; }
function hsdLabel(s) { return t('calibration.' + (HSD[s] ?? HSD.UNKNOWN).key); }
// Tô màu ngày hạn theo trạng thái hiệu lực
function dueClass(s) {
  if (s === 'EXPIRED') return 'text-red-600 dark:text-red-400 font-semibold';
  if (s === 'EXPIRING') return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-slate-600 dark:text-slate-400';
}

// Tổng hợp nhanh trên trang hiện tại
const summary = computed(() => ({
  total: devices.value.length,
  expiring: devices.value.filter(d => d.status_hsd === 'EXPIRING').length,
  expired: devices.value.filter(d => d.status_hsd === 'EXPIRED').length,
}));

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(search.value && { search: search.value }), ...(status.value && { status: status.value }) });
    const res = await apiFetch(`/api/calibration/devices?${params}`);
    const json = await res.json();
    devices.value = json.data ?? [];
    pagination.value = json.pagination ?? { page: 1, totalPages: 1 };
  } finally {
    loading.value = false;
  }
}

function openDevice(d) {
  deviceForm.value = d
    ? { ...d }
    : { device_code: '', name: '', type: '', location: '', status: 'ACTIVE' };
  deviceModal.value = true;
}

async function saveDevice() {
  if (!deviceForm.value.device_code || !deviceForm.value.name) { showToast(false, t('calibration.requiredFields')); return; }
  saving.value = true;
  try {
    const id = deviceForm.value.id;
    const payload = {
      device_code: deviceForm.value.device_code,
      name: deviceForm.value.name,
      type: deviceForm.value.type || null,
      location: deviceForm.value.location || null,
      status: deviceForm.value.status || 'ACTIVE',
    };
    const res = await apiFetch(id ? `/api/calibration/devices/${id}` : '/api/calibration/devices', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'error');
    deviceModal.value = false;
    showToast(true, t('calibration.saved'));
    load(pagination.value.page);
  } catch (e) {
    showToast(false, e.message || t('calibration.saveError'));
  } finally {
    saving.value = false;
  }
}

function openRecord(d) {
  recordForm.value = { device_id: d.id, _deviceCode: d.device_code, calibrated_date: '', due_date: '', certificate_no: '', result: 'PASS', calibrated_by: '' };
  recordModal.value = true;
}

async function saveRecord() {
  saving.value = true;
  try {
    const payload = {
      device_id: recordForm.value.device_id,
      calibrated_date: recordForm.value.calibrated_date || null,
      due_date: recordForm.value.due_date || null,
      certificate_no: recordForm.value.certificate_no || null,
      result: recordForm.value.result || null,
      calibrated_by: recordForm.value.calibrated_by || null,
    };
    const res = await apiFetch('/api/calibration/records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'error');
    recordModal.value = false;
    showToast(true, t('calibration.saved'));
    load(pagination.value.page);
  } catch (e) {
    showToast(false, e.message || t('calibration.saveError'));
  } finally {
    saving.value = false;
  }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(() => load());
</script>

<style scoped>
.form-input, .form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.5rem;
  background: white;
  color: rgb(31 41 55);
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus, .form-control:focus { border-color: #60a5fa; }
:global(.dark) .form-input, :global(.dark) .form-control {
  border-color: #252540;
  background: #12122a;
  color: rgb(243 244 246);
}
</style>
