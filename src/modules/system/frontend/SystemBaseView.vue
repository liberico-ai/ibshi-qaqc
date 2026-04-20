<template>
  <div class="w-full h-full flex flex-col">
    <!-- Breadcrumb Area -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight transition-colors">{{ pageTitle }}</h2>
      <div class="flex items-center text-[13px] text-slate-500 dark:text-gray-500 gap-1.5">
        <router-link to="/" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Trang Chủ</router-link>
        <svg class="w-3.5 h-3.5 text-slate-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        <span class="text-slate-500 dark:text-gray-400">Hệ Thống</span>
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

const route = useRoute();

const pageTitle = computed(() => {
  if (route.path.startsWith('/system/settings')) return 'Cài Đặt Hệ Thống';
  
  switch (route.name) {
    case 'SystemUsers': return 'Quản Lý Người Dùng';
    case 'SystemRoles': return 'Nhóm Quyền & Vai Trò';
    case 'RolePermissions': return 'Chi tiết Phân Quyền';
    case 'SystemCronjobs': return 'Quản Lý Cronjobs';
    case 'ProfileSettings': return 'Hồ Sơ Cá Nhân';
    case 'SystemAbout': return 'Về Hệ Thống';
    default: return 'Cài Đặt Hệ Thống';
  }
});
</script>
