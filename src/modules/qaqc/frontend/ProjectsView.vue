<template>
  <div class="space-y-4">
    <PageHeader :title="$t('qaqcViews.projects_title')">
      <template #actions>
        <button v-can="'qaqc.projects.sync'" @click="sync" :disabled="syncing" class="btn btn-primary disabled:opacity-50">
          <svg class="w-4 h-4" :class="{ 'animate-spin': syncing }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          {{ syncing ? $t('qaqcViews.syncing') : $t('qaqcViews.sync_erp') }}
        </button>
      </template>
    </PageHeader>

    <UiCard body-class="p-0">
      <div class="overflow-x-auto">
        <table class="qc-table">
          <thead>
            <tr>
              <th>{{ $t('qaqcViews.col_code') }}</th>
              <th>{{ $t('qaqcViews.col_project_name') }}</th>
              <th>{{ $t('qaqcViews.col_customer') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th>{{ $t('qaqcViews.col_synced_at') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="5" class="text-center text-slate-500 py-8">{{ $t('qaqcViews.loading') }}</td></tr>
            <tr v-else-if="!projects.length"><td colspan="5" class="text-center text-slate-500 py-8">{{ $t('qaqcViews.projects_empty') }}</td></tr>
            <tr v-for="p in projects" :key="p.id">
              <td class="font-mono text-xs font-medium">{{ p.code }}</td>
              <td class="font-medium">{{ p.name }}</td>
              <td>{{ p.customer ?? '—' }}</td>
              <td>
                <StatusTag :type="p.status === 'ACTIVE' ? 'green' : 'gray'" :label="p.status" />
              </td>
              <td class="text-slate-500 text-xs">
                {{ p.synced_at ? new Date(p.synced_at).toLocaleString('vi-VN') : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
      {{ toast.message }}
    </div>
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

const projects = ref([]);
const loading = ref(false);
const syncing = ref(false);
const toast = ref({ show: false, ok: true, message: '' });

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch('/api/qaqc/projects');
    projects.value = (await res.json()).data ?? [];
  } finally {
    loading.value = false;
  }
}

async function sync() {
  syncing.value = true;
  try {
    const res = await apiFetch('/api/qaqc/projects/sync', { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    showToast(true, t('qaqcViews.synced_count', { count: json.synced }));
    await load();
  } catch (e) {
    showToast(false, e.message || t('qaqcViews.sync_failed'));
  } finally {
    syncing.value = false;
  }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(load);
</script>
