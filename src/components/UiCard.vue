<!--
  UiCard — khung thẻ chung (theo mockup .card)
  Props:
    - title   {String}  tiêu đề card (hiển thị trong header)
  Slots:
    - header   thay toàn bộ phần header (ghi đè title + actions)
    - actions  nút/điều khiển bên phải header
    - default  nội dung body
  Lưu ý: nếu không truyền title và không dùng slot header thì card không có header.
-->
<template>
  <div class="card">
    <div v-if="$slots.header || title || $slots.actions" class="card-header">
      <slot name="header">
        <div class="card-title">{{ title }}</div>
      </slot>
      <div v-if="$slots.actions" class="flex items-center gap-2">
        <slot name="actions"></slot>
      </div>
    </div>
    <div :class="bodyClass">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title:     { type: String, default: '' },
  bodyClass: { type: String, default: 'card-body' },
});
</script>
