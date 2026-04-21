<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1117] transition-colors relative overflow-hidden">
    <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>

    <div class="w-full max-w-md p-8 bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#252540] relative z-10 mx-4">

      <!-- Step 1: password -->
      <template v-if="step === 'password'">
        <div class="text-center mb-8">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-4">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h2 class="text-2xl font-bold text-slate-800 dark:text-white">Welcome Back</h2>
          <p class="text-sm text-slate-500 dark:text-gray-400 mt-2">Sign in to the Operations Platform to continue.</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Tài Khoản</label>
            <input v-model="form.username" required type="text" class="w-full input-base" placeholder="Enter your username">
          </div>
          <div>
            <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Password</label>
            <input v-model="form.password" required type="password" class="w-full input-base" placeholder="••••••••">
          </div>

          <div v-if="errorMessage" class="error-box">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {{ errorMessage }}
          </div>

          <button :disabled="loading" type="submit" class="w-full btn-primary mt-4">
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
          </button>
        </form>

        <div class="relative my-5">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200 dark:border-[#252540]"></div></div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="px-2 bg-white dark:bg-[#1a1a2e] text-slate-400">hoặc</span>
          </div>
        </div>

        <button @click="loginWithPasskey" :disabled="loading"
                class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-200 dark:border-[#252540] bg-white dark:bg-[#0f1117] text-slate-700 dark:text-gray-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-[#252540] transition-all disabled:opacity-50 shadow-sm">
          <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0a6 6 0 1112 0v1H6v-1zm-2 5h16v2H4v-2z"/>
          </svg>
          Đăng nhập bằng Passkey
        </button>
      </template>

      <!-- Step 2: MFA verify -->
      <template v-else-if="step === 'mfa'">
        <div class="text-center mb-6">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-4">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-slate-800 dark:text-white">Xác thực hai yếu tố</h2>
          <p class="text-sm text-slate-500 dark:text-gray-400 mt-1">
            {{ useBackup ? 'Nhập backup code' : `Nhập mã từ: ${selectedFactor?.factor_name}` }}
          </p>
        </div>

        <!-- Factor selector (nếu có nhiều) -->
        <div v-if="!useBackup && availableFactors.length > 1" class="flex gap-2 flex-wrap mb-4">
          <button v-for="f in availableFactors" :key="f.id"
                  @click="selectedFactor = f"
                  :class="['px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    selectedFactor?.id === f.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-[#0f1117] text-slate-600 dark:text-gray-400']">
            {{ f.factor_name }}
          </button>
        </div>

        <!-- HOTP: send button -->
        <div v-if="!useBackup && selectedFactor?.factor_type === 'hotp'" class="mb-4">
          <button @click="sendHOTP" :disabled="loading"
                  class="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50">
            {{ hotpSent ? 'Gửi lại OTP' : 'Gửi OTP' }}
          </button>
        </div>

        <!-- OTP input -->
        <div v-if="!useBackup" class="mb-5">
          <OTPInput ref="otpInputRef" v-model="mfaToken" @complete="verifyMFA" />
        </div>

        <!-- Backup code input -->
        <div v-else class="mb-5">
          <input v-model="backupCode" placeholder="Nhập backup code"
                 class="w-full input-base text-center font-mono tracking-widest" />
        </div>

        <div v-if="errorMessage" class="error-box mb-4">{{ errorMessage }}</div>

        <button @click="useBackup ? verifyBackup() : verifyMFA()" :disabled="loading || (!useBackup && mfaToken.length < 6) || (useBackup && !backupCode)"
                class="w-full btn-primary">
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span>{{ loading ? 'Đang xác nhận...' : 'Xác nhận' }}</span>
        </button>

        <div class="flex justify-between mt-4">
          <button @click="step = 'password'; errorMessage = ''" class="text-sm text-slate-500 hover:underline">← Quay lại</button>
          <button @click="useBackup = !useBackup; errorMessage = ''; mfaToken = ''; backupCode = ''"
                  class="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            {{ useBackup ? 'Dùng OTP' : 'Dùng backup code' }}
          </button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import OTPInput from '../../../components/OTPInput.vue';
import { startAuthentication } from '@simplewebauthn/browser';

const emit = defineEmits(['success']);

const step = ref('password');
const form = ref({ username: '', password: '' });
const loading = ref(false);
const errorMessage = ref('');

// MFA state
const partialToken = ref('');
const availableFactors = ref([]);
const selectedFactor = ref(null);
const mfaToken = ref('');
const useBackup = ref(false);
const backupCode = ref('');
const hotpSent = ref(false);
const otpInputRef = ref(null);

const authHeader = computed(() => ({ Authorization: `Bearer ${partialToken.value}`, 'Content-Type': 'application/json' }));

async function handleLogin() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await fetch('/api/system/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    if (data.mfa_required) {
      partialToken.value = data.partial_token;
      availableFactors.value = data.available_factors;
      selectedFactor.value = data.available_factors[0] ?? null;
      step.value = 'mfa';
    } else {
      emit('success', data);
    }
  } catch (e) {
    errorMessage.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function sendHOTP() {
  loading.value = true;
  try {
    await fetch(`/api/system/mfa/factors/hotp/${selectedFactor.value.id}/send`, {
      method: 'POST',
      headers: authHeader.value,
    });
    hotpSent.value = true;
  } catch (e) {
    errorMessage.value = 'Không gửi được OTP';
  } finally {
    loading.value = false;
  }
}

async function verifyMFA() {
  if (mfaToken.value.length < 6) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: authHeader.value,
      body: JSON.stringify({ factor_id: selectedFactor.value.id, token: mfaToken.value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'OTP không hợp lệ');
    emit('success', { token: data.token });
  } catch (e) {
    errorMessage.value = e.message;
    otpInputRef.value?.clear();
  } finally {
    loading.value = false;
  }
}

async function loginWithPasskey() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const challengeRes = await fetch('/api/auth/passkey/challenge');
    const { options, challenge_key } = await challengeRes.json();

    const response = await startAuthentication({ optionsJSON: options });

    const verifyRes = await fetch('/api/auth/passkey/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response, challenge_key }),
    });
    const data = await verifyRes.json();
    if (!verifyRes.ok) throw new Error(data.error || 'Xác thực Passkey thất bại');

    emit('success', data);
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      errorMessage.value = 'Người dùng đã huỷ xác thực';
    } else {
      errorMessage.value = e.message;
    }
  } finally {
    loading.value = false;
  }
}

async function verifyBackup() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await fetch('/api/auth/mfa/backup', {
      method: 'POST',
      headers: authHeader.value,
      body: JSON.stringify({ backup_code: backupCode.value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Backup code không hợp lệ');
    emit('success', { token: data.token });
  } catch (e) {
    errorMessage.value = e.message;
    backupCode.value = '';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.input-base {
  @apply bg-slate-50 dark:bg-[#0f1117] border border-gray-200 dark:border-[#252540] rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:bg-white focus:border-blue-500 dark:focus:border-blue-500 dark:focus:bg-[#151521] shadow-sm transition-all w-full;
}
.btn-primary {
  @apply bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 flex items-center justify-center gap-2 rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50;
}
.error-box {
  @apply text-[13px] font-medium text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-100 dark:border-red-500/20 text-center flex items-center justify-center gap-2;
}
</style>
