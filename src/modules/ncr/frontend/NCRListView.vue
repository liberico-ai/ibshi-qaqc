<template>
  <div>
    <PageHeader :title="$t('ncr.list.title')" :subtitle="$t('ncr.list.subtitle')">
      <template #actions>
        <button v-can="'ncr.write'" @click="openCreate" class="btn btn-danger">
          + {{ $t('ncr.list.create') }}
        </button>
      </template>
    </PageHeader>

    <!-- Summary stat cards -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard icon="📝" color="blue"   :label="$t('ncr.stats.total')" :value="summary.total" />
      <StatCard icon="🔴" color="red"    :label="$t('ncr.stats.open')"  :value="summary.open" />
      <StatCard icon="✅" color="green"  :label="$t('ncr.stats.closed')" :value="summary.closed" />
      <StatCard icon="⏰" color="amber"  :label="$t('ncr.stats.overdue')" :value="summary.overdue" />
    </div>

    <!-- Filters -->
    <UiCard class="mb-5" body-class="card-body flex flex-wrap gap-3">
      <select v-model="status" @change="load(1)"
        class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        <option value="">{{ $t('ncr.list.allStatus') }}</option>
        <option v-for="s in STATES" :key="s" :value="s">{{ $t('ncr.status.' + s) }}</option>
      </select>
      <select v-model="severity" @change="load(1)"
        class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        <option value="">{{ $t('ncr.list.allSeverity') }}</option>
        <option value="minor">{{ $t('ncr.severity.minor') }}</option>
        <option value="major">{{ $t('ncr.severity.major') }}</option>
        <option value="critical">{{ $t('ncr.severity.critical') }}</option>
      </select>
      <select v-model="slaStatus" @change="load(1)"
        class="px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        <option value="">{{ $t('ncr.list.allSla') }}</option>
        <option value="ON_TIME">{{ $t('ncr.sla.ON_TIME') }}</option>
        <option value="AT_RISK">{{ $t('ncr.sla.AT_RISK') }}</option>
        <option value="OVERDUE">{{ $t('ncr.sla.OVERDUE') }}</option>
        <option value="CLOSED">{{ $t('ncr.sla.CLOSED') }}</option>
      </select>
      <button @click="load(1)" class="btn btn-primary">{{ $t('ncr.list.filter') }}</button>
    </UiCard>

    <UiCard body-class="p-0">
      <div class="overflow-x-auto">
        <table class="qc-table">
          <thead>
            <tr>
              <th>{{ $t('ncr.field.ncrNo') }}</th>
              <th>{{ $t('ncr.field.title') }}</th>
              <th>{{ $t('ncr.field.severity') }}</th>
              <th>{{ $t('ncr.field.status') }}</th>
              <th>{{ $t('ncr.field.sla') }}</th>
              <th>{{ $t('ncr.field.dueDate') }}</th>
              <th class="text-right">{{ $t('ncr.field.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="7" class="text-center text-slate-400 py-8">{{ $t('ncr.loading') }}</td></tr>
            <tr v-else-if="!records.length"><td colspan="7" class="text-center text-slate-400 py-8">{{ $t('ncr.list.empty') }}</td></tr>
            <tr v-for="r in records" :key="r.id">
              <td class="font-semibold text-red-600 dark:text-red-400">{{ r.ncr_no }}</td>
              <td>{{ r.title }}</td>
              <td><StatusTag :type="severityColor(r.severity)" :label="$t('ncr.severity.' + r.severity)" /></td>
              <td><StatusTag :status="r.status" :label="$t('ncr.status.' + r.status)" /></td>
              <td>
                <StatusTag v-if="slaOf(r)" :type="slaColor(slaOf(r))" :label="$t('ncr.sla.' + slaOf(r))" />
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
              <td class="text-xs" :class="isOverdue(r) ? 'text-red-600 dark:text-red-400 font-semibold' : ''">
                {{ r.due_date ? new Date(r.due_date).toLocaleDateString('vi-VN') : '—' }}
              </td>
              <td class="text-right">
                <router-link :to="`/ncr/${r.id}`" class="btn btn-outline btn-sm">
                  {{ $t('ncr.list.detail') }}
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-1">
      <button v-for="p in pagination.totalPages" :key="p" @click="load(p)"
        :class="p === pagination.page ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
        class="px-3 py-1.5 rounded text-sm font-medium transition-colors">{{ p }}</button>
    </div>

    <!-- Create Modal -->
    <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="modal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">{{ $t('ncr.create.title') }}</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('ncr.field.title') }} *</label>
          <input v-model="form.title" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('ncr.field.description') }}</label>
          <textarea v-model="form.description" rows="3" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('ncr.field.severity') }}</label>
            <select v-model="form.severity" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
              <option value="minor">{{ $t('ncr.severity.minor') }}</option>
              <option value="major">{{ $t('ncr.severity.major') }}</option>
              <option value="critical">{{ $t('ncr.severity.critical') }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('ncr.field.sourceType') }}</label>
            <select v-model="form.source_type" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
              <option value="manual">{{ $t('ncr.source.manual') }}</option>
              <option value="inspection">{{ $t('ncr.source.inspection') }}</option>
              <option value="mir">{{ $t('ncr.source.mir') }}</option>
            </select>
          </div>
        </div>
        <div v-if="form.source_type !== 'manual'">
          <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('ncr.field.sourceRef') }}</label>
          <input v-model="form.source_ref_id" :placeholder="$t('ncr.create.sourceRefPlaceholder')" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('ncr.field.dueDate') }}</label>
            <input type="date" v-model="form.due_date" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">{{ $t('ncr.field.assignedTo') }}</label>
            <input type="number" v-model.number="form.assigned_to" :placeholder="$t('ncr.create.userIdPlaceholder')" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="modal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">{{ $t('ncr.cancel') }}</button>
          <button @click="createNCR" :disabled="creating" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
            {{ creating ? $t('ncr.create.creating') : $t('ncr.list.create') }}
          </button>
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
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatCard from '@/components/StatCard.vue';
import StatusTag from '@/components/StatusTag.vue';

const { t } = useI18n();
const router = useRouter();
const records = ref([]);
const loading = ref(false);
const status = ref('');
const severity = ref('');
const slaStatus = ref('');
const pagination = ref({ page: 1, totalPages: 1 });
const modal = ref(false);
const creating = ref(false);
const form = ref({ title: '', description: '', severity: 'minor', source_type: 'manual', source_ref_id: '', due_date: '', assigned_to: null });
const toast = ref({ show: false, ok: true, message: '' });

const STATES = ['OPEN', 'ASSIGNED', 'ROOT_CAUSE', 'CAPA_PLAN', 'IN_PROGRESS', 'VERIFY', 'CLOSED', 'REOPEN'];

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
const SEVERITY_TAG = { minor: 'gray', major: 'amber', critical: 'red' };
function statusClass(s) { return STATUS_COLORS[s] ?? ''; }
function severityClass(s) { return SEVERITY_COLORS[s] ?? ''; }
function severityColor(s) { return SEVERITY_TAG[s] ?? 'gray'; }

// SLA badge (BR03.01): xanh = đúng hạn, vàng = sắp tới hạn, đỏ = quá hạn.
const SLA_TAG = { ON_TIME: 'green', AT_RISK: 'amber', OVERDUE: 'red', CLOSED: 'gray' };
const AT_RISK_DAYS = 2;
function slaColor(s) { return SLA_TAG[s] ?? 'gray'; }
// Ưu tiên sla_status do backend tính; nếu thiếu thì tính tại client từ hạn SLA/hạn xử lý.
function slaOf(r) {
  if (r.sla_status) return r.sla_status;
  if (r.status === 'CLOSED') return 'CLOSED';
  const due = r.sla_due_date ?? r.due_date;
  if (!due) return null;
  const today = new Date(new Date().toDateString());
  const d = new Date(new Date(due).toDateString());
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return 'OVERDUE';
  if (diff <= AT_RISK_DAYS) return 'AT_RISK';
  return 'ON_TIME';
}
function isOverdue(r) {
  if (r.status === 'CLOSED') return false;
  const due = r.sla_due_date ?? r.due_date;
  if (!due) return false;
  return new Date(due) < new Date(new Date().toDateString());
}

const summary = computed(() => {
  const rows = records.value || [];
  const open = rows.filter(r => r.status !== 'CLOSED').length;
  return {
    total: rows.length,
    open,
    closed: rows.filter(r => r.status === 'CLOSED').length,
    overdue: rows.filter(r => isOverdue(r)).length,
  };
});

async function load(page = 1) {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page, ...(status.value && { status: status.value }), ...(severity.value && { severity: severity.value }), ...(slaStatus.value && { slaStatus: slaStatus.value }) });
    const res = await apiFetch(`/api/ncr?${params}`);
    const json = await res.json();
    records.value = json.data ?? [];
    pagination.value = json.pagination;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  form.value = { title: '', description: '', severity: 'minor', source_type: 'manual', source_ref_id: '', due_date: '', assigned_to: null };
  modal.value = true;
}

async function createNCR() {
  if (!form.value.title) { showToast(false, t('ncr.create.titleRequired')); return; }
  creating.value = true;
  try {
    const payload = { ...form.value };
    if (!payload.source_ref_id) delete payload.source_ref_id;
    if (!payload.due_date) delete payload.due_date;
    if (!payload.assigned_to) delete payload.assigned_to;
    const res = await apiFetch('/api/ncr', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || (json.errors && json.errors[0]?.msg));
    modal.value = false;
    router.push(`/ncr/${json.data.id}`);
  } catch (e) {
    showToast(false, e.message || t('ncr.create.error'));
  } finally {
    creating.value = false;
  }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(() => load());
</script>
