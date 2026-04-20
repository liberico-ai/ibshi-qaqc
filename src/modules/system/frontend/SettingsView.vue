<template>
  <div class="system-settings-layout w-full h-full flex flex-col md:flex-row gap-6 items-start">
    <!-- Tabs Sidebar -->
    <div class="w-full md:w-64 flex-shrink-0 flex flex-col gap-1 pr-0 md:pr-4 border-b md:border-b-0 md:border-r border-gray-200 dark:border-[#252540] overflow-y-auto">
      <router-link 
        v-for="tab in settingTabs" 
        :key="tab.name"
        :to="tab.path"
        class="px-4 py-3 text-sm font-semibold rounded-lg transition-colors flex items-center justify-between"
        :class="($route.name === tab.name || $route.path.startsWith(tab.path))
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
          : 'bg-transparent text-slate-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-[#252540] dark:hover:text-gray-200'"
      >
        <span>{{ tab.meta.tabLabel }}</span>
      </router-link>
    </div>

    <!-- Active Tab Content -->
    <div class="flex-1 min-w-0 w-full overflow-hidden">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// Get routes dynamically from router to render tabs automatically
const router = useRouter();

const settingTabs = computed(() => {
  return router.getRoutes()
    .filter(r => r.path.startsWith('/system/settings/') && r.meta && r.meta.tabLabel)
    .sort((a,b) => (a.meta.tabOrder || 99) - (b.meta.tabOrder || 99));
});
</script>
