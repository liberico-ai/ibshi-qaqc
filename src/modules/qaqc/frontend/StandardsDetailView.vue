<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <router-link to="/qaqc/standards" class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </router-link>
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">{{ standard?.code }} — {{ standard?.title }}</h2>
    </div>

    <div v-if="loading" class="card p-8 text-center text-slate-500">{{ $t('qaqcViews.loading') }}</div>
    <template v-else-if="standard">
      <!-- Info -->
      <div class="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div><span class="block text-xs text-slate-500 mb-1">{{ $t('qaqcViews.std_group') }}</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ standard.grp ?? '—' }}</span></div>
        <div><span class="block text-xs text-slate-500 mb-1">{{ $t('qaqcViews.std_version') }}</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ standard.version ?? '—' }}</span></div>
        <div><span class="block text-xs text-slate-500 mb-1">{{ $t('qaqcViews.std_issued') }}</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ standard.issued_date ?? '—' }}</span></div>
        <div><span class="block text-xs text-slate-500 mb-1">{{ $t('common.status') }}</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-medium"
            :class="standard.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'">
            {{ standard.status }}
          </span>
        </div>
      </div>

      <!-- Chemical Specs -->
      <div v-if="standard.specs?.chemical?.length" class="card p-0 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-semibold text-sm text-slate-700 dark:text-slate-300">{{ $t('qaqcViews.chemical') }}</div>
        <table class="w-full text-sm">
          <thead><tr class="bg-slate-50 dark:bg-[#1a1a2e]">
            <th class="px-4 py-2 text-left text-slate-600 dark:text-slate-400">{{ $t('qaqcViews.col_grade') }}</th>
            <th class="px-4 py-2 text-left text-slate-600 dark:text-slate-400">{{ $t('qaqcViews.col_element') }}</th>
            <th class="px-4 py-2 text-right text-slate-600 dark:text-slate-400">{{ $t('qaqcViews.col_min') }}</th>
            <th class="px-4 py-2 text-right text-slate-600 dark:text-slate-400">{{ $t('qaqcViews.col_max') }}</th>
            <th class="px-4 py-2 text-left text-slate-600 dark:text-slate-400">{{ $t('qaqcViews.col_unit') }}</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="r in standard.specs.chemical" :key="r.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
              <td class="px-4 py-2 text-slate-600 dark:text-slate-400">{{ r.grade ?? '—' }}</td>
              <td class="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{{ r.element }}</td>
              <td class="px-4 py-2 text-right text-slate-600 dark:text-slate-400">{{ r.min_val ?? '—' }}</td>
              <td class="px-4 py-2 text-right text-slate-600 dark:text-slate-400">{{ r.max_val ?? '—' }}</td>
              <td class="px-4 py-2 text-slate-500">{{ r.unit ?? '%' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mechanical Specs -->
      <div v-if="standard.specs?.mechanical?.length" class="card p-0 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-semibold text-sm text-slate-700 dark:text-slate-300">{{ $t('qaqcViews.mechanical') }}</div>
        <table class="w-full text-sm">
          <thead><tr class="bg-slate-50 dark:bg-[#1a1a2e]">
            <th class="px-4 py-2 text-left text-slate-600 dark:text-slate-400">{{ $t('qaqcViews.col_grade') }}</th>
            <th class="px-4 py-2 text-left text-slate-600 dark:text-slate-400">{{ $t('qaqcViews.col_property') }}</th>
            <th class="px-4 py-2 text-right text-slate-600 dark:text-slate-400">{{ $t('qaqcViews.col_min') }}</th>
            <th class="px-4 py-2 text-right text-slate-600 dark:text-slate-400">{{ $t('qaqcViews.col_max') }}</th>
            <th class="px-4 py-2 text-left text-slate-600 dark:text-slate-400">{{ $t('qaqcViews.col_unit') }}</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="r in standard.specs.mechanical" :key="r.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
              <td class="px-4 py-2 text-slate-600 dark:text-slate-400">{{ r.grade ?? '—' }}</td>
              <td class="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{{ r.property }}</td>
              <td class="px-4 py-2 text-right text-slate-600 dark:text-slate-400">{{ r.min_val ?? '—' }}</td>
              <td class="px-4 py-2 text-right text-slate-600 dark:text-slate-400">{{ r.max_val ?? '—' }}</td>
              <td class="px-4 py-2 text-slate-500">{{ r.unit ?? '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useRoute } from 'vue-router';

const route = useRoute();
const standard = ref(null);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/qaqc/standards/${route.params.id}`);
    standard.value = (await res.json()).data;
  } finally {
    loading.value = false;
  }
});
</script>
