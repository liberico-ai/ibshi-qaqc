<!--
  QcPipeline — dải 9 (hoặc N) giai đoạn QC (theo mockup .pipeline)
  Props:
    - stages {Array} danh sách giai đoạn, mỗi phần tử:
        { num: 1, icon: '📦', label: 'Material\nInspection', state: 'done'|'active'|'pending' }
      `label` có thể chứa '\n' để xuống dòng.
    - showLegend {Boolean} hiện chú thích màu bên dưới (mặc định true)
  Sự kiện:
    - @select(stage) khi bấm vào một giai đoạn
-->
<template>
  <div>
    <div class="pipeline">
      <div
        v-for="(s, i) in stages"
        :key="i"
        class="pipeline-stage"
        :class="s.state || 'pending'"
        @click="$emit('select', s)"
      >
        <span class="stage-icon">{{ s.icon }}</span>
        <span class="stage-num">{{ s.num ?? i + 1 }}</span>
        <span v-html="formatLabel(s.label)"></span>
      </div>
    </div>
    <div v-if="showLegend" class="flex gap-4 mt-3 justify-center">
      <span class="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span class="inline-block w-2.5 h-2.5 rounded-sm" style="background:#d1fae5"></span> Hoàn thành
      </span>
      <span class="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span class="inline-block w-2.5 h-2.5 rounded-sm" style="background:#dbeafe"></span> Đang thực hiện
      </span>
      <span class="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span class="inline-block w-2.5 h-2.5 rounded-sm" style="background:#f1f5f9"></span> Chờ
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stages:     { type: Array, default: () => [] },
  showLegend: { type: Boolean, default: true },
});
defineEmits(['select']);

function formatLabel(label) {
  if (!label) return '';
  // Cho phép xuống dòng bằng \n; escape thẻ HTML khác để an toàn
  const safe = String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return safe.replace(/\n/g, '<br>');
}
</script>
