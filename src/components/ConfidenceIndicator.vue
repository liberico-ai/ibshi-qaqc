<template>
  <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full" :class="colorClass">
    <span class="w-1.5 h-1.5 rounded-full inline-block" :class="dotClass"></span>
    {{ $t('confidence.label', { pct }) }}
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  confidence: {
    type: Number,
    required: true,
  },
});

const pct = computed(() => Math.round(props.confidence * 100));

const colorClass = computed(() => {
  if (props.confidence >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
  if (props.confidence >= 0.6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
});

const dotClass = computed(() => {
  if (props.confidence >= 0.8) return 'bg-green-500';
  if (props.confidence >= 0.6) return 'bg-amber-500';
  return 'bg-red-500';
});
</script>
