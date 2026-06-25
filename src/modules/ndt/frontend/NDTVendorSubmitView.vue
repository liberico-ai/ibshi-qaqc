<template>
  <div class="max-w-lg mx-auto py-10 px-4">
    <UiCard>
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Nộp kết quả NDT (Nhà thầu)</h2>

        <div v-if="loading" class="text-sm text-slate-500">Đang kiểm tra token...</div>

        <div v-else-if="tokenError" class="text-sm text-red-600 dark:text-red-400">
          {{ tokenError }}
        </div>

        <template v-else-if="info">
          <div class="text-xs text-slate-500">
            Yêu cầu: <b class="text-slate-700 dark:text-slate-200">{{ info.request_no }}</b>
            — Phương pháp <b>{{ info.method }}</b>
            <div class="mt-1">Hạn token: {{ new Date(info.expires_at).toLocaleString('vi-VN') }}</div>
          </div>

          <div v-if="done" class="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            Đã gửi kết quả thành công. Cảm ơn nhà thầu.
          </div>

          <template v-else>
            <div>
              <label class="form-label">Kết quả *</label>
              <select v-model="form.result" class="form-control">
                <option value="accept">Đạt (accept)</option>
                <option value="reject">Không đạt (reject)</option>
              </select>
            </div>
            <div>
              <label class="form-label">Số báo cáo</label>
              <input v-model="form.report_no" class="form-control" />
            </div>
            <div>
              <label class="form-label">Liên kết tệp báo cáo (URL)</label>
              <input v-model="form.file_link" placeholder="https://..." class="form-control" />
            </div>
            <button @click="submit" :disabled="saving" class="btn btn-primary w-full disabled:opacity-50">
              {{ saving ? 'Đang gửi...' : 'Gửi kết quả' }}
            </button>
            <div v-if="err" class="text-xs text-red-600">{{ err }}</div>
          </template>
        </template>
      </div>
    </UiCard>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import UiCard from '@/components/UiCard.vue';

const route = useRoute();
const token = ref('');
const loading = ref(true);
const tokenError = ref('');
const info = ref(null);
const saving = ref(false);
const done = ref(false);
const err = ref('');
const form = ref({ result: 'accept', report_no: '', file_link: '' });

async function verify() {
  loading.value = true;
  tokenError.value = '';
  try {
    const res = await fetch(`/api/ndt/vendor/verify?token=${encodeURIComponent(token.value)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Token không hợp lệ');
    info.value = json.data;
  } catch (e) {
    tokenError.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function submit() {
  saving.value = true;
  err.value = '';
  try {
    const payload = {
      token: token.value,
      result: form.value.result,
      ...(form.value.report_no && { report_no: form.value.report_no }),
      ...(form.value.file_link && { file_link: form.value.file_link }),
    };
    const res = await fetch('/api/ndt/vendor/results', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || (json.errors && json.errors[0]?.msg) || 'Lỗi gửi kết quả');
    done.value = true;
  } catch (e) {
    err.value = e.message;
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  token.value = route.query.token || '';
  if (!token.value) { tokenError.value = 'Thiếu token'; loading.value = false; return; }
  verify();
});
</script>

<style scoped>
.form-label { @apply block text-xs font-semibold text-slate-500 mb-1.5; }
.form-control {
  @apply w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 outline-none
         transition-colors focus:border-blue-400
         dark:border-[#252540] dark:bg-[#12122a] dark:text-slate-100;
}
</style>
