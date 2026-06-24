<!--
  ProjectDashboardView — Bảng điều khiển theo Dự án. Trang phụ Dashboard.
  Reskin Pha 2: PageHeader + UiCard + .qc-table + ProgressBar + StatusTag. Giữ nguyên API.
-->
<template>
  <div>
    <PageHeader :title="t('dashboard.projectTitle')" :subtitle="t('dashboard.projectSubtitle')" />

    <div v-if="loading" class="card card-body text-center text-slate-500 py-10">{{ t('dashboard.loading') }}</div>
    <div v-else-if="!rows.length" class="card card-body text-center text-slate-500 py-10">{{ t('dashboard.noProjects') }}</div>
    <UiCard v-else body-class="overflow-x-auto">
      <table class="qc-table">
        <thead>
          <tr>
            <th>{{ t('dashboard.project') }}</th>
            <th>{{ t('dashboard.passFail') }}</th>
            <th class="text-center">{{ t('dashboard.openNcr') }}</th>
            <th>{{ t('dashboard.mdrPct') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.project_id">
            <td>
              <div class="font-semibold text-slate-800 dark:text-slate-200">{{ r.code }}</div>
              <div class="text-xs text-slate-400">{{ r.name }}</div>
            </td>
            <td>
              <div class="flex items-center gap-2 min-w-[170px]">
                <div class="flex-1 flex rounded-[3px] overflow-hidden h-1.5 bg-slate-200 dark:bg-[#252540]">
                  <div class="bg-emerald-500 h-1.5" :style="{ width: r.passPct + '%' }"></div>
                  <div class="bg-red-500 h-1.5" :style="{ width: r.failPct + '%' }"></div>
                </div>
                <span class="text-xs text-slate-500 whitespace-nowrap">{{ r.passPct }}% / {{ r.failPct }}%</span>
              </div>
            </td>
            <td class="text-center">
              <StatusTag v-if="r.openNcr > 0" type="amber" :label="String(r.openNcr)" />
              <StatusTag v-else type="green" label="0" />
            </td>
            <td>
              <div class="min-w-[130px]">
                <ProgressBar :value="r.mdrCompletion ?? 0" :show-label="true" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </UiCard>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiFetch } from '@/utils/api.js';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import ProgressBar from '@/components/ProgressBar.vue';
import StatusTag from '@/components/StatusTag.vue';

const { t } = useI18n();
const rows = ref([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await apiFetch('/api/dashboard/projects');
    rows.value = (await res.json()).data ?? [];
  } finally {
    loading.value = false;
  }
});
</script>
