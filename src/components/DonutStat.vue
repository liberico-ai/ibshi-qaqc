<!--
  DonutStat — biểu đồ donut bằng CSS conic-gradient (theo mockup .donut-chart)
  Props:
    - value {Number}  phần trăm 0–100 (phần được tô màu)
    - color {String}  mã màu vòng (mặc định primary-light #3b82f6)
    - track {String}  màu nền vòng còn lại (mặc định #e2e8f0)
    - label {String}  nhãn nhỏ phía dưới donut
    - centerText {String} chữ ở tâm; mặc định hiển thị '<value>%'
    - thickness {Number} độ dày vòng tính bằng px (mặc định 18)
-->
<template>
  <div class="flex flex-col items-center">
    <div class="donut-chart" :style="donutStyle">
      <div class="absolute rounded-full bg-white dark:bg-[#1a1a2e]" :style="holeStyle"></div>
      <div class="donut-center">{{ centerText || (Math.round(clamped) + '%') }}</div>
    </div>
    <div v-if="label" class="text-center text-[12px] text-slate-500 dark:text-slate-400 mt-2">{{ label }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value:      { type: [Number, String], default: 0 },
  color:      { type: String, default: '#3b82f6' },
  track:      { type: String, default: '#e2e8f0' },
  label:      { type: String, default: '' },
  centerText: { type: String, default: '' },
  thickness:  { type: Number, default: 18 },
});

const clamped = computed(() => Math.max(0, Math.min(100, Number(props.value) || 0)));

const donutStyle = computed(() => ({
  background: `conic-gradient(${props.color} ${clamped.value * 3.6}deg, ${props.track} 0deg)`,
}));

const holeStyle = computed(() => ({
  width: `calc(100% - ${props.thickness * 2}px)`,
  height: `calc(100% - ${props.thickness * 2}px)`,
}));
</script>
