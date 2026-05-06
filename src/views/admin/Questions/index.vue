<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useAdminStore } from '@/stores/admin';

import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import Textarea from 'primevue/textarea';
import Tooltip from 'primevue/tooltip';

const vTooltip = Tooltip;

const questions = ref([]);
const adminStore = useAdminStore();
const loading = ref(true);
const filterSkill = ref(null);
const filterExam = ref(null);
const filterType = ref('');
const searchQuery = ref('');
const filterLevel = ref(null);
const skills = ref([]);
const exams = ref([]);
const showInstructionsModal = ref(false);
const selectedSkillForInst = ref(null);
const selectedLevelForInst = ref(null);
const instructionsText = ref('');
const instructionsAudioFile = ref(null);
const isSavingInst = ref(false);
const skillsWithLevels = ref([]);


const questionTypeMeta = {
    mcq:          { label: 'MCQ',          severity: 'info',      icon: 'pi-check-square', color: 'bg-blue-500' },
    true_false:   { label: 'True / False', severity: 'warn',      icon: 'pi-verified',     color: 'bg-orange-500' },
    short_answer: { label: 'Short Answer', severity: 'success',   icon: 'pi-pencil',       color: 'bg-emerald-500' },
    writing:      { label: 'Writing',      severity: 'contrast',  icon: 'pi-file-edit',    color: 'bg-slate-700' },
    speaking:     { label: 'Speaking',     severity: 'danger',    icon: 'pi-microphone',   color: 'bg-rose-500' },
    upload:       { label: 'Upload',       severity: 'secondary', icon: 'pi-upload',       color: 'bg-purple-500' },
    drag_drop:    { label: 'Drag & Drop',  severity: 'info',      icon: 'pi-arrows-alt',   color: 'bg-cyan-500' },
    fill_blank:   { label: 'Fill Blanks',  severity: 'warn',      icon: 'pi-minus',        color: 'bg-amber-500' },
    matching:     { label: 'Matching',     severity: 'success',   icon: 'pi-list',         color: 'bg-teal-500' },
    ordering:     { label: 'Ordering',     severity: 'help',      icon: 'pi-sort-numeric-down', color: 'bg-indigo-500' },
    highlight:    { label: 'Highlight',    severity: 'warn',      icon: 'pi-sun',          color: 'bg-yellow-500' },
    word_selection: { label: 'Word Select', severity: 'info',     icon: 'pi-cursor-click', color: 'bg-sky-500' },
};

const deleteItem = async (id) => {
    if (!confirm('Delete this question? This action cannot be undone.')) return;
    try {
        await api.delete(`/admin/questions/${id}`);
        fetchData();
    } catch (err) {
        console.error('Delete failed', err);
    }
};

const fetchData = async () => {
    loading.value = true;
    try {
        const params = {};
        if (filterSkill.value) params.skill_id = filterSkill.value;
        if (filterExam.value) params.exam_id = filterExam.value;
        if (filterLevel.value) params.level_id = filterLevel.value;

        const [qRes, sRes, eRes, slRes] = await Promise.all([
            api.get('/admin/questions', { params }),
            api.get('/admin/skills'),
            api.get('/admin/exams'),
            api.get('/admin/skills-with-levels').catch(() => ({ data: [] }))
        ]);
        questions.value = qRes.data.data || qRes.data;
        skills.value = sRes.data;
        exams.value = eRes.data;
        skillsWithLevels.value = slRes.data;
    } catch (err) {
        console.error('Failed to load', err);
    } finally {
        loading.value = false;
    }
};

const openInstructions = () => {
    showInstructionsModal.value = true;
    if (skillsWithLevels.value.length > 0) {
        selectedSkillForInst.value = skillsWithLevels.value[0];
        if (selectedSkillForInst.value.levels.length > 0) {
            selectLevel(selectedSkillForInst.value.levels[0]);
        }
    }
};

const selectLevel = (level) => {
    selectedLevelForInst.value = level;
    instructionsText.value = level.instructions || '';
    instructionsAudioFile.value = null;
};

const handleAudioUpload = (e) => {
    instructionsAudioFile.value = e.target.files[0];
};

const saveInstructions = async () => {
    if (!selectedLevelForInst.value) return;
    isSavingInst.value = true;
    const formData = new FormData();
    formData.append('_method', 'PATCH');
    formData.append('instructions', instructionsText.value);
    if (instructionsAudioFile.value) {
        formData.append('instructions_audio', instructionsAudioFile.value);
    }
    try {
        await api.post(`/admin/levels/${selectedLevelForInst.value.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        fetchData();
        alert('Instructions saved!');
    } catch (err) {
        console.error('Save failed', err);
    } finally {
        isSavingInst.value = false;
    }
};

const resolveUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const storageBase = baseUrl.replace('/api/v1', '/storage').replace('/api', '/storage');
    return `${storageBase}/${path.replace('storage/', '')}`;
};

const filteredQuestions = computed(() => {
    let filtered = questions.value;
    if (filterType.value)  filtered = filtered.filter(q => q.type === filterType.value);
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        filtered = filtered.filter(item =>
            item.content?.toLowerCase().includes(q) ||
            item.instructions?.toLowerCase().includes(q) ||
            item.passage?.title?.toLowerCase().includes(q)
        );
    }
    return [...filtered].sort((a, b) => {
        const lvA = a.level?.level_number || a.level_id || 0;
        const lvB = b.level?.level_number || b.level_id || 0;
        if (lvA !== lvB) return lvA - lvB;
        const passA = a.passage_id || 0;
        const passB = b.passage_id || 0;
        if (passA !== passB) return passB - passA;
        return (a.id - b.id);
    });
});

watch([filterSkill, filterExam, filterLevel], () => {
    fetchData();
});

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div class="min-h-screen bg-slate-50/50 pb-24">
      <!-- Title & Filters Section (Sticky) -->
      <div class="sticky top-[-40px] z-[100] bg-white border-b border-slate-200 shadow-lg shadow-slate-200/20 -mx-10 px-10 pt-16 pb-8 mb-10 transition-all duration-300">
        <div class="max-w-[1600px] mx-auto space-y-8">
          <!-- Header: Title + Actions -->
          <div class="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div class="flex items-center gap-5">
              <div class="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-100 ring-4 ring-indigo-50">
                <i class="pi pi-database text-white text-2xl"></i>
              </div>
              <div>
                <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Question Bank</h1>
                <p class="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.3em] flex items-center gap-2">
                  <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  {{ filteredQuestions.length }} Cognitive Assets Managed
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <Button label="Level Guides" icon="pi pi-book" severity="secondary" text @click="openInstructions" class="font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 px-6 py-4 rounded-xl" />
              <Button label="Add New Question" icon="pi pi-plus" raised @click="$router.push({ name: adminStore.user?.role === 'teacher' ? 'teacher.questions.create' : 'admin.questions.create' })" class="font-black text-[10px] uppercase tracking-widest px-10 h-14 shadow-2xl shadow-indigo-200 rounded-2xl" />
            </div>
          </div>

          <!-- Filter Bar -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-[2rem] border border-slate-100 shadow-inner">
            <div class="lg:col-span-4 relative group">
              <i class="pi pi-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
              <InputText v-model="searchQuery" placeholder="Search by content or keywords..." 
                class="w-full pl-12 h-12 rounded-[1.5rem] bg-white border-transparent shadow-sm focus:border-indigo-500/20 transition-all font-bold text-xs" />
            </div>

            <div class="lg:col-span-8 flex flex-wrap items-center justify-end gap-3">
              <Select v-model="filterExam" :options="[{title:'All Exams', id:null}, ...exams]" optionLabel="title" optionValue="id" placeholder="Exam" class="h-12 rounded-xl border-transparent shadow-sm min-w-[160px] text-[10px] font-black uppercase" />
              <Select v-model="filterSkill" :options="[{name:'All Skills', id:null}, ...skills]" optionLabel="name" optionValue="id" placeholder="Skill" class="h-12 rounded-xl border-transparent shadow-sm min-w-[140px] text-[10px] font-black uppercase" />
              <Select v-model="filterType" :options="[{label:'All Types', value:''}, ...Object.entries(questionTypeMeta).map(([k,v])=>({label:v.label, value:k}))]" optionLabel="label" optionValue="value" placeholder="Type" class="h-12 rounded-xl border-transparent shadow-sm min-w-[140px] text-[10px] font-black uppercase" />
              <Select v-model="filterLevel" :options="[{label:'All Levels', value:null}, ...Array.from({length:10}, (_,i)=>({label:`Level ${i+1}`, value:i+1}))]" optionLabel="label" optionValue="value" placeholder="Level" class="h-12 rounded-xl border-transparent shadow-sm min-w-[120px] text-[10px] font-black uppercase" />
              
              <Button v-if="searchQuery || filterSkill || filterExam || filterLevel || filterType" 
                icon="pi pi-filter-slash" severity="danger" rounded outlined @click="searchQuery=''; filterSkill=null; filterExam=null; filterLevel=null; filterType=''" 
                v-tooltip.top="'Reset Filters'" class="h-12 w-12" />
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-[1600px] mx-auto px-6">
        
        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-40">
          <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-6">Accessing Matrix Repository...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredQuestions.length === 0" class="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 gap-6">
          <div class="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
            <i class="pi pi-search text-5xl"></i>
          </div>
          <div class="text-center">
            <h3 class="text-2xl font-black text-slate-800 tracking-tight uppercase">Zero Results Found</h3>
            <p class="text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-widest">Adjust your filters to refine the search</p>
          </div>
          <Button label="Clear All Parameters" icon="pi pi-refresh" severity="secondary" outlined @click="searchQuery=''; filterSkill=null; filterExam=null; filterLevel=null; filterType=''" class="rounded-2xl font-black text-[10px] uppercase tracking-widest px-8" />
        </div>

        <!-- Content View (Table Only) -->
        <div v-else class="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative z-0">
          <DataTable :value="filteredQuestions" paginator :rows="15" class="p-datatable-sm" responsiveLayout="scroll">
            <Column header="#" style="width: 70px">
              <template #body="{ data }"><span class="text-[10px] font-black text-slate-400">#{{ data.id }}</span></template>
            </Column>
            <Column header="Question Content" style="min-width: 400px">
              <template #body="{ data }">
                <div class="flex items-center gap-4 py-2">
                  <div v-if="data.image_url" class="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                    <img :src="resolveUrl(data.image_url)" class="w-full h-full object-cover" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-sm font-bold text-slate-700 truncate max-w-[350px]" v-html="data.content || '<span class=\'italic text-slate-300\'>No text content</span>'"></div>
                    <div v-if="data.passage" class="flex items-center gap-1.5 mt-1">
                      <i class="pi pi-book text-[9px] text-indigo-400"></i>
                      <span class="text-[10px] font-bold text-slate-400 truncate">{{ data.passage.title }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </Column>
            <Column header="Type">
              <template #body="{ data }">
                <Tag :value="questionTypeMeta[data.type]?.label" :severity="questionTypeMeta[data.type]?.severity" class="text-[9px] font-black uppercase rounded-lg px-2" />
              </template>
            </Column>
            <Column header="Level">
              <template #body="{ data }">
                <span class="text-xs font-black text-slate-600">L{{ data.level?.level_number || data.level_id }}</span>
              </template>
            </Column>
            <Column header="Skill">
              <template #body="{ data }">
                <span class="text-xs font-bold text-slate-500 uppercase">{{ data.skill?.name }}</span>
              </template>
            </Column>
            <Column header="Points" class="text-center">
              <template #body="{ data }">
                <span class="text-sm font-black text-indigo-600">{{ data.points }}</span>
              </template>
            </Column>
            <Column header="Authorship" style="width: 150px">
              <template #body="{ data }">
                <div class="flex flex-col gap-1">
                  <div v-if="data.creator" class="flex items-center gap-1.5">
                    <i class="pi pi-user text-[9px] text-slate-400"></i>
                    <span class="text-[10px] font-bold text-slate-600 truncate max-w-[120px]" v-tooltip.top="`${data.creator.first_name} ${data.creator.last_name}`">
                      {{ data.creator.first_name }} {{ data.creator.last_name }}
                    </span>
                  </div>
                  <div v-if="data.updater && data.updated_by !== data.created_by" class="flex items-center gap-1.5 opacity-70">
                    <i class="pi pi-pencil text-[9px] text-slate-400"></i>
                    <span class="text-[10px] font-medium text-slate-500 truncate max-w-[120px]" v-tooltip.top="`Last edited by ${data.updater.first_name}`">
                      {{ data.updater.first_name }}
                    </span>
                  </div>
                  <span v-if="!data.creator" class="text-[9px] font-bold text-slate-300 italic">System</span>
                </div>
              </template>
            </Column>
            <Column style="width: 100px" class="text-right">
              <template #body="{ data }">
                <div class="flex justify-end gap-1">
                  <Button icon="pi pi-pencil" severity="secondary" text size="small" @click="$router.push({ name: adminStore.user?.role === 'teacher' ? 'teacher.questions.edit' : 'admin.questions.edit', params: { id: data.id } })" />
                  <Button icon="pi pi-trash" severity="danger" text size="small" @click="deleteItem(data.id)" />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>

      <!-- Level Instructions Modal (Refined) -->
      <Dialog v-model:visible="showInstructionsModal" :style="{ width: '85vw' }" maximizable modal class="rounded-[3rem] overflow-hidden">
        <template #header>
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <i class="pi pi-book text-lg"></i>
            </div>
            <div>
              <h3 class="text-xl font-black text-slate-800">Master Level Guides</h3>
              <p class="text-xs font-bold text-slate-400 mt-0.5">Configure cognitive tier instructions and media</p>
            </div>
          </div>
        </template>

        <div class="flex flex-col lg:flex-row gap-8 py-6 h-full min-h-[60vh]">
          <!-- Skill Navigation -->
          <div class="w-full lg:w-80 bg-slate-50 rounded-3xl p-6 space-y-8 overflow-y-auto max-h-[70vh] border border-slate-100">
            <div v-for="skill in skillsWithLevels" :key="skill.id" class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="w-1 h-4 bg-indigo-500 rounded-full"></span>
                <span class="text-xs font-black text-slate-800 uppercase tracking-widest">{{ skill.name }}</span>
              </div>
              <div class="grid grid-cols-4 gap-2">
                <button v-for="level in skill.levels" :key="level.id"
                  @click="selectedSkillForInst = skill; selectLevel(level)"
                  :class="selectedLevelForInst?.id === level.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2'
                    : 'bg-white text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md border border-slate-100'"
                  class="aspect-square rounded-xl flex items-center justify-center font-black text-[10px] transition-all duration-300">
                  L{{ level.level_number }}
                </button>
              </div>
            </div>
          </div>

          <!-- Configuration Editor -->
          <div class="flex-1 space-y-8">
            <div v-if="selectedLevelForInst" class="animate-in fade-in slide-in-from-right-4 duration-500">
              <div class="flex items-center gap-3 mb-8 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                <span class="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase">Tier Active</span>
                <h4 class="text-lg font-black text-indigo-900 uppercase tracking-tight">
                  {{ selectedSkillForInst?.name }} <span class="mx-2 text-indigo-300">/</span> Level {{ selectedLevelForInst.level_number }}
                </h4>
              </div>

              <div class="grid grid-cols-1 gap-8">
                <div class="space-y-3">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Textual Guidance</label>
                  <Textarea v-model="instructionsText" autoResize rows="6"
                    placeholder="Provide clear instructions for students entering this difficulty tier..."
                    class="w-full rounded-[2rem] border-slate-200 bg-white p-8 text-sm font-semibold shadow-sm focus:ring-4 focus:ring-indigo-50 transition-all leading-relaxed" />
                </div>

                <div class="space-y-3">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Audio Narration</label>
                  <div class="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
                    <div v-if="selectedLevelForInst.instructions_audio_url" class="flex-1 w-full bg-slate-50 p-4 rounded-2xl flex items-center gap-4 border border-slate-100">
                      <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <i class="pi pi-volume-up"></i>
                      </div>
                      <audio :src="resolveUrl(selectedLevelForInst.instructions_audio_url)" controls class="h-8 flex-1"></audio>
                    </div>
                    <div v-else class="flex-1 text-center py-4 text-slate-300 italic text-sm">
                      No audio instruction currently set.
                    </div>
                    <div class="shrink-0">
                      <label class="relative cursor-pointer group">
                        <input type="file" @change="handleAudioUpload" accept="audio/*" class="hidden" />
                        <div class="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                          <i class="pi pi-upload mr-2"></i> {{ instructionsAudioFile ? 'Change File' : 'Upload Audio' }}
                        </div>
                      </label>
                    </div>
                  </div>
                  <p v-if="instructionsAudioFile" class="text-[10px] font-bold text-emerald-600 ml-4">
                    <i class="pi pi-check-circle mr-1"></i> New file selected: {{ instructionsAudioFile.name }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center h-full bg-slate-50 rounded-[3rem] border border-dashed border-slate-200 p-12">
              <i class="pi pi-arrow-left text-4xl text-slate-200 mb-4"></i>
              <p class="text-slate-400 font-black text-sm uppercase tracking-widest">Select a Level to Edit</p>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end items-center gap-4 p-4 border-t border-slate-100 mt-4">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-auto ml-4" v-if="selectedLevelForInst">
              Changes will be applied immediately to all students in this level.
            </span>
            <Button label="Discard" severity="secondary" text @click="showInstructionsModal = false" class="font-bold text-sm" />
            <Button label="Push Changes" icon="pi pi-cloud-upload" :loading="isSavingInst" :disabled="!selectedLevelForInst"
              @click="saveInstructions" class="font-bold px-10 h-12 rounded-2xl shadow-xl shadow-indigo-100" />
          </div>
        </template>
      </Dialog>
    </div>
  </AdminLayout>
</template>

<style scoped>
.prose-slate :deep(p) { margin: 0; }

/* Custom Scrollbar for better aesthetics */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #f8fafc; }
::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

:deep(.p-datatable-thead > tr > th) {
    background: #F8FAFC;
    border-bottom: 2px solid #F1F5F9;
    padding: 1.25rem;
    color: #94A3B8;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.15em;
}

:deep(.p-datatable-tbody > tr) {
    border-bottom: 1px solid #F1F5F9;
    transition: all 0.3s ease;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #F8FAFC;
}

:deep(.p-datatable-tbody > tr > td) {
    padding: 1rem 1.25rem;
}

/* Animations */
.animate-in {
  animation-duration: 0.5s;
  animation-fill-mode: both;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in { animation-name: fadeIn; }

.ql-editor-preview {
  max-height: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
