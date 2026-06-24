<template>
  <span class="inline-block">
    <button
      @click="showModal = true"
      class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
    >
      <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>
      {{ label }}
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false"></div>
        <div class="relative z-10 w-full max-w-lg bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-start justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <div class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">
                {{ citation.standard }}
              </div>
              <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                <span v-if="citation.section">§ {{ citation.section }}</span>
                <span v-if="citation.page" class="ml-2 text-slate-500">p. {{ citation.page }}</span>
              </div>
            </div>
            <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Body: chunk text -->
          <div class="p-4 max-h-72 overflow-y-auto">
            <div v-if="citation.chunk_text"
              class="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 font-mono leading-relaxed whitespace-pre-wrap">
              {{ citation.chunk_text }}
            </div>
            <div v-else class="text-sm text-slate-400 italic">{{ $t('citation.empty') }}</div>
          </div>

          <!-- Footer -->
          <div class="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span class="text-xs text-slate-400">{{ $t('citation.chunk', { id: citation.chunk_id?.slice(-8) ?? '—' }) }}</span>
            <span class="text-xs text-slate-500">
              {{ $t('citation.page_standard', { page: citation.page ?? '?', standard: citation.standard }) }}
            </span>
          </div>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  citation: {
    type: Object,
    required: true,
  },
});

const showModal = ref(false);

const label = computed(() => {
  const parts = [props.citation.standard];
  if (props.citation.section) parts.push(`§ ${props.citation.section}`);
  if (props.citation.page) parts.push(`p.${props.citation.page}`);
  return parts.join(' ');
});
</script>
