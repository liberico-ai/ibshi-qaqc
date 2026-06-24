<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('inspection.revision.title') }}</h3>
      <button v-if="canRevise" @click="openRevise"
        class="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
        {{ $t('qaqcMore.create_revision') }}
      </button>
    </div>

    <!-- Revision list -->
    <div class="card p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-slate-50 dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-slate-800">
            <th class="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">{{ $t('qaqcMore.col_rev') }}</th>
            <th class="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">{{ $t('common.status') }}</th>
            <th class="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">{{ $t('qaqcMore.col_editor') }}</th>
            <th class="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">{{ $t('qaqcMore.col_time') }}</th>
            <th class="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400">{{ $t('qaqcMore.col_reason') }}</th>
            <th class="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-400">{{ $t('qaqcMore.col_compare') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="loading"><td colspan="6" class="px-3 py-6 text-center text-slate-500">{{ $t('common.loading') }}</td></tr>
          <tr v-else-if="!revisions.length"><td colspan="6" class="px-3 py-6 text-center text-slate-400">{{ $t('qaqcMore.revisions_empty') }}</td></tr>
          <tr v-for="rev in revisions" :key="rev.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td class="px-3 py-2">
              <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">v{{ rev.revision }}</span>
              <span v-if="rev.is_current" class="ml-2 px-1.5 py-0.5 text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded">{{ $t('qaqcMore.current_badge') }}</span>
            </td>
            <td class="px-3 py-2 text-slate-600 dark:text-slate-400">{{ rev.status ?? '—' }}</td>
            <td class="px-3 py-2 text-slate-600 dark:text-slate-400">{{ rev.editor_name ?? '—' }}</td>
            <td class="px-3 py-2 text-slate-500 text-xs">{{ fmt(rev.created_at) }}</td>
            <td class="px-3 py-2 text-slate-500 text-xs max-w-xs truncate" :title="rev.revision_reason">
              {{ rev.revision_reason ?? (rev.revision === 1 ? $t('qaqcMore.original_reason') : '—') }}
            </td>
            <td class="px-3 py-2 text-center">
              <input type="radio" name="diff-from" :value="rev.id" v-model="diffFromId"
                class="mr-1 w-3 h-3 accent-blue-600" :title="$t('qaqcMore.diff_from')"/>
              <input type="radio" name="diff-to" :value="rev.id" v-model="diffToId"
                class="w-3 h-3 accent-indigo-600" :title="$t('qaqcMore.diff_to')"/>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="revisions.length > 1" class="px-3 py-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
        <span class="text-xs text-slate-400">{{ $t('qaqcMore.select_two_revisions') }}</span>
        <button @click="doDiff" :disabled="!diffFromId || !diffToId || diffFromId === diffToId"
          class="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg">
          {{ $t('qaqcMore.compare') }}
        </button>
      </div>
    </div>

    <!-- Diff viewer -->
    <div v-if="diff" class="card p-4 space-y-3">
      <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('qaqcMore.compare') }}</h4>
      <div v-if="!diff.fields.length && !diff.results.length" class="text-sm text-slate-400 italic">{{ $t('qaqcMore.no_diff') }}</div>

      <div v-if="diff.fields.length" class="space-y-1">
        <div class="text-xs font-medium text-slate-500 uppercase">{{ $t('qaqcMore.diff_fields') }}</div>
        <table class="w-full text-xs">
          <thead>
            <tr class="text-slate-500">
              <th class="text-left py-1">{{ $t('qaqcMore.col_field') }}</th>
              <th class="text-left py-1">{{ $t('qaqcMore.col_old') }}</th>
              <th class="text-left py-1">{{ $t('qaqcMore.col_new') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in diff.fields" :key="f.field" class="border-t border-slate-100 dark:border-slate-800">
              <td class="py-1 font-medium text-slate-700 dark:text-slate-300">{{ f.field }}</td>
              <td class="py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded px-1">{{ f.from ?? '∅' }}</td>
              <td class="py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded px-1">{{ f.to ?? '∅' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="diff.results.length" class="space-y-1">
        <div class="text-xs font-medium text-slate-500 uppercase">{{ $t('qaqcMore.diff_checkpoints') }}</div>
        <div v-for="r in diff.results" :key="r.checkpoint_id" class="text-xs p-2 rounded"
          :class="{
            'bg-green-50 dark:bg-green-900/20': r.change === 'added',
            'bg-red-50 dark:bg-red-900/20':     r.change === 'removed',
            'bg-amber-50 dark:bg-amber-900/20': r.change === 'modified',
          }">
          <span class="font-mono font-semibold">{{ r.checkpoint_id }}</span>
          <span class="ml-2 text-slate-500">[{{ r.change }}]</span>
          <span v-if="r.change === 'modified'" class="ml-2">
            {{ r.from?.result ?? '—' }} → {{ r.to?.result ?? '—' }}
          </span>
          <span v-else-if="r.change === 'added'" class="ml-2 text-green-700 dark:text-green-400">+ {{ r.to?.result }}</span>
          <span v-else class="ml-2 text-red-700 dark:text-red-400">− {{ r.from?.result }}</span>
        </div>
      </div>
    </div>

    <!-- Revise modal -->
    <Teleport to="body">
      <div v-if="reviseModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="reviseModal.show = false"></div>
        <div class="relative z-10 w-full max-w-md bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl p-5 space-y-4">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ $t('qaqcMore.create_revision_modal') }}</h3>
          <p class="text-xs text-slate-500">{{ $t('qaqcMore.revision_reason_hint') }}</p>
          <textarea v-model="reviseModal.reason" rows="4"
            :placeholder="$t('qaqcMore.revision_reason_placeholder')"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none resize-none"></textarea>
          <div class="text-xs" :class="reviseModal.reason.length >= 20 ? 'text-green-600 dark:text-green-400' : 'text-amber-500'">
            {{ $t('qaqcMore.chars_count', { count: reviseModal.reason.length }) }}
          </div>
          <div class="flex justify-end gap-2">
            <button @click="reviseModal.show = false" class="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">{{ $t('common.cancel') }}</button>
            <button @click="submitRevise" :disabled="reviseModal.reason.length < 20 || reviseModal.saving"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg">
              {{ reviseModal.saving ? $t('qaqcMore.creating_revision') : $t('inspection.revision.create') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  inspectionId: { type: String, required: true },
  canRevise: { type: Boolean, default: true },
});
const emit = defineEmits(['revised']);

const loading = ref(false);
const revisions = ref([]);
const diffFromId = ref(null);
const diffToId = ref(null);
const diff = ref(null);

const reviseModal = reactive({ show: false, reason: '', saving: false });

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/qaqc/inspections/${props.inspectionId}/revisions`);
    if (res.ok) {
      const json = await res.json();
      revisions.value = json.data?.revisions ?? [];
    }
  } finally {
    loading.value = false;
  }
}

async function doDiff() {
  if (!diffFromId.value || !diffToId.value) return;
  const res = await apiFetch(`/api/qaqc/inspections/${diffFromId.value}/diff/${diffToId.value}`);
  if (res.ok) {
    const json = await res.json();
    diff.value = json.data;
  }
}

function openRevise() {
  reviseModal.reason = '';
  reviseModal.show = true;
}

async function submitRevise() {
  reviseModal.saving = true;
  try {
    const res = await apiFetch(`/api/qaqc/inspections/${props.inspectionId}/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reviseModal.reason }),
    });
    if (res.ok) {
      reviseModal.show = false;
      await load();
      emit('revised');
    } else {
      const err = await res.json();
      alert(err.error ?? t('qaqcMore.create_revision_failed'));
    }
  } finally {
    reviseModal.saving = false;
  }
}

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

onMounted(load);
</script>
