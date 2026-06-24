<!--
  PaintingListView — Kiểm tra sơn / DFT (ILS-QAC-F12).
  Reskin Pha 2: PageHeader + UiCard + .qc-table + StatusTag (PASS/FAIL theo ngưỡng DFT) + .btn.
  Giữ nguyên API/hành vi.
-->
<template>
  <div>
    <PageHeader :title="t('forms.paintingTitle')" :subtitle="t('forms.dftHint')">
      <template #actions>
        <button @click="printPage" class="btn btn-outline print:hidden">🖨️ {{ t('forms.print') }}</button>
        <button v-can="'forms.painting.write'" @click="openCreate" class="btn btn-primary print:hidden">+ {{ t('forms.addPainting') }}</button>
      </template>
    </PageHeader>

    <UiCard body-class="overflow-x-auto">
      <table class="qc-table">
        <thead>
          <tr>
            <th>{{ t('forms.area') }}</th>
            <th>{{ t('forms.dftReading') }}</th>
            <th>{{ t('forms.dftRange') }}</th>
            <th>{{ t('forms.surfacePrep') }}</th>
            <th>{{ t('forms.result') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="text-center text-slate-400 py-8">{{ t('forms.loading') }}</td></tr>
          <tr v-else-if="!rows.length"><td colspan="5" class="text-center text-slate-400 py-8">{{ t('forms.empty') }}</td></tr>
          <tr v-for="r in rows" :key="r.id">
            <td class="font-semibold">{{ r.area ?? '—' }}</td>
            <td>{{ r.dft_reading ?? '—' }}</td>
            <td class="text-slate-500 text-xs">{{ r.dft_min ?? '—' }} – {{ r.dft_max ?? '—' }}</td>
            <td>{{ r.surface_prep ?? '—' }}</td>
            <td>
              <StatusTag v-if="r.result" :type="r.result === 'PASS' ? 'green' : 'red'" :label="r.result" />
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </UiCard>

    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-1 mt-4 print:hidden">
      <button v-for="p in pagination.totalPages" :key="p" @click="load(p)"
        :class="p === pagination.page ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'">{{ p }}</button>
    </div>

    <!-- Modal tạo kiểm tra sơn -->
    <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div class="absolute inset-0 bg-black/50" @click="modal=false"></div>
      <div class="card relative w-full max-w-md">
        <div class="card-header"><div class="card-title">{{ t('forms.addPainting') }} (ILS-QAC-F12)</div></div>
        <div class="card-body space-y-3">
          <div><label class="fi-label">{{ t('forms.area') }}</label><input v-model="form.area" class="fi"></div>
          <div class="grid grid-cols-3 gap-2">
            <div><label class="fi-label">{{ t('forms.dftReading') }}</label><input type="number" step="0.01" v-model.number="form.dft_reading" class="fi"></div>
            <div><label class="fi-label">{{ t('forms.min') }}</label><input type="number" step="0.01" v-model.number="form.dft_min" class="fi"></div>
            <div><label class="fi-label">{{ t('forms.max') }}</label><input type="number" step="0.01" v-model.number="form.dft_max" class="fi"></div>
          </div>
          <div><label class="fi-label">{{ t('forms.surfacePrep') }}</label><input v-model="form.surface_prep" placeholder="Sa2.5 / St3" class="fi"></div>
          <p class="text-xs text-slate-400">{{ t('forms.dftHint') }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <button @click="modal=false" class="btn btn-outline">{{ t('forms.cancel') }}</button>
            <button @click="save" :disabled="saving" class="btn btn-primary disabled:opacity-50">{{ saving ? t('forms.saving') : t('forms.save') }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'" class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg print:hidden">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiFetch } from '@/utils/api.js';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';

const { t } = useI18n();
const rows = ref([]);
const loading = ref(false);
const saving = ref(false);
const pagination = ref({ page: 1, totalPages: 1 });
const modal = ref(false);
const form = ref({});
const toast = ref({ show: false, ok: true, message: '' });

function printPage() { if (typeof window !== 'undefined') window.print(); }

async function load(page = 1) {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/forms/painting?page=${page}`);
    const json = await res.json();
    rows.value = json.data ?? [];
    pagination.value = json.pagination ?? { page: 1, totalPages: 1 };
  } finally { loading.value = false; }
}

function openCreate() { form.value = { area: '', dft_reading: null, dft_min: null, dft_max: null, surface_prep: '' }; modal.value = true; }

async function save() {
  saving.value = true;
  try {
    const payload = {
      area: form.value.area || null,
      dft_reading: form.value.dft_reading ?? null,
      dft_min: form.value.dft_min ?? null,
      dft_max: form.value.dft_max ?? null,
      surface_prep: form.value.surface_prep || null,
    };
    const res = await apiFetch('/api/forms/painting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'error');
    modal.value = false;
    showToast(true, `${t('forms.saved')} — ${json.data.result ?? ''}`);
    load(1);
  } catch (e) { showToast(false, e.message || t('forms.saveError')); }
  finally { saving.value = false; }
}

function showToast(ok, message) { toast.value = { show: true, ok, message }; setTimeout(() => { toast.value.show = false; }, 3500); }
onMounted(() => load());
</script>

<style scoped>
.fi { width: 100%; padding: 0.5rem 0.75rem; font-size: 0.875rem; border: 1px solid rgb(229 231 235); border-radius: 0.5rem; background: white; color: rgb(31 41 55); outline: none; }
:global(.dark) .fi { border-color: #252540; background: #12122a; color: rgb(243 244 246); }
.fi-label { display: block; font-size: 0.75rem; font-weight: 600; color: rgb(100 116 139); margin-bottom: 0.25rem; }
</style>
