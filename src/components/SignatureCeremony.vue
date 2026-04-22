<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div class="w-full max-w-sm bg-white dark:bg-[#12122a] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#252540]">
      <div class="p-6 border-b border-gray-100 dark:border-[#252540]">
        <h3 class="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          Xác nhận chữ ký số
        </h3>
        <p v-if="summaryText" class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ summaryText }}</p>
      </div>

      <div class="p-6 space-y-5">
        <div>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 text-center">PIN 6 chữ số</label>
          <OTPInput v-model="pin" :length="6" ref="pinInput" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 text-center">Mã OTP (Authenticator)</label>
          <OTPInput v-model="otp" :length="6" ref="otpInput" />
        </div>

        <label class="flex items-start gap-2 cursor-pointer">
          <input v-model="confirmed" type="checkbox" class="mt-0.5 rounded border-gray-300">
          <span class="text-xs text-slate-600 dark:text-slate-400">Tôi xác nhận đã đọc và chịu trách nhiệm về nội dung tài liệu này</span>
        </label>

        <p v-if="errorMsg" class="text-xs text-red-500 text-center">{{ errorMsg }}</p>
      </div>

      <div class="p-4 flex gap-3 border-t border-gray-100 dark:border-[#252540]">
        <button @click="cancel" :disabled="signing"
          class="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50">
          Huỷ
        </button>
        <button @click="submit" :disabled="signing || !confirmed || pin.length < 6 || otp.length < 6"
          class="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          <svg v-if="signing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          {{ signing ? 'Đang ký...' : 'Xác nhận ký' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { apiFetch } from '@/utils/api.js';
import OTPInput from './OTPInput.vue';

const props = defineProps({
  show:        { type: Boolean, default: false },
  entityType:  { type: String,  required: true },
  entityId:    { type: String,  required: true },
  summaryText: { type: String,  default: '' },
  docPayload:  { type: Object,  default: () => ({}) },
});
const emit = defineEmits(['success', 'cancel']);

const pin       = ref('');
const otp       = ref('');
const confirmed = ref(false);
const signing   = ref(false);
const errorMsg  = ref('');
const pinInput  = ref(null);
const otpInput  = ref(null);

watch(() => props.show, v => {
  if (v) {
    pin.value = ''; otp.value = ''; confirmed.value = false; errorMsg.value = '';
    setTimeout(() => pinInput.value?.clear?.(), 50);
  }
});

async function submit() {
  signing.value = true;
  errorMsg.value = '';
  try {
    const res = await apiFetch('/api/system/signature/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pin: pin.value,
        otp_token: otp.value,
        entity_type: props.entityType,
        entity_id:   props.entityId,
        doc_payload: props.docPayload,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ký số thất bại');
    emit('success', data.data);
  } catch (e) {
    errorMsg.value = e.message;
    otpInput.value?.clear?.();
    otp.value = '';
  } finally {
    signing.value = false;
  }
}

function cancel() {
  emit('cancel');
}
</script>
