<!--
  OverviewView — Dashboard Tổng quan (giao diện theo mockup IBS QA/QC).
  Lấy dữ liệu thật từ các API:
    GET /api/dashboard/qc-kpi              → KPI tổng (firstPassRate, ncr, mdr…)
    GET /api/dashboard/projects            → danh sách dự án (pass%, openNcr, mdr%)
    GET /api/dashboard/management          → rollup toàn hệ thống
    GET /api/qaqc/inspections/dashboard    → inspection gần đây + pipeline (nếu có)
    GET /api/ncr?limit=…                   → NCR theo nguyên nhân gốc + timeline
    GET /api/mdr?limit=…                   → MDR completion top packages
  Tất cả lỗi/thiếu dữ liệu đều bắt mềm → hiển thị 0 / empty state, không vỡ trang.
-->
<template>
  <div>
    <PageHeader title="Dashboard Tổng quan" :subtitle="subtitle">
      <template #actions>
        <a :href="reportUrl" target="_blank" class="btn btn-outline">📥 Xuất báo cáo</a>
        <router-link to="/qaqc/inspections" class="btn btn-primary">+ Tạo Inspection mới</router-link>
      </template>
    </PageHeader>

    <!-- 4 stat cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard icon="📁" color="blue"   label="Dự án đang chạy" :value="stats.activeProjects"
                :change="stats.activeProjectsChange" trend="up" />
      <StatCard icon="✅" color="green"  label="Tỷ lệ Pass" :value="stats.passRate + '%'"
                :change="stats.passRateChange" trend="up" />
      <StatCard icon="⚠️" color="red"    label="NCR đang mở" :value="stats.openNcr"
                :change="stats.openNcrChange" trend="down" />
      <StatCard icon="📋" color="purple" label="MDR hoàn thành" :value="stats.mdrCompletion + '%'"
                :change="stats.mdrChange" trend="up" />
    </div>

    <!-- QC Pipeline -->
    <UiCard class="mb-6">
      <template #header>
        <div class="card-title">📐 QC Pipeline{{ pipelineProject ? ' — ' + pipelineProject : '' }}</div>
      </template>
      <template #actions>
        <select v-if="projects.length" v-model="selectedProjectId"
                class="text-[12px] rounded-lg border border-slate-200 dark:border-[#252540] dark:bg-transparent px-2.5 py-1.5">
          <option v-for="p in projects" :key="p.project_id" :value="p.project_id">{{ p.code }} — {{ p.name }}</option>
        </select>
      </template>
      <QcPipeline :stages="pipelineStages" />
    </UiCard>

    <!-- Recent inspections + Activity -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
      <UiCard class="lg:col-span-3" body-class="" title="">
        <template #header>
          <div class="card-title">🔍 Inspection gần đây</div>
        </template>
        <template #actions>
          <router-link to="/qaqc/inspections" class="btn btn-outline btn-sm">Xem tất cả →</router-link>
        </template>
        <div class="overflow-x-auto">
          <table class="qc-table">
            <thead>
              <tr><th>Mã</th><th>Hạng mục</th><th>Ngày</th><th>Kết quả</th><th>Inspector</th></tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in recentInspections" :key="i">
                <td class="font-semibold">{{ r.code }}</td>
                <td>{{ r.item }}</td>
                <td>{{ r.date }}</td>
                <td><StatusTag :status="r.result" :label="r.resultLabel" /></td>
                <td>{{ r.inspector }}</td>
              </tr>
              <tr v-if="!recentInspections.length">
                <td colspan="5" class="text-center text-slate-400 py-8">Chưa có inspection nào</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>

      <UiCard class="lg:col-span-2" body-class="px-5 py-3" title="">
        <template #header><div class="card-title">⏱️ Hoạt động gần đây</div></template>
        <ActivityTimeline :items="activity" empty="Chưa có hoạt động gần đây" />
      </UiCard>
    </div>

    <!-- NCR root cause + MDR completion -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <UiCard title="📊 NCR theo nguyên nhân gốc">
        <div v-if="ncrRootCauses.length" class="flex flex-col gap-3">
          <div v-for="(rc, i) in ncrRootCauses" :key="i">
            <div class="flex justify-between text-[12px] mb-1">
              <span>{{ rc.label }}</span>
              <span class="font-semibold">{{ rc.count }} NCR ({{ rc.pct }}%)</span>
            </div>
            <ProgressBar :value="rc.pct" :color="rc.color" />
          </div>
        </div>
        <div v-else class="py-8 text-center text-[13px] text-slate-400">Chưa có dữ liệu NCR</div>
        <div class="mt-4 pt-4 border-t border-slate-200 dark:border-[#252540] flex gap-5">
          <div class="text-center flex-1">
            <div class="text-2xl font-bold text-emerald-600">{{ ncrSummary.closed }}</div>
            <div class="text-[11px] text-slate-500">Đã đóng</div>
          </div>
          <div class="text-center flex-1">
            <div class="text-2xl font-bold text-red-500">{{ ncrSummary.open }}</div>
            <div class="text-[11px] text-slate-500">Đang mở</div>
          </div>
          <div class="text-center flex-1">
            <div class="text-2xl font-bold text-slate-700 dark:text-slate-200">{{ ncrSummary.total }}</div>
            <div class="text-[11px] text-slate-500">Tổng NCR</div>
          </div>
        </div>
      </UiCard>

      <UiCard title="📋 MDR Completion — Top Packages">
        <div v-if="mdrPackages.length" class="flex flex-col gap-3.5">
          <ProgressBar v-for="(m, i) in mdrPackages" :key="i" :value="m.pct" :label="m.name" :show-label="true" />
        </div>
        <div v-else class="py-8 text-center text-[13px] text-slate-400">Chưa có hồ sơ MDR</div>
        <div v-if="mdrPackages.length" class="mt-4 p-3 rounded-lg text-[12px]"
             style="background:#f0fdf4;color:#065f46">
          ✅ <strong>{{ mdrSummary.completed }}/{{ mdrSummary.total }}</strong> packages hoàn thành 100% —
          Tổng tiến độ: <strong>{{ stats.mdrCompletion }}%</strong>
        </div>
      </UiCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';
import PageHeader from '@/components/PageHeader.vue';
import StatCard from '@/components/StatCard.vue';
import UiCard from '@/components/UiCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import ProgressBar from '@/components/ProgressBar.vue';
import QcPipeline from '@/components/QcPipeline.vue';
import ActivityTimeline from '@/components/ActivityTimeline.vue';

const reportUrl = '/api/dashboard/report?period=weekly';

const stats = ref({
  activeProjects: 0, activeProjectsChange: '',
  passRate: 0, passRateChange: '',
  openNcr: 0, openNcrChange: '',
  mdrCompletion: 0, mdrChange: '',
});

const projects = ref([]);
const selectedProjectId = ref(null);
const recentInspections = ref([]);
const activity = ref([]);
const ncrRootCauses = ref([]);
const ncrSummary = ref({ closed: 0, open: 0, total: 0 });
const mdrPackages = ref([]);
const mdrSummary = ref({ completed: 0, total: 0 });

const subtitle = computed(() => {
  const now = new Date();
  return `Cập nhật lần cuối: ${now.toLocaleDateString('vi-VN')}, ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
});

const pipelineProject = computed(() => {
  const p = projects.value.find(x => x.project_id === selectedProjectId.value);
  return p ? `Dự án ${p.code} (${p.name})` : '';
});

// 9 giai đoạn QC theo mockup. Mức "done/active/pending" suy ra từ % tiến độ dự án.
const STAGE_DEFS = [
  { num: 1, icon: '📦', label: 'Material\nInspection' },
  { num: 2, icon: '✂️', label: 'Marking\n& Cutting' },
  { num: 3, icon: '🔩', label: 'Fit-up\nAssembly' },
  { num: 4, icon: '⚡', label: 'Welding' },
  { num: 5, icon: '🔬', label: 'NDT' },
  { num: 6, icon: '📏', label: 'Dimensional\nCheck' },
  { num: 7, icon: '💧', label: 'Pressure\nTest' },
  { num: 8, icon: '🎨', label: 'Painting\nCoating' },
  { num: 9, icon: '📦', label: 'Packing\n& MDR' },
];

const pipelineStages = computed(() => {
  const p = projects.value.find(x => x.project_id === selectedProjectId.value);
  // % hoàn thành: ưu tiên mdrCompletion, fallback passPct
  const pct = p ? (p.mdrCompletion ?? p.passPct ?? 0) : 0;
  const doneCount = Math.floor((pct / 100) * STAGE_DEFS.length);
  return STAGE_DEFS.map((s, i) => ({
    ...s,
    state: i < doneCount ? 'done' : (i === doneCount && pct > 0 ? 'active' : 'pending'),
  }));
});

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d) ? '' : d.toLocaleDateString('vi-VN');
}

const ROOT_CAUSE_LABELS = {
  welding: '⚡ Welding defect',
  process: '🔄 Process deviation',
  dimensional: '📏 Dimensional error',
  painting: '🎨 Painting defect',
  material: '📦 Material issue',
};
const ROOT_CAUSE_COLORS = ['red', 'amber', 'blue', 'green', 'purple'];

async function safeJson(url) {
  try {
    const res = await apiFetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function loadAll() {
  // ── KPI tổng + management ──
  const [kpiJson, projJson, mgmtJson] = await Promise.all([
    safeJson('/api/dashboard/qc-kpi'),
    safeJson('/api/dashboard/projects'),
    safeJson('/api/dashboard/management'),
  ]);

  const kpi = kpiJson?.data ?? {};
  const mgmt = mgmtJson?.data ?? {};
  projects.value = projJson?.data ?? [];

  if (projects.value.length) {
    // chọn dự án có code chứa 13079 nếu có, ngược lại dự án đầu
    const whyalla = projects.value.find(p => (p.code || '').includes('13079'));
    selectedProjectId.value = (whyalla || projects.value[0]).project_id;
  }

  const activeProjects = projects.value.filter(p => (p.mdrCompletion ?? 0) < 100).length || projects.value.length;
  stats.value = {
    activeProjects: mgmt.totalProjects ?? projects.value.length ?? 0,
    activeProjectsChange: activeProjects ? `${activeProjects} dự án đang sản xuất` : '',
    passRate: kpi.firstPassRate ?? 0,
    passRateChange: kpi.firstPass ? `${kpi.firstPass.pass}/${kpi.firstPass.total} hạng mục đạt` : '',
    openNcr: kpi.ncr?.open ?? mgmt.totalOpenNcr ?? 0,
    openNcrChange: kpi.ncr?.total ? `Tổng ${kpi.ncr.total} NCR` : '',
    mdrCompletion: kpi.mdr?.avgCompletion ?? mgmt.avgMdrCompletion ?? 0,
    mdrChange: kpi.mdr?.total ? `${kpi.mdr.total} hồ sơ MDR` : '',
  };

  // ── Inspection gần đây (nếu API có) ──
  const inspJson = await safeJson('/api/qaqc/inspections/dashboard');
  const inspData = inspJson?.data ?? {};
  const recent = inspData.recent || inspData.recentInspections || inspData.inspections || [];
  recentInspections.value = (Array.isArray(recent) ? recent : []).slice(0, 6).map(r => ({
    code: r.ip_code || r.code || r.id?.slice?.(0, 8) || '—',
    item: r.description || r.item || r.unit_id || '—',
    date: fmtDate(r.completed_at || r.created_at || r.date),
    result: r.result || r.status || '',
    resultLabel: (r.result || r.status || '—').toString(),
    inspector: r.inspector || r.assigned_to_name || r.signed_by_name || '—',
  }));

  // ── NCR theo nguyên nhân gốc + timeline ──
  const ncrJson = await safeJson('/api/ncr?limit=100');
  const ncrList = ncrJson?.data?.rows || ncrJson?.data || ncrJson?.rows || [];
  if (Array.isArray(ncrList) && ncrList.length) {
    const total = ncrList.length;
    const open = ncrList.filter(n => /open/i.test(n.status || '')).length;
    ncrSummary.value = { closed: total - open, open, total };

    const byCause = {};
    for (const n of ncrList) {
      const key = (n.root_cause_category || 'other').toLowerCase();
      byCause[key] = (byCause[key] || 0) + 1;
    }
    ncrRootCauses.value = Object.entries(byCause)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count], i) => ({
        label: ROOT_CAUSE_LABELS[key] || `📌 ${key}`,
        count,
        pct: Math.round((count / total) * 1000) / 10,
        color: ROOT_CAUSE_COLORS[i % ROOT_CAUSE_COLORS.length],
      }));

    // timeline: 5 NCR gần nhất
    activity.value = ncrList
      .slice()
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 5)
      .map(n => ({
        dot: /open/i.test(n.status || '') ? 'red' : 'green',
        html: `<strong>${n.ncr_no || 'NCR'}</strong> ${/open/i.test(n.status || '') ? 'đang mở' : 'đã đóng'} — ${n.title || ''}`,
        time: fmtDate(n.updated_at || n.created_at),
      }));
  } else {
    ncrSummary.value = { closed: 0, open: kpi.ncr?.open ?? 0, total: kpi.ncr?.total ?? 0 };
  }

  // ── MDR completion top packages ──
  const mdrJson = await safeJson('/api/mdr?limit=100');
  const mdrList = mdrJson?.data?.rows || mdrJson?.data || mdrJson?.rows || [];
  if (Array.isArray(mdrList) && mdrList.length) {
    mdrPackages.value = mdrList
      .slice()
      .sort((a, b) => (b.completion_pct ?? 0) - (a.completion_pct ?? 0))
      .slice(0, 6)
      .map(m => ({ name: m.name || m.id, pct: Number(m.completion_pct) || 0 }));
    mdrSummary.value = {
      completed: mdrList.filter(m => Number(m.completion_pct) >= 100).length,
      total: mdrList.length,
    };
  }
}

onMounted(loadAll);
</script>
