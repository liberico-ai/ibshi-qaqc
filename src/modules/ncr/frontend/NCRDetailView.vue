<template>
  <div>
    <PageHeader :title="ncr?.ncr_no ?? $t('ncr.detail.title')" :subtitle="ncr?.title ?? ''">
      <template #actions>
        <StatusTag v-if="ncr" :status="ncr.status" :label="$t('ncr.status.' + ncr.status)" />
        <StatusTag v-if="ncr" :type="severityColor(ncr.severity)" :label="$t('ncr.severity.' + ncr.severity)" />
        <router-link to="/ncr" class="btn btn-outline btn-sm">← {{ $t('ncr.detail.back') }}</router-link>
      </template>
    </PageHeader>

    <div v-if="loading" class="card p-8 text-center text-slate-500">{{ $t('ncr.loading') }}</div>
    <template v-else-if="ncr">
      <!-- 7-step workflow pipeline -->
      <UiCard class="mb-5" :title="$t('ncr.detail.workflow')">
        <div class="flex items-center gap-1 overflow-x-auto pb-1">
          <template v-for="(step, i) in workflowSteps" :key="step.key">
            <div class="flex flex-col items-center text-center min-w-[84px]">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold"
                   :class="step.state === 'done' ? 'bg-emerald-500 text-white'
                     : step.state === 'active' ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40'
                     : 'bg-slate-200 text-slate-500 dark:bg-slate-700'">
                {{ step.state === 'done' ? '✓' : i + 1 }}
              </div>
              <div class="mt-1.5 text-[11px] leading-tight"
                   :class="step.state === 'pending' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300 font-medium'">
                {{ $t('ncr.status.' + step.key) }}
              </div>
            </div>
            <div v-if="i < workflowSteps.length - 1" class="flex-1 h-0.5 min-w-[16px] rounded"
                 :class="step.state === 'done' ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'"></div>
          </template>
        </div>
      </UiCard>

      <!-- NCR Form QAP-09 fields -->
      <UiCard class="mb-5" :title="$t('ncr.detail.formTitle')">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><span class="block text-xs text-slate-500 mb-1">{{ $t('ncr.field.ncrNo') }}</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ ncr.ncr_no }}</span></div>
          <div><span class="block text-xs text-slate-500 mb-1">{{ $t('ncr.field.project') }}</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ ncr.project_code ?? '—' }}</span></div>
          <div><span class="block text-xs text-slate-500 mb-1">{{ $t('ncr.field.sourceType') }}</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ $t('ncr.source.' + ncr.source_type) }}</span></div>
          <div><span class="block text-xs text-slate-500 mb-1">{{ $t('ncr.field.assignedTo') }}</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ ncr.assigned_name ?? '—' }}</span></div>
          <div><span class="block text-xs text-slate-500 mb-1">{{ $t('ncr.field.dueDate') }}</span><span class="font-medium" :class="overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'">{{ ncr.due_date ? new Date(ncr.due_date).toLocaleDateString('vi-VN') : '—' }}</span></div>
          <div><span class="block text-xs text-slate-500 mb-1">{{ $t('ncr.field.rootCause') }}</span><span class="font-medium text-slate-800 dark:text-slate-200">{{ ncr.root_cause_category ?? '—' }}</span></div>
        </div>
        <div>
          <span class="block text-xs text-slate-500 mb-1">{{ $t('ncr.field.title') }}</span>
          <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ ncr.title }}</p>
        </div>
        <div v-if="ncr.description">
          <span class="block text-xs text-slate-500 mb-1">{{ $t('ncr.field.description') }}</span>
          <p class="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{{ ncr.description }}</p>
        </div>
        <div v-if="ncr.hold_flag" class="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-xs font-semibold">
          {{ $t('ncr.detail.holdFlag') }}
        </div>
      </UiCard>

      <!-- Workflow buttons -->
      <UiCard v-can="'ncr.write'" class="mb-5" :title="$t('ncr.detail.actions')">
        <div class="flex flex-wrap items-center gap-2">
          <button v-for="next in nextStates" :key="next" @click="transition(next)" class="btn btn-primary btn-sm">
            → {{ $t('ncr.status.' + next) }}
          </button>
          <span v-if="!nextStates.length" class="text-xs text-slate-400">{{ $t('ncr.detail.noTransition') }}</span>

          <button v-if="ncr.status === 'VERIFY'" v-can="'ncr.close'" @click="closeNCR" class="btn btn-success btn-sm">
            {{ $t('ncr.detail.closeBtn') }}
          </button>
        </div>

        <!-- Assign -->
        <div v-can="'ncr.assign'" class="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-[#252540]">
          <span class="text-xs text-slate-500">{{ $t('ncr.detail.assignLabel') }}</span>
          <input type="number" v-model.number="assignForm.assigned_to" :placeholder="$t('ncr.create.userIdPlaceholder')"
            class="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none w-28">
          <input type="date" v-model="assignForm.due_date"
            class="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          <button @click="assign" class="btn btn-primary btn-sm">{{ $t('ncr.detail.assignBtn') }}</button>
        </div>
      </UiCard>

      <!-- CAPA table -->
      <UiCard class="mb-5" body-class="p-0">
        <template #header><div class="card-title">{{ $t('ncr.detail.capaTitle') }}</div></template>
        <template #actions>
          <button v-can="'ncr.write'" @click="actionModal = true" class="btn btn-outline btn-sm">
            + {{ $t('ncr.detail.addAction') }}
          </button>
        </template>
        <div class="overflow-x-auto">
          <table class="qc-table">
            <thead>
              <tr>
                <th>{{ $t('ncr.field.actionType') }}</th>
                <th>{{ $t('ncr.field.description') }}</th>
                <th>{{ $t('ncr.field.owner') }}</th>
                <th>{{ $t('ncr.field.dueDate') }}</th>
                <th>{{ $t('ncr.field.status') }}</th>
                <th class="text-right">{{ $t('ncr.field.action') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!ncr.actions?.length"><td colspan="6" class="text-center text-slate-400 py-6 text-xs">{{ $t('ncr.detail.noCapa') }}</td></tr>
              <tr v-for="a in ncr.actions" :key="a.id">
                <td><StatusTag :type="a.action_type === 'corrective' ? 'blue' : 'purple'" :label="$t('ncr.actionType.' + a.action_type)" /></td>
                <td>{{ a.description }}</td>
                <td class="text-slate-500">{{ a.owner_name ?? '—' }}</td>
                <td class="text-slate-500 text-xs">{{ a.due_date ? new Date(a.due_date).toLocaleDateString('vi-VN') : '—' }}</td>
                <td><StatusTag :status="a.status" :label="$t('ncr.actionStatus.' + a.status)" /></td>
                <td class="text-right">
                  <button v-if="a.status !== 'verified'" v-can="'ncr.verify'" @click="verifyAction(a.id)" class="btn btn-success btn-sm">
                    {{ $t('ncr.detail.verifyBtn') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>

      <!-- History -->
      <UiCard v-if="ncr.history?.length" :title="$t('ncr.detail.history')">
        <ul class="space-y-2">
          <li v-for="h in ncr.history" :key="h.id" class="flex items-start gap-2 text-xs">
            <span class="text-slate-400 whitespace-nowrap">{{ new Date(h.created_at).toLocaleString('vi-VN') }}</span>
            <span class="text-slate-600 dark:text-slate-400">
              <b>{{ $t('ncr.event.' + h.event_type) }}</b>
              <template v-if="h.from_status || h.to_status"> — {{ h.from_status ?? '?' }} → {{ h.to_status ?? '?' }}</template>
              <template v-if="h.note"> · {{ h.note }}</template>
              <template v-if="h.actor_name"> ({{ h.actor_name }})</template>
            </span>
          </li>
        </ul>
      </UiCard>
    </template>

    <!-- Add CAPA Action Modal -->
    <div v-if="actionModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="actionModal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ $t('ncr.detail.addAction') }}</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('ncr.field.actionType') }}</label>
          <select v-model="actionForm.action_type" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
            <option value="corrective">{{ $t('ncr.actionType.corrective') }}</option>
            <option value="preventive">{{ $t('ncr.actionType.preventive') }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('ncr.field.description') }} *</label>
          <textarea v-model="actionForm.description" rows="3" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('ncr.field.owner') }}</label>
            <input type="number" v-model.number="actionForm.owner_id" :placeholder="$t('ncr.create.userIdPlaceholder')" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('ncr.field.dueDate') }}</label>
            <input type="date" v-model="actionForm.due_date" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="actionModal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">{{ $t('ncr.cancel') }}</button>
          <button @click="addAction" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{{ $t('ncr.detail.addAction') }}</button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';

const { t } = useI18n();
const route = useRoute();
const ncr = ref(null);
const loading = ref(false);
const actionModal = ref(false);
const assignForm = ref({ assigned_to: null, due_date: '' });
const actionForm = ref({ action_type: 'corrective', description: '', owner_id: null, due_date: '' });
const toast = ref({ show: false, ok: true, message: '' });

const TRANSITIONS = {
  OPEN: ['ASSIGNED'],
  ASSIGNED: ['ROOT_CAUSE'],
  ROOT_CAUSE: ['CAPA_PLAN'],
  CAPA_PLAN: ['IN_PROGRESS'],
  IN_PROGRESS: ['VERIFY'],
  VERIFY: ['IN_PROGRESS'],
  CLOSED: ['REOPEN'],
  REOPEN: ['ASSIGNED'],
};

const STATUS_COLORS = {
  OPEN: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  ASSIGNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  ROOT_CAUSE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  CAPA_PLAN: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  VERIFY: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  CLOSED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  REOPEN: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};
const SEVERITY_COLORS = {
  minor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  major: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};
const ACTION_STATUS_COLORS = {
  open: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-blue-100 text-blue-700',
  verified: 'bg-green-100 text-green-700',
};
const SEVERITY_TAG = { minor: 'gray', major: 'amber', critical: 'red' };
function statusClass(s) { return STATUS_COLORS[s] ?? ''; }
function severityClass(s) { return SEVERITY_COLORS[s] ?? ''; }
function severityColor(s) { return SEVERITY_TAG[s] ?? 'gray'; }
function actionStatusClass(s) { return ACTION_STATUS_COLORS[s] ?? ''; }

// 7-step CAPA workflow (REOPEN không nằm trên trục chính)
const WORKFLOW = ['OPEN', 'ASSIGNED', 'ROOT_CAUSE', 'CAPA_PLAN', 'IN_PROGRESS', 'VERIFY', 'CLOSED'];
const workflowSteps = computed(() => {
  const cur = ncr.value?.status;
  // REOPEN coi như quay lại bước ASSIGNED trên trục hiển thị
  const effective = cur === 'REOPEN' ? 'ASSIGNED' : cur;
  const idx = WORKFLOW.indexOf(effective);
  return WORKFLOW.map((key, i) => ({
    key,
    state: idx < 0 ? 'pending' : i < idx ? 'done' : i === idx ? 'active' : 'pending',
  }));
});

const nextStates = computed(() => ncr.value ? (TRANSITIONS[ncr.value.status] ?? []) : []);
const overdue = computed(() => {
  if (!ncr.value?.due_date || ncr.value.status === 'CLOSED') return false;
  return new Date(ncr.value.due_date) < new Date(new Date().toDateString());
});

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/ncr/${route.params.id}`);
    ncr.value = (await res.json()).data;
  } finally {
    loading.value = false;
  }
}

async function apiPost(path, body) {
  const res = await apiFetch(`/api/ncr/${route.params.id}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || (json.errors && json.errors[0]?.msg) || t('ncr.error'));
  return json;
}

async function transition(toStatus) {
  try {
    await apiPost('/transition', { to_status: toStatus });
    showToast(true, t('ncr.detail.transitionOk'));
    await load();
  } catch (e) { showToast(false, e.message); }
}

async function assign() {
  if (!assignForm.value.assigned_to) { showToast(false, t('ncr.detail.assignRequired')); return; }
  try {
    await apiPost('/assign', { assigned_to: assignForm.value.assigned_to, due_date: assignForm.value.due_date || null });
    showToast(true, t('ncr.detail.assignOk'));
    await load();
  } catch (e) { showToast(false, e.message); }
}

async function addAction() {
  if (!actionForm.value.description) { showToast(false, t('ncr.detail.descRequired')); return; }
  try {
    const payload = { ...actionForm.value };
    if (!payload.owner_id) delete payload.owner_id;
    if (!payload.due_date) delete payload.due_date;
    await apiPost('/actions', payload);
    actionModal.value = false;
    actionForm.value = { action_type: 'corrective', description: '', owner_id: null, due_date: '' };
    showToast(true, t('ncr.detail.actionAdded'));
    await load();
  } catch (e) { showToast(false, e.message); }
}

async function verifyAction(actionId) {
  try {
    await apiPost(`/actions/${actionId}/verify`, { status: 'verified' });
    showToast(true, t('ncr.detail.verifyOk'));
    await load();
  } catch (e) { showToast(false, e.message); }
}

async function closeNCR() {
  try {
    await apiPost('/close', {});
    showToast(true, t('ncr.detail.closeOk'));
    await load();
  } catch (e) { showToast(false, e.message); }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(load);
</script>
