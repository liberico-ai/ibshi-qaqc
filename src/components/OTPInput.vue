<template>
  <div class="flex gap-2 justify-center">
    <input
      v-for="(_, i) in digits"
      :key="i"
      :ref="el => { if (el) inputs[i] = el }"
      v-model="digits[i]"
      type="text"
      inputmode="numeric"
      maxlength="1"
      class="w-11 h-13 text-center text-xl font-bold rounded-lg border border-gray-300 dark:border-[#252540] bg-white dark:bg-[#0f1117] text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 shadow-sm transition-all"
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
      @paste.prevent="onPaste"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  length: { type: Number, default: 6 },
  modelValue: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue', 'complete']);

const digits = ref(Array(props.length).fill(''));
const inputs = ref([]);

watch(() => props.modelValue, v => {
  if (!v) digits.value = Array(props.length).fill('');
});

function onInput(i, e) {
  const val = e.target.value.replace(/\D/g, '').slice(0, 1);
  digits.value[i] = val;
  sync();
  if (val && i < props.length - 1) inputs.value[i + 1]?.focus();
  if (digits.value.every(d => d)) emit('complete', digits.value.join(''));
}

function onKeydown(i, e) {
  if (e.key === 'Backspace' && !digits.value[i] && i > 0) {
    inputs.value[i - 1]?.focus();
  }
  if (e.key === 'ArrowLeft' && i > 0) inputs.value[i - 1]?.focus();
  if (e.key === 'ArrowRight' && i < props.length - 1) inputs.value[i + 1]?.focus();
}

function onPaste(e) {
  const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, props.length);
  text.split('').forEach((c, i) => { digits.value[i] = c; });
  sync();
  const next = Math.min(text.length, props.length - 1);
  inputs.value[next]?.focus();
  if (text.length === props.length) emit('complete', text);
}

function sync() {
  emit('update:modelValue', digits.value.join(''));
}

defineExpose({
  clear: () => {
    digits.value = Array(props.length).fill('');
    sync();
    inputs.value[0]?.focus();
  }
});
</script>
