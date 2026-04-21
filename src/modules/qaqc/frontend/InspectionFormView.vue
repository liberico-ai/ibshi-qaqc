<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <router-link to="/qaqc/inspections" class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </router-link>
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Kiểm Tra — {{ inspection?.ip_code }}</h2>
      <span v-if="hasDraft" class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
        Bản nháp đã lưu
      </span>
    </div>

    <div v-if="loading" class="card p-8 text-center text-slate-500">Đang tải...</div>
    <template v-else-if="inspection">
      <div class="card p-4 space-y-4">
        <div v-for="(result, i) in form" :key="result.checkpoint_id" class="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <p class="font-medium text-slate-800 dark:text-slate-200 text-sm">{{ result.label }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ result.required ? 'Bắt buộc' : 'Không bắt buộc' }}</p>
            </div>
            <div class="flex gap-2">
              <button @click="setResult(i, 'PASS')"
                :class="result.result === 'PASS' ? 'bg-green-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
                class="px-3 py-1.5 rounded text-sm font-medium transition-colors">PASS</button>
              <button @click="setResult(i, 'FAIL')"
                :class="result.result === 'FAIL' ? 'bg-red-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
                class="px-3 py-1.5 rounded text-sm font-medium transition-colors">FAIL</button>
            </div>
          </div>
          <div v-if="result.data_type === 'numeric'" class="mt-3 flex gap-2">
            <input v-model="result.measured_value" type="number" step="0.001" placeholder="Giá trị đo"
              class="w-40 px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
            <input v-model="result.measured_unit" placeholder="Đơn vị"
              class="w-24 px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          </div>
          <input v-model="result.note" placeholder="Ghi chú..." class="mt-2 w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>

        <div class="flex justify-between pt-2">
          <button @click="saveResults" :disabled="saving"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
            {{ saving ? 'Đang lưu...' : 'Lưu kết quả' }}
          </button>
          <button @click="sign" :disabled="signing"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
            {{ signing ? 'Đang ký...' : 'Ký số & Hoàn thành' }}
          </button>
        </div>
      </div>
    </template>

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useRoute } from 'vue-router';
import { offlineFormStore } from '@/core/offline-form-store.js';

const route = useRoute();
const inspection = ref(null);
const form = ref([]);
const loading = ref(false);
const saving = ref(false);
const signing = ref(false);
const hasDraft = ref(false);
const toast = ref({ show: false, ok: true, message: '' });

let autoSaveTimer = null;

function draftKey() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return `${user.id ?? 'anon'}_inspection_${route.params.id}`;
}

async function saveDraft() {
  if (!form.value.length) return;
  await offlineFormStore.saveDraft(draftKey(), form.value);
}

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/qaqc/inspections/${route.params.id}`);
    inspection.value = (await res.json()).data;
    const existingResults = {};
    for (const r of inspection.value.results ?? []) {
      existingResults[r.checkpoint_id] = r;
    }
    const cpRes = await apiFetch(`/api/qaqc/itp/${inspection.value.item_id}`).catch(() => null);
    let checkpoints = [];
    if (cpRes?.ok) {
      const cpData = (await cpRes.json()).data;
      checkpoints = cpData?.checkpoints ?? [];
    }

    // Build form from server data
    const serverForm = checkpoints.map(cp => ({
      checkpoint_id: cp.id,
      label: cp.label,
      required: cp.required,
      data_type: cp.data_type,
      result: existingResults[cp.id]?.result ?? '',
      measured_value: existingResults[cp.id]?.measured_value ?? '',
      measured_unit: existingResults[cp.id]?.measured_unit ?? '',
      note: existingResults[cp.id]?.note ?? '',
    }));

    // Restore draft if newer than server data
    const draft = await offlineFormStore.loadDraft(draftKey());
    if (draft && draft.length === serverForm.length) {
      form.value = draft;
      hasDraft.value = true;
    } else {
      form.value = serverForm;
      hasDraft.value = false;
    }
  } finally {
    loading.value = false;
  }
}

function setResult(idx, val) {
  form.value[idx].result = val;
}

async function saveResults() {
  saving.value = true;
  try {
    const res = await apiFetch(`/api/qaqc/inspections/${route.params.id}/results`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: form.value }),
    });
    const data = await res.json();

    if (res.status === 202 && data.queued) {
      // Queued offline — keep draft, show offline message
      await saveDraft();
      showToast(true, 'Đã lưu vào hàng đợi offline. Sẽ đồng bộ khi có mạng.');
    } else if (!res.ok) {
      throw new Error(data.error || 'Lỗi lưu kết quả');
    } else {
      await offlineFormStore.clearDraft(draftKey());
      hasDraft.value = false;
      showToast(true, 'Đã lưu kết quả');
    }
  } catch (e) {
    showToast(false, e.message || 'Lỗi lưu kết quả');
  } finally {
    saving.value = false;
  }
}

async function sign() {
  signing.value = true;
  try {
    const res = await apiFetch(`/api/qaqc/inspections/${route.params.id}/sign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();

    if (res.status === 202 && data.queued) {
      showToast(true, 'Đã lưu vào hàng đợi offline. Chữ ký sẽ được xử lý khi có mạng.');
    } else if (!res.ok) {
      throw new Error(data.error || 'Lỗi ký số');
    } else {
      await offlineFormStore.clearDraft(draftKey());
      hasDraft.value = false;
      showToast(true, 'Đã ký số và hoàn thành kiểm tra');
      await load();
    }
  } catch (e) {
    showToast(false, e.message || 'Lỗi ký số');
  } finally {
    signing.value = false;
  }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

// Watch form changes → auto-save draft every 30s
watch(form, () => { hasDraft.value = true; }, { deep: true });

onMounted(async () => {
  await load();
  autoSaveTimer = setInterval(saveDraft, 30_000);
});

onUnmounted(() => {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
});
</script>
