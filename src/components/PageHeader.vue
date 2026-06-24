<!--
  PageHeader — tiêu đề trang + vùng nút hành động (theo mockup .page-header)
  Props:
    - title    {String}  tiêu đề lớn
    - subtitle {String}  phụ đề nhỏ
  Slots:
    - actions  các nút bên phải (vd: <button class="btn btn-primary">…</button>)
-->
<template>
  <div class="page-header">
    <div>
      <div class="page-title">{{ title }}</div>
      <div v-if="subtitle" class="page-subtitle">{{ subtitle }}</div>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title:    { type: String, default: '' },
  subtitle: { type: String, default: '' },
});
</script>
