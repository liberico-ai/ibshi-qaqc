<template>
  <!-- Expired warning (> 2h offline) — highest priority -->
  <div v-if="isExpired"
    class="flex items-center justify-between px-4 py-2 bg-red-600 text-white text-sm">
    <div class="flex items-center gap-2">
      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span>{{ $t('offline.expired') }}</span>
    </div>
    <button @click="clearExpiredAndLogout"
      class="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors">
      {{ $t('offline.login_again') }}
    </button>
  </div>

  <!-- Offline with pending items -->
  <div v-else-if="!isOnline || pendingCount > 0"
    :class="!isOnline ? 'bg-amber-500' : 'bg-blue-600'"
    class="flex items-center justify-between px-4 py-2 text-white text-sm">
    <div class="flex items-center gap-2">
      <!-- Status dot -->
      <span :class="!isOnline ? 'bg-red-200' : isSyncing ? 'bg-yellow-200 animate-pulse' : 'bg-green-200'"
        class="w-2 h-2 rounded-full flex-shrink-0"/>

      <span v-if="!isOnline && pendingCount > 0">
        {{ $t('offline.offline_pending', { count: pendingCount }) }}
      </span>
      <span v-else-if="!isOnline">
        {{ $t('offline.offline_no_pending') }}
      </span>
      <span v-else-if="isSyncing">
        {{ $t('offline.syncing', { count: pendingCount }) }}
      </span>
      <span v-else>
        {{ $t('offline.pending', { count: pendingCount }) }}
      </span>
    </div>

    <button v-if="isOnline && pendingCount > 0 && !isSyncing"
      @click="syncNow"
      class="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors">
      {{ $t('offline.sync_now') }}
    </button>
  </div>

  <!-- Synced toast (shown briefly after sync) -->
  <Transition name="fade">
    <div v-if="showSyncedToast"
      class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      <span>{{ $t('offline.synced') }}</span>
    </div>
  </Transition>
</template>

<script setup>
import { watch, ref } from 'vue';
import { useOfflineSync } from '@/composables/useOfflineSync.js';

const { isOnline, isSyncing, pendingCount, isExpired, syncNow, clearExpiredAndLogout } = useOfflineSync();

const showSyncedToast = ref(false);
let prevPending = pendingCount.value;

watch([isSyncing], ([syncing]) => {
  if (!syncing && prevPending > 0 && pendingCount.value === 0) {
    showSyncedToast.value = true;
    setTimeout(() => { showSyncedToast.value = false; }, 3000);
  }
  prevPending = pendingCount.value;
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
