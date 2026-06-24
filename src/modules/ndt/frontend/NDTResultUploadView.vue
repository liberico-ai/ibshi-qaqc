<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/50" @click="$emit('close')"></div>
    <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
      <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">Tải kết quả NDT (F08 / F15)</h3>
      <div class="text-xs text-slate-500">Yêu cầu: <b>{{ request.request_no }}</b> — {{ request.method }}</div>

      <div>
        <label class="form-label">Kết quả *</label>
        <select v-model="form.result" class="form-control">
          <option value="accept">Đạt (accept)</option>
          <option value="reject">Không đạt (reject)</option>
        </select>
      </div>
      <div>
        <label class="form-label">Số báo cáo</label>
        <input v-model="form.report_no" class="form-control">
      </div>
      <div>
        <label class="form-label">Liên kết tệp báo cáo (URL)</label>
        <input v-model="form.file_link" placeholder="https://..." class="form-control">
      </div>

      <div class="flex justify-end gap-2">
        <button @click="$emit('close')" class="btn btn-outline">Hủy</button>
        <button @click="save" :disabled="saving" class="btn btn-primary disabled:opacity-50">
          {{ saving ? 'Đang lưu...' : 'Lưu kết quả' }}
        </button>
      </div>

      <div v-if="err" class="text-xs text-red-600">{{ err }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { apiFetch } from '@/utils/api.js';

const props = defineProps({ request: { type: Object, required: true } });
const emit = defineEmits(['close', 'saved']);

const saving = ref(false);
const err = ref('');
const form = ref({ result: 'accept', report_no: '', file_link: '' });

async function save() {
  saving.value = true;
  err.value = '';
  try {
    const payload = {
      result: form.value.result,
      ...(form.value.report_no && { report_no: form.value.report_no }),
      ...(form.value.file_link && { file_link: form.value.file_link }),
    };
    const res = await apiFetch(`/api/ndt/requests/${props.request.id}/results`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Lỗi lưu kết quả');
    emit('saved');
  } catch (e) {
    err.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.form-label { @apply block text-xs font-semibold text-slate-500 mb-1.5; }
.form-control {
  @apply w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 outline-none
         transition-colors focus:border-blue-400
         dark:border-[#252540] dark:bg-[#12122a] dark:text-slate-100;
}
</style>
