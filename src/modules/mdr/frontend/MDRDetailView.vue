<template>
  <div>
    <PageHeader :title="dossier?.name ?? $t('mdr.detail.title')" :subtitle="$t('mdr.detail.subtitle')">
      <template #actions>
        <StatusTag v-if="dossier" :status="dossier.status" :label="$t('mdr.status.' + dossier.status)" />
        <router-link to="/mdr" class="btn btn-outline btn-sm">← {{ $t('mdr.detail.back') }}</router-link>
      </template>
    </PageHeader>

    <div v-if="loading" class="card p-8 text-center text-slate-500">{{ $t('mdr.loading') }}</div>
    <template v-else-if="dossier">
      <!-- Completion + actions -->
      <UiCard class="mb-5">
        <div class="flex items-center gap-3 mb-3">
          <div class="flex-1"><ProgressBar :value="Number(dossier.completion_pct) || 0" /></div>
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 w-14 text-right">{{ Number(dossier.completion_pct).toFixed(0) }}%</span>
        </div>
        <div v-if="missingCats.length" class="mb-3 p-3 rounded-lg text-[12px] bg-red-50 text-red-700 dark:bg-red-900/15 dark:text-red-300">
          ⚠️ <strong>{{ missingCats.length }}</strong> {{ $t('mdr.detail.missingSummary') }}: {{ missingCats.map(c => c.name_vi).join(', ') }}
        </div>
        <div class="flex flex-wrap gap-2">
          <button @click="rescan" class="btn btn-outline btn-sm">{{ $t('mdr.detail.rescan') }}</button>
          <button v-can="'mdr.compile'" @click="compile" :disabled="busy" class="btn btn-primary btn-sm disabled:opacity-50">{{ $t('mdr.detail.compile') }}</button>
          <button v-can="'mdr.submit'" @click="submitModal = true" class="btn btn-success btn-sm">{{ $t('mdr.detail.submit') }}</button>
          <button v-can="'mdr.write'" @click="transModal = true" class="btn btn-primary btn-sm">{{ $t('mdr.detail.transmittal') }}</button>
        </div>
      </UiCard>

      <!-- Category checklist -->
      <UiCard class="mb-5" body-class="p-0">
        <template #header><div class="card-title">{{ $t('mdr.detail.categories') }}</div></template>
        <div class="divide-y divide-slate-100 dark:divide-[#252540]">
          <div v-for="cat in dossier.categories" :key="cat.id" class="px-5 py-3"
            :class="catMissing(cat) ? 'bg-red-50/60 dark:bg-red-900/10' : ''">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 text-[13px]">
                <span class="check" :class="catMissing(cat) ? 'missing' : (catDone(cat) ? 'done' : 'na')">
                  {{ catMissing(cat) ? '❌' : (catDone(cat) ? '✅' : '○') }}
                </span>
                <span class="text-xs font-mono text-slate-400">{{ String(cat.order_no).padStart(2,'0') }}</span>
                <span class="font-medium text-slate-800 dark:text-slate-200">{{ cat.name_vi }}</span>
                <StatusTag v-if="!cat.required" type="gray" :label="$t('mdr.detail.optional')" />
                <StatusTag v-if="catMissing(cat)" type="red" :label="$t('mdr.detail.missing')" />
              </div>
              <button v-can="'mdr.write'" @click="openAddDoc(cat)" class="btn btn-outline btn-sm shrink-0">
                + {{ $t('mdr.detail.addDoc') }}
              </button>
            </div>
            <ul v-if="docsOf(cat).length" class="mt-2 ml-7 space-y-1">
              <li v-for="d in docsOf(cat)" :key="d.id" class="flex items-center gap-2 text-xs">
                <span class="w-2 h-2 rounded-full" :class="d.status === 'present' ? 'bg-emerald-500' : 'bg-red-400'"></span>
                <span class="text-slate-700 dark:text-slate-300">{{ d.doc_name }}</span>
                <span v-if="d.source_module" class="text-[10px] text-slate-400">[{{ d.source_module }}]</span>
                <a v-if="d.file_link" :href="d.file_link" target="_blank" class="text-blue-600 hover:underline">{{ $t('mdr.detail.viewFile') }}</a>
                <button v-if="d.status !== 'present'" v-can="'mdr.write'" @click="markPresent(d)" class="ml-auto text-[11px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200">
                  {{ $t('mdr.detail.markPresent') }}
                </button>
              </li>
            </ul>
            <p v-else class="mt-1 ml-7 text-xs text-slate-400">{{ $t('mdr.detail.noDocs') }}</p>
          </div>
        </div>
      </UiCard>

      <!-- Transmittals -->
      <UiCard v-if="transmittals.length" body-class="p-0">
        <template #header><div class="card-title">{{ $t('mdr.detail.transmittalList') }}</div></template>
        <div class="overflow-x-auto">
          <table class="qc-table">
            <thead>
              <tr>
                <th>{{ $t('mdr.field.transNo') }}</th>
                <th>{{ $t('mdr.field.client') }}</th>
                <th>{{ $t('mdr.field.docCount') }}</th>
                <th>{{ $t('mdr.field.issuedAt') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tr in transmittals" :key="tr.id">
                <td class="font-mono text-xs">{{ tr.transmittal_no }}</td>
                <td>{{ tr.client ?? '—' }}</td>
                <td>{{ tr.doc_count }}</td>
                <td class="text-slate-500 text-xs">{{ new Date(tr.issued_at).toLocaleDateString('vi-VN') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>
    </template>

    <!-- Add Document Modal -->
    <div v-if="docModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="docModal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ $t('mdr.detail.addDoc') }} — {{ docForm.category_name }}</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('mdr.field.docName') }} *</label>
          <input v-model="docForm.doc_name" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('mdr.field.fileLink') }}</label>
          <input v-model="docForm.file_link" :placeholder="$t('mdr.detail.fileLinkPlaceholder')" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('mdr.field.sourceModule') }}</label>
          <input v-model="docForm.source_module" placeholder="qaqc / mir / ncr / manual" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div class="flex justify-end gap-2">
          <button @click="docModal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">{{ $t('mdr.cancel') }}</button>
          <button @click="addDoc" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{{ $t('mdr.detail.addDoc') }}</button>
        </div>
      </div>
    </div>

    <!-- Submit Modal -->
    <div v-if="submitModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="submitModal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ $t('mdr.detail.submit') }}</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('mdr.field.client') }} *</label>
          <input v-model="clientName" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div class="flex justify-end gap-2">
          <button @click="submitModal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">{{ $t('mdr.cancel') }}</button>
          <button @click="buildSubmission" :disabled="busy" class="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">{{ $t('mdr.detail.submit') }}</button>
        </div>
      </div>
    </div>

    <!-- Transmittal Modal -->
    <div v-if="transModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="transModal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ $t('mdr.detail.transmittal') }} (ILS-QAC-F13)</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('mdr.field.client') }} *</label>
          <input v-model="transForm.client" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('mdr.field.purpose') }}</label>
          <input v-model="transForm.purpose" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('mdr.field.remarks') }}</label>
          <textarea v-model="transForm.remarks" rows="2" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none"></textarea>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="transModal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">{{ $t('mdr.cancel') }}</button>
          <button @click="createTransmittal" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{{ $t('mdr.detail.create') }}</button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import ProgressBar from '@/components/ProgressBar.vue';

const { t } = useI18n();
const route = useRoute();
const dossier = ref(null);
const transmittals = ref([]);
const loading = ref(false);
const busy = ref(false);
const docModal = ref(false);
const submitModal = ref(false);
const transModal = ref(false);
const docForm = ref({ category_id: '', category_name: '', doc_name: '', file_link: '', source_module: 'manual' });
const clientName = ref('');
const transForm = ref({ client: '', purpose: '', remarks: '' });
const toast = ref({ show: false, ok: true, message: '' });

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  ready: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  submitted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
};
function statusClass(s) { return STATUS_COLORS[s] ?? ''; }
function pctColor(p) {
  if (p >= 100) return 'bg-green-500';
  if (p >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}
function docsOf(cat) { return (dossier.value?.documents ?? []).filter((d) => d.category_id === cat.id); }
function catMissing(cat) {
  if (!cat.required) return false;
  return !docsOf(cat).some((d) => d.status === 'present');
}
function catDone(cat) { return docsOf(cat).some((d) => d.status === 'present'); }

const missingCats = computed(() => (dossier.value?.categories ?? []).filter((c) => catMissing(c)));

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/mdr/${route.params.id}`);
    dossier.value = (await res.json()).data;
    const tr = await apiFetch(`/api/mdr/${route.params.id}/transmittals`);
    transmittals.value = (await tr.json()).data ?? [];
  } finally {
    loading.value = false;
  }
}

async function apiCall(path, method = 'POST', body) {
  const res = await apiFetch(`/api/mdr/${route.params.id}${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || (json.errors && json.errors[0]?.msg) || t('mdr.error'));
  return json;
}

async function rescan() {
  try { await apiCall('/scan'); showToast(true, t('mdr.detail.rescanOk')); await load(); }
  catch (e) { showToast(false, e.message); }
}

function openAddDoc(cat) {
  docForm.value = { category_id: cat.id, category_name: cat.name_vi, doc_name: '', file_link: '', source_module: 'manual' };
  docModal.value = true;
}

async function addDoc() {
  if (!docForm.value.doc_name) { showToast(false, t('mdr.detail.docNameRequired')); return; }
  try {
    const payload = { category_id: docForm.value.category_id, doc_name: docForm.value.doc_name, source_module: docForm.value.source_module };
    if (docForm.value.file_link) payload.file_link = docForm.value.file_link;
    await apiCall('/documents', 'POST', payload);
    docModal.value = false;
    showToast(true, t('mdr.detail.docAdded'));
    await load();
  } catch (e) { showToast(false, e.message); }
}

async function markPresent(d) {
  try { await apiCall(`/documents/${d.id}`, 'PUT', { status: 'present' }); showToast(true, t('mdr.detail.marked')); await load(); }
  catch (e) { showToast(false, e.message); }
}

async function compile() {
  busy.value = true;
  try {
    const res = await apiFetch(`/api/mdr/${route.params.id}/compile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    const blob = await res.blob();
    downloadBlob(blob, 'MDR_Bundle.pdf');
    showToast(true, t('mdr.detail.compileOk'));
  } catch (e) { showToast(false, e.message); }
  finally { busy.value = false; }
}

async function buildSubmission() {
  if (!clientName.value) { showToast(false, t('mdr.detail.clientRequired')); return; }
  busy.value = true;
  try {
    const res = await apiFetch(`/api/mdr/${route.params.id}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: clientName.value }),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    const blob = await res.blob();
    downloadBlob(blob, 'MDR_Submission.zip');
    submitModal.value = false;
    showToast(true, t('mdr.detail.submitOk'));
    await load();
  } catch (e) { showToast(false, e.message); }
  finally { busy.value = false; }
}

async function createTransmittal() {
  if (!transForm.value.client) { showToast(false, t('mdr.detail.clientRequired')); return; }
  try {
    const payload = { client: transForm.value.client };
    if (transForm.value.purpose) payload.purpose = transForm.value.purpose;
    if (transForm.value.remarks) payload.remarks = transForm.value.remarks;
    await apiCall('/transmittals', 'POST', payload);
    transModal.value = false;
    transForm.value = { client: '', purpose: '', remarks: '' };
    showToast(true, t('mdr.detail.transOk'));
    await load();
  } catch (e) { showToast(false, e.message); }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(load);
</script>
