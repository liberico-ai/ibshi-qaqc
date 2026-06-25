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

        <p class="text-xs text-slate-400">Khi chọn nhà thầu có email, hệ thống sẽ tự gửi thông báo yêu cầu kèm liên kết token tới nhà thầu.</p>

        <!-- Hiển thị token nhà thầu sau khi tạo (nếu có) để copy/gửi tay -->
        <div v-if="vendorTokenLink" class="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-3 space-y-2">
          <div class="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Liên kết nộp kết quả cho nhà thầu (token dùng 1 lần)</div>
          <div class="flex gap-2 items-center">
            <input :value="vendorTokenLink" readonly class="form-control text-xs flex-1" />
            <button @click="copyToken" type="button" class="btn btn-outline btn-sm">Sao chép</button>
          </div>
          <div class="text-right">
            <router-link to="/ndt/requests" class="text-xs text-blue-600 hover:underline">Xong → về danh sách</router-link>
          </div>
        </div>

        <div v-else class="flex justify-end gap-2">
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
const vendorTokenLink = ref('');

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
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Lỗi tạo yêu cầu');
    // Nếu đã gửi nhà thầu → backend trả token; hiển thị liên kết để copy thay vì chuyển trang ngay.
    if (json.data?.vendor_token) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      vendorTokenLink.value = `${origin}/ndt/vendor/submit?token=${json.data.vendor_token}`;
      showToast(true, 'Đã tạo yêu cầu & sinh token nhà thầu');
    } else {
      router.push('/ndt/requests');
    }
  } catch (e) {
    showToast(false, e.message);
  } finally {
    saving.value = false;
  }
}

async function copyToken() {
  try {
    if (navigator?.clipboard) await navigator.clipboard.writeText(vendorTokenLink.value);
    showToast(true, 'Đã sao chép liên kết');
  } catch {
    showToast(false, 'Không sao chép được');
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
