<!--
  StatCard — thẻ chỉ số tổng quan (theo mockup .stat-card)
  Props:
    - icon    {String}  emoji hoặc ký tự hiển thị trong ô icon (vd: '📁')
    - color   {String}  màu ô icon: blue | green | amber | red | purple
    - label   {String}  nhãn nhỏ phía trên (vd: 'Dự án đang chạy')
    - value   {String|Number}  giá trị lớn (vd: '8' hoặc '83.3%')
    - change  {String}  dòng thay đổi nhỏ phía dưới (tuỳ chọn)
    - trend   {String}  'up' | 'down' — màu của dòng change (mặc định 'up')
-->
<template>
  <div class="stat-card">
    <div class="stat-icon" :class="color">
      <slot name="icon">{{ icon }}</slot>
    </div>
    <div class="flex-1 min-w-0">
      <div class="stat-label">{{ label }}</div>
      <div class="stat-value">{{ value }}</div>
      <div v-if="change" class="stat-change" :class="trend">{{ change }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon:   { type: String, default: '' },
  color:  { type: String, default: 'blue' },
  label:  { type: String, default: '' },
  value:  { type: [String, Number], default: '' },
  change: { type: String, default: '' },
  trend:  { type: String, default: 'up' },
});
</script>
