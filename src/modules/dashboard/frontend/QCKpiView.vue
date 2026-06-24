<!--
  QCKpiView — KPI Chất lượng (QC). Trang phụ Dashboard.
  Reskin Pha 2: PageHeader + StatCard + UiCard + DonutStat + ProgressBar. Giữ nguyên API.
-->
<template>
  <div>
    <PageHeader :title="t('dashboard.qcKpiTitle')" :subtitle="t('dashboard.qcKpiSubtitle')">
      <template #actions>
        <a :href="reportUrl('weekly')" target="_blank" class="btn btn-primary">📥 {{ t('dashboard.exportWeekly') }}</a>
      </template>
    </PageHeader>

    <div v-if="loading" class="card card-body text-center text-slate-500 py-10">{{ t('dashboard.loading') }}</div>
    <template v-else>
      <!-- 4 stat cards KPI -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon="✅" color="green" :label="t('dashboard.firstPassRate')" :value="(kpi.firstPassRate ?? 0) + '%'"
          :change="kpi.firstPass ? `${kpi.firstPass.pass}/${kpi.firstPass.total} ${t('dashboard.items')}` : ''" />
        <StatCard icon="⚠️" color="red" :label="t('dashboard.ncrOpen')" :value="kpi.ncr?.open ?? 0"
          :change="`${t('dashboard.totalLabel')}: ${kpi.ncr?.total ?? 0}`" trend="down" />
        <StatCard icon="⏱️" color="amber" :label="t('dashboard.ncrCloseout')" :value="kpi.ncr?.avgCloseoutDays ?? 'N/A'"
          :change="t('dashboard.days')" />
        <StatCard icon="🔄" color="blue" :label="t('dashboard.inspectionCycle')" :value="kpi.inspectionCycleDays ?? 'N/A'"
          :change="t('dashboard.days')" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Donut: tỷ lệ đạt lần đầu -->
        <UiCard :title="t('dashboard.firstPassRate')">
          <DonutStat :value="kpi.firstPassRate ?? 0" color="#10b981"
            :label="kpi.firstPass ? `${kpi.firstPass.pass}/${kpi.firstPass.total} ${t('dashboard.items')}` : ''" />
        </UiCard>

        <!-- MDR completion -->
        <UiCard class="lg:col-span-2" :title="t('dashboard.mdrCompletion')">
          <div class="mb-2">
            <ProgressBar :value="kpi.mdr?.avgCompletion ?? 0" :label="t('dashboard.mdrCompletion')" :show-label="true" />
          </div>
          <div class="text-xs text-slate-400 mt-2">{{ t('dashboard.dossiers') }}: {{ kpi.mdr?.total ?? 0 }}</div>

          <div class="mt-4 pt-4 border-t border-slate-200 dark:border-[#252540] grid grid-cols-3 gap-3">
            <div class="text-center">
              <div class="text-2xl font-bold text-emerald-600">{{ kpi.firstPassRate ?? 0 }}%</div>
              <div class="text-[11px] text-slate-500">{{ t('dashboard.firstPassRate') }}</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-red-500">{{ kpi.ncr?.open ?? 0 }}</div>
              <div class="text-[11px] text-slate-500">{{ t('dashboard.ncrOpen') }}</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-indigo-500">{{ kpi.mdr?.avgCompletion ?? 0 }}%</div>
              <div class="text-[11px] text-slate-500">{{ t('dashboard.mdrCompletion') }}</div>
            </div>
          </div>
        </UiCard>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiFetch } from '@/utils/api.js';
import PageHeader from '@/components/PageHeader.vue';
import StatCard from '@/components/StatCard.vue';
import UiCard from '@/components/UiCard.vue';
import DonutStat from '@/components/DonutStat.vue';
import ProgressBar from '@/components/ProgressBar.vue';

const { t } = useI18n();
const kpi = ref({});
const loading = ref(false);

function reportUrl(period) { return `/api/dashboard/report?period=${period}`; }

onMounted(async () => {
  loading.value = true;
  try {
    const res = await apiFetch('/api/dashboard/qc-kpi');
    kpi.value = (await res.json()).data ?? {};
  } finally {
    loading.value = false;
  }
});
</script>
