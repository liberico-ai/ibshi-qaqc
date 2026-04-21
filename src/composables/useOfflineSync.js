import { ref, onMounted, onUnmounted } from 'vue';
import { offlineQueue } from '@/core/offline-queue.js';

export function useOfflineSync() {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const isSyncing = ref(false);
  const pendingCount = ref(0);
  const isExpired = ref(false);
  let intervalId = null;

  async function refreshCount() {
    if (typeof indexedDB === 'undefined') return;
    pendingCount.value = await offlineQueue.pendingCount();
    isExpired.value = await offlineQueue.hasExpired();
  }

  async function syncNow() {
    if (!isOnline.value || isSyncing.value) return;
    if (typeof indexedDB === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    isSyncing.value = true;
    try {
      const { synced } = await offlineQueue.flush(token);
      await refreshCount();
      return synced;
    } finally {
      isSyncing.value = false;
    }
  }

  async function clearExpiredAndLogout() {
    if (typeof indexedDB === 'undefined') return;
    await offlineQueue.clear();
    pendingCount.value = 0;
    isExpired.value = false;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  }

  async function handleOnline() {
    isOnline.value = true;
    await syncNow();
  }

  function handleOffline() {
    isOnline.value = false;
    refreshCount();
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    refreshCount();
    intervalId = setInterval(refreshCount, 5000);
  });

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (intervalId) clearInterval(intervalId);
  });

  return {
    isOnline,
    isSyncing,
    pendingCount,
    isExpired,
    syncNow,
    refreshCount,
    clearExpiredAndLogout,
  };
}
