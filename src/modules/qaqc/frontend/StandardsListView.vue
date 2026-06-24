<template>
  <div class="space-y-4">
    <PageHeader :title="$t('standards.title')">
      <template #actions>
        <button v-can="'qaqc.standards.write'" @click="router.push('/qaqc/standards/import')" class="btn btn-outline">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          {{ $t('standards.import_pdf') }}
        </button>
        <button v-can="'qaqc.standards.write'" @click="openCreate" class="btn btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          {{ $t('standards.add_standard') }}
        </button>
      </template>
    </PageHeader>

    <!-- Filters -->
    <UiCard body-class="card-body">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="sm:col-span-2">
          <input v-model="q" @keyup.enter="load(1)" :placeholder="$t('qaqcMore.search_placeholder')"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
        </div>
        <div>
          <input v-model="grp" @keyup.enter="load(1)" :placeholder="$t('qaqcMore.group_placeholder')"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
        </div>
        <div>
          <select v-model="status" @change="load(1)"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
            <option value="ACTIVE">{{ $t('qaqcMore.status_active') }}</option>
            <option value="DEPRECATED">{{ $t('qaqcMore.status_deprecated') }}</option>
            <option value="">{{ $t('common.all') }}</option>
          </select>
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <button @click="load(1)" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">{{ $t('common.search') }}</button>
        <button @click="q='';grp='';status='ACTIVE';load(1)" class="btn btn-outline">{{ $t('common.reset') }}</button>
      </div>
    </UiCard>

    <UiCard body-class="p-0">
      <div class="overflow-x-auto">
        <table class="qc-table">
          <thead>
            <tr>
              <th>{{ $t('standards.code') }}</th>
              <th>{{ $t('qaqcMore.col_title') }}</th>
              <th>{{ $t('standards.group') }}</th>
              <th>{{ $t('standards.version') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th class="text-right">{{ $t('common.details') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="6" class="text-center text-slate-500 py-8">{{ $t('common.loading') }}</td></tr>
            <tr v-else-if="!standards.length"><td colspan="6" class="text-center text-slate-500 py-8">{{ $t('qaqcMore.standards_empty') }}</td></tr>
            <tr v-for="s in standards" :key="s.id">
              <td class="font-mono text-xs font-medium">{{ s.code }}</td>
              <td class="max-w-xs truncate">{{ s.title }}</td>
              <td class="text-slate-500">{{ s.grp ?? '—' }}</td>
              <td class="text-slate-500">{{ s.version ?? '—' }}</td>
              <td>
                <StatusTag :status="s.status" :label="s.status" />
              </td>
              <td class="text-right">
                <router-link :to="`/qaqc/standards/${s.id}`" class="btn btn-outline btn-sm">
                  {{ $t('qaqcMore.view') }}
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
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ $t('qaqcMore.add_standard_modal') }}</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('qaqcMore.std_code_label') }}</label>
          <input v-model="createForm.code" :placeholder="$t('qaqcMore.std_code_placeholder')" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('qaqcMore.std_title_label') }}</label>
          <input v-model="createForm.title" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('standards.group') }}</label>
            <input v-model="createForm.grp" :placeholder="$t('qaqcMore.std_group_placeholder')" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('standards.version') }}</label>
            <input v-model="createForm.version" :placeholder="$t('qaqcMore.std_version_placeholder')" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="modal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">{{ $t('common.cancel') }}</button>
          <button @click="createStandard" :disabled="creating" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
            {{ creating ? $t('qaqcMore.creating') : $t('common.create') }}
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

const { t } = useI18n();
const router = useRouter();
const standards = ref([]);
const loading = ref(false);
const q = ref('');
const grp = ref('');
const status = ref('ACTIVE');
const pagination = ref({ page: 1, totalPages: 1 });
const modal = ref(false);
const creating = ref(false);
const createForm = ref({ code: '', title: '', grp: '', version: '' });
const toast = ref({ show: false, ok: true, message: '' });

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(q.value && { q: q.value }), ...(grp.value && { grp: grp.value }), ...(status.value && { status: status.value }) });
    const res = await apiFetch(`/api/qaqc/standards?${params}`);
    const json = await res.json();
    standards.value = json.data ?? [];
    pagination.value = json.pagination;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  createForm.value = { code: '', title: '', grp: '', version: '' };
  modal.value = true;
}

async function createStandard() {
  if (!createForm.value.code || !createForm.value.title) {
    showToast(false, t('qaqcMore.code_title_required'));
    return;
  }
  creating.value = true;
  try {
    const res = await apiFetch('/api/qaqc/standards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm.value),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    modal.value = false;
    router.push(`/qaqc/standards/${json.data.id}`);
  } catch (e) {
    showToast(false, e.message || t('qaqcMore.create_standard_failed'));
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
