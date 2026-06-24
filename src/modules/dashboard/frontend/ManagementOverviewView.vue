<!--
  ManagementOverviewView — Tổng quan Quản lý. Trang phụ Dashboard.
  Reskin Pha 2: PageHeader + StatCard + UiCard + ProgressBar (tỷ lệ đạt theo dự án). Giữ nguyên API.
-->
<template>
  <div>
    <PageHeader :title="t('dashboard.mgmtTitle')" :subtitle="t('dashboard.mgmtSubtitle')">
      <template #actions>
        <a :href="'/api/dashboard/report?period=monthly'" target="_blank" class="btn btn-primary">📥 {{ t('dashboard.exportMonthly') }}</a>
      </template>
    </PageHeader>

    <div v-if="loading" class="card card-body text-center text-slate-500 py-10">{{ t('dashboard.loading') }}</div>
    <template v-else>
      <!-- 5 stat cards rollup -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon="📁" color="blue" :label="t('dashboard.totalProjects')" :value="data.totalProjects ?? 0" />
        <StatCard icon="⚠️" color="red" :label="t('dashboard.openNcr')" :value="data.totalOpenNcr ?? 0" trend="down" />
        <StatCard icon="✅" color="green" :label="t('dashboard.firstPassRate')" :value="(data.firstPassRate ?? 0) + '%'" />
        <StatCard icon="📋" color="purple" :label="t('dashboard.avgMdr')" :value="(data.avgMdrCompletion ?? 'N/A') + '%'" />
        <StatCard icon="⏱️" color="amber" :label="t('dashboard.ncrCloseout')" :value="data.ncrAvgCloseoutDays ?? 'N/A'"
          :change="t('dashboard.days')" />
      </div>

      <!-- Tỷ lệ đạt theo dự án -->
      <UiCard :title="t('dashboard.passByProject')">
        <div v-if="!chartProjects.length" class="text-sm text-slate-400 py-6 text-center">{{ t('dashboard.noProjects') }}</div>
        <div v-else class="flex flex-col gap-3.5">
          <div v-for="p in chartProjects" :key="p.project_id" class="flex items-center gap-3">
            <span class="w-28 text-xs font-medium text-slate-600 dark:text-slate-300 truncate">{{ p.code }}</span>
            <div class="flex-1"><ProgressBar :value="p.passPct" color="green" /></div>
            <span class="w-12 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">{{ p.passPct }}%</span>
          </div>
        </div>
      </UiCard>
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
import ProgressBar from '@/components/ProgressBar.vue';

const { t } = useI18n();
const data = ref({});
const loading = ref(false);

const chartProjects = computed(() => (data.value.projects || []).slice(0, 15));

onMounted(async () => {
  loading.value = true;
  try {
    const res = await apiFetch('/api/dashboard/management');
    data.value = (await res.json()).data ?? {};
  } finally {
    loading.value = false;
  }
});
</script>
