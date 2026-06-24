<template>
  <div>
    <PageHeader title="Bản đồ mối hàn" subtitle="Quản lý mối hàn theo bản vẽ & WPS">
      <template #actions>
        <button v-can="'welding.weldmap.write'" @click="openCreateMap" class="btn btn-primary">+ Tạo bản đồ</button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Map list -->
      <UiCard body-class="p-0">
        <template #header><div class="card-title">Danh sách bản đồ</div></template>
        <div class="divide-y divide-slate-100 dark:divide-[#252540] max-h-[60vh] overflow-y-auto">
          <div v-if="loadingMaps" class="px-4 py-6 text-center text-slate-500 text-sm">Đang tải...</div>
          <div v-else-if="!maps.length" class="px-4 py-6 text-center text-slate-500 text-sm">Chưa có bản đồ</div>
          <button v-for="m in maps" :key="m.id" @click="selectMap(m.id)"
            :class="selected?.id === m.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'"
            class="w-full text-left px-4 py-3 transition-colors">
            <div class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ m.name ?? '(không tên)' }}</div>
            <div class="text-xs text-slate-500">Bản vẽ: {{ m.drawing_no ?? '—' }}</div>
          </button>
        </div>
      </UiCard>

      <!-- Joints -->
      <UiCard body-class="p-0 overflow-x-auto" class="lg:col-span-2">
        <template #header>
          <div class="card-title">Mối hàn {{ selected ? `— ${selected.name ?? selected.drawing_no ?? ''}` : '' }}</div>
        </template>
        <template #actions>
          <button v-if="selected" v-can="'welding.weldmap.write'" @click="openAddJoint" class="btn btn-primary btn-sm">+ Mối hàn</button>
        </template>
        <table v-if="selected" class="qc-table">
          <thead>
            <tr>
              <th>Số mối</th>
              <th>WPS</th>
              <th>Thợ hàn</th>
              <th>NDT</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!selected.joints?.length"><td colspan="5" class="text-center text-slate-400 py-6">Chưa có mối hàn</td></tr>
            <tr v-for="j in selected.joints" :key="j.id">
              <td class="font-semibold text-slate-800 dark:text-slate-200">{{ j.joint_no }}</td>
              <td>{{ j.wps_no ?? '—' }}</td>
              <td>{{ j.welder_code ? `${j.welder_code} — ${j.welder_name}` : '—' }}</td>
              <td><StatusTag :type="j.ndt_required ? 'blue' : 'gray'" :label="j.ndt_required ? 'Có' : 'Không'" /></td>
              <td><StatusTag :status="j.status" :label="j.status" /></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="px-4 py-10 text-center text-slate-400 text-sm">Chọn một bản đồ để xem mối hàn</div>
      </UiCard>
    </div>

    <!-- Create Map Modal -->
    <div v-if="mapModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="mapModal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">Tạo bản đồ mối hàn</h3>
        <div>
          <label class="form-label">Tên</label>
          <input v-model="mapForm.name" class="form-control">
        </div>
        <div>
          <label class="form-label">Số bản vẽ</label>
          <input v-model="mapForm.drawing_no" class="form-control">
        </div>
        <div class="flex justify-end gap-2">
          <button @click="mapModal=false" class="btn btn-outline">Hủy</button>
          <button @click="createMap" class="btn btn-primary">Lưu</button>
        </div>
      </div>
    </div>

    <!-- Add Joint Modal -->
    <div v-if="jointModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="jointModal=false"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">Thêm mối hàn</h3>
        <div>
          <label class="form-label">Số mối hàn *</label>
          <input v-model="jointForm.joint_no" class="form-control">
        </div>
        <div>
          <label class="form-label">WPS</label>
          <select v-model="jointForm.wps_id" class="form-control">
            <option value="">-- Chọn WPS --</option>
            <option v-for="w in wpsList" :key="w.id" :value="w.id">{{ w.wps_no }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Thợ hàn</label>
          <select v-model="jointForm.welder_id" class="form-control">
            <option value="">-- Chọn thợ hàn --</option>
            <option v-for="w in welderList" :key="w.id" :value="w.id" :disabled="w.cert?.status === 'EXPIRED'">
              {{ w.welder_code }} — {{ w.full_name }} ({{ w.cert?.label }})
            </option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" v-model="jointForm.ndt_required"> Yêu cầu NDT
        </label>
        <div class="flex justify-end gap-2">
          <button @click="jointModal=false" class="btn btn-outline">Hủy</button>
          <button @click="addJoint" class="btn btn-primary">Thêm</button>
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
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';

const maps = ref([]);
const loadingMaps = ref(false);
const selected = ref(null);
const wpsList = ref([]);
const welderList = ref([]);
const mapModal = ref(false);
const mapForm = ref({ name: '', drawing_no: '' });
const jointModal = ref(false);
const jointForm = ref({ joint_no: '', wps_id: '', welder_id: '', ndt_required: false });
const toast = ref({ show: false, ok: true, message: '' });

async function loadMaps() {
  loadingMaps.value = true;
  try {
    const res = await apiFetch('/api/welding/weldmaps?limit=200');
    maps.value = (await res.json()).data ?? [];
  } finally {
    loadingMaps.value = false;
  }
}

async function selectMap(id) {
  const res = await apiFetch(`/api/welding/weldmaps/${id}`);
  selected.value = (await res.json()).data;
}

function openCreateMap() {
  mapForm.value = { name: '', drawing_no: '' };
  mapModal.value = true;
}

async function createMap() {
  try {
    const res = await apiFetch('/api/welding/weldmaps', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapForm.value),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Lỗi tạo bản đồ');
    mapModal.value = false;
    showToast(true, 'Đã tạo bản đồ');
    loadMaps();
  } catch (e) {
    showToast(false, e.message);
  }
}

async function openAddJoint() {
  jointForm.value = { joint_no: '', wps_id: '', welder_id: '', ndt_required: false };
  // Tải danh sách WPS và thợ hàn để chọn
  const [wRes, welRes] = await Promise.all([
    apiFetch('/api/welding/wps?limit=200'),
    apiFetch('/api/welding/welders?limit=200'),
  ]);
  wpsList.value = (await wRes.json()).data ?? [];
  welderList.value = (await welRes.json()).data ?? [];
  jointModal.value = true;
}

async function addJoint() {
  if (!jointForm.value.joint_no) { showToast(false, 'Số mối hàn là bắt buộc'); return; }
  try {
    const payload = {
      joint_no: jointForm.value.joint_no,
      ndt_required: jointForm.value.ndt_required,
      ...(jointForm.value.wps_id && { wps_id: jointForm.value.wps_id }),
      ...(jointForm.value.welder_id && { welder_id: jointForm.value.welder_id }),
    };
    const res = await apiFetch(`/api/welding/weldmaps/${selected.value.id}/joints`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Lỗi thêm mối hàn');
    jointModal.value = false;
    showToast(true, 'Đã thêm mối hàn');
    selectMap(selected.value.id);
  } catch (e) {
    showToast(false, e.message);
  }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(() => loadMaps());
</script>

<style scoped>
.form-label { @apply block text-xs font-semibold text-slate-500 mb-1.5; }
.form-control {
  @apply w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 outline-none
         transition-colors focus:border-blue-400
         dark:border-[#252540] dark:bg-[#12122a] dark:text-slate-100;
}
</style>
