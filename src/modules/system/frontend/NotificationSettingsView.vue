<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Cài đặt thông báo</h2>
      <p class="text-xs text-slate-500 mt-1">Quản lý kênh nhận thông báo và loại sự kiện bạn muốn theo dõi.</p>
    </div>

    <!-- Channels section -->
    <div class="card p-4 space-y-4">
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Kênh đã kết nối</h3>

      <div v-for="ch in channels" :key="ch.channel_class"
        class="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <div class="flex-1">
          <div class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ labelFor(ch.channel_class) }}</div>
          <div class="text-xs text-slate-500">
            <span v-if="identityFor(ch.channel_class)?.is_verified" class="text-green-600 dark:text-green-400">
              ✓ Đã kết nối — {{ maskIdentity(identityFor(ch.channel_class)?.identity) }}
            </span>
            <span v-else class="text-slate-400">Chưa kết nối</span>
          </div>
        </div>

        <template v-if="ch.channel_class === 'notification-telegram'">
          <button v-if="!identityFor(ch.channel_class)?.is_verified" @click="linkTelegram"
            class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            Kết nối Telegram
          </button>
          <button v-else @click="unlink(ch.channel_class)"
            class="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded-lg">
            Hủy kết nối
          </button>
        </template>

        <template v-else-if="ch.channel_class === 'notification-mattermost'">
          <button v-if="!identityFor(ch.channel_class)?.is_verified" @click="openMattermost"
            class="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
            Dán webhook URL
          </button>
          <button v-else @click="unlink(ch.channel_class)"
            class="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded-lg">
            Hủy kết nối
          </button>
        </template>

        <template v-else>
          <span class="text-xs text-slate-400">Chưa hỗ trợ</span>
        </template>
      </div>
    </div>

    <!-- Prefs matrix -->
    <div class="card p-0 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Sự kiện theo kênh</h3>
      </div>
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-slate-50 dark:bg-[#1a1a2e] border-b border-slate-200 dark:border-slate-800">
            <th class="text-left px-4 py-2 font-semibold text-slate-600 dark:text-slate-400">Sự kiện</th>
            <th v-for="ch in channels" :key="ch.channel_class"
              class="px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 text-center">
              {{ labelFor(ch.channel_class) }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="ev in eventTypes" :key="ev.key">
            <td class="px-4 py-2 text-slate-700 dark:text-slate-300">{{ ev.label }}</td>
            <td v-for="ch in channels" :key="ch.channel_class" class="text-center px-4 py-2">
              <input type="checkbox"
                :checked="isEnabled(ev.key, ch.channel_class)"
                @change="togglePref(ev.key, ch.channel_class, $event.target.checked)"
                :disabled="!identityFor(ch.channel_class)?.is_verified"
                class="w-4 h-4 rounded accent-blue-600" />
            </td>
          </tr>
        </tbody>
      </table>
      <div class="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <button @click="savePrefs" :disabled="saving"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
          {{ saving ? 'Đang lưu...' : 'Lưu thay đổi' }}
        </button>
      </div>
    </div>

    <!-- Telegram link modal -->
    <Teleport to="body">
      <div v-if="telegramModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="telegramModal.show = false"></div>
        <div class="relative z-10 w-full max-w-md bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl p-5 space-y-4">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Kết nối Telegram</h3>
          <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-slate-700 dark:text-slate-300 space-y-2">
            <p>1. Mở Telegram.</p>
            <p>2. Gửi lệnh sau tới bot:</p>
            <pre class="mt-2 px-3 py-2 bg-white dark:bg-[#0f0f24] rounded text-center font-mono text-base font-bold text-blue-600 dark:text-blue-400">/link {{ telegramModal.code }}</pre>
            <p class="text-xs text-slate-500">Mã hết hạn sau 15 phút.</p>
          </div>
          <p class="text-xs text-slate-500">{{ telegramModal.instructions }}</p>
          <div class="flex justify-end gap-2">
            <button @click="telegramModal.show = false" class="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">Đóng</button>
            <button @click="reload" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
              Kiểm tra lại
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Mattermost link modal -->
    <Teleport to="body">
      <div v-if="mattermostModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="mattermostModal.show = false"></div>
        <div class="relative z-10 w-full max-w-md bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl p-5 space-y-4">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Kết nối Mattermost</h3>
          <p class="text-xs text-slate-500">Tạo Incoming Webhook trên Mattermost và dán URL vào ô bên dưới.</p>
          <input v-model="mattermostModal.url" type="url" placeholder="https://mattermost.example.com/hooks/..."
            class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none" />
          <div class="flex justify-end gap-2">
            <button @click="mattermostModal.show = false" class="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">Hủy</button>
            <button @click="saveMattermost" :disabled="mattermostModal.saving || !mattermostModal.url"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg">
              {{ mattermostModal.saving ? 'Đang lưu...' : 'Lưu' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';

const CHANNEL_LABELS = {
  'notification-telegram':   'Telegram',
  'notification-mattermost': 'Mattermost',
  'notification-email':      'Email',
};

const eventTypes = [
  { key: 'ITP_SUBMITTED',       label: 'ITP chờ duyệt' },
  { key: 'ITP_APPROVED',        label: 'ITP đã duyệt' },
  { key: 'ITP_REJECTED',        label: 'ITP bị từ chối' },
  { key: 'NCR_CREATED',         label: 'NCR tạo mới' },
  { key: 'NCR_HIGH_SEVERITY',   label: 'NCR nghiêm trọng' },
  { key: 'INSPECTION_OVERDUE',  label: 'Inspection quá hạn' },
  { key: 'MIR_NEEDS_DECISION',  label: 'MIR chờ quyết định' },
  { key: 'MIR_DECIDED',         label: 'MIR đã quyết định' },
  { key: 'HOLD_POINT_RELEASED', label: 'Hold Point released' },
  { key: 'HOLD_POINT_OVERRIDE', label: 'Hold Point override' },
];

const channels = ref([]);
const identities = ref([]);
const prefs = ref([]);
const saving = ref(false);

const telegramModal = reactive({ show: false, code: '', instructions: '' });
const mattermostModal = reactive({ show: false, url: '', saving: false });

function labelFor(cc) { return CHANNEL_LABELS[cc] ?? cc; }

function identityFor(cc) {
  return identities.value.find(i => i.channel_class === cc);
}

function maskIdentity(v) {
  if (!v) return '';
  if (v.startsWith('http')) return v.slice(0, 40) + '...';
  return v.slice(0, 3) + '***' + v.slice(-3);
}

function isEnabled(eventType, channelClass) {
  return prefs.value.some(p => p.event_type === eventType && p.channel_class === channelClass && p.enabled);
}

function togglePref(eventType, channelClass, enabled) {
  const idx = prefs.value.findIndex(p => p.event_type === eventType && p.channel_class === channelClass);
  if (idx >= 0) prefs.value[idx].enabled = enabled;
  else prefs.value.push({ event_type: eventType, channel_class: channelClass, enabled });
}

async function reload() {
  const res = await apiFetch('/api/system/notifications/prefs');
  if (res.ok) {
    const json = await res.json();
    const channelNames = json.data.channels ?? [];
    channels.value = channelNames.map(c => ({ channel_class: c }));
    identities.value = json.data.identities ?? [];
    prefs.value = json.data.prefs ?? [];
  }
}

async function savePrefs() {
  saving.value = true;
  try {
    await apiFetch('/api/system/notifications/prefs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefs: prefs.value }),
    });
  } finally {
    saving.value = false;
  }
}

async function linkTelegram() {
  const res = await apiFetch('/api/system/notifications/channels/notification-telegram/link/initiate', { method: 'POST' });
  if (res.ok) {
    const json = await res.json();
    telegramModal.code = json.data.code;
    telegramModal.instructions = json.data.instructions;
    telegramModal.show = true;
  }
}

function openMattermost() {
  mattermostModal.url = '';
  mattermostModal.show = true;
}

async function saveMattermost() {
  mattermostModal.saving = true;
  try {
    const res = await apiFetch('/api/system/notifications/channels/notification-mattermost/link/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: mattermostModal.url }),
    });
    if (res.ok) {
      mattermostModal.show = false;
      await reload();
    }
  } finally {
    mattermostModal.saving = false;
  }
}

async function unlink(channelClass) {
  if (!confirm('Hủy kết nối kênh này?')) return;
  await apiFetch(`/api/system/notifications/channels/${channelClass}`, { method: 'DELETE' });
  await reload();
}

onMounted(reload);
</script>
