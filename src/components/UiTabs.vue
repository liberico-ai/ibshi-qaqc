<!--
  UiTabs — thanh tab (theo mockup .tabs / .tab)
  Props (v-model):
    - modelValue {String|Number}  key tab đang chọn
    - tabs {Array} mỗi phần tử: { key: 'all', label: 'Tất cả (12)' }
  Sự kiện:
    - update:modelValue khi đổi tab (dùng v-model)
-->
<template>
  <div class="tabs">
    <div
      v-for="t in tabs"
      :key="t.key"
      class="tab"
      :class="{ active: t.key === modelValue }"
      @click="$emit('update:modelValue', t.key)"
    >
      {{ t.label }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  tabs:       { type: Array, default: () => [] },
});
defineEmits(['update:modelValue']);
</script>
