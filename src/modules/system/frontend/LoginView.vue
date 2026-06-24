<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1117] transition-colors relative overflow-hidden">
    <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>

    <div class="w-full max-w-md p-8 bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#252540] relative z-10 mx-4">
      <div class="text-center mb-8">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-4">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white">{{ $t('auth.welcome_back') }}</h2>
        <p class="text-sm text-slate-500 dark:text-gray-400 mt-2">{{ $t('auth.signin_subtitle') }}</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">{{ $t('auth.username') }}</label>
          <input v-model="form.username" required type="text" class="w-full input-base" :placeholder="$t('auth.username_placeholder')">
        </div>
        <div>
          <label class="block text-[13px] font-semibold text-slate-700 dark:text-gray-300 mb-1.5">{{ $t('auth.password') }}</label>
          <input v-model="form.password" required type="password" class="w-full input-base" placeholder="••••••••">
        </div>

        <div v-if="errorMessage" class="error-box">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {{ errorMessage }}
        </div>

        <button :disabled="loading" type="submit" class="w-full btn-primary mt-4">
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span>{{ loading ? $t('auth.signing_in') : $t('auth.sign_in') }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const emit = defineEmits(['success']);

const form = ref({ username: '', password: '' });
const loading = ref(false);
const errorMessage = ref('');

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
    if (!res.ok) throw new Error(data.error || t('auth.login_failed'));
    emit('success', data);
  } catch (e) {
    errorMessage.value = e.message;
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
