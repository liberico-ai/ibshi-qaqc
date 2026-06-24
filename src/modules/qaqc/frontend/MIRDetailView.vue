<template>
  <div class="space-y-4">
    <PageHeader :title="`MIR — ${mir?.po_ref ?? mir?.id?.slice(0,8) ?? ''}`">
      <template #actions>
        <StatusTag v-if="mir" :type="stageTagType(mir.stage)" :label="mir.stage" />
        <router-link to="/qaqc/mir" class="btn btn-outline btn-sm">← Quay lại</router-link>
      </template>
    </PageHeader>

    <div v-if="loading" class="card p-8 text-center text-slate-500">Đang tải...</div>
    <template v-else-if="mir">
      <!-- Info -->
      <UiCard body-class="card-body">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><span class="block text-xs text-slate-500 mb-1">Dự án</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ mir.project_code }}</span></div>
          <div><span class="block text-xs text-slate-500 mb-1">Supplier</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ mir.supplier_id ?? '—' }}</span></div>
          <div><span class="block text-xs text-slate-500 mb-1">Ngày tạo</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ new Date(mir.created_at).toLocaleDateString('vi-VN') }}</span></div>
        </div>
      </UiCard>

      <!-- Stage Actions -->
      <div v-can="'qaqc.mir.write'" class="card p-4 flex flex-wrap gap-2">
        <template v-if="mir.stage === 'EXPECTED'">
          <label class="text-xs font-semibold text-slate-500 w-full mb-1">Upload MTC để chuyển sang DOC_RECEIVED</label>
          <input v-model="mtcForm.heat_no" placeholder="Heat No" class="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          <input v-model="mtcForm.grade" placeholder="Grade" class="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          <input v-model="mtcForm.file_url" placeholder="File URL" class="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          <button @click="uploadMTC" class="btn btn-primary btn-sm">Upload MTC</button>
        </template>
        <button v-if="mir.stage === 'DOC_RECEIVED'" @click="recordPhysical" class="btn btn-primary btn-sm">
          Ghi nhận Physical Inspection
        </button>
        <button v-if="mir.stage === 'PHYSICAL_INSPECTED'" @click="runCrossCheck" class="btn btn-primary btn-sm">
          Chạy AI-2 Cross-Check
        </button>
        <template v-if="mir.stage === 'MTC_VERIFIED'">
          <span class="text-xs text-slate-500 self-center">Quyết định:</span>
          <button @click="decide('ACCEPT')" class="btn btn-success btn-sm">ACCEPT</button>
          <button @click="decide('CONDITIONAL')" class="btn btn-warning btn-sm">CONDITIONAL</button>
          <button @click="decide('REJECT')" class="btn btn-danger btn-sm">REJECT</button>
        </template>
        <button v-if="mir.stage === 'DECIDED'" v-can="'qaqc.mir.warehouse'" @click="warehouse" class="btn btn-success btn-sm">
          Nhập kho
        </button>
      </div>

      <!-- Cross-check results -->
      <div v-if="crossCheckResult" class="card p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Kết quả AI-2 Cross-Check</h3>
          <span :class="crossCheckResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
            class="text-sm font-medium">
            {{ crossCheckResult.ok ? 'PASSED' : 'FAILED' }} — {{ crossCheckResult.summary.passed }}/{{ crossCheckResult.summary.total }}
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead><tr class="text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th class="text-left py-1 pr-3">Loại</th><th class="text-left py-1 pr-3">Thuộc tính</th>
              <th class="text-right py-1 pr-3">Thực tế</th><th class="text-right py-1 pr-3">Min</th>
              <th class="text-right py-1 pr-3">Max</th><th class="text-center py-1">Kết quả</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="r in crossCheckResult.results" :key="`${r.category}-${r.property}`">
                <td class="py-1 pr-3 text-slate-500">{{ r.category }}</td>
                <td class="py-1 pr-3 font-medium">{{ r.property }}</td>
                <td class="py-1 pr-3 text-right">{{ r.actual ?? '—' }}</td>
                <td class="py-1 pr-3 text-right text-slate-500">{{ r.min_val ?? '—' }}</td>
                <td class="py-1 pr-3 text-right text-slate-500">{{ r.max_val ?? '—' }}</td>
                <td class="py-1 text-center">
                  <StatusTag :status="r.status" :label="r.status" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Certs -->
      <UiCard v-if="mir.certs?.length" title="MTC Certificates" body-class="p-0">
        <div class="overflow-x-auto">
          <table class="qc-table">
            <thead>
              <tr>
                <th>Heat No</th>
                <th>Grade</th>
                <th>Supplier</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in mir.certs" :key="c.id">
                <td>{{ c.heat_no ?? '—' }}</td>
                <td>{{ c.grade ?? '—' }}</td>
                <td class="text-slate-500">{{ c.supplier ?? '—' }}</td>
                <td>
                  <a v-if="c.file_url" :href="c.file_url" target="_blank" class="text-blue-600 hover:underline text-xs">Xem file</a>
                  <span v-else class="text-slate-400 text-xs">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>
    </template>

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg">{{ toast.message }}</div>

    <SignatureCeremony v-model="showSignature" @confirm="onSignConfirm" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useRoute } from 'vue-router';
import SignatureCeremony from '@/components/SignatureCeremony.vue';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';

const route = useRoute();
const mir = ref(null);
const loading = ref(false);
const crossCheckResult = ref(null);
const mtcForm = ref({ heat_no: '', grade: '', file_url: '' });
const toast = ref({ show: false, ok: true, message: '' });
const showSignature = ref(false);
const pendingDecision = ref(null);

const STAGE_TAG_TYPES = {
  EXPECTED: 'gray',
  DOC_RECEIVED: 'blue',
  PHYSICAL_INSPECTED: 'blue',
  MTC_VERIFIED: 'purple',
  DECIDED: 'green',
  INSTOCK: 'green',
};
function stageTagType(s) { return STAGE_TAG_TYPES[s] ?? 'gray'; }

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/qaqc/mir/${route.params.id}`);
    mir.value = (await res.json()).data;
  } finally {
    loading.value = false;
  }
}

async function apiPost(path, body) {
  const res = await apiFetch(`/api/qaqc/mir/${route.params.id}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Lỗi');
  return json;
}

async function uploadMTC() {
  try {
    await apiPost('/upload-mtc', mtcForm.value);
    showToast(true, 'Đã upload MTC');
    await load();
  } catch (e) { showToast(false, e.message); }
}

async function recordPhysical() {
  try {
    await apiPost('/physical');
    showToast(true, 'Đã ghi nhận Physical Inspection');
    await load();
  } catch (e) { showToast(false, e.message); }
}

async function runCrossCheck() {
  try {
    const json = await apiPost('/crosscheck');
    crossCheckResult.value = json.data;
    showToast(json.data.ok, json.data.ok ? 'Cross-check PASSED' : 'Cross-check có lỗi — xem chi tiết');
    await load();
  } catch (e) { showToast(false, e.message); }
}

// Quyết định nghiệm thu cần chữ ký số → mở nghi thức ký trước.
function decide(decision) {
  pendingDecision.value = decision;
  showSignature.value = true;
}

async function onSignConfirm(pin) {
  const decision = pendingDecision.value;
  pendingDecision.value = null;
  if (!decision) return;
  try {
    await apiPost('/decide', { decision, pin });
    showToast(true, `Đã ghi quyết định: ${decision}`);
    await load();
  } catch (e) { showToast(false, e.message); }
}

async function warehouse() {
  try {
    await apiPost('/warehouse');
    showToast(true, 'Đã nhập kho');
    await load();
  } catch (e) { showToast(false, e.message); }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(load);
</script>
