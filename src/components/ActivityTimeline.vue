<!--
  ActivityTimeline — dòng thời gian hoạt động (theo mockup .timeline)
  Props:
    - items {Array} mỗi phần tử:
        { dot: 'green'|'blue'|'amber'|'red', html: '<strong>NCR-008</strong> mới tạo…', time: 'Hôm nay, 08:45' }
      `html` cho phép in đậm; `text` là phương án thuần văn bản nếu không muốn HTML.
    - empty {String} thông báo khi không có dữ liệu
-->
<template>
  <div v-if="items && items.length" class="timeline">
    <div v-for="(it, i) in items" :key="i" class="timeline-item">
      <span class="timeline-dot" :class="it.dot || 'blue'"></span>
      <div>
        <div class="timeline-text" v-if="it.html" v-html="it.html"></div>
        <div class="timeline-text" v-else>{{ it.text }}</div>
        <div class="timeline-time">{{ it.time }}</div>
      </div>
    </div>
  </div>
  <div v-else class="py-8 text-center text-[13px] text-slate-400">{{ empty }}</div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  empty: { type: String, default: 'Chưa có hoạt động' },
});
</script>
