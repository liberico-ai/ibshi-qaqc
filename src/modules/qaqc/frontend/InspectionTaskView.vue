<template>
  <div class="space-y-4">
    <PageHeader :title="$t('qaqcViews.my_tasks')" />

    <!-- Filters -->
    <UiCard body-class="card-body">
      <div class="flex flex-wrap gap-3">
        <select v-model="status" @change="load(1)"
          class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          <option value="PENDING">{{ $t('qaqcViews.pending_do') }}</option>
          <option value="IN_PROGRESS">{{ $t('qaqcViews.in_progress') }}</option>
          <option value="">{{ $t('common.all') }}</option>
        </select>
        <select v-model="projectId" @change="load(1)"
          class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          <option value="">{{ $t('qaqcViews.all_projects') }}</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
        </select>
        <button @click="load(1)" class="btn btn-primary">{{ $t('qaqcViews.filter') }}</button>
      </div>
    </UiCard>

    <div v-if="pendingHolds.length" class="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl text-sm text-amber-800 dark:text-amber-300">
      <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
      <span>{{ $t('qaqcViews.holds_warning', { count: pendingHolds.length, codes: pendingHolds.map(h => h.ip_code).join(', ') }) }}</span>
    </div>

    <UiCard body-class="p-0">
      <div class="overflow-x-auto">
        <table class="qc-table">
          <thead>
            <tr>
              <th>{{ $t('qaqcViews.col_ip_code') }}</th>
              <th>{{ $t('qaqcViews.col_unit_name') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th>{{ $t('common.created_at') }}</th>
              <th class="text-right">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="5" class="text-center text-slate-500 py-8">{{ $t('qaqcViews.loading') }}</td></tr>
            <tr v-else-if="!items.length"><td colspan="5" class="text-center text-slate-500 py-8">{{ $t('qaqcViews.tasks_empty') }}</td></tr>
            <tr v-for="item in items" :key="item.id">
              <td class="font-mono text-xs font-medium">{{ item.ip_code ?? '—' }}</td>
              <td>{{ item.unit_id ?? '—' }}</td>
              <td>
                <StatusTag :status="item.status" :label="item.status" />
              </td>
              <td class="text-slate-500 text-xs">{{ new Date(item.created_at).toLocaleDateString('vi-VN') }}</td>
              <td class="text-right">
                <router-link :to="`/qaqc/inspections/${item.id}/form`" class="btn btn-outline btn-sm">
                  {{ item.status === 'PENDING' ? $t('qaqcViews.start') : $t('qaqcViews.continue') }}
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useProjects } from './useProjects.js';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';

const { projects } = useProjects();
const items = ref([]);
const loading = ref(false);
const status = ref('PENDING');
const projectId = ref('');
const pagination = ref({ page: 1, totalPages: 1 });
const pendingHolds = ref([]);

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(status.value && { status: status.value }), ...(projectId.value && { projectId: projectId.value }) });
    const [inspRes, holdsRes] = await Promise.all([
      apiFetch(`/api/qaqc/inspections?${params}`),
      apiFetch(`/api/qaqc/itp/pending-holds${projectId.value ? `?projectId=${projectId.value}` : ''}`).catch(() => null),
    ]);
    const json = await inspRes.json();
    items.value = json.data ?? [];
    pagination.value = json.pagination;
    if (holdsRes?.ok) pendingHolds.value = (await holdsRes.json()).data ?? [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => load());
</script>
