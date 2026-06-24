<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="card p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Keyword -->
        <div class="sm:col-span-2 lg:col-span-2">
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{{ $t('sysLogs.keyword') }}</label>
          <input v-model="filters.keyword" @keyup.enter="loadLogs(1)"
            :placeholder="$t('sysLogs.keyword_placeholder')"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
        </div>
        <!-- Action -->
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{{ $t('sysLogs.action') }}</label>
          <select v-model="filters.action" @change="loadLogs(1)"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
            <option value="">{{ $t('common.all') }}</option>
            <option value="insert">Insert</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </div>
        <!-- Table -->
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{{ $t('sysLogs.table') }}</label>
          <input v-model="filters.entity_table" @keyup.enter="loadLogs(1)" :placeholder="$t('sysLogs.table_placeholder')"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
        </div>
        <!-- Date range -->
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{{ $t('sysLogs.from_date') }}</label>
          <input v-model="filters.from" type="datetime-local"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{{ $t('sysLogs.to_date') }}</label>
          <input v-model="filters.to" type="datetime-local"
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <button @click="loadLogs(1)" :disabled="loading"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
          {{ $t('common.search') }}
        </button>
        <button @click="resetFilters"
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg">
          {{ $t('common.reset') }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="card p-0 overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-slate-50 dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-slate-800">
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{{ $t('sysLogs.col_time') }}</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{{ $t('sysLogs.col_user') }}</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{{ $t('sysLogs.action') }}</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{{ $t('sysLogs.col_table') }}</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{{ $t('sysLogs.col_record') }}</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">IP</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right whitespace-nowrap">{{ $t('common.details') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="loading && logs.length === 0">
            <td colspan="7" class="px-4 py-8 text-center text-slate-500">{{ $t('sysLogs.loading') }}</td>
          </tr>
          <tr v-else-if="logs.length === 0">
            <td colspan="7" class="px-4 py-8 text-center text-slate-500">{{ $t('sysLogs.empty') }}</td>
          </tr>
          <tr v-for="log in logs" :key="log.id"
            class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
              {{ formatDate(log.created_at) }}
            </td>
            <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
              {{ log.username || '—' }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold" :class="actionClass(log.action)">
                {{ log.action.toUpperCase() }}
              </span>
            </td>
            <td class="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">
              {{ log.entity_table }}
            </td>
            <td class="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap max-w-[120px] truncate">
              {{ log.entity_id || '—' }}
            </td>
            <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {{ log.ip_address || '—' }}
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button @click="openDetail(log)"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-xs font-medium">
                {{ $t('sysLogs.view') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between text-sm text-slate-500">
      <span>Tổng: {{ meta.total }} entries | Trang {{ meta.page }}/{{ meta.totalPages }}</span>
      <div class="flex gap-2">
        <button @click="loadLogs(meta.page - 1)" :disabled="meta.page <= 1 || loading"
          class="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50">
          {{ $t('common.previous') }}
        </button>
        <button @click="loadLogs(meta.page + 1)" :disabled="meta.page >= meta.totalPages || loading"
          class="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50">
          {{ $t('common.next') }}
        </button>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="selected" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-[#13131e] rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 class="text-base font-bold text-slate-800 dark:text-white">{{ $t('sysLogs.detail_title') }}</h3>
            <p class="text-xs text-slate-500 mt-0.5">{{ selected.category }} — {{ formatDate(selected.created_at) }}</p>
          </div>
          <button @click="selected = null" class="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="overflow-y-auto p-5 space-y-4 flex-1">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-slate-500 dark:text-slate-400">{{ $t('sysLogs.user_label') }}</span> <span class="font-medium text-slate-800 dark:text-slate-200">{{ selected.username || '—' }}</span></div>
            <div><span class="text-slate-500 dark:text-slate-400">IP:</span> <span class="font-medium text-slate-800 dark:text-slate-200">{{ selected.ip_address || '—' }}</span></div>
            <div><span class="text-slate-500 dark:text-slate-400">{{ $t('sysLogs.table_label') }}</span> <span class="font-mono text-blue-600 dark:text-blue-400">{{ selected.entity_table }}</span></div>
            <div><span class="text-slate-500 dark:text-slate-400">{{ $t('sysLogs.record_label') }}</span> <span class="font-mono text-slate-800 dark:text-slate-200 text-xs">{{ selected.entity_id || '—' }}</span></div>
          </div>

          <div v-if="selected.new_data">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {{ selected.action === 'insert' ? $t('sysLogs.data_created') : $t('sysLogs.snapshot_after') }}
            </p>
            <pre class="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-words">{{ JSON.stringify(selected.new_data, null, 2) }}</pre>
          </div>
          <div v-else>
            <p class="text-xs text-slate-400 italic">{{ $t('sysLogs.no_snapshot') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useToast } from '@/composables/useToast.js';

const toast = useToast();

const logs   = ref([]);
const loading = ref(false);
const selected = ref(null);
const meta = ref({ total: 0, page: 1, limit: 50, totalPages: 1 });

const filters = ref({ keyword: '', action: '', entity_table: '', from: '', to: '' });

const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

const actionClass = (action) => {
  if (action === 'insert') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (action === 'update') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
  if (action === 'delete') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-slate-100 text-slate-800';
};

const buildQuery = (page) => {
  const p = new URLSearchParams({ page, limit: 50 });
  if (filters.value.keyword)      p.set('keyword', filters.value.keyword.trim());
  if (filters.value.action)       p.set('action', filters.value.action);
  if (filters.value.entity_table) p.set('entity_table', filters.value.entity_table.trim());
  if (filters.value.from) {
    const d = new Date(filters.value.from);
    if (!isNaN(d)) p.set('from', d.toISOString());
  }
  if (filters.value.to) {
    const d = new Date(filters.value.to);
    if (!isNaN(d)) p.set('to', d.toISOString());
  }
  return p.toString();
};

const loadLogs = async (page = 1) => {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/system/logs?${buildQuery(page)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || `Lỗi tải log (${res.status})`);
      return;
    }
    const data = await res.json();
    logs.value = data.data ?? [];
    meta.value = data.meta ?? { total: 0, page: 1, limit: 50, totalPages: 1 };
  } catch (err) {
    toast.error('Không thể kết nối đến server.');
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.value = { keyword: '', action: '', entity_table: '', from: '', to: '' };
  loadLogs(1);
};

const openDetail = (log) => { selected.value = log; };

onMounted(() => loadLogs());
</script>
