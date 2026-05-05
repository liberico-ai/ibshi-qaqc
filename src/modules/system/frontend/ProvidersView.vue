<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Quản Lý Providers</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Cấu hình các provider tích hợp (ERP, AI, NAS...)</p>
      </div>
      <button @click="openCreate"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Thêm Provider
      </button>
    </div>

    <!-- Table -->
    <div class="card p-0 overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-slate-50 dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-slate-800">
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Tên</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Class</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Module</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Trạng thái</th>
            <th class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="loading && providers.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-slate-500">Đang tải...</td>
          </tr>
          <tr v-else-if="providers.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-slate-500">Chưa có provider nào</td>
          </tr>
          <tr v-for="p in providers" :key="p.id"
            class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <td class="px-4 py-3">
              <div class="font-medium text-slate-800 dark:text-slate-200">{{ p.name }}</div>
              <div v-if="p.description" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ p.description }}</div>
            </td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">{{ p.class_name }}</td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">{{ p.module }}</td>
            <td class="px-4 py-3">
              <span :class="p.is_active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
                class="px-2 py-0.5 rounded-full text-xs font-medium">
                {{ p.is_active ? 'Hoạt động' : 'Vô hiệu' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button @click="testProvider(p)" :disabled="testingId === p.id"
                class="text-xs px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:text-amber-400 disabled:opacity-50 mr-2 transition-colors">
                {{ testingId === p.id ? 'Testing...' : 'Test' }}
              </button>
              <button @click="openEdit(p)"
                class="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-400 mr-2 transition-colors">
                Sửa
              </button>
              <button @click="confirmDelete(p)"
                class="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-400 transition-colors">
                Xóa
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex justify-center gap-1">
      <button v-for="p in pagination.totalPages" :key="p" @click="loadProviders(p)"
        :class="p === pagination.page
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'"
        class="px-3 py-1.5 rounded text-sm font-medium transition-colors">
        {{ p }}
      </button>
    </div>

    <!-- Modal: Create/Edit -->
    <div v-if="modal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeModal"></div>
      <div class="relative bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl w-full max-w-lg">
        <div class="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 class="text-base font-semibold text-slate-800 dark:text-slate-100">
            {{ modal.editing ? 'Sửa Provider' : 'Thêm Provider' }}
          </h3>
          <button @click="closeModal" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <form @submit.prevent="submitModal" class="p-5 space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tên hiển thị *</label>
            <input v-model="form.name" required placeholder="VD: ibshi ERP Webhook Prod"
              class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
          </div>
          <!-- Class -->
          <div v-if="!modal.editing">
            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Provider Class *</label>
            <select v-model="form.class_name" required
              class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
              <option value="">-- Chọn class --</option>
              <option v-for="c in classes" :key="c.className" :value="c.className">
                {{ c.className }} ({{ c.module }})
              </option>
            </select>
          </div>
          <!-- Description -->
          <div>
            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Mô tả</label>
            <input v-model="form.description" placeholder="Mô tả ngắn về provider này"
              class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none">
          </div>
          <!-- Active -->
          <div class="flex items-center gap-2">
            <input type="checkbox" id="is_active" v-model="form.is_active"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
            <label for="is_active" class="text-sm text-slate-700 dark:text-slate-300">Kích hoạt</label>
          </div>
          <!-- Config guide -->
          <div v-if="currentGuide" class="rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 p-3 text-xs space-y-1.5">
            <p class="font-semibold text-blue-700 dark:text-blue-400 mb-2">Hướng dẫn cấu hình — {{ activeClassName }}</p>
            <div v-for="field in currentGuide" :key="field.key" class="flex gap-2">
              <code class="shrink-0 font-mono text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 px-1.5 py-0.5 rounded">{{ field.key }}</code>
              <span class="text-blue-700 dark:text-blue-400">
                <span class="font-medium">{{ field.type }}</span> — {{ field.desc }}
                <span v-if="field.example" class="text-blue-500 dark:text-blue-500"> (vd: <em>{{ field.example }}</em>)</span>
              </span>
            </div>
          </div>

          <!-- Config JSON -->
          <div>
            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Config (JSON) <span class="font-normal text-slate-400">— sẽ được mã hóa khi lưu</span>
            </label>
            <textarea v-model="form.configJson" rows="5" :placeholder="currentPlaceholder"
              class="w-full px-3 py-2 text-sm font-mono border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none">
            </textarea>
            <p v-if="configError" class="mt-1 text-xs text-red-500">{{ configError }}</p>
          </div>
          <!-- Actions -->
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="closeModal"
              class="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">
              Hủy
            </button>
            <button type="submit" :disabled="saving"
              class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">
              {{ saving ? 'Đang lưu...' : (modal.editing ? 'Lưu thay đổi' : 'Tạo Provider') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" :class="toast.ok ? 'bg-green-600' : 'bg-red-600'"
      class="fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg max-w-sm">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';

const CONFIG_GUIDES = {
  'IbshiErpSSOProvider': {
    fields: [
      { key: 'mode',  type: 'string', desc: '"mock" để test nội bộ, "live" để kết nối thật', example: 'live' },
      { key: 'url',   type: 'string', desc: 'Base URL của ERP SSO API', example: 'https://erp.ibshi.com' },
      { key: 'token', type: 'string', desc: 'Bearer token xác thực với ERP' },
    ],
    placeholder: '{\n  "mode": "mock",\n  "url": "",\n  "token": ""\n}',
  },
  'IbshiErpWebhookProvider': {
    fields: [
      { key: 'mode',   type: 'string', desc: '"mock" hoặc "live"', example: 'live' },
      { key: 'url',    type: 'string', desc: 'Endpoint webhook của ERP nhận sự kiện', example: 'https://erp.ibshi.com/webhook' },
      { key: 'secret', type: 'string', desc: 'HMAC-SHA256 secret để ký payload gửi đi' },
    ],
    placeholder: '{\n  "mode": "mock",\n  "url": "",\n  "secret": ""\n}',
  },
  'IbshiErpProjectsProvider': {
    fields: [
      { key: 'mode',  type: 'string', desc: '"mock" hoặc "live"', example: 'live' },
      { key: 'url',   type: 'string', desc: 'Base URL API ERP Projects', example: 'https://erp.ibshi.com' },
      { key: 'token', type: 'string', desc: 'Bearer token xác thực' },
    ],
    placeholder: '{\n  "mode": "mock",\n  "url": "",\n  "token": ""\n}',
  },
  'IbshiErpNASProvider': {
    fields: [
      { key: 'mode',  type: 'string', desc: '"mock" hoặc "live"', example: 'live' },
      { key: 'url',   type: 'string', desc: 'Base URL NAS API', example: 'https://nas.ibshi.com' },
      { key: 'token', type: 'string', desc: 'Bearer token xác thực NAS' },
    ],
    placeholder: '{\n  "mode": "mock",\n  "url": "",\n  "token": ""\n}',
  },
  'AIStandardsLookupProvider': {
    fields: [
      { key: 'mode',    type: 'string', desc: '"rule-based" (không cần API key) hoặc "gemini"', example: 'gemini' },
      { key: 'api_key', type: 'string', desc: 'Google Gemini API key (chỉ cần khi mode=gemini)' },
    ],
    placeholder: '{\n  "mode": "rule-based",\n  "api_key": ""\n}',
  },
  'AIMTCCrossCheckProvider': {
    fields: [
      { key: 'mode',    type: 'string', desc: '"rule-based" hoặc "gemini"', example: 'gemini' },
      { key: 'api_key', type: 'string', desc: 'Google Gemini API key (chỉ cần khi mode=gemini)' },
    ],
    placeholder: '{\n  "mode": "rule-based",\n  "api_key": ""\n}',
  },
};

const providers = ref([]);
const classes = ref([]);
const loading = ref(false);
const saving = ref(false);
const testingId = ref(null);
const pagination = ref({ page: 1, totalPages: 1 });
const configError = ref('');

const modal = ref({ show: false, editing: null });
const form = ref({ name: '', class_name: '', description: '', is_active: true, configJson: '' });

const activeClassName = computed(() => modal.value.editing?.class_name ?? form.value.class_name);
const currentGuide = computed(() => CONFIG_GUIDES[activeClassName.value]?.fields ?? null);
const currentPlaceholder = computed(() => CONFIG_GUIDES[activeClassName.value]?.placeholder ?? '{\n  \n}');
const toast = ref({ show: false, ok: true, message: '' });

async function loadProviders(page = 1) {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/system/providers?page=${page}`);
    const json = await res.json();
    providers.value = json.data;
    pagination.value = json.pagination;
  } finally {
    loading.value = false;
  }
}

async function loadClasses() {
  try {
    const res = await apiFetch('/api/system/providers/classes');
    const json = await res.json();
    classes.value = json.data;
  } catch { /* ignore */ }
}

function openCreate() {
  form.value = { name: '', class_name: '', description: '', is_active: true, configJson: '{\n  "mode": "mock"\n}' };
  configError.value = '';
  modal.value = { show: true, editing: null };
}

function openEdit(p) {
  form.value = {
    name: p.name,
    class_name: p.class_name,
    description: p.description || '',
    is_active: p.is_active,
    configJson: '',
  };
  configError.value = '';
  modal.value = { show: true, editing: p };
}

function closeModal() {
  modal.value.show = false;
}

async function submitModal() {
  configError.value = '';
  let config = undefined;
  if (form.value.configJson.trim()) {
    try {
      config = JSON.parse(form.value.configJson);
    } catch {
      configError.value = 'JSON không hợp lệ';
      return;
    }
  }

  saving.value = true;
  try {
    const payload = {
      name: form.value.name,
      description: form.value.description,
      is_active: form.value.is_active,
      ...(config !== undefined && { config }),
    };

    let res;
    if (modal.value.editing) {
      res = await apiFetch(`/api/system/providers/${modal.value.editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      payload.class_name = form.value.class_name;
      payload.module = classes.value.find(c => c.className === form.value.class_name)?.module ?? 'unknown';
      res = await apiFetch('/api/system/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const err = await res.json();
      showToast(false, err.error || 'Có lỗi xảy ra');
      return;
    }
    closeModal();
    await loadProviders(pagination.value.page);
    showToast(true, modal.value.editing ? 'Đã cập nhật provider' : 'Đã tạo provider');
  } finally {
    saving.value = false;
  }
}

async function testProvider(p) {
  testingId.value = p.id;
  try {
    const res = await apiFetch(`/api/system/providers/${p.id}/test`, { method: 'POST' });
    const json = await res.json();
    showToast(json.ok, json.message || (json.ok ? 'Kết nối thành công' : 'Kết nối thất bại'));
  } catch {
    showToast(false, 'Lỗi khi test provider');
  } finally {
    testingId.value = null;
  }
}

async function confirmDelete(p) {
  if (!confirm(`Vô hiệu hóa provider "${p.name}"?`)) return;
  try {
    const res = await apiFetch(`/api/system/providers/${p.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    await loadProviders(pagination.value.page);
    showToast(true, 'Đã vô hiệu hóa provider');
  } catch {
    showToast(false, 'Có lỗi khi xóa provider');
  }
}

function showToast(ok, message) {
  toast.value = { show: true, ok, message };
  setTimeout(() => { toast.value.show = false; }, 3500);
}

onMounted(() => {
  loadProviders();
  loadClasses();
});
</script>
