<!--
  PortalProjectView — Cổng khách hàng (chỉ đọc).
  Reskin Pha 2: PageHeader + StatCard (Pass% / NCR mở / MDR%) + UiCard + ProgressBar + StatusTag.
  Tối giản, sạch cho khách hàng bên ngoài. Giữ nguyên API/hành vi.
-->
<template>
  <div>
    <PageHeader :title="t('portal.title')" :subtitle="t('portal.readOnlyNote')" />

    <div v-if="loading" class="card card-body text-center text-slate-500 py-10">{{ t('portal.loading') }}</div>
    <div v-else-if="!projects.length" class="card card-body text-center text-slate-500 py-10">{{ t('portal.noAccess') }}</div>

    <template v-else>
      <!-- Lưới chọn dự án -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <button v-for="p in projects" :key="p.project_id" @click="select(p)"
          class="card card-body text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          :class="selected?.project_id === p.project_id ? 'ring-2 ring-blue-500' : ''">
          <div class="font-semibold text-slate-800 dark:text-slate-100">{{ p.code ?? p.project_id.slice(0, 8) }}</div>
          <div class="text-sm text-slate-500">{{ p.name ?? '—' }}</div>
          <div class="text-xs text-slate-400 mt-1">{{ t('portal.client') }}: {{ p.client_name ?? '—' }}</div>
        </button>
      </div>

      <!-- Bảng tóm tắt dự án đã chọn -->
      <div v-if="selected">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">
            {{ summary?.project?.code ?? selected.code ?? '' }} — {{ summary?.project?.name ?? selected.name ?? '' }}
          </h3>
          <span v-if="summaryLoading" class="text-xs text-slate-400">{{ t('portal.loading') }}</span>
        </div>

        <!-- Stat cards tóm tắt -->
        <div v-if="summary" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard icon="✅" color="green" :label="t('portal.passRate')" :value="passRate + '%'" />
          <StatCard icon="⏳" color="amber" :label="t('portal.inspectionPending')" :value="summary.inspections.pending" />
          <StatCard icon="⚠️" color="red" :label="t('portal.openNcr')" :value="summary.openNcr" />
          <StatCard icon="📋" color="purple" :label="t('portal.mdrCompletion')" :value="(summary.mdrCompletion ?? 'N/A') + '%'" />
        </div>

        <!-- Tiến độ kiểm tra + bảng số liệu -->
        <UiCard v-if="summary" :title="t('portal.inspectionProgress')">
          <div class="flex rounded-full overflow-hidden h-3 bg-slate-200 dark:bg-[#252540] mb-3">
            <div class="bg-emerald-500 h-3" :style="{ width: pct(summary.inspections.completed) + '%' }"></div>
            <div class="bg-amber-400 h-3" :style="{ width: pct(summary.inspections.pending) + '%' }"></div>
            <div class="bg-red-500 h-3" :style="{ width: pct(summary.inspections.failed) + '%' }"></div>
          </div>

          <table class="qc-table">
            <thead>
              <tr><th>{{ t('portal.metric') }}</th><th class="text-right">{{ t('portal.count') }}</th><th>{{ t('portal.status') }}</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>{{ t('portal.inspectionCompleted') }}</td>
                <td class="text-right font-semibold">{{ summary.inspections.completed }}</td>
                <td><StatusTag type="green" :label="t('portal.completed')" /></td>
              </tr>
              <tr>
                <td>{{ t('portal.inspectionPending') }}</td>
                <td class="text-right font-semibold">{{ summary.inspections.pending }}</td>
                <td><StatusTag type="amber" :label="t('portal.pending')" /></td>
              </tr>
              <tr>
                <td>{{ t('portal.inspectionFailed') }}</td>
                <td class="text-right font-semibold">{{ summary.inspections.failed }}</td>
                <td><StatusTag type="red" :label="t('portal.failed')" /></td>
              </tr>
              <tr>
                <td class="font-semibold">{{ t('portal.total') }}</td>
                <td class="text-right font-bold">{{ summary.inspections.total }}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div class="mt-5">
            <ProgressBar :value="summary.mdrCompletion ?? 0" :label="t('portal.mdrCompletion')" :show-label="true" />
          </div>
        </UiCard>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiFetch } from '@/utils/api.js';
import PageHeader from '@/components/PageHeader.vue';
import StatCard from '@/components/StatCard.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import ProgressBar from '@/components/ProgressBar.vue';

const { t } = useI18n();
const projects = ref([]);
const loading = ref(false);
const selected = ref(null);
const summary = ref(null);
const summaryLoading = ref(false);

function pct(n) {
  const total = summary.value?.inspections?.total || 0;
  if (!total) return 0;
  return Math.round((Number(n) / total) * 100);
}

const passRate = computed(() => pct(summary.value?.inspections?.completed ?? 0));

async function select(p) {
  selected.value = p;
  summary.value = null;
  summaryLoading.value = true;
  try {
    const res = await apiFetch(`/api/portal/projects/${p.project_id}/summary`);
    if (res.ok) summary.value = (await res.json()).data;
  } finally {
    summaryLoading.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const res = await apiFetch('/api/portal/projects');
    projects.value = (await res.json()).data ?? [];
    if (projects.value.length) select(projects.value[0]);
  } finally {
    loading.value = false;
  }
});
</script>
