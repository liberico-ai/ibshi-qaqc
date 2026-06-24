<!--
  PressureListView — Chứng chỉ thử áp lực (ILS-QAC-F14).
  Reskin Pha 2: PageHeader + UiCard + .qc-table + StatusTag (môi chất + PASS/FAIL) + .btn.
  Giữ nguyên API/hành vi.
-->
<template>
  <div>
    <PageHeader :title="t('forms.pressureTitle')" :subtitle="t('forms.pressureNote')">
      <template #actions>
        <button @click="printPage" class="btn btn-outline print:hidden">🖨️ {{ t('forms.print') }}</button>
        <button v-can="'forms.pressure.write'" @click="openCreate" class="btn btn-primary print:hidden">+ {{ t('forms.addPressure') }}</button>
      </template>
    </PageHeader>

    <UiCard body-class="overflow-x-auto">
      <table class="qc-table">
        <thead>
          <tr>
            <th>{{ t('forms.testNo') }}</th>
            <th>{{ t('forms.medium') }}</th>
            <th>{{ t('forms.pressureValue') }}</th>
            <th>{{ t('forms.holdTime') }}</th>
            <th>{{ t('forms.certificateNo') }}</th>
            <th>{{ t('forms.result') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="text-center text-slate-400 py-8">{{ t('forms.loading') }}</td></tr>
          <tr v-else-if="!rows.length"><td colspan="6" class="text-center text-slate-400 py-8">{{ t('forms.empty') }}</td></tr>
          <tr v-for="r in rows" :key="r.id">
            <td class="font-mono text-xs font-semibold">{{ r.test_no }}</td>
            <td><StatusTag :type="r.medium === 'pneumatic' ? 'amber' : 'blue'" :label="r.medium === 'pneumatic' ? t('forms.pneumatic') : t('forms.hydro')" /></td>
            <td>{{ r.pressure_value ?? '—' }}</td>
            <td>{{ r.hold_time ?? '—' }}</td>
            <td>{{ r.certificate_no ?? '—' }}</td>
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

    <!-- Modal tạo thử áp lực -->
    <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div class="absolute inset-0 bg-black/50" @click="modal=false"></div>
      <div class="card relative w-full max-w-md">
        <div class="card-header"><div class="card-title">{{ t('forms.addPressure') }} (ILS-QAC-F14)</div></div>
        <div class="card-body space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="fi-label">{{ t('forms.testNo') }} *</label><input v-model="form.test_no" class="fi"></div>
            <div><label class="fi-label">{{ t('forms.medium') }}</label>
              <select v-model="form.medium" class="fi"><option value="hydro">{{ t('forms.hydro') }}</option><option value="pneumatic">{{ t('forms.pneumatic') }}</option></select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="fi-label">{{ t('forms.pressureValue') }}</label><input type="number" step="0.001" v-model.number="form.pressure_value" class="fi"></div>
            <div><label class="fi-label">{{ t('forms.holdTime') }}</label><input v-model="form.hold_time" placeholder="30 min" class="fi"></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="fi-label">{{ t('forms.result') }}</label>
              <select v-model="form.result" class="fi"><option :value="null">—</option><option value="PASS">PASS</option><option value="FAIL">FAIL</option></select>
            </div>
            <div><label class="fi-label">{{ t('forms.certificateNo') }}</label><input v-model="form.certificate_no" class="fi"></div>
          </div>
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
    const res = await apiFetch(`/api/forms/pressure?page=${page}`);
    const json = await res.json();
    rows.value = json.data ?? [];
    pagination.value = json.pagination ?? { page: 1, totalPages: 1 };
  } finally { loading.value = false; }
}

function openCreate() { form.value = { test_no: '', medium: 'hydro', pressure_value: null, hold_time: '', result: null, certificate_no: '' }; modal.value = true; }

async function save() {
  if (!form.value.test_no) { showToast(false, t('forms.requiredFields')); return; }
  saving.value = true;
  try {
    const payload = {
      test_no: form.value.test_no,
      medium: form.value.medium,
      pressure_value: form.value.pressure_value ?? null,
      hold_time: form.value.hold_time || null,
      result: form.value.result || null,
      certificate_no: form.value.certificate_no || null,
    };
    const res = await apiFetch('/api/forms/pressure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'error');
    modal.value = false;
    showToast(true, t('forms.saved'));
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
