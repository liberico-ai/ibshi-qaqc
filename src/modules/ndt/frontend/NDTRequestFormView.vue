<template>
  <div class="max-w-2xl mx-auto">
    <PageHeader title="Tạo yêu cầu NDT (ILS-QAC-F11)">
      <template #actions>
        <router-link to="/ndt/requests" class="btn btn-outline">← Quay lại</router-link>
      </template>
    </PageHeader>

    <UiCard>
      <div class="space-y-4">
        <div>
          <label class="form-label">Số yêu cầu *</label>
          <input v-model="form.request_no" placeholder="VD: NDT-2026-001" class="form-control">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Phương pháp *</label>
            <select v-model="form.method" class="form-control">
              <option value="RT">RT — Chụp ảnh phóng xạ</option>
              <option value="UT">UT — Siêu âm</option>
              <option value="MT">MT — Hạt từ</option>
              <option value="PT">PT — Thẩm thấu</option>
            </select>
          </div>
          <div>
            <label class="form-label">Nhà thầu NDT</label>
            <select v-model="form.vendor_id" class="form-control">
              <option value="">-- Chọn nhà thầu --</option>
              <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}{{ v.is_approved ? '' : ' (chưa duyệt)' }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Mã mối hàn (tham chiếu)</label>
            <input v-model.number="form.weld_joint_ref" type="number" placeholder="Số tham chiếu mối hàn" class="form-control">
          </div>
          <div>
            <label class="form-label">Mã kiểm tra (inspection_id)</label>
            <input v-model="form.inspection_id" placeholder="UUID kiểm tra (tuỳ chọn)" class="form-control">
          </div>
        </div>

        <p class="text-xs text-slate-400">Khi chọn nhà thầu có email, hệ thống sẽ tự gửi thông báo yêu cầu tới nhà thầu.</p>

        <div class="flex justify-end gap-2">
          <router-link to="/ndt/requests" class="btn btn-outline">Hủy</router-link>
          <button @click="submit" :disabled="saving" class="btn btn-primary disabled:opacity-50">
            {{ saving ? 'Đang gửi...' : 'Gửi yêu cầu' }}
          </button>
        </div>
      </div>
    </UiCard>

    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import UiCard from '@/components/UiCard.vue';

const router = useRouter();
const vendors = ref([]);
const saving = ref(false);
const form = ref({ request_no: '', method: 'RT', vendor_id: '', weld_joint_ref: null, inspection_id: '' });
const toast = ref({ show: false, ok: true, message: '' });

async function loadVendors() {
  try {
    const res = await apiFetch('/api/ndt/vendors?limit=200');
    vendors.value = (await res.json()).data ?? [];
  } catch { vendors.value = []; }
}

async function submit() {
  if (!form.value.request_no) { showToast(false, 'Số yêu cầu là bắt buộc'); return; }
  saving.value = true;
  try {
    const payload = {
      request_no: form.value.request_no,
      method: form.value.method,
      ...(form.value.vendor_id && { vendor_id: form.value.vendor_id }),
      ...(form.value.weld_joint_ref != null && form.value.weld_joint_ref !== '' && { weld_joint_ref: Number(form.value.weld_joint_ref) }),
      ...(form.value.inspection_id && { inspection_id: form.value.inspection_id }),
    };
    const res = await apiFetch('/api/ndt/requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Lỗi tạo yêu cầu');
    router.push('/ndt/requests');
  } catch (e) {
    showToast(false, e.message);
  } finally {
    saving.value = false;
  }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(() => loadVendors());
</script>

<style scoped>
.form-label { @apply block text-xs font-semibold text-slate-500 mb-1.5; }
.form-control {
  @apply w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 outline-none
         transition-colors focus:border-blue-400
         dark:border-[#252540] dark:bg-[#12122a] dark:text-slate-100;
}
</style>
