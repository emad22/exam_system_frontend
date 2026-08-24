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
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import CardListSkeleton from '@/components/skeletons/CardListSkeleton.vue';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';

const toast = useToast();
const confirm = useConfirm();

// State
const criteria = ref([]);
const categories = ref([]);
const totalPoints = ref(0);
const totalPercentage = ref(0);
const loading = ref(true);
const saving = ref(false);
const resetting = ref(false);

// Dialog State
const showDialog = ref(false);
const isEditing = ref(false);
const editingId = ref(null);

const defaultCategories = [
  'General Format & Vocabulary',
  'Grammar & Syntax',
  'Content & Structure',
  'Rhetoric & Style (Creativity & Impact)'
];

const form = ref({
  category: 'General Format & Vocabulary',
  customCategory: '',
  name: '',
  description: '',
  percentage: 5.0,
  max_points: 45.0,
  order_index: 1,
  is_active: true,
});

const formErrors = ref({});

// Category Options
const categoryOptions = computed(() => {
  const existing = [...new Set([...defaultCategories, ...criteria.value.map(c => c.category)])];
  return existing;
});

// Load data
async function loadCriteria() {
  loading.value = true;
  try {
    const res = await api.get('/admin/rubrics');
    criteria.value = res.data.criteria || [];
    categories.value = res.data.categories || [];
    totalPoints.value = res.data.total_points || 0;
    totalPercentage.value = res.data.total_percentage || 0;
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Load Failed',
      detail: err?.response?.data?.message || 'Could not load rubric criteria.',
      life: 4000
    });
  } finally {
    loading.value = false;
  }
}

function openCreateDialog(categoryName = null) {
  isEditing.value = false;
  editingId.value = null;
  formErrors.value = {};
  
  const nextOrder = criteria.value.length > 0 
    ? Math.max(...criteria.value.map(c => c.order_index || 0)) + 1 
    : 1;

  form.value = {
    category: categoryName || defaultCategories[0],
    customCategory: '',
    name: '',
    description: '',
    percentage: 5.0,
    max_points: 45.0,
    order_index: nextOrder,
    is_active: true,
  };
  showDialog.value = true;
}

function openEditDialog(row) {
  isEditing.value = true;
  editingId.value = row.id;
  formErrors.value = {};
  form.value = {
    category: row.category,
    customCategory: '',
    name: row.name,
    description: row.description || '',
    percentage: parseFloat(row.percentage) || 0,
    max_points: parseFloat(row.max_points) || 0,
    order_index: row.order_index || 1,
    is_active: Boolean(row.is_active),
  };
  showDialog.value = true;
}

function closeDialog() {
  showDialog.value = false;
  editingId.value = null;
  formErrors.value = {};
}

async function saveCriterion() {
  formErrors.value = {};
  
  const finalCategory = form.value.customCategory.trim() 
    ? form.value.customCategory.trim() 
    : form.value.category;

  if (!finalCategory) {
    formErrors.value.category = ['Category is required'];
    return;
  }
  if (!form.value.name.trim()) {
    formErrors.value.name = ['Criterion name is required'];
    return;
  }

  saving.value = true;
  const payload = {
    skill_type: 'writing',
    category: finalCategory,
    name: form.value.name.trim(),
    description: form.value.description ? form.value.description.trim() : '',
    percentage: form.value.percentage,
    max_points: form.value.max_points,
    order_index: form.value.order_index,
    is_active: form.value.is_active,
  };

  try {
    if (isEditing.value && editingId.value) {
      await api.patch(`/admin/rubrics/${editingId.value}`, payload);
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Rubric criterion updated successfully.',
        life: 3000
      });
    } else {
      await api.post('/admin/rubrics', payload);
      toast.add({
        severity: 'success',
        summary: 'Created',
        detail: 'New rubric criterion created successfully.',
        life: 3000
      });
    }
    closeDialog();
    await loadCriteria();
  } catch (err) {
    if (err?.response?.status === 422) {
      formErrors.value = err.response.data.errors || {};
    } else {
      toast.add({
        severity: 'error',
        summary: 'Save Failed',
        detail: err?.response?.data?.message || 'Error occurred while saving.',
        life: 4000
      });
    }
  } finally {
    saving.value = false;
  }
}

async function toggleActive(row) {
  try {
    await api.patch(`/admin/rubrics/${row.id}`, {
      ...row,
      is_active: !row.is_active,
    });
    row.is_active = !row.is_active;
    await loadCriteria();
    toast.add({
      severity: 'info',
      summary: 'Status Changed',
      detail: `Criterion ${row.is_active ? 'enabled' : 'disabled'}.`,
      life: 2000
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not update criterion status.',
      life: 3000
    });
  }
}

function confirmDelete(row) {
  confirm.require({
    message: `Are you sure you want to delete criterion "${row.name}"?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Yes, Delete',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger rounded-xl',
    rejectClass: 'p-button-secondary p-button-outlined rounded-xl',
    accept: async () => {
      try {
        await api.delete(`/admin/rubrics/${row.id}`);
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Criterion deleted successfully.',
          life: 3000
        });
        await loadCriteria();
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: err?.response?.data?.message || 'Could not delete criterion.',
          life: 4000
        });
      }
    }
  });
}

function confirmResetDefault() {
  confirm.require({
    message: 'Are you sure you want to reset all criteria to the standard default rubric (14 criteria - 900 points total)? Any custom modifications will be replaced.',
    header: 'Reset to Standard Rubric',
    icon: 'pi pi-refresh',
    acceptLabel: 'Yes, Reset to Default',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-warning rounded-xl',
    rejectClass: 'p-button-secondary p-button-outlined rounded-xl',
    accept: async () => {
      resetting.value = true;
      try {
        await api.post('/admin/rubrics/reset-default');
        toast.add({
          severity: 'success',
          summary: 'Reset Completed',
          detail: 'Standard rubric criteria restored successfully.',
          life: 3000
        });
        await loadCriteria();
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Reset Failed',
          detail: err?.response?.data?.message || 'Could not reset criteria.',
          life: 4000
        });
      } finally {
        resetting.value = false;
      }
    }
  });
}

onMounted(loadCriteria);
</script>

<template>
  <AdminLayout>
    <div class="w-full px-4 md:px-10 pt-8">

      <!-- Header Section -->
      <div class="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-[2.5rem] p-8 text-white shadow-2xl border border-slate-700/40">
        <div class="absolute -right-12 -top-12 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute left-1/4 -bottom-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black tracking-wide border border-rose-500/30">
              <i class="pi pi-pencil text-xs"></i>
              <span>Writing Evaluation System</span>
            </div>
            <h1 class="text-3xl font-black tracking-tight text-white">
              Writing Assessment Rubrics & Criteria
            </h1>
            <p class="text-slate-300 text-sm max-w-2xl font-medium leading-relaxed">
              Define the categories, criteria descriptions, weight percentages, and maximum points shown to examiners during writing task correction.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button
              label="Reset to Default"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              :loading="resetting"
              @click="confirmResetDefault"
              class="border-slate-600 hover:border-slate-400 text-slate-200 rounded-2xl px-5 py-3 text-xs font-black shadow-sm"
            />
            <Button
              label="Add Criterion"
              icon="pi pi-plus"
              @click="() => openCreateDialog()"
              class="bg-rose-600 hover:bg-rose-700 border-none text-white rounded-2xl px-6 py-3 text-xs font-black shadow-lg shadow-rose-900/40 transition-all hover:scale-105"
            />
          </div>
        </div>

        <!-- Metrics Row -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/60">
          <div class="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span class="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Categories</span>
            <span class="text-2xl font-black text-white mt-1 block">{{ categories.length }} Categories</span>
          </div>
          <div class="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span class="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Active Criteria</span>
            <span class="text-2xl font-black text-white mt-1 block">{{ criteria.filter(c => c.is_active).length }} Criteria</span>
          </div>
          <div class="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span class="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Total Max Score</span>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="text-2xl font-black text-emerald-400">{{ totalPoints }}</span>
              <span class="text-xs text-slate-400 font-bold">pts</span>
            </div>
          </div>
          <div class="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span class="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Total Weight</span>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="text-2xl font-black" :class="totalPercentage === 100 ? 'text-emerald-400' : 'text-amber-400'">
                {{ totalPercentage }}%
              </span>
              <span v-if="totalPercentage === 100" class="text-[10px] text-emerald-300 font-bold ml-1">✓ Complete</span>
              <span v-else class="text-[10px] text-amber-300 font-bold ml-1">⚠️ Incomplete</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="mt-6 px-4 md:px-8">
        <CardListSkeleton :rows="5" />
      </div>

      <!-- Categories & Criteria Tables -->
      <div v-else class="space-y-8">
        <div 
          v-for="(cat, cIdx) in categories" 
          :key="cat.name"
          class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
        >
          <!-- Category Header -->
          <div class="px-8 py-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-3 h-8 bg-rose-600 rounded-full"></div>
              <div>
                <h3 class="font-black text-slate-800 text-lg leading-tight">{{ cat.name }}</h3>
                <p class="text-xs text-slate-400 font-bold mt-0.5">{{ cat.criteria.length }} sub-criteria</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="bg-rose-50 border border-rose-100 rounded-xl px-4 py-1.5 text-center">
                <span class="text-[10px] font-black text-rose-500 uppercase block">Weight</span>
                <span class="text-sm font-black text-rose-700">{{ cat.total_percentage }}%</span>
              </div>
              <div class="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-1.5 text-center">
                <span class="text-[10px] font-black text-emerald-500 uppercase block">Subtotal</span>
                <span class="text-sm font-black text-emerald-700">{{ cat.total_points }} pts</span>
              </div>
              <Button
                icon="pi pi-plus"
                label="Add to Category"
                severity="secondary"
                outlined
                size="small"
                @click="openCreateDialog(cat.name)"
                class="rounded-xl font-black text-xs border-slate-200 hover:border-slate-300"
              />
            </div>
          </div>

          <!-- Category Criteria List / Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th class="py-3.5 px-6 w-16 text-center">#</th>
                  <th class="py-3.5 px-6">Criterion</th>
                  <th class="py-3.5 px-6 min-w-[280px]">Guidance & Description</th>
                  <th class="py-3.5 px-6 text-center w-28">Weight %</th>
                  <th class="py-3.5 px-6 text-center w-32">Max Points</th>
                  <th class="py-3.5 px-6 text-center w-28">Status</th>
                  <th class="py-3.5 px-6 text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                <tr 
                  v-for="(item, idx) in cat.criteria" 
                  :key="item.id"
                  class="hover:bg-slate-50/60 transition-colors"
                  :class="{'opacity-50 bg-slate-50/30': !item.is_active}"
                >
                  <td class="py-4 px-6 text-center font-black text-slate-400 text-xs">
                    {{ item.order_index || idx + 1 }}
                  </td>
                  <td class="py-4 px-6 font-bold text-slate-900">
                    {{ item.name }}
                  </td>
                  <td class="py-4 px-6 text-slate-600 leading-relaxed text-xs">
                    <span v-if="item.description">{{ item.description }}</span>
                    <span v-else class="text-slate-300 italic">No description provided</span>
                  </td>
                  <td class="py-4 px-6 text-center font-black text-rose-600">
                    {{ item.percentage }}%
                  </td>
                  <td class="py-4 px-6 text-center font-black text-slate-800">
                    <span class="inline-block bg-slate-100 px-3 py-1 rounded-lg text-xs font-black text-slate-700">
                      {{ item.max_points }} pts
                    </span>
                  </td>
                  <td class="py-4 px-6 text-center">
                    <button 
                      @click="toggleActive(item)" 
                      class="transition-transform active:scale-95"
                      :title="item.is_active ? 'Click to disable' : 'Click to enable'"
                    >
                      <Tag 
                        :value="item.is_active ? 'Active' : 'Inactive'" 
                        :severity="item.is_active ? 'success' : 'secondary'"
                        class="text-[10px] font-black rounded-lg px-2.5 py-1 cursor-pointer"
                      />
                    </button>
                  </td>
                  <td class="py-4 px-6 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <Button
                        icon="pi pi-pencil"
                        severity="secondary"
                        text
                        rounded
                        @click="openEditDialog(item)"
                        class="w-8 h-8 text-slate-500 hover:text-brand-primary hover:bg-slate-100"
                        title="Edit Criterion"
                      />
                      <Button
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        rounded
                        @click="confirmDelete(item)"
                        class="w-8 h-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Criterion"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="categories.length === 0" class="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
          <i class="pi pi-inbox text-5xl text-slate-300"></i>
          <h3 class="text-base font-bold text-slate-700">No criteria defined yet</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">You can create a new criterion or restore the standard writing rubric with one click.</p>
          <Button
            label="Restore Standard Rubric"
            icon="pi pi-refresh"
            @click="confirmResetDefault"
            class="bg-brand-primary text-white rounded-xl px-5 py-2.5 text-xs font-black"
          />
        </div>
      </div>

    </div>

    <!-- Create / Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="isEditing ? 'Edit Rubric Criterion' : 'Add New Rubric Criterion'"
      :modal="true"
      :style="{ width: '560px' }"
      class="p-fluid rounded-3xl overflow-hidden"
    >
      <form @submit.prevent="saveCriterion" class="space-y-5 pt-2">

        <!-- Category -->
        <div class="space-y-1.5">
          <label class="text-xs font-black text-slate-700">Category <span class="text-rose-500">*</span></label>
          <select
            v-model="form.category"
            class="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white shadow-sm"
          >
            <option v-for="cat in categoryOptions" :key="cat" :value="cat">{{ cat }}</option>
            <option value="__custom__">+ Add Custom Category...</option>
          </select>
          <div v-if="form.category === '__custom__'" class="mt-2">
            <InputText
              v-model="form.customCategory"
              placeholder="Enter custom category name..."
              class="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium"
            />
          </div>
          <span v-if="formErrors.category" class="text-xs text-rose-500 font-bold block">{{ formErrors.category[0] }}</span>
        </div>

        <!-- Name -->
        <div class="space-y-1.5">
          <label class="text-xs font-black text-slate-700">Criterion Name <span class="text-rose-500">*</span></label>
          <InputText
            v-model="form.name"
            placeholder="e.g., Length, Vocabulary, Conjugation..."
            class="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium"
            :class="{'border-rose-500': formErrors.name}"
          />
          <span v-if="formErrors.name" class="text-xs text-rose-500 font-bold block">{{ formErrors.name[0] }}</span>
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <label class="text-xs font-black text-slate-700">Guidance & Description (Examiner Guide)</label>
          <Textarea
            v-model="form.description"
            rows="3"
            autoResize
            placeholder="Instructions for the grader on what to evaluate and expect from the student..."
            class="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium"
          />
        </div>

        <!-- Numbers Row: Percentage & Max Points -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-xs font-black text-slate-700">Weight Percentage (%) <span class="text-rose-500">*</span></label>
            <InputNumber
              v-model="form.percentage"
              :min="0"
              :max="100"
              :minFractionDigits="1"
              :maxFractionDigits="2"
              suffix=" %"
              class="w-full"
              inputClass="rounded-xl border border-slate-200 p-3 text-sm font-bold text-center"
            />
            <span v-if="formErrors.percentage" class="text-xs text-rose-500 font-bold block">{{ formErrors.percentage[0] }}</span>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-black text-slate-700">Max Points <span class="text-rose-500">*</span></label>
            <InputNumber
              v-model="form.max_points"
              :min="0"
              :minFractionDigits="0"
              :maxFractionDigits="2"
              suffix=" pts"
              class="w-full"
              inputClass="rounded-xl border border-slate-200 p-3 text-sm font-bold text-center text-emerald-600"
            />
            <span v-if="formErrors.max_points" class="text-xs text-rose-500 font-bold block">{{ formErrors.max_points[0] }}</span>
          </div>
        </div>

        <!-- Order Index & Status -->
        <div class="grid grid-cols-2 gap-4 pt-2">
          <div class="space-y-1.5">
            <label class="text-xs font-black text-slate-700">Sort Order</label>
            <InputNumber
              v-model="form.order_index"
              :min="1"
              class="w-full"
              inputClass="rounded-xl border border-slate-200 p-3 text-sm font-bold text-center"
            />
          </div>

          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 mt-5">
            <span class="text-xs font-black text-slate-700">Active Status</span>
            <ToggleSwitch v-model="form.is_active" />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            outlined
            @click="closeDialog"
            class="rounded-xl px-5 py-2.5 text-xs font-black border-slate-200"
          />
          <Button
            type="submit"
            :label="isEditing ? 'Save Changes' : 'Create Criterion'"
            icon="pi pi-check"
            :loading="saving"
            class="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-6 py-2.5 text-xs font-black shadow-md border-none"
          />
        </div>

      </form>
    </Dialog>

  </AdminLayout>
</template>

<style scoped>
.animate-in {
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
