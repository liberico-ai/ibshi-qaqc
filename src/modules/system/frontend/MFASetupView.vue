<template>
  <div class="max-w-lg mx-auto py-10 px-4">
    <div class="bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-xl border border-gray-200 dark:border-[#252540] p-8">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-slate-800 dark:text-white">Thiết lập xác thực hai yếu tố</h1>
          <p class="text-sm text-slate-500 dark:text-gray-400">Bảo vệ tài khoản của bạn</p>
        </div>
      </div>

      <!-- Active factors list -->
      <div v-if="factors.length" class="mb-6">
        <h2 class="text-sm font-semibold text-slate-600 dark:text-gray-400 mb-3 uppercase tracking-wide">Đã kích hoạt</h2>
        <div class="space-y-2">
          <div v-for="f in factors" :key="f.id"
               class="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">{{ f.factor_type.toUpperCase() }}</span>
              <span class="text-sm text-slate-700 dark:text-gray-300">{{ f.factor_name }}</span>
            </div>
            <button @click="disableFactor(f.id)"
                    class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors">Tắt</button>
          </div>
        </div>

        <!-- Backup codes -->
        <button @click="fetchBackupCodes" class="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Tạo lại backup codes
        </button>
      </div>

      <!-- Backup codes display -->
      <div v-if="backupCodes.length" class="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
        <p class="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Lưu lại 10 backup codes — chỉ hiển thị một lần</p>
        <div class="grid grid-cols-2 gap-1 font-mono text-sm text-slate-700 dark:text-gray-300">
          <span v-for="c in backupCodes" :key="c">{{ c }}</span>
        </div>
        <button @click="backupCodes = []" class="mt-3 text-xs text-slate-500 hover:underline">Đã lưu, đóng</button>
      </div>

      <!-- Add new factor -->
      <h2 class="text-sm font-semibold text-slate-600 dark:text-gray-400 mb-3 uppercase tracking-wide">Thêm phương thức mới</h2>
      <div class="flex gap-2 flex-wrap mb-5">
        <button v-for="t in ['totp', 'hotp', 'passkey']" :key="t"
                @click="activeTab = t"
                :class="['px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-[#0f1117] text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-[#252540]']">
          {{ t === 'totp' ? 'Authenticator App (TOTP)' : t === 'hotp' ? 'Telegram (HOTP)' : 'Passkey (sinh trắc học)' }}
        </button>
      </div>

      <!-- TOTP setup -->
      <div v-if="activeTab === 'totp'">
        <div v-if="!totp.factorId" class="space-y-4">
          <input v-model="totp.name" placeholder="Tên thiết bị, vd: Điện thoại cá nhân"
                 class="w-full input-base" />
          <button @click="initTOTP" :disabled="loading"
                  class="w-full btn-primary">
            {{ loading ? 'Đang tạo...' : 'Tạo QR Code' }}
          </button>
        </div>

        <div v-else class="space-y-4">
          <p class="text-sm text-slate-600 dark:text-gray-400">Quét QR bằng Google Authenticator / Authy:</p>
          <img :src="totp.qr" alt="QR Code" class="mx-auto w-48 h-48 rounded-lg border border-gray-200 dark:border-[#252540]" />
          <p class="text-xs text-center text-slate-500 dark:text-gray-500">Hoặc nhập thủ công: <code class="font-mono">{{ totp.secret }}</code></p>
          <OTPInput ref="totpInput" v-model="totp.token" @complete="enrollTOTP" />
          <button @click="enrollTOTP" :disabled="loading || totp.token.length < 6" class="w-full btn-primary">
            {{ loading ? 'Đang xác nhận...' : 'Xác nhận & Kích hoạt' }}
          </button>
          <button @click="cancelTOTP" class="w-full text-sm text-slate-500 hover:underline">Hủy</button>
        </div>
      </div>

      <!-- HOTP setup -->
      <div v-if="activeTab === 'hotp'">
        <div v-if="!hotp.factorId" class="space-y-4">
          <input v-model="hotp.name" placeholder="Tên, vd: Telegram cá nhân" class="w-full input-base" />
          <select v-model="hotp.provider" class="w-full input-base">
            <option value="">-- Chọn kênh gửi --</option>
            <option v-for="p in hotpProviders" :key="p.name" :value="p.name">{{ p.description || p.name }}</option>
          </select>
          <input v-model="hotp.destination" :placeholder="hotp.provider.includes('telegram') ? 'Telegram Chat ID' : 'Địa chỉ nhận'"
                 class="w-full input-base" />
          <button @click="initHOTP" :disabled="loading || !hotp.provider"
                  class="w-full btn-primary">
            {{ loading ? 'Đang gửi OTP...' : 'Gửi OTP thử' }}
          </button>
        </div>

        <div v-else class="space-y-4">
          <p class="text-sm text-slate-600 dark:text-gray-400">Nhập mã OTP vừa nhận được:</p>
          <OTPInput ref="hotpInput" v-model="hotp.token" @complete="enrollHOTP" />
          <button @click="resendHOTP" :disabled="loading" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Gửi lại OTP
          </button>
          <button @click="enrollHOTP" :disabled="loading || hotp.token.length < 6" class="w-full btn-primary">
            {{ loading ? 'Đang xác nhận...' : 'Xác nhận & Kích hoạt' }}
          </button>
          <button @click="cancelHOTP" class="w-full text-sm text-slate-500 hover:underline">Hủy</button>
        </div>
      </div>

      <!-- Passkey setup -->
      <div v-if="activeTab === 'passkey'" class="space-y-4">
        <div class="p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-sm text-blue-800 dark:text-blue-300">
          <p class="font-semibold mb-1">Passkey là gì?</p>
          <p>Passkey dùng sinh trắc học (vân tay, Face ID) hoặc PIN thiết bị để đăng nhập — không cần mật khẩu. Chỉ hoạt động trên trình duyệt và thiết bị hỗ trợ WebAuthn.</p>
        </div>
        <input v-model="passkeyName" placeholder="Tên thiết bị, vd: MacBook Touch ID"
               class="w-full input-base" />
        <button @click="registerPasskey" :disabled="loading"
                class="w-full btn-primary">
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0a6 6 0 1112 0v1H6v-1zm-2 5h16v2H4v-2z"/></svg>
          {{ loading ? 'Đang đăng ký...' : 'Đăng ký Passkey' }}
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" class="mt-4 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-100 dark:border-red-500/20 text-center">
        {{ error }}
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import OTPInput from '../../../components/OTPInput.vue';
import { startRegistration } from '@simplewebauthn/browser';

const factors = ref([]);
const backupCodes = ref([]);
const hotpProviders = ref([]);
const activeTab = ref('totp');
const loading = ref(false);
const error = ref('');

const totp = ref({ factorId: null, name: '', qr: '', secret: '', token: '' });
const hotpInput = ref(null);
const totpInput = ref(null);
const hotp = ref({ factorId: null, name: '', provider: '', destination: '', token: '' });
const passkeyName = ref('');

const api = (path, opts = {}) =>
  fetch(path, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, ...opts });

async function load() {
  const [fRes, pRes] = await Promise.all([
    api('/api/system/mfa/factors'),
    api('/api/system/mfa/providers'),
  ]);
  factors.value = (await fRes.json()).factors ?? [];
  hotpProviders.value = (await pRes.json()).providers ?? [];
}

onMounted(load);

async function disableFactor(id) {
  if (!confirm('Tắt factor này?')) return;
  await api(`/api/system/mfa/factors/${id}`, { method: 'DELETE' });
  await load();
}

async function fetchBackupCodes() {
  if (!confirm('Tạo bộ backup codes mới sẽ xóa bộ cũ. Tiếp tục?')) return;
  const res = await api('/api/system/mfa/backup-codes');
  backupCodes.value = (await res.json()).codes ?? [];
}

async function initTOTP() {
  error.value = '';
  loading.value = true;
  try {
    const res = await api('/api/system/mfa/factors/totp/init', {
      method: 'POST',
      body: JSON.stringify({ factor_name: totp.value.name || 'Authenticator App' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    totp.value.factorId = data.factorId;
    totp.value.qr = data.qrCodeDataUrl;
    totp.value.secret = data.secret;
  } catch (e) { error.value = e.message; }
  finally { loading.value = false; }
}

async function enrollTOTP() {
  if (totp.value.token.length < 6) return;
  error.value = '';
  loading.value = true;
  try {
    const res = await api(`/api/system/mfa/factors/totp/${totp.value.factorId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ token: totp.value.token }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    totp.value = { factorId: null, name: '', qr: '', secret: '', token: '' };
    await load();
    await fetchBackupCodes();
  } catch (e) {
    error.value = e.message;
    totpInput.value?.clear();
  } finally { loading.value = false; }
}

async function cancelTOTP() {
  if (totp.value.factorId) {
    await api(`/api/system/mfa/factors/${totp.value.factorId}/pending`, { method: 'DELETE' });
  }
  totp.value = { factorId: null, name: '', qr: '', secret: '', token: '' };
}

async function initHOTP() {
  error.value = '';
  loading.value = true;
  try {
    const res = await api('/api/system/mfa/factors/hotp/init', {
      method: 'POST',
      body: JSON.stringify({ factor_name: hotp.value.name || 'Telegram', provider_name: hotp.value.provider, destination: hotp.value.destination }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    hotp.value.factorId = data.factorId;
  } catch (e) { error.value = e.message; }
  finally { loading.value = false; }
}

async function resendHOTP() {
  loading.value = true;
  try {
    await api(`/api/system/mfa/factors/hotp/${hotp.value.factorId}/send`, { method: 'POST' });
    hotpInput.value?.clear();
  } catch (e) { error.value = e.message; }
  finally { loading.value = false; }
}

async function enrollHOTP() {
  if (hotp.value.token.length < 6) return;
  error.value = '';
  loading.value = true;
  try {
    const res = await api(`/api/system/mfa/factors/hotp/${hotp.value.factorId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ token: hotp.value.token }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    hotp.value = { factorId: null, name: '', provider: '', destination: '', token: '' };
    await load();
    await fetchBackupCodes();
  } catch (e) {
    error.value = e.message;
    hotpInput.value?.clear();
  } finally { loading.value = false; }
}

async function cancelHOTP() {
  if (hotp.value.factorId) {
    await api(`/api/system/mfa/factors/${hotp.value.factorId}/pending`, { method: 'DELETE' });
  }
  hotp.value = { factorId: null, name: '', provider: '', destination: '', token: '' };
}

async function registerPasskey() {
  error.value = '';
  loading.value = true;
  try {
    const optRes = await api('/api/system/mfa/passkey/options');
    const options = await optRes.json();
    if (!optRes.ok) throw new Error(options.error || 'Không lấy được options');

    const response = await startRegistration({ optionsJSON: options });

    const enrollRes = await api('/api/system/mfa/passkey/enroll', {
      method: 'POST',
      body: JSON.stringify({ factor_name: passkeyName.value || 'Passkey', response }),
    });
    const data = await enrollRes.json();
    if (!enrollRes.ok) throw new Error(data.error || 'Đăng ký thất bại');

    passkeyName.value = '';
    await load();
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      error.value = 'Người dùng đã huỷ xác thực passkey';
    } else {
      error.value = e.message;
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.input-base {
  @apply bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-[#252540] rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 shadow-sm transition-all;
}
.btn-primary {
  @apply bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 flex items-center justify-center gap-2 rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50;
}
</style>
