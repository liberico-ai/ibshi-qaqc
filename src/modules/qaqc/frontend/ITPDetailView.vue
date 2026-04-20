<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <router-link to="/qaqc/itp" class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </router-link>
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">
        ITP — {{ plan?.product_type }} v{{ plan?.version }}
      </h2>
      <span v-if="plan" class="px-2 py-0.5 rounded-full text-xs font-medium" :class="statusClass(plan.status)">{{ plan.status }}</span>
    </div>

    <div v-if="loading" class="card p-8 text-center text-slate-500">Đang tải...</div>
    <template v-else-if="plan">
      <!-- Actions -->
      <div v-can="'qaqc.itp.write'" class="flex gap-2 flex-wrap">
        <button v-if="plan.status === 'DRAFT'" @click="transition('UNDER_REVIEW')"
          class="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Gửi duyệt</button>
        <button v-if="plan.status === 'UNDER_REVIEW'" v-can="'qaqc.itp.approve'" @click="transition('MANAGER_APPROVED')"
          class="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">Manager Approve</button>
        <button v-if="plan.status === 'MANAGER_APPROVED'" v-can="'qaqc.itp.approve'" @click="transition('DIRECTOR_APPROVED')"
          class="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">Director Approve</button>
        <button v-if="plan.status === 'DIRECTOR_APPROVED'" v-can="'qaqc.itp.approve'" @click="transition('ACTIVE')"
          class="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">Kích hoạt</button>
        <button v-can="'qaqc.itp.write'" @click="copy"
          class="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">Copy sang dự án khác</button>
      </div>

      <!-- Items -->
      <div class="card p-0 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span class="font-semibold text-sm text-slate-700 dark:text-slate-300">Danh sách Inspection Points ({{ plan.items?.length ?? 0 }})</span>
          <button v-if="plan.status === 'DRAFT'" v-can="'qaqc.itp.write'" @click="openAddItem"
            class="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Thêm IP
          </button>
        </div>
        <table class="w-full text-sm">
          <thead><tr class="bg-slate-50 dark:bg-[#1a1a2e]">
            <th class="px-4 py-2 text-left text-slate-600 dark:text-slate-400 w-12">Seq</th>
            <th class="px-4 py-2 text-left text-slate-600 dark:text-slate-400">IP Code</th>
            <th class="px-4 py-2 text-left text-slate-600 dark:text-slate-400">Mô tả</th>
            <th class="px-4 py-2 text-center text-slate-600 dark:text-slate-400">Hold</th>
            <th class="px-4 py-2 text-center text-slate-600 dark:text-slate-400">Witness</th>
            <th class="px-4 py-2 text-left text-slate-600 dark:text-slate-400">Checkpoints</th>
          <th v-if="plan.status === 'DRAFT'" class="px-4 py-2"></th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-if="!plan.items?.length"><td colspan="7" class="px-4 py-6 text-center text-slate-500">Chưa có IP — nhấn "Thêm IP" để bắt đầu</td></tr>
            <tr v-for="item in plan.items" :key="item.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
              <td class="px-4 py-2 text-center font-medium text-slate-600 dark:text-slate-400">{{ item.seq }}</td>
              <td class="px-4 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{{ item.ip_code ?? '—' }}</td>
              <td class="px-4 py-2 text-slate-700 dark:text-slate-300 max-w-xs">{{ item.description ?? '—' }}</td>
              <td class="px-4 py-2 text-center">
                <span v-if="item.hold_flag" class="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">H</span>
                <span v-else class="text-slate-300 dark:text-slate-600">—</span>
              </td>
              <td class="px-4 py-2 text-center">
                <span v-if="item.witness_flag" class="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">W</span>
                <span v-else class="text-slate-300 dark:text-slate-600">—</span>
              </td>
              <td class="px-4 py-2 text-slate-500 dark:text-slate-400 text-xs">{{ item.checkpoints?.length ?? 0 }} checkpoint(s)</td>
              <td v-if="plan.status === 'DRAFT'" class="px-4 py-2 text-right">
                <button @click="deleteItem(item.id)" class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400">Xóa</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Add Item modal -->
    <div v-if="itemModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="itemModal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">Thêm Inspection Point</h3>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1">IP Code</label>
            <input v-model="itemForm.ip_code" placeholder="VD: IP-001" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
          </div>
          <div class="flex items-end gap-4 pb-0.5">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="itemForm.hold_flag" class="rounded">
              <span class="text-sm text-slate-700 dark:text-slate-300">Hold (H)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="itemForm.witness_flag" class="rounded">
              <span class="text-sm text-slate-700 dark:text-slate-300">Witness (W)</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Mô tả</label>
          <input v-model="itemForm.description" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Tiêu chí nghiệm thu</label>
          <input v-model="itemForm.acceptance_criteria" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
        </div>

        <!-- Checkpoints -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-slate-500">Checkpoints</label>
            <button @click="addCheckpoint" type="button" class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">+ Thêm checkpoint</button>
          </div>
          <div v-for="(cp, i) in itemForm.checkpoints" :key="i" class="flex gap-2 mb-2 items-center">
            <input v-model="cp.label" placeholder="Nội dung kiểm tra" class="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
            <select v-model="cp.data_type" class="px-2 py-1.5 text-xs border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
              <option value="boolean">Pass/Fail</option>
              <option value="numeric">Numeric</option>
              <option value="text">Text</option>
            </select>
            <label class="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
              <input type="checkbox" v-model="cp.required"> Bắt buộc
            </label>
            <button @click="itemForm.checkpoints.splice(i,1)" class="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
          </div>
          <p v-if="!itemForm.checkpoints.length" class="text-xs text-slate-400">Chưa có checkpoint</p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button @click="itemModal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">Hủy</button>
          <button @click="saveItem" :disabled="savingItem" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
            {{ savingItem ? 'Đang lưu...' : 'Thêm IP' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Copy modal -->
    <div v-if="copyModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="copyModal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">Copy ITP sang dự án</h3>
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Dự án đích *</label>
          <select v-model="copyTargetId" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
            <option value="">-- Chọn dự án --</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
          </select>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="copyModal=false" class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">Hủy</button>
          <button @click="confirmCopy" :disabled="!copyTargetId" class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">Copy</button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useRoute } from 'vue-router';
import { useProjects } from './useProjects.js';

const route = useRoute();
const { projects } = useProjects();
const plan = ref(null);
const loading = ref(false);
const toast = ref({ show: false, ok: true, message: '' });
const copyModal = ref(false);
const copyTargetId = ref('');
const itemModal = ref(false);
const savingItem = ref(false);
const itemForm = ref({ ip_code: '', description: '', hold_flag: false, witness_flag: false, acceptance_criteria: '', checkpoints: [] });

function openAddItem() {
  itemForm.value = { ip_code: '', description: '', hold_flag: false, witness_flag: false, acceptance_criteria: '', checkpoints: [] };
  itemModal.value = true;
}

function addCheckpoint() {
  itemForm.value.checkpoints.push({ label: '', data_type: 'boolean', required: true });
}

async function saveItem() {
  savingItem.value = true;
  try {
    const res = await apiFetch(`/api/qaqc/itp/${route.params.id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemForm.value),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    itemModal.value = false;
    await load();
    showToast(true, 'Đã thêm Inspection Point');
  } catch (e) {
    showToast(false, e.message || 'Lỗi thêm IP');
  } finally {
    savingItem.value = false;
  }
}

async function deleteItem(itemId) {
  if (!confirm('Xóa Inspection Point này?')) return;
  try {
    const res = await apiFetch(`/api/qaqc/itp/${route.params.id}/items/${itemId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
    await load();
    showToast(true, 'Đã xóa IP');
  } catch (e) {
    showToast(false, e.message || 'Lỗi xóa IP');
  }
}

const STATUS_COLORS = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  MANAGER_APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  DIRECTOR_APPROVED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  SUPERSEDED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  ARCHIVED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};
function statusClass(s) { return STATUS_COLORS[s] ?? ''; }

async function load() {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/qaqc/itp/${route.params.id}`);
    plan.value = (await res.json()).data;
  } finally {
    loading.value = false;
  }
}

async function transition(targetStatus) {
  const endpoint = targetStatus === 'UNDER_REVIEW' ? 'submit' : 'approve';
  const body = endpoint === 'approve' ? { targetStatus } : undefined;
  const res = await apiFetch(`/api/qaqc/itp/${route.params.id}/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) { showToast(false, json.error || 'Lỗi chuyển trạng thái'); return; }
  plan.value = json.data;
  showToast(true, `Chuyển sang ${targetStatus} thành công`);
}

function copy() {
  copyTargetId.value = '';
  copyModal.value = true;
}

async function confirmCopy() {
  if (!copyTargetId.value) return;
  copyModal.value = false;
  const res = await apiFetch(`/api/qaqc/itp/${route.params.id}/copy`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetProjectId: copyTargetId.value }),
  });
  const json = await res.json();
  if (!res.ok) { showToast(false, json.error || 'Lỗi copy ITP'); return; }
  const target = projects.value.find(p => p.id === copyTargetId.value);
  showToast(true, `Đã copy ITP sang ${target?.code ?? copyTargetId.value}`);
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(load);
</script>
