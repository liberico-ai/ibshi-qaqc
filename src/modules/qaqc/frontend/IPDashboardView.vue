<template>
  <div class="space-y-4">
    <PageHeader :title="$t('qaqcViews.dashboard_title')">
      <template #actions>
        <span v-if="pendingHoldsCount > 0"
          class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-500/30">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0-6v2m-6 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
          {{ pendingHoldsCount }} {{ $t('qaqcViews.hold_point') }} {{ $t('qaqcViews.pending') }}
        </span>
      </template>
    </PageHeader>

    <!-- Summary counters -->
    <div v-if="rows.length" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon="✅" color="green" :label="$t('qaqcViews.col_completed')" :value="totals.completed" />
      <StatCard icon="⏳" color="amber" :label="$t('qaqcViews.col_pending')" :value="totals.pending" />
      <StatCard icon="⚠️" color="red" :label="$t('qaqcViews.col_failed')" :value="totals.failed" />
      <StatCard icon="📋" color="blue" :label="$t('qaqcViews.col_total')" :value="totals.total" />
    </div>

    <div v-if="loading" class="card p-8 text-center text-slate-500">{{ $t('qaqcViews.loading') }}</div>
    <div v-else-if="!rows.length" class="card p-8 text-center text-slate-500">{{ $t('qaqcViews.dashboard_empty') }}</div>
    <UiCard v-else body-class="p-0">
      <div class="overflow-x-auto">
        <table class="qc-table">
          <thead>
            <tr>
              <th>{{ $t('qaqcViews.projects_title') }}</th>
              <th>{{ $t('qaqcViews.col_ip_code') }}</th>
              <th class="text-center">{{ $t('qaqcViews.col_completed') }}</th>
              <th class="text-center">{{ $t('qaqcViews.col_pending') }}</th>
              <th class="text-center">{{ $t('qaqcViews.col_failed') }}</th>
              <th class="text-center">{{ $t('qaqcViews.col_total') }}</th>
              <th>{{ $t('qaqcViews.col_rate') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="`${r.project_code}-${r.ip_code}`">
              <td class="font-medium">{{ r.project_name }}</td>
              <td class="font-mono text-xs">{{ r.ip_code ?? '—' }}</td>
              <td class="text-center text-green-700 dark:text-green-400 font-medium">{{ r.completed }}</td>
              <td class="text-center text-amber-700 dark:text-amber-400 font-medium">{{ r.pending }}</td>
              <td class="text-center text-red-700 dark:text-red-400 font-medium">{{ r.failed }}</td>
              <td class="text-center text-slate-600 dark:text-slate-400">{{ r.total }}</td>
              <td>
                <div class="flex items-center gap-2">
                  <ProgressBar class="flex-1" :value="completionPct(r)" color="green" />
                  <span class="text-xs text-slate-500 w-10 text-right">{{ completionPct(r) }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatCard from '@/components/StatCard.vue';
import ProgressBar from '@/components/ProgressBar.vue';

const rows = ref([]);
const loading = ref(false);
const pendingHoldsCount = ref(0);

const totals = computed(() => rows.value.reduce((acc, r) => ({
  completed: acc.completed + (Number(r.completed) || 0),
  pending: acc.pending + (Number(r.pending) || 0),
  failed: acc.failed + (Number(r.failed) || 0),
  total: acc.total + (Number(r.total) || 0),
}), { completed: 0, pending: 0, failed: 0, total: 0 }));

function completionPct(r) {
  if (!r.total) return 0;
  return Math.round((Number(r.completed) / Number(r.total)) * 100);
}

onMounted(async () => {
  loading.value = true;
  try {
    const [dashRes, holdsRes] = await Promise.all([
      apiFetch('/api/qaqc/inspections/dashboard'),
      apiFetch('/api/qaqc/itp/pending-holds').catch(() => null),
    ]);
    rows.value = (await dashRes.json()).data ?? [];
    if (holdsRes?.ok) pendingHoldsCount.value = ((await holdsRes.json()).data ?? []).length;
  } finally {
    loading.value = false;
  }
});
</script>
