<script setup>
import { ref, computed, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';

const toast = useToast();
const confirm = useConfirm();

// ── State ────────────────────────────────────────────────────────────────────
const rows = ref([]);
const loading = ref(true);
const saving = ref(false);
const activeTab = ref('core');   // 'core' | 'productive'
const activeFramework = ref('cefr'); // 'cefr' | 'actfl'

// Dialog state
const showDialog = ref(false);
const editingRow = ref(null);
const form = ref({ skill_group: 'core', framework: 'cefr', min_score: 0, level_label: '', sort_order: null, is_active: true });
const formErrors = ref({});

// Bulk import dialog
const showBulkDialog = ref(false);
const bulkJson = ref('');
const bulkGroup = ref('core');
const bulkFramework = ref('cefr');
const bulkSaving = ref(false);

// ── Computed ─────────────────────────────────────────────────────────────────
const filteredRows = computed(() =>
  rows.value
    .filter(r => r.skill_group === activeTab.value && r.framework === activeFramework.value)
    .sort((a, b) => b.min_score - a.min_score)
);

const groupOptions = [
  { label: 'Core Skills (Listening / Reading / Structure)', value: 'core' },
  { label: 'Productive Skills (Writing / Speaking)', value: 'productive' },
];

const frameworkOptions = [
  { label: 'CEFR', value: 'cefr' },
  { label: 'ACTFL', value: 'actfl' },
];

// Stats for header cards
const totalCefrCore = computed(() => rows.value.filter(r => r.skill_group === 'core' && r.framework === 'cefr').length);
const totalActflCore = computed(() => rows.value.filter(r => r.skill_group === 'core' && r.framework === 'actfl').length);
const totalCefrProd = computed(() => rows.value.filter(r => r.skill_group === 'productive' && r.framework === 'cefr').length);
const totalActflProd = computed(() => rows.value.filter(r => r.skill_group === 'productive' && r.framework === 'actfl').length);

// ── API ───────────────────────────────────────────────────────────────────────
async function loadThresholds() {
  loading.value = true;
  try {
    const res = await api.get('/admin/cefr-actfl-thresholds/flat');
    rows.value = res.data;
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Load Failed', detail: err?.response?.data?.message || 'Could not load thresholds.', life: 4000 });
  } finally {
    loading.value = false;
  }
}

async function saveRow() {
  formErrors.value = {};
  saving.value = true;
  try {
    if (editingRow.value) {
      await api.patch(`/admin/cefr-actfl-thresholds/${editingRow.value.id}`, form.value);
      toast.add({ severity: 'success', summary: 'Updated', detail: 'Threshold updated successfully.', life: 3000 });
    } else {
      await api.post('/admin/cefr-actfl-thresholds', form.value);
      toast.add({ severity: 'success', summary: 'Created', detail: 'Threshold created successfully.', life: 3000 });
    }
    closeDialog();
    await loadThresholds();
  } catch (err) {
    if (err?.response?.status === 422) {
      // Validation errors: show inline field errors only, no toast needed
      formErrors.value = err.response.data.errors || {};
      return;
    }
    // toast.add({ severity: 'error', summary: 'Save Failed', detail: err?.response?.data?.message || 'Could not save threshold.', life: 4000 });
  } finally {
    saving.value = false;
  }
}

async function deleteRow(row) {
  confirm.require({
    message: `Delete level "${row.level_label}" (min ${row.min_score}) from ${row.skill_group}/${row.framework}?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await api.delete(`/admin/cefr-actfl-thresholds/${row.id}`);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Threshold deleted.', life: 3000 });
        await loadThresholds();
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Delete Failed', detail: err?.response?.data?.message || 'Could not delete.', life: 4000 });
      }
    }
  });
}

async function saveBulk() {
  bulkSaving.value = true;
  try {
    const parsed = JSON.parse(bulkJson.value);
    const thresholds = Array.isArray(parsed) ? parsed : parsed.thresholds;
    await api.put('/admin/cefr-actfl-thresholds/bulk-update', {
      skill_group: bulkGroup.value,
      framework: bulkFramework.value,
      thresholds,
    });
    toast.add({ severity: 'success', summary: 'Bulk Updated', detail: `Thresholds replaced for ${bulkGroup.value}/${bulkFramework.value}.`, life: 3000 });
    showBulkDialog.value = false;
    bulkJson.value = '';
    await loadThresholds();
  } catch (err) {
    if (err instanceof SyntaxError) {
      toast.add({ severity: 'error', summary: 'Invalid JSON', detail: 'Please check your JSON format.', life: 4000 });
    } else {
      toast.add({ severity: 'error', summary: 'Bulk Failed', detail: err?.response?.data?.message || 'Could not bulk update.', life: 4000 });
    }
  } finally {
    bulkSaving.value = false;
  }
}

// ── Dialog helpers ────────────────────────────────────────────────────────────
function openCreate() {
  editingRow.value = null;
  formErrors.value = {};
  form.value = {
    skill_group: activeTab.value,
    framework: activeFramework.value,
    min_score: 0,
    level_label: '',
    sort_order: null,
    is_active: true,
  };
  showDialog.value = true;
}

function openEdit(row) {
  editingRow.value = row;
  formErrors.value = {};
  form.value = {
    skill_group: row.skill_group,
    framework: row.framework,
    min_score: row.min_score,
    level_label: row.level_label,
    sort_order: row.sort_order,
    is_active: row.is_active,
  };
  showDialog.value = true;
}

function closeDialog() {
  showDialog.value = false;
  editingRow.value = null;
}

function openBulkDialog() {
  bulkGroup.value = activeTab.value;
  bulkFramework.value = activeFramework.value;
  // Pre-fill with current filtered rows as template
  const template = filteredRows.value.map(r => ({
    min_score: r.min_score,
    level_label: r.level_label,
    sort_order: r.sort_order,
    is_active: r.is_active,
  }));
  bulkJson.value = JSON.stringify(template, null, 2);
  showBulkDialog.value = true;
}

// ── Misc ──────────────────────────────────────────────────────────────────────
function getScoreColor(score) {
  if (score >= 700) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (score >= 450) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (score >= 200) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-rose-100 text-rose-700 border-rose-200';
}

function isActive(row) {
  return row.is_active;
}

onMounted(loadThresholds);
</script>

<template>
  <AdminLayout>
    <Toast />
    <ConfirmDialog />

    <div class="w-full space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 mt-6 px-4 md:px-8 pb-24">

      <!-- ── Header ──────────────────────────────────────────────────────── -->
      <div
        class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div
          class="absolute right-0 top-0 w-64 h-64 bg-violet-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-violet-100/30 transition-all duration-1000">
        </div>
        <div
          class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl">
        </div>
        <div class="relative z-10 space-y-1.5">
          <div class="flex items-center gap-2 text-xs font-extrabold text-violet-600 uppercase tracking-wider">
            <i class="pi pi-sliders-h text-violet-500"></i>
            <span>Scoring Configuration</span>
          </div>
          <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">CEFR &amp; ACTFL Thresholds</h1>
          <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
            Configure score-to-level mapping rules. Changes take effect immediately on new certificate generation (cache
            clears automatically).
          </p>
        </div>
        <div class="flex items-center gap-3 mt-6 md:mt-0 relative z-10">
          <Button label="Bulk Replace" icon="pi pi-upload" outlined severity="secondary"
            class="text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200"
            @click="openBulkDialog" />
          <Button label="Add Threshold" icon="pi pi-plus" severity="contrast"
            class="text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-slate-200"
            @click="openCreate" />
        </div>
      </div>

      <!-- ── Stat Cards ──────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div v-for="card in [
          { label: 'Core CEFR', count: totalCefrCore, icon: 'pi-list', color: 'bg-violet-500', bg: 'bg-violet-50/40', tab: 'core', fw: 'cefr' },
          { label: 'Core ACTFL', count: totalActflCore, icon: 'pi-chart-bar', color: 'bg-blue-500', bg: 'bg-blue-50/40', tab: 'core', fw: 'actfl' },
          { label: 'Productive CEFR', count: totalCefrProd, icon: 'pi-pen-to-square', color: 'bg-emerald-500', bg: 'bg-emerald-50/40', tab: 'productive', fw: 'cefr' },
          { label: 'Productive ACTFL', count: totalActflProd, icon: 'pi-microphone', color: 'bg-amber-500', bg: 'bg-amber-50/40', tab: 'productive', fw: 'actfl' },
        ]" :key="card.label"
          class="p-6 rounded-2xl border border-slate-100 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group"
          :class="[card.bg, (activeTab === card.tab && activeFramework === card.fw) ? 'ring-2 ring-violet-400 ring-offset-1' : '']"
          @click="activeTab = card.tab; activeFramework = card.fw">
          <div class="flex items-center justify-between mb-3">
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:rotate-6 transition-all duration-300"
              :class="card.color">
              <i :class="`pi ${card.icon} text-sm`"></i>
            </div>
            <span v-if="activeTab === card.tab && activeFramework === card.fw"
              class="text-[9px] font-black uppercase tracking-widest text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">Active</span>
          </div>
          <div class="text-3xl font-black text-slate-800 tracking-tight">{{ card.count }}</div>
          <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{{ card.label }}</div>
        </div>
      </div>

      <!-- ── Tab Switchers ───────────────────────────────────────────────── -->
      <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <!-- Group & Framework Tabs -->
        <div
          class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-8 pt-7 pb-5 border-b border-slate-50">
          <div class="flex flex-col gap-4 w-full md:w-auto">
            <!-- Skill Group Pills -->
            <div class="flex items-center gap-2">
              <button
                v-for="g in [{ label: '⚡ Core Skills', value: 'core' }, { label: '🎙️ Productive Skills', value: 'productive' }]"
                :key="g.value" @click="activeTab = g.value"
                class="px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 border"
                :class="activeTab === g.value
                  ? 'bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-100'">
                {{ g.label }}
              </button>
            </div>
            <!-- Framework Pills -->
            <div class="flex items-center gap-2">
              <button
                v-for="f in [{ label: 'CEFR Framework', value: 'cefr', color: 'violet' }, { label: 'ACTFL Framework', value: 'actfl', color: 'blue' }]"
                :key="f.value" @click="activeFramework = f.value"
                class="px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 border"
                :class="activeFramework === f.value
                  ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200'
                  : 'bg-violet-50/50 text-violet-400 border-violet-100 hover:border-violet-300 hover:bg-violet-50'">
                {{ f.label }}
              </button>
            </div>
          </div>

          <!-- Active context label -->
          <div class="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div class="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse"></div>
            <span class="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
              {{ activeTab === 'core' ? 'Core Skills' : 'Productive Skills' }}
              &nbsp;·&nbsp;
              {{ activeFramework.toUpperCase() }}
            </span>
            <span class="bg-violet-100 text-violet-600 text-[10px] font-black px-2 py-0.5 rounded-full">
              {{ filteredRows.length }} levels
            </span>
          </div>
        </div>

        <!-- ── Table ──────────────────────────────────────────────────────── -->
        <div v-if="loading" class="flex items-center justify-center py-24 gap-3">
          <ProgressSpinner class="!w-8 !h-8" />
          <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading thresholds…</span>
        </div>

        <div v-else class="overflow-x-auto">
          <DataTable :value="filteredRows" class="p-datatable-sm" responsiveLayout="scroll" stripedRows>

            <!-- Min Score -->
            <Column header="MIN SCORE / POINTS" style="width:200px">
              <template #body="{ data }">
                <div class="flex items-center gap-2">
                  <span class="px-3 py-1.5 rounded-xl text-xs font-black border" :class="getScoreColor(data.min_score)">
                    ≥ {{ data.min_score }}
                  </span>
                  <span class="text-[10px] font-bold text-slate-400">
                    {{ activeTab === 'core' ? '(out of 900)' : '(%)' }}
                  </span>
                </div>
              </template>
            </Column>

            <!-- Level Label -->
            <Column header="LEVEL LABEL" style="min-width:200px">
              <template #body="{ data }">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-violet-400"></div>
                  <span class="font-extrabold text-slate-800 text-sm">{{ data.level_label }}</span>
                </div>
              </template>
            </Column>

            <!-- Framework -->
            <Column header="FRAMEWORK" style="width:140px">
              <template #body="{ data }">
                <Tag :value="data.framework.toUpperCase()" :severity="data.framework === 'cefr' ? 'info' : 'warn'"
                  class="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg" />
              </template>
            </Column>

            <!-- Skill Group -->
            <Column header="SKILL GROUP" style="width:170px">
              <template #body="{ data }">
                <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border" :class="data.skill_group === 'core'
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'">
                  {{ data.skill_group === 'core' ? '⚡ Core' : '🎙️ Productive' }}
                </span>
              </template>
            </Column>

            <!-- Sort Order -->
            <Column header="ORDER" style="width:90px">
              <template #body="{ data }">
                <span class="text-xs font-bold text-slate-400">#{{ data.sort_order ?? '—' }}</span>
              </template>
            </Column>

            <!-- Is Active -->
            <Column header="STATUS" style="width:110px">
              <template #body="{ data }">
                <Tag :value="data.is_active ? 'Active' : 'Inactive'"
                  :severity="data.is_active ? 'success' : 'secondary'"
                  class="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg" />
              </template>
            </Column>

            <!-- Actions -->
            <Column header="ACTIONS" style="width:120px">
              <template #body="{ data }">
                <div class="flex items-center gap-2">
                  <button @click="openEdit(data)"
                    class="w-8 h-8 rounded-xl bg-slate-50 hover:bg-violet-50 text-slate-400 hover:text-violet-600 flex items-center justify-center border border-slate-200 hover:border-violet-200 transition-all duration-200 shadow-sm">
                    <i class="pi pi-pencil text-xs"></i>
                  </button>
                  <button @click="deleteRow(data)"
                    class="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-200 hover:border-rose-200 transition-all duration-200 shadow-sm">
                    <i class="pi pi-trash text-xs"></i>
                  </button>
                </div>
              </template>
            </Column>

            <!-- Empty State -->
            <template #empty>
              <div class="py-20 text-center space-y-3">
                <div class="text-5xl opacity-20">📊</div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  No thresholds defined for {{ activeTab }}/{{ activeFramework.toUpperCase() }} yet.
                </p>
                <button @click="openCreate"
                  class="mt-2 inline-flex items-center gap-2 text-xs font-extrabold text-violet-600 hover:text-violet-700 transition-colors">
                  <i class="pi pi-plus-circle"></i> Add first threshold
                </button>
              </div>
            </template>
          </DataTable>
        </div>
      </div>

      <!-- ── Score Scale Guide ───────────────────────────────────────────── -->


    </div>

    <!-- ── Create / Edit Dialog ────────────────────────────────────────────── -->
    <Dialog v-model:visible="showDialog" modal :header="editingRow ? 'Edit Threshold' : 'Add Threshold'"
      :style="{ width: '480px' }" class="rounded-2xl overflow-hidden">
      <div class="space-y-5 py-2">

        <!-- Skill Group -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Skill Group</label>
          <Select v-model="form.skill_group" :options="groupOptions" optionLabel="label" optionValue="value"
            placeholder="Select skill group" class="w-full text-sm" />
          <p v-if="formErrors.skill_group" class="text-xs text-rose-500 font-bold">{{ formErrors.skill_group[0] }}</p>
        </div>

        <!-- Framework -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Framework</label>
          <Select v-model="form.framework" :options="frameworkOptions" optionLabel="label" optionValue="value"
            placeholder="Select framework" class="w-full text-sm" />
          <p v-if="formErrors.framework" class="text-xs text-rose-500 font-bold">{{ formErrors.framework[0] }}</p>
        </div>

        <!-- Min Score -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
            Minimum Score
            <span class="font-bold text-slate-400 normal-case ml-1">
              ({{ form.skill_group === 'core' ? 'points out of 900' : 'percentage 0–100' }})
            </span>
          </label>
          <InputNumber v-model="form.min_score" :min="0" :max="form.skill_group === 'core' ? 900 : 100"
            class="w-full text-sm" inputClass="w-full" />
          <p v-if="formErrors.min_score" class="text-xs text-rose-500 font-bold">{{ formErrors.min_score[0] }}</p>
        </div>

        <!-- Level Label -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Level Label</label>
          <InputText v-model="form.level_label" placeholder="e.g. C1, Advanced High, B2.1" class="w-full text-sm"
            maxlength="50" />
          <p v-if="formErrors.level_label" class="text-xs text-rose-500 font-bold">{{ formErrors.level_label[0] }}</p>
        </div>

        <!-- Sort Order -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
            Sort Order <span class="font-bold text-slate-400 normal-case">(optional — auto if blank)</span>
          </label>
          <InputNumber v-model="form.sort_order" :min="0" class="w-full text-sm" inputClass="w-full"
            placeholder="Leave blank for auto" />
        </div>

        <!-- Is Active -->
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p class="text-xs font-extrabold text-slate-700">Active</p>
            <p class="text-[10px] font-bold text-slate-400">Inactive thresholds are skipped during mapping</p>
          </div>
          <ToggleSwitch v-model="form.is_active" />
        </div>

      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-3 pt-2">
          <Button label="Cancel" severity="secondary" outlined @click="closeDialog"
            class="text-xs font-extrabold uppercase tracking-wider rounded-xl px-6" />
          <Button :label="editingRow ? 'Save Changes' : 'Create'" icon="pi pi-check" :loading="saving" @click="saveRow"
            class="text-xs font-extrabold uppercase tracking-wider rounded-xl px-6 bg-violet-600 border-violet-600 hover:bg-violet-700" />
        </div>
      </template>
    </Dialog>

    <!-- ── Bulk Replace Dialog ─────────────────────────────────────────────── -->
    <Dialog v-model:visible="showBulkDialog" modal header="Bulk Replace Thresholds" :style="{ width: '580px' }"
      class="rounded-2xl overflow-hidden">
      <div class="space-y-5 py-2">

        <div class="p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-3">
          <i class="pi pi-exclamation-triangle text-amber-500 mt-0.5 shrink-0"></i>
          <p class="text-xs font-bold text-amber-700">
            This will <strong>DELETE ALL existing thresholds</strong> for the selected group/framework and replace them
            with
            the new list. Use with caution.
          </p>
        </div>

        <!-- Skill Group -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Skill Group</label>
            <Select v-model="bulkGroup" :options="groupOptions" optionLabel="label" optionValue="value"
              class="w-full text-sm" />
          </div>
          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Framework</label>
            <Select v-model="bulkFramework" :options="frameworkOptions" optionLabel="label" optionValue="value"
              class="w-full text-sm" />
          </div>
        </div>

        <!-- JSON Editor -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
            Thresholds JSON Array
            <span class="normal-case font-bold text-slate-400 ml-1">(sorted highest min_score first recommended)</span>
          </label>
          <textarea v-model="bulkJson" rows="12"
            class="w-full font-mono text-xs bg-slate-900 text-emerald-300 rounded-xl p-4 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
            placeholder='[
  { "min_score": 810, "level_label": "C2",  "sort_order": 0, "is_active": true },
  { "min_score": 720, "level_label": "C1",  "sort_order": 1, "is_active": true },
  ...
]'></textarea>
        </div>

      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-3 pt-2">
          <Button label="Cancel" severity="secondary" outlined @click="showBulkDialog = false"
            class="text-xs font-extrabold uppercase tracking-wider rounded-xl px-6" />
          <Button label="Replace All" icon="pi pi-upload" :loading="bulkSaving" @click="saveBulk" severity="danger"
            class="text-xs font-extrabold uppercase tracking-wider rounded-xl px-6" />
        </div>
      </template>
    </Dialog>

  </AdminLayout>
</template>

<style scoped>
.animate-in {
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.p-datatable-thead > tr > th) {
  background: #f8fafc;
  border-bottom: 2px solid #f1f5f9;
  padding: 0.9rem 1rem;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

:deep(.p-datatable-tbody > tr) {
  border-bottom: 1px solid #f8fafc;
  transition: background 0.15s;
}

:deep(.p-datatable-tbody > tr:hover) {
  background: #fafbff !important;
}

:deep(.p-datatable-tbody > tr > td) {
  padding: 0.875rem 1rem;
}

:deep(.p-dialog .p-dialog-header) {
  padding: 1.5rem 1.75rem 1rem;
  font-weight: 800;
  font-size: 1rem;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
}

:deep(.p-dialog .p-dialog-content) {
  padding: 1rem 1.75rem;
}

:deep(.p-dialog .p-dialog-footer) {
  padding: 1rem 1.75rem 1.5rem;
  border-top: 1px solid #f1f5f9;
}

:deep(.p-inputtext),
:deep(.p-inputnumber-input),
:deep(.p-select) {
  border-radius: 0.75rem;
  font-size: 0.875rem;
  border-color: #e2e8f0;
}

:deep(.p-inputtext:focus),
:deep(.p-inputnumber-input:focus),
:deep(.p-select:focus) {
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
}
</style>
