<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <router-link to="/qaqc/mir" class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </router-link>
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">MIR — {{ mir?.po_ref ?? mir?.id?.slice(0,8) }}</h2>
      <span v-if="mir" class="px-2 py-0.5 rounded-full text-xs font-medium" :class="stageClass(mir.stage)">{{ mir.stage }}</span>
    </div>

    <div v-if="loading" class="card p-8 text-center text-slate-500">Đang tải...</div>
    <template v-else-if="mir">
      <!-- Info -->
      <div class="card p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div><span class="block text-xs text-slate-500 mb-1">Dự án</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ mir.project_code }}</span></div>
        <div><span class="block text-xs text-slate-500 mb-1">Supplier</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ mir.supplier_id ?? '—' }}</span></div>
        <div><span class="block text-xs text-slate-500 mb-1">Ngày tạo</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ new Date(mir.created_at).toLocaleDateString('vi-VN') }}</span></div>
        <div v-if="signature" class="col-span-2 sm:col-span-3 pt-1">
          <SignatureBadge :signature="signature" />
        </div>
      </div>

      <!-- Stage Actions -->
      <div v-can="'qaqc.mir.write'" class="card p-4 flex flex-wrap gap-2">
        <template v-if="mir.stage === 'EXPECTED'">
          <label class="text-xs font-semibold text-slate-500 w-full mb-1">Upload MTC để chuyển sang DOC_RECEIVED</label>
          <input v-model="mtcForm.heat_no" placeholder="Heat No" class="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          <input v-model="mtcForm.grade" placeholder="Grade" class="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          <input v-model="mtcForm.file_url" placeholder="File URL" class="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          <button @click="uploadMTC" class="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Upload MTC</button>
        </template>
        <button v-if="mir.stage === 'DOC_RECEIVED'" @click="recordPhysical"
          class="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
          Ghi nhận Physical Inspection
        </button>
        <button v-if="mir.stage === 'PHYSICAL_INSPECTED'" @click="runCrossCheck"
          class="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
          Chạy AI-2 Cross-Check
        </button>
        <template v-if="mir.stage === 'MTC_VERIFIED'">
          <span class="text-xs text-slate-500 self-center">Quyết định:</span>
          <button @click="openSignCeremony('ACCEPT')" class="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">ACCEPT</button>
          <button @click="openSignCeremony('CONDITIONAL')" class="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">CONDITIONAL</button>
          <button @click="openSignCeremony('REJECT')" class="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">REJECT</button>
        </template>
        <button v-if="mir.stage === 'DECIDED'" v-can="'qaqc.mir.warehouse'" @click="warehouse"
          class="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
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
                  <span class="px-1.5 py-0.5 rounded text-xs font-medium"
                    :class="r.status === 'PASS' ? 'bg-green-100 text-green-700' : r.status === 'FAIL' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'">
                    {{ r.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Certs -->
      <div v-if="mir.certs?.length" class="card p-0 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-semibold text-sm text-slate-700 dark:text-slate-300">MTC Certificates</div>
        <table class="w-full text-sm">
          <thead><tr class="bg-slate-50 dark:bg-[#1a1a2e]">
            <th class="px-4 py-2 text-left text-slate-600">Heat No</th>
            <th class="px-4 py-2 text-left text-slate-600">Grade</th>
            <th class="px-4 py-2 text-left text-slate-600">Supplier</th>
            <th class="px-4 py-2 text-left text-slate-600">File</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="c in mir.certs" :key="c.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
              <td class="px-4 py-2 text-slate-700 dark:text-slate-300">{{ c.heat_no ?? '—' }}</td>
              <td class="px-4 py-2 text-slate-700 dark:text-slate-300">{{ c.grade ?? '—' }}</td>
              <td class="px-4 py-2 text-slate-500">{{ c.supplier ?? '—' }}</td>
              <td class="px-4 py-2">
                <a v-if="c.file_url" :href="c.file_url" target="_blank" class="text-blue-600 hover:underline text-xs">Xem file</a>
                <span v-else class="text-slate-400 text-xs">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <SignatureCeremony
      :show="signCeremony.show"
      entity-type="MIR"
      :entity-id="route.params.id"
      :summary-text="`MIR ${mir?.po_ref ?? ''} — Quyết định: ${signCeremony.decision}`"
      :doc-payload="{ mirId: route.params.id, decision: signCeremony.decision }"
      @success="onSignSuccess"
      @cancel="signCeremony.show = false"
    />

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useRoute } from 'vue-router';
import SignatureCeremony from '@/components/SignatureCeremony.vue';
import SignatureBadge from '@/components/SignatureBadge.vue';

const route = useRoute();
const mir = ref(null);
const loading = ref(false);
const crossCheckResult = ref(null);
const mtcForm = ref({ heat_no: '', grade: '', file_url: '' });
const toast = ref({ show: false, ok: true, message: '' });
const signature = ref(null);
const signCeremony = reactive({ show: false, decision: '' });

const STAGE_COLORS = {
  EXPECTED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  DOC_RECEIVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  PHYSICAL_INSPECTED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  MTC_VERIFIED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  DECIDED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  INSTOCK: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
};
function stageClass(s) { return STAGE_COLORS[s] ?? ''; }

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/qaqc/mir/${route.params.id}`);
    mir.value = (await res.json()).data;
    const sigRes = await apiFetch(`/api/system/signature/MIR/${route.params.id}`).catch(() => null);
    if (sigRes?.ok) signature.value = (await sigRes.json()).data;
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

function openSignCeremony(decision) {
  signCeremony.decision = decision;
  signCeremony.show = true;
}

async function onSignSuccess(sig) {
  signCeremony.show = false;
  try {
    await apiPost('/decide', { decision: signCeremony.decision, signature_id: sig.id });
    showToast(true, `Quyết định: ${signCeremony.decision} — đã ký số`);
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
