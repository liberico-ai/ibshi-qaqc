<!--
  ProgressBar — thanh tiến độ (theo mockup .progress-bar / .progress-fill)
  Props:
    - value {Number}  phần trăm 0–100
    - color {String}  green | blue | amber | red. Nếu 'auto' → tự chọn theo value
    - showLabel {Boolean}  hiện nhãn % bên phải dòng trên
    - label {String}  nhãn bên trái (tuỳ chọn, hiện cùng showLabel)
-->
<template>
  <div class="w-full">
    <div v-if="label || showLabel" class="flex justify-between text-[12px] mb-1">
      <span class="text-slate-600 dark:text-slate-300">{{ label }}</span>
      <span v-if="showLabel" class="font-semibold text-slate-700 dark:text-slate-200">{{ Math.round(clamped) }}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" :class="resolvedColor" :style="{ width: clamped + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value:     { type: [Number, String], default: 0 },
  color:     { type: String, default: 'auto' },
  showLabel: { type: Boolean, default: false },
  label:     { type: String, default: '' },
});

const clamped = computed(() => Math.max(0, Math.min(100, Number(props.value) || 0)));

const resolvedColor = computed(() => {
  if (props.color !== 'auto') return props.color;
  const v = clamped.value;
  if (v >= 100) return 'green';
  if (v >= 80) return 'blue';
  if (v >= 50) return 'amber';
  return 'red';
});
</script>
