<template>
  <div class="space-y-4">
    <PageHeader :title="$t('qaqcMore.mir_title')">
      <template #actions>
        <button v-can="'qaqc.mir.write'" @click="openCreate" class="btn btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          {{ $t('qaqcMore.create_mir') }}
        </button>
      </template>
    </PageHeader>

    <!-- Filters -->
    <UiCard body-class="card-body">
      <div class="flex flex-wrap gap-3">
        <select v-model="projectId" @change="load(1)"
          class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          <option value="">{{ $t('qaqcMore.all_projects') }}</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
        </select>
        <select v-model="stage" @change="load(1)"
          class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          <option value="">{{ $t('qaqcMore.all_stages') }}</option>
          <option value="EXPECTED">EXPECTED</option>
          <option value="DOC_RECEIVED">DOC_RECEIVED</option>
          <option value="PHYSICAL_INSPECTED">PHYSICAL_INSPECTED</option>
          <option value="MTC_VERIFIED">MTC_VERIFIED</option>
          <option value="DECIDED">DECIDED</option>
          <option value="INSTOCK">INSTOCK</option>
        </select>
        <input v-model="supplierId" @keyup.enter="load(1)" :placeholder="$t('qaqcMore.supplier_id_placeholder')"
          class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        <button @click="load(1)" class="btn btn-primary">{{ $t('qaqcMore.filter') }}</button>
      </div>
    </UiCard>

    <UiCard body-class="p-0">
      <div class="overflow-x-auto">
        <table class="qc-table">
          <thead>
            <tr>
              <th>{{ $t('mir.po_ref') }}</th>
              <th>{{ $t('mir.supplier') }}</th>
              <th>{{ $t('qaqcMore.col_stage') }}</th>
              <th>{{ $t('qaqcMore.col_created_date') }}</th>
              <th class="text-right">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="5" class="text-center text-slate-500 py-8">{{ $t('common.loading') }}</td></tr>
            <tr v-else-if="!records.length"><td colspan="5" class="text-center text-slate-500 py-8">{{ $t('qaqcMore.mir_empty') }}</td></tr>
            <tr v-for="r in records" :key="r.id">
              <td class="font-medium">{{ r.po_ref ?? '—' }}</td>
              <td>{{ r.supplier_id ?? '—' }}</td>
              <td>
                <StatusTag :type="stageTagType(r.stage)" :label="r.stage" />
              </td>
              <td class="text-slate-500 text-xs">{{ new Date(r.created_at).toLocaleDateString('vi-VN') }}</td>
              <td class="text-right">
                <router-link :to="`/qaqc/mir/${r.id}`" class="btn btn-outline btn-sm">
                  {{ $t('common.details') }}
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-1">
      <button v-for="p in pagination.totalPages" :key="p" @click="load(p)"
        :class="p === pagination.page ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
        class="px-3 py-1.5 rounded text-sm font-medium transition-colors">{{ p }}</button>
    </div>

    <!-- Create Modal -->
    <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="modal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ $t('qaqcMore.create_mir_modal') }}</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('qaqcMore.project_required_label') }}</label>
          <select v-model="createForm.project_id" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
            <option value="">{{ $t('qaqcMore.select_project') }}</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('mir.po_ref') }}</label>
          <input v-model="createForm.po_ref" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('qaqcMore.supplier_id_placeholder') }}</label>
          <input v-model="createForm.supplier_id" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div class="flex justify-end gap-2">
          <button @click="modal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">{{ $t('common.cancel') }}</button>
          <button @click="createMIR" :disabled="creating" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
            {{ creating ? $t('qaqcMore.creating_mir') : $t('qaqcMore.create_mir') }}
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
import { useRouter } from 'vue-router';
import { useProjects } from './useProjects.js';
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';

const { t } = useI18n();
const router = useRouter();
const { projects } = useProjects();
const records = ref([]);
const loading = ref(false);
const projectId = ref('');
const stage = ref('');
const supplierId = ref('');
const pagination = ref({ page: 1, totalPages: 1 });
const modal = ref(false);
const creating = ref(false);
const createForm = ref({ project_id: '', po_ref: '', supplier_id: '' });
const toast = ref({ show: false, ok: true, message: '' });

const STAGE_TAG_TYPES = {
  EXPECTED: 'gray',
  DOC_RECEIVED: 'blue',
  PHYSICAL_INSPECTED: 'blue',
  MTC_VERIFIED: 'purple',
  DECIDED: 'green',
  INSTOCK: 'green',
};
function stageTagType(s) { return STAGE_TAG_TYPES[s] ?? 'gray'; }

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(projectId.value && { projectId: projectId.value }), ...(stage.value && { stage: stage.value }), ...(supplierId.value && { supplierId: supplierId.value }) });
    const res = await apiFetch(`/api/qaqc/mir?${params}`);
    const json = await res.json();
    records.value = json.data ?? [];
    pagination.value = json.pagination;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  createForm.value = { project_id: '', po_ref: '', supplier_id: '' };
  modal.value = true;
}

async function createMIR() {
  if (!createForm.value.project_id) { showToast(false, t('qaqcMore.project_id_required')); return; }
  creating.value = true;
  try {
    const res = await apiFetch('/api/qaqc/mir', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm.value),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    modal.value = false;
    router.push(`/qaqc/mir/${json.data.id}`);
  } catch (e) {
    showToast(false, e.message || t('qaqcMore.create_mir_failed'));
  } finally {
    creating.value = false;
  }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(() => load());
</script>
