<template>
  <div>
    <PageHeader :title="$t('mdr.list.title')" :subtitle="$t('mdr.list.subtitle')">
      <template #actions>
        <button v-can="'mdr.write'" @click="modal = true" class="btn btn-primary">
          + {{ $t('mdr.list.create') }}
        </button>
      </template>
    </PageHeader>

    <UiCard class="mb-5" body-class="card-body flex flex-wrap gap-3">
      <select v-model="status" @change="load(1)"
        class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        <option value="">{{ $t('mdr.list.allStatus') }}</option>
        <option v-for="s in STATES" :key="s" :value="s">{{ $t('mdr.status.' + s) }}</option>
      </select>
      <button @click="load(1)" class="btn btn-primary">{{ $t('mdr.list.filter') }}</button>
    </UiCard>

    <UiCard body-class="p-0">
      <div class="overflow-x-auto">
        <table class="qc-table">
          <thead>
            <tr>
              <th>{{ $t('mdr.field.name') }}</th>
              <th>{{ $t('mdr.field.project') }}</th>
              <th>{{ $t('mdr.field.status') }}</th>
              <th class="w-56">{{ $t('mdr.field.completion') }}</th>
              <th class="text-right">{{ $t('mdr.field.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="5" class="text-center text-slate-400 py-8">{{ $t('mdr.loading') }}</td></tr>
            <tr v-else-if="!records.length"><td colspan="5" class="text-center text-slate-400 py-8">{{ $t('mdr.list.empty') }}</td></tr>
            <tr v-for="r in records" :key="r.id">
              <td class="font-semibold">{{ r.name }}</td>
              <td>{{ r.project_code ?? '—' }}</td>
              <td><StatusTag :status="r.status" :label="$t('mdr.status.' + r.status)" /></td>
              <td>
                <div class="flex items-center gap-2">
                  <div class="flex-1"><ProgressBar :value="Number(r.completion_pct) || 0" /></div>
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-300 w-10 text-right">{{ Number(r.completion_pct).toFixed(0) }}%</span>
                </div>
              </td>
              <td class="text-right">
                <router-link :to="`/mdr/${r.id}`" class="btn btn-outline btn-sm">
                  {{ $t('mdr.list.detail') }}
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
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ $t('mdr.create.title') }}</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('mdr.field.name') }} *</label>
          <input v-model="form.name" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <p class="text-xs text-slate-400">{{ $t('mdr.create.seedNote') }}</p>
        <div class="flex justify-end gap-2">
          <button @click="modal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">{{ $t('mdr.cancel') }}</button>
          <button @click="createDossier" :disabled="creating" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
            {{ creating ? $t('mdr.create.creating') : $t('mdr.list.create') }}
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
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import ProgressBar from '@/components/ProgressBar.vue';

const { t } = useI18n();
const router = useRouter();
const records = ref([]);
const loading = ref(false);
const status = ref('');
const pagination = ref({ page: 1, totalPages: 1 });
const modal = ref(false);
const creating = ref(false);
const form = ref({ name: '' });
const toast = ref({ show: false, ok: true, message: '' });

const STATES = ['draft', 'in_progress', 'ready', 'submitted'];
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

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(status.value && { status: status.value }) });
    const res = await apiFetch(`/api/mdr?${params}`);
    const json = await res.json();
    records.value = json.data ?? [];
    pagination.value = json.pagination;
  } finally {
    loading.value = false;
  }
}

async function createDossier() {
  if (!form.value.name) { showToast(false, t('mdr.create.nameRequired')); return; }
  creating.value = true;
  try {
    const res = await apiFetch('/api/mdr', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || (json.errors && json.errors[0]?.msg));
    modal.value = false;
    form.value = { name: '' };
    router.push(`/mdr/${json.data.id}`);
  } catch (e) {
    showToast(false, e.message || t('mdr.create.error'));
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
