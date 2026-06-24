<!--
  RfiListView — RFI (Yêu cầu kiểm tra) 2 chiều nội bộ/bên ngoài (ILS-QAC-F06).
  Reskin Pha 2: PageHeader + UiCard + .qc-table + StatusTag + .btn. Giữ nguyên API/hành vi.
-->
<template>
  <div>
    <PageHeader :title="t('forms.rfiTitle')" :subtitle="t('forms.readOnlyNoteHint')">
      <template #actions>
        <button @click="printPage" class="btn btn-outline print:hidden">🖨️ {{ t('forms.print') }}</button>
        <button v-can="'forms.rfi.write'" @click="openCreate" class="btn btn-primary print:hidden">+ {{ t('forms.addRfi') }}</button>
      </template>
    </PageHeader>

    <!-- Bộ lọc -->
    <UiCard class="mb-4 print:hidden" body-class="card-body flex flex-wrap gap-3">
      <select v-model="type" @change="load(1)" class="fi-sel">
        <option value="">{{ t('forms.allTypes') }}</option>
        <option value="internal">{{ t('forms.internal') }}</option>
        <option value="external">{{ t('forms.external') }}</option>
      </select>
      <select v-model="status" @change="load(1)" class="fi-sel">
        <option value="">{{ t('forms.allStatus') }}</option>
        <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
      </select>
    </UiCard>

    <!-- Danh sách RFI -->
    <UiCard body-class="overflow-x-auto">
      <table class="qc-table">
        <thead>
          <tr>
            <th>{{ t('forms.rfiNo') }}</th>
            <th>{{ t('forms.type') }}</th>
            <th>{{ t('forms.inspectionPoint') }}</th>
            <th>{{ t('forms.status') }}</th>
            <th>{{ t('forms.scheduledAt') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="text-center text-slate-400 py-8">{{ t('forms.loading') }}</td></tr>
          <tr v-else-if="!rows.length"><td colspan="5" class="text-center text-slate-400 py-8">{{ t('forms.empty') }}</td></tr>
          <tr v-for="r in rows" :key="r.id">
            <td class="font-mono text-xs font-semibold">{{ r.rfi_no }}</td>
            <td><StatusTag :type="r.type === 'external' ? 'purple' : 'blue'" :label="r.type === 'external' ? t('forms.external') : t('forms.internal')" /></td>
            <td>{{ r.inspection_point ?? '—' }}</td>
            <td><StatusTag :status="r.status" :label="r.status" /></td>
            <td class="text-slate-500 text-xs">{{ r.scheduled_at ? new Date(r.scheduled_at).toLocaleString('vi-VN') : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </UiCard>

    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-1 mt-4 print:hidden">
      <button v-for="p in pagination.totalPages" :key="p" @click="load(p)"
        :class="p === pagination.page ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'">{{ p }}</button>
    </div>

    <!-- Modal tạo RFI -->
    <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div class="absolute inset-0 bg-black/50" @click="modal=false"></div>
      <div class="card relative w-full max-w-md">
        <div class="card-header"><div class="card-title">{{ t('forms.addRfi') }} (ILS-QAC-F06)</div></div>
        <div class="card-body space-y-3">
          <div><label class="fi-label">{{ t('forms.rfiNo') }} *</label><input v-model="form.rfi_no" class="fi"></div>
          <div><label class="fi-label">{{ t('forms.type') }}</label>
            <select v-model="form.type" class="fi"><option value="internal">{{ t('forms.internal') }}</option><option value="external">{{ t('forms.external') }}</option></select>
          </div>
          <div><label class="fi-label">{{ t('forms.inspectionPoint') }}</label><input v-model="form.inspection_point" class="fi"></div>
          <div><label class="fi-label">{{ t('forms.scheduledAt') }}</label><input type="datetime-local" v-model="form.scheduled_at" class="fi"></div>
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
const STATUSES = ['OPEN', 'SCHEDULED', 'DONE', 'CLOSED', 'REJECTED'];
const rows = ref([]);
const loading = ref(false);
const saving = ref(false);
const type = ref('');
const status = ref('');
const pagination = ref({ page: 1, totalPages: 1 });
const modal = ref(false);
const form = ref({});
const toast = ref({ show: false, ok: true, message: '' });

function printPage() { if (typeof window !== 'undefined') window.print(); }

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(type.value && { type: type.value }), ...(status.value && { status: status.value }) });
    const res = await apiFetch(`/api/forms/rfi?${params}`);
    const json = await res.json();
    rows.value = json.data ?? [];
    pagination.value = json.pagination ?? { page: 1, totalPages: 1 };
  } finally { loading.value = false; }
}

function openCreate() { form.value = { rfi_no: '', type: 'internal', inspection_point: '', scheduled_at: '' }; modal.value = true; }

async function save() {
  if (!form.value.rfi_no) { showToast(false, t('forms.requiredFields')); return; }
  saving.value = true;
  try {
    const payload = {
      rfi_no: form.value.rfi_no,
      type: form.value.type,
      inspection_point: form.value.inspection_point || null,
      scheduled_at: form.value.scheduled_at ? new Date(form.value.scheduled_at).toISOString() : null,
    };
    const res = await apiFetch('/api/forms/rfi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
.fi-sel { padding: 0.5rem 0.75rem; font-size: 0.875rem; border: 1px solid rgb(229 231 235); border-radius: 0.5rem; background: white; color: rgb(31 41 55); outline: none; }
:global(.dark) .fi-sel { border-color: #252540; background: #12122a; color: rgb(243 244 246); }
.fi-label { display: block; font-size: 0.75rem; font-weight: 600; color: rgb(100 116 139); margin-bottom: 0.25rem; }
</style>
