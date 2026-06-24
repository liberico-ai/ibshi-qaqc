<template>
  <div class="w-full h-full flex flex-col">
    <!-- Breadcrumb Area -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight transition-colors">{{ pageTitle }}</h2>
      <div class="flex items-center text-[13px] text-slate-500 dark:text-gray-500 gap-1.5">
        <router-link to="/" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{{ $t('system.home') }}</router-link>
        <svg class="w-3.5 h-3.5 text-slate-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        <span class="text-slate-500 dark:text-gray-400">{{ $t('system.system') }}</span>
        <svg class="w-3.5 h-3.5 text-slate-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        <span class="text-slate-500 dark:text-gray-400">{{ pageTitle }}</span>
      </div>
    </div>

    <!-- Active Route Content -->
    <div class="flex-1">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const { t } = useI18n();

const pageTitle = computed(() => {
  if (route.path.startsWith('/system/settings')) return t('system.settings');

  switch (route.name) {
    case 'SystemUsers': return t('system.users');
    case 'SystemRoles': return t('system.roles');
    case 'RolePermissions': return t('system.role_permissions');
    case 'SystemCronjobs': return t('system.cronjobs');
    case 'ProfileSettings': return 'Hồ Sơ Cá Nhân';
    case 'SystemAbout': return t('system.about');
    default: return t('system.settings');
  }
});
</script>
