<!--
  StatusTag — nhãn trạng thái màu (theo mockup .tag)
  Props:
    - type  {String}  màu trực tiếp: green | amber | red | blue | purple | gray
    - label {String}  văn bản hiển thị (nếu không dùng slot)
    - status {String} mã trạng thái nghiệp vụ — tự suy ra màu nếu không truyền `type`
  Bảng suy màu từ status (không phân biệt hoa thường):
    PASS/CLOSED/DONE/COMPLETED/HOÀN THÀNH → green
    FAIL/OPEN/CRITICAL/OVERDUE            → red
    REWORK/PENDING/WARNING/CHỜ            → amber
    IN_PROGRESS/ACTIVE/ĐANG               → blue
    còn lại                                → gray
-->
<template>
  <span class="tag" :class="`tag-${resolvedType}`">
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type:   { type: String, default: '' },
  label:  { type: String, default: '' },
  status: { type: String, default: '' },
});

const map = [
  { re: /pass|closed|close|done|complete|hoàn thành|đạt/i, color: 'green' },
  { re: /fail|open|critical|overdue|quá hạn|không đạt|mở/i, color: 'red' },
  { re: /rework|pending|warning|chờ|sửa lại/i, color: 'amber' },
  { re: /progress|active|đang|in_progress/i, color: 'blue' },
];

const resolvedType = computed(() => {
  if (props.type) return props.type;
  const s = props.status || props.label || '';
  for (const m of map) if (m.re.test(s)) return m.color;
  return 'gray';
});
</script>
