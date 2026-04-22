<template>
  <span v-if="signature && !signature.isVoided"
    class="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 cursor-default"
    @mouseenter="show = true" @mouseleave="show = false">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
    </svg>
    Ký số bởi {{ signature.signedBy }} lúc {{ formatTime(signature.signedAt) }}

    <div v-if="show"
      class="absolute bottom-full left-0 mb-2 w-72 p-3 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#252540] rounded-xl shadow-xl text-left z-20 space-y-1.5">
      <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Chi tiết chữ ký</p>
      <p class="text-xs text-slate-500"><span class="font-medium text-slate-600 dark:text-slate-400">Ký bởi:</span> {{ signature.signedBy }}</p>
      <p class="text-xs text-slate-500"><span class="font-medium text-slate-600 dark:text-slate-400">Thời gian:</span> {{ formatFull(signature.signedAt) }}</p>
      <p class="text-xs text-slate-500"><span class="font-medium text-slate-600 dark:text-slate-400">Phương thức:</span> {{ signature.method }}</p>
      <p v-if="signature.ip" class="text-xs text-slate-500"><span class="font-medium text-slate-600 dark:text-slate-400">IP:</span> {{ signature.ip }}</p>
      <p class="text-xs font-mono text-slate-400 break-all"><span class="font-medium not-italic text-slate-500 dark:text-slate-400">Hash:</span> {{ signature.docHash?.slice(0, 16) }}…</p>
    </div>
  </span>

  <span v-else-if="signature?.isVoided"
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
    </svg>
    Chữ ký đã thu hồi
  </span>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  signature: { type: Object, default: null },
});

const show = ref(false);

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function formatFull(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'medium' });
}
</script>
