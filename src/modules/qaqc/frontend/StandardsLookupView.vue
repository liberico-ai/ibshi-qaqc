<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Tra Cứu Tiêu Chuẩn</h2>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-slate-200 dark:border-slate-700">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="px-4 py-2 text-sm font-medium transition-colors rounded-t"
        :class="activeTab === tab.key
          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
      >{{ tab.label }}</button>
    </div>

    <!-- Tab 1: Tra Cứu -->
    <div v-if="activeTab === 'lookup'" class="space-y-4">
      <div class="card p-4 flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1 min-w-[200px]">
          <label class="text-xs text-slate-500">Tiêu Chuẩn</label>
          <select
            v-model="lookup.selectedStandard"
            @change="onLookupStandardChange"
            class="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none"
          >
            <option value="">-- Chọn tiêu chuẩn --</option>
            <option v-for="std in standards" :key="std.standard_code" :value="std.standard_code">
              {{ std.standard_code }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1 min-w-[160px]">
          <label class="text-xs text-slate-500">Grade</label>
          <select
            v-model="lookup.selectedGrade"
            class="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none"
            :disabled="!lookup.selectedStandard"
          >
            <option value="">-- Chọn grade --</option>
            <option v-for="g in lookupGrades" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <button
          @click="doLookup"
          :disabled="!lookup.selectedStandard || !lookup.selectedGrade || lookup.loading"
          class="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >Tra Cứu</button>
      </div>

      <div v-if="lookup.loading" class="card p-8 text-center text-slate-500">Đang tải...</div>

      <template v-else-if="lookup.result">
        <div class="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
          {{ lookup.result.standard_name }} — Grade <span class="text-blue-600 dark:text-blue-400">{{ lookup.result.grade }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Chemistry -->
          <div class="card p-4 space-y-2">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Thành Phần Hóa Học</h3>
            <table class="w-full text-xs">
              <thead>
                <tr class="text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th class="text-left py-1 pr-3">Nguyên tố</th>
                  <th class="text-left py-1">Giới hạn</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-for="(val, key) in lookup.result.chemistry" :key="key">
                  <td class="py-1 pr-3 font-medium text-slate-700 dark:text-slate-300">{{ key }}</td>
                  <td class="py-1 text-slate-600 dark:text-slate-400">{{ val }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Mechanical -->
          <div class="card p-4 space-y-2">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Tính Chất Cơ Học</h3>
            <table class="w-full text-xs">
              <thead>
                <tr class="text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th class="text-left py-1 pr-3">Thuộc tính</th>
                  <th class="text-left py-1">Giá trị</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-for="(val, key) in lookup.result.mechanical" :key="key">
                  <td class="py-1 pr-3 font-medium text-slate-700 dark:text-slate-300">{{ key }}</td>
                  <td class="py-1 text-slate-600 dark:text-slate-400">{{ val }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- Tab 2: So Sánh -->
    <div v-if="activeTab === 'compare'" class="space-y-4">
      <div class="card p-4 space-y-3">
        <div v-for="(sel, idx) in compare.selections" :key="idx" class="flex flex-wrap items-end gap-3">
          <span class="text-xs text-slate-500 w-4">{{ idx + 1 }}</span>
          <div class="flex flex-col gap-1 min-w-[200px]">
            <label class="text-xs text-slate-500">Tiêu Chuẩn</label>
            <select
              v-model="sel.standardCode"
              @change="onCompareStandardChange(idx)"
              class="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none"
            >
              <option value="">-- Chọn tiêu chuẩn --</option>
              <option v-for="std in standards" :key="std.standard_code" :value="std.standard_code">
                {{ std.standard_code }}
              </option>
            </select>
          </div>
          <div class="flex flex-col gap-1 min-w-[160px]">
            <label class="text-xs text-slate-500">Grade</label>
            <select
              v-model="sel.grade"
              class="px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none"
              :disabled="!sel.standardCode"
            >
              <option value="">-- Chọn grade --</option>
              <option v-for="g in compareGrades[idx]" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
        </div>
        <button
          @click="doCompare"
          :disabled="compare.loading || compare.selections.filter(s => s.standardCode && s.grade).length < 2"
          class="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >So Sánh</button>
      </div>

      <div v-if="compare.loading" class="card p-8 text-center text-slate-500">Đang tải...</div>

      <div v-else-if="compare.results.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="item in compare.results" :key="`${item.standard_code}-${item.grade}`" class="card p-4 space-y-3">
          <div>
            <div class="text-xs text-slate-500">{{ item.standard_code }}</div>
            <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">Grade {{ item.grade }}</div>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Hóa Học</div>
            <div v-for="(val, key) in item.chemistry" :key="key" class="flex justify-between text-xs py-0.5 border-b border-slate-100 dark:border-slate-800">
              <span class="text-slate-600 dark:text-slate-400">{{ key }}</span>
              <span class="font-medium text-slate-700 dark:text-slate-300">{{ val }}</span>
            </div>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Cơ Học</div>
            <div v-for="(val, key) in item.mechanical" :key="key" class="flex justify-between text-xs py-0.5 border-b border-slate-100 dark:border-slate-800">
              <span class="text-slate-600 dark:text-slate-400">{{ key }}</span>
              <span class="font-medium text-slate-700 dark:text-slate-300">{{ val }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 4: AI Hỏi Đáp -->
    <div v-if="activeTab === 'ai'" class="space-y-4">
      <div class="card p-4 space-y-3">
        <textarea
          v-model="ai.query"
          @keydown.ctrl.enter="doAiSearch"
          rows="3"
          placeholder="Nhập câu hỏi kỹ thuật... (Ctrl+Enter để gửi)"
          class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
        ></textarea>
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400">Tìm kiếm ngữ nghĩa trong thư viện tiêu chuẩn đã import</span>
          <button @click="doAiSearch" :disabled="!ai.query.trim() || ai.loading"
            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            <svg v-if="ai.loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
            </svg>
            {{ ai.loading ? 'Đang tìm...' : 'Hỏi AI' }}
          </button>
        </div>
      </div>

      <!-- Result -->
      <div v-if="ai.result" class="card p-5 space-y-4">
        <!-- Header: confidence + not found warning -->
        <div class="flex flex-wrap items-center gap-3">
          <ConfidenceIndicator :confidence="ai.result.confidence ?? 0" />
          <span v-if="ai.result.source" class="text-xs text-slate-400">
            {{ ai.result.source === 'gemini-vector' ? 'AI (vector search)' : 'Tìm kiếm cơ bản' }}
          </span>
        </div>

        <!-- Not found -->
        <div v-if="ai.result.not_found_reasons?.length"
          class="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div>
            <div class="font-medium mb-0.5">Không tìm thấy trong thư viện tiêu chuẩn</div>
            <div v-for="(r, i) in ai.result.not_found_reasons" :key="i" class="text-xs">{{ r }}</div>
          </div>
        </div>

        <!-- Low confidence disclaimer -->
        <div v-else-if="ai.result.confidence < 0.6"
          class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
          Kết quả có độ tin cậy thấp — vui lòng tra thêm trong tài liệu gốc.
        </div>

        <!-- Summary -->
        <div v-if="ai.result.summary" class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {{ ai.result.summary }}
        </div>

        <!-- Citations -->
        <div v-if="ai.result.citations?.length" class="space-y-2">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Trích dẫn</div>
          <div class="flex flex-wrap gap-2">
            <CitationBadge v-for="(c, i) in ai.result.citations" :key="i" :citation="c" />
          </div>
        </div>

        <!-- Feedback -->
        <div class="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <span class="text-xs text-slate-400">Kết quả có chính xác không?</span>
          <button @click="openFeedback('WRONG_ANSWER')"
            class="text-xs px-2 py-1 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
            Sai nội dung
          </button>
          <button @click="openFeedback('MISSING_CITATION')"
            class="text-xs px-2 py-1 rounded border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30">
            Thiếu trích dẫn
          </button>
          <button @click="openFeedback('WRONG_PAGE')"
            class="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
            Sai trang
          </button>
        </div>
      </div>

      <!-- Feedback modal -->
      <Teleport to="body">
        <div v-if="feedback.show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50" @click="feedback.show = false"></div>
          <div class="relative z-10 w-full max-w-md bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl p-5 space-y-4">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Báo Sai</h3>
            <div>
              <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Loại lỗi</label>
              <select v-model="feedback.type" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none">
                <option value="WRONG_ANSWER">Sai nội dung</option>
                <option value="MISSING_CITATION">Thiếu trích dẫn</option>
                <option value="WRONG_PAGE">Sai trang / section</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mô tả (tùy chọn)</label>
              <textarea v-model="feedback.reason" rows="3"
                class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none resize-none"
                placeholder="Mô tả chi tiết lỗi..."></textarea>
            </div>
            <div class="flex justify-end gap-2">
              <button @click="feedback.show = false" class="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800">Hủy</button>
              <button @click="submitFeedback" :disabled="feedback.submitting"
                class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded-lg">
                {{ feedback.submitting ? 'Đang gửi...' : 'Gửi báo cáo' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>

    <!-- Tab 3: Tương Đương -->
    <div v-if="activeTab === 'equivalents'" class="space-y-4">
      <div class="card p-4 flex gap-3 items-center">
        <input
          v-model="equivSearch"
          @input="onEquivSearch"
          placeholder="Tìm kiếm grade..."
          class="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-[#252540] rounded-lg bg-white dark:bg-[#12122a] text-gray-800 dark:text-gray-100 outline-none"
        />
      </div>

      <div v-if="equiv.loading" class="card p-8 text-center text-slate-500">Đang tải...</div>

      <div v-else-if="equiv.data.length" class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th class="text-left py-2 px-4 font-medium">Grade</th>
              <th class="text-left py-2 px-4 font-medium">Các Grade Tương Đương</th>
              <th class="text-left py-2 px-4 font-medium">Ghi Chú</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="group in equiv.data" :key="group.grade_key">
              <td class="py-2 px-4 font-semibold text-slate-800 dark:text-slate-200 align-top whitespace-nowrap">{{ group.grade_key }}</td>
              <td class="py-2 px-4 align-top">
                <div v-for="eq in group.equivalents" :key="eq.equivalent_grade" class="text-slate-700 dark:text-slate-300">
                  {{ eq.equivalent_grade }}
                </div>
              </td>
              <td class="py-2 px-4 align-top">
                <div v-for="eq in group.equivalents" :key="eq.equivalent_grade" class="text-xs text-slate-500">
                  {{ eq.note }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="card p-8 text-center text-slate-400 text-sm">Không tìm thấy kết quả.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import CitationBadge from '@/components/CitationBadge.vue';
import ConfidenceIndicator from '@/components/ConfidenceIndicator.vue';

const tabs = [
  { key: 'lookup', label: 'Tra Cứu' },
  { key: 'compare', label: 'So Sánh' },
  { key: 'equivalents', label: 'Tương Đương' },
  { key: 'ai', label: 'AI Hỏi Đáp' },
];
const activeTab = ref('lookup');

// ── Standards list ──────────────────────────────────────────────
const standards = ref([]);

async function loadStandards() {
  const res = await apiFetch('/api/qaqc/standards-lookup');
  if (res.ok) {
    const json = await res.json();
    standards.value = json.data;
  }
}

// ── Tab 1: Lookup ───────────────────────────────────────────────
const lookup = reactive({ selectedStandard: '', selectedGrade: '', loading: false, result: null });

const lookupGrades = computed(() => {
  const std = standards.value.find(s => s.standard_code === lookup.selectedStandard);
  return std?.grades ?? [];
});

function onLookupStandardChange() {
  lookup.selectedGrade = '';
  lookup.result = null;
}

async function doLookup() {
  if (!lookup.selectedStandard || !lookup.selectedGrade) return;
  lookup.loading = true;
  lookup.result = null;
  try {
    const code = encodeURIComponent(lookup.selectedStandard);
    const grade = encodeURIComponent(lookup.selectedGrade);
    const res = await apiFetch(`/api/qaqc/standards-lookup/${code}/grades/${grade}`);
    if (res.ok) {
      const json = await res.json();
      lookup.result = json.data;
    }
  } finally {
    lookup.loading = false;
  }
}

// ── Tab 2: Compare ──────────────────────────────────────────────
const compare = reactive({
  selections: [
    { standardCode: '', grade: '' },
    { standardCode: '', grade: '' },
    { standardCode: '', grade: '' },
  ],
  loading: false,
  results: [],
});

const compareGrades = computed(() =>
  compare.selections.map(sel => {
    const std = standards.value.find(s => s.standard_code === sel.standardCode);
    return std?.grades ?? [];
  })
);

function onCompareStandardChange(idx) {
  compare.selections[idx].grade = '';
  compare.results = [];
}

async function doCompare() {
  const selections = compare.selections.filter(s => s.standardCode && s.grade);
  if (selections.length < 2) return;
  compare.loading = true;
  compare.results = [];
  try {
    const res = await apiFetch('/api/qaqc/standards-lookup/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selections }),
    });
    if (res.ok) {
      const json = await res.json();
      compare.results = json.data;
    }
  } finally {
    compare.loading = false;
  }
}

// ── Tab 3: Equivalents ──────────────────────────────────────────
const equivSearch = ref('');
const equiv = reactive({ loading: false, data: [] });
let equivTimer = null;

async function loadEquivalents(q = '') {
  equiv.loading = true;
  try {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    const res = await apiFetch(`/api/qaqc/standards-lookup/equivalents${qs}`);
    if (res.ok) {
      const json = await res.json();
      equiv.data = json.data;
    }
  } finally {
    equiv.loading = false;
  }
}

function onEquivSearch() {
  clearTimeout(equivTimer);
  equivTimer = setTimeout(() => loadEquivalents(equivSearch.value), 300);
}

// ── Tab 4: AI Search ────────────────────────────────────────────
const ai = reactive({ query: '', loading: false, result: null });

async function doAiSearch() {
  if (!ai.query.trim()) return;
  ai.loading = true;
  ai.result = null;
  try {
    const res = await apiFetch('/api/qaqc/standards-lookup/ai-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: ai.query }),
    });
    if (res.ok) {
      const json = await res.json();
      ai.result = json.data;
    }
  } finally {
    ai.loading = false;
  }
}

// ── Feedback ────────────────────────────────────────────────────
const feedback = reactive({ show: false, type: 'WRONG_ANSWER', reason: '', submitting: false });

function openFeedback(type) {
  feedback.type = type;
  feedback.reason = '';
  feedback.show = true;
}

async function submitFeedback() {
  feedback.submitting = true;
  try {
    await apiFetch('/api/qaqc/standards-lookup/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ai.query,
        answer_snapshot: ai.result,
        feedback_type: feedback.type,
        reason: feedback.reason || null,
      }),
    });
    feedback.show = false;
  } finally {
    feedback.submitting = false;
  }
}

// ── Init ────────────────────────────────────────────────────────
onMounted(async () => {
  await loadStandards();
  await loadEquivalents();
});
</script>
