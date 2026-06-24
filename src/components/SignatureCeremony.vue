<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#252540] overflow-hidden">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-gray-200 dark:border-[#252540] flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-white">{{ $t('signature.title') }}</h3>
            <p class="text-[11px] text-slate-500">{{ enrollMode ? $t('signature.enroll_pin') : $t('signature.sign') }}</p>
          </div>
        </div>

        <!-- Body -->
        <div class="p-5 space-y-3">
          <p class="text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {{ enrollMode ? $t('signature.enroll_hint') : $t('signature.sign_hint') }}
          </p>

          <div>
            <label class="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1">{{ $t('signature.pin') }}</label>
            <input ref="pinInput" v-model="pin" type="password" inputmode="numeric" autocomplete="off"
              maxlength="12" placeholder="••••"
              class="w-full px-3 py-2 text-center tracking-[0.4em] text-lg border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none focus:border-emerald-500"
              @keyup.enter="submit">
          </div>

          <div v-if="enrollMode">
            <label class="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1">{{ $t('signature.pin_confirm') }}</label>
            <input v-model="pinConfirm" type="password" inputmode="numeric" autocomplete="off" maxlength="12"
              placeholder="••••" class="w-full px-3 py-2 text-center tracking-[0.4em] text-lg border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none focus:border-emerald-500"
              @keyup.enter="submit">
          </div>

          <p v-if="error" class="text-[12px] text-red-600 dark:text-red-400">{{ error }}</p>
        </div>

        <!-- Footer -->
        <div class="px-5 py-4 border-t border-gray-200 dark:border-[#252540] flex justify-end gap-2">
          <button @click="onCancel" :disabled="busy"
            class="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50">
            {{ $t('common.cancel') }}
          </button>
          <button @click="submit" :disabled="busy"
            class="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
            {{ busy ? $t('common.loading') : (enrollMode ? $t('common.save') : $t('signature.sign')) }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSignature } from '@/composables/useSignature.js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const { t } = useI18n();
const { checkPinStatus, setPin } = useSignature();

const pin = ref('');
const pinConfirm = ref('');
const error = ref('');
const busy = ref(false);
const enrollMode = ref(false);
const pinInput = ref(null);

watch(() => props.modelValue, async (visible) => {
  if (visible) {
    pin.value = '';
    pinConfirm.value = '';
    error.value = '';
    busy.value = true;
    const hasPin = await checkPinStatus();
    enrollMode.value = hasPin === false;
    busy.value = false;
    await nextTick();
    pinInput.value?.focus();
  }
});

async function submit() {
  error.value = '';
  if (!/^\d{4,12}$/.test(pin.value)) {
    error.value = t('signature.pin_format');
    return;
  }
  if (enrollMode.value) {
    if (pin.value !== pinConfirm.value) {
      error.value = t('signature.pin_mismatch');
      return;
    }
    busy.value = true;
    try {
      await setPin(pin.value);
      enrollMode.value = false;
    } catch (e) {
      error.value = e.message || t('errors.SERVER_ERROR');
      return;
    } finally {
      busy.value = false;
    }
  }
  // PIN sẵn sàng — chuyển lên cho component cha gửi kèm request ký.
  emit('confirm', pin.value);
  emit('update:modelValue', false);
}

function onCancel() {
  emit('cancel');
  emit('update:modelValue', false);
}
</script>
