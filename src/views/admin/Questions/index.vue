<script setup>
import { ref, onMounted, computed } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

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

const questions = ref([]);
const loading = ref(true);
const filterSkill = ref('');
const filterType = ref('');
const searchQuery = ref('');
const skills = ref([]);
const showInstructionsModal = ref(false);
const selectedSkillForInst = ref(null);
const selectedLevelForInst = ref(null);
const instructionsText = ref('');
const instructionsAudioFile = ref(null);
const isSavingInst = ref(false);
const skillsWithLevels = ref([]);

const fetchData = async () => {
    loading.value = true;
    try {
        const [qRes, sRes, slRes] = await Promise.all([
            api.get('/admin/questions'),
            api.get('/admin/skills'),
            api.get('/admin/skills-with-levels')
        ]);
        questions.value = qRes.data.data || qRes.data;
        skills.value = sRes.data;
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
        alert('Instructions saved successfully!');
        fetchData(); // Refresh to get updated instructions
    } catch (err) {
        console.error('Failed to save instructions', err);
        alert('Error saving instructions.');
    } finally {
        isSavingInst.value = false;
    }
};

const getDifficultyStyles = (level) => {
    if (level <= 3) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (level <= 6) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-rose-50 text-rose-600 border-rose-100';
};

const filteredQuestions = computed(() => {
    let filtered = questions.value;
    if (filterSkill.value) {
        filtered = filtered.filter(q => q.skill?.name === filterSkill.value);
    }
    if (filterType.value) {
        filtered = filtered.filter(q => q.type === filterType.value);
    }
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(q => q.content.toLowerCase().includes(query));
    }
    return filtered;
});

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        <!-- Header & HUD Filter Bar -->
        <div class="flex flex-col space-y-8">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                     <h1 class="text-3xl font-black text-slate-800 tracking-tight">Questions Bank</h1>
                     <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manage all exam questions</p>
                </div>
                <div class="flex items-center space-x-3">
                    <Button label="Manage Instructions" icon="pi pi-cog" severity="secondary" outlined size="small" @click="openInstructions" />
                    <Button label="Import Batch (CSV)" icon="pi pi-file-excel" severity="secondary" outlined size="small" />
                    <Button label="Add Question" icon="pi pi-plus" size="small" @click="$router.push('/admin/questions/create')" />
                </div>
            </div>

            <!-- Filter HUD -->
            <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-wrap gap-6 items-center">
                 <!-- Search -->
                 <div class="relative flex-1 min-w-[300px]">
                    <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10"></i>
                    <InputText v-model="searchQuery" placeholder="Search questions content..." class="w-full pl-12 rounded-2xl shadow-sm" />
                 </div>

                 <div class="w-px h-6 bg-slate-100 hidden md:block"></div>

                 <div class="flex items-center space-x-4">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skill</label>
                      <Select v-model="filterSkill" 
                            :options="[{name:'All Skills', value:''}, ...skills.map(s => ({name:s.name, value:s.name}))]" 
                            optionLabel="name" 
                            optionValue="value" 
                            class="w-40 rounded-xl" />
                 </div>
                 
                 <div class="flex items-center space-x-4">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                      <Select v-model="filterType" 
                            :options="[{label:'All Types', value:''}, {label:'Multiple Choice', value:'mcq'}, {label:'True / False', value:'true_false'}, {label:'Short Text', value:'short_answer'}]" 
                            optionLabel="label" 
                            optionValue="value" 
                            class="w-40 rounded-xl" />
                 </div>
                 <div class="ml-auto text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      Matched: {{ filteredQuestions.length }}
                 </div>
            </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4 mt-6">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading questions...</p>
        </div>

        <div v-else>
            <Card v-if="filteredQuestions.length > 0" class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6 pb-4">
                <template #content>
                    <DataTable :value="filteredQuestions" dataKey="id" paginator :rows="10" 
                        class="p-datatable-sm text-sm" responsiveLayout="scroll">

                        <Column header="Question" style="min-width: 400px">
                            <template #body="{ data }">
                                <div class="flex items-start space-x-4">
                                     <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold shrink-0">
                                         #{{ data.id }}
                                     </div>
                                     <div>
                                          <p class="font-bold text-slate-700 tracking-tight leading-relaxed line-clamp-2 text-sm">{{ data.content }}</p>
                                           <div class="flex items-center space-x-3 mt-2">
                                                <Tag :value="data.skill?.name || 'General'" severity="info" class="text-[9px] uppercase tracking-wider" />
                                                <Tag v-if="data.media_path" value="Media" icon="pi pi-image" severity="success" class="text-[9px] uppercase tracking-wider" />
                                           </div>
                                     </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Type" style="min-width: 150px">
                            <template #body="{ data }">
                                <Tag :value="data.type" severity="secondary" rounded class="text-[10px] uppercase tracking-wider" />
                            </template>
                        </Column>

                        <Column header="Tag" style="min-width: 120px">
                            <template #body="{ data }">
                                <Tag v-if="data.group_tag" :value="data.group_tag" severity="contrast" class="text-[9px] uppercase tracking-widest font-mono" />
                                <span v-else class="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">None</span>
                            </template>
                        </Column>

                        <Column header="Difficulty" style="min-width: 120px">
                            <template #body="{ data }">
                                <span :class="getDifficultyStyles(data.difficulty_level)" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border">
                                    Level {{ data.difficulty_level }}
                                </span>
                            </template>
                        </Column>

                        <Column header="Points" style="min-width: 100px" class="text-center">
                            <template #body="{ data }">
                                 <div class="font-black text-slate-800 text-lg tracking-tighter">{{ data.points }}</div>
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 120px" class="text-right">
                            <template #body="{ data }">
                                <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="$router.push(`/admin/questions/${data.id}/edit`)" />
                            </template>
                        </Column>
                        
                    </DataTable>
                </template>
            </Card>

            <!-- Empty State -->
            <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center mt-6">
                <i class="pi pi-inbox text-slate-300 text-6xl mb-6"></i>
                <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">No Questions Found</h3>
                <p class="text-slate-400 font-bold mb-8">
                    Your question bank is empty. Start adding questions or import from CSV.
                </p>
                <Button label="Add First Question" icon="pi pi-arrow-right" iconPos="right" @click="$router.push('/admin/questions/create')" />
            </div>
        </div>

        <!-- Level Instructions Modal -->
        <Dialog v-model:visible="showInstructionsModal" header="Level Instructions" :style="{ width: '80vw', height: '80vh' }" maximizable modal>
             <div class="flex flex-col md:flex-row h-full w-full">
                  <!-- Sidebar: Skills & Levels -->
                  <div class="w-full md:w-64 bg-slate-50 border-r border-slate-100 flex flex-col p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar rounded-xl">
                       <div class="space-y-4 pb-10">
                             <div v-for="skill in skillsWithLevels" :key="skill.id" class="space-y-2">
                                  <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ skill.name }}</div>
                                  <div class="grid grid-cols-3 gap-2">
                                       <button v-for="level in skill.levels" :key="level.id"
                                               @click="selectedSkillForInst = skill; selectLevel(level)"
                                               :class="selectedLevelForInst?.id === level.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'"
                                               class="h-8 rounded-lg font-bold text-xs transition-all active:scale-95 border border-transparent shadow-sm flex items-center justify-center">
                                           L{{ level.level_number }}
                                       </button>
                                  </div>
                             </div>
                       </div>
                  </div>

                  <!-- Editor Panel -->
                  <div class="flex-1 flex flex-col min-h-0 bg-white p-6 md:p-10 space-y-8 overflow-y-auto w-full">
                       <div v-if="selectedLevelForInst">
                            <div class="flex items-center space-x-6 mb-8">
                                 <div>
                                      <h2 class="text-2xl font-black text-slate-800 tracking-tight uppercase">{{ selectedSkillForInst?.name }} — LEVEL {{ selectedLevelForInst.level_number }}</h2>
                                      <p class="text-xs font-bold text-slate-400 mt-1">Editing instructions for this difficulty</p>
                                 </div>
                            </div>

                            <div class="space-y-8">
                                 <!-- Text Instructions -->
                                 <div class="space-y-2">
                                      <label class="text-xs font-bold text-slate-600 flex items-center"><i class="pi pi-align-left mr-2"></i> Text Instructions</label>
                                      <Textarea v-model="instructionsText" autoResize rows="6" placeholder="Enter level instructions here..." class="w-full rounded-2xl shadow-sm" />
                                 </div>

                                 <!-- Audio Instructions -->
                                 <div class="space-y-3">
                                      <label class="text-xs font-bold text-slate-600 flex items-center"><i class="pi pi-volume-up mr-2"></i> Audio Guidance</label>
                                      <div class="flex flex-col space-y-4">
                                           <div v-if="selectedLevelForInst.instructions_audio_url" class="p-4 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-100">
                                                <div class="flex items-center space-x-3">
                                                     <i class="pi pi-check-circle text-emerald-600 text-xl"></i>
                                                     <span class="text-xs font-bold text-emerald-700 uppercase tracking-widest">Active Audio Attached</span>
                                                </div>
                                                <audio :src="selectedLevelForInst.instructions_audio_url" controls class="h-8 w-48 no-scrollbar"></audio>
                                           </div>
                                           <input type="file" @change="handleAudioUpload" accept="audio/*" 
                                                  class="block w-full text-xs text-slate-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-slate-100 file:text-slate-500 hover:file:bg-slate-200 transition-all font-sans" />
                                      </div>
                                 </div>
                            </div>
                       </div>
                       <div v-else class="flex flex-col items-center justify-center h-full space-y-6 text-center">
                            <i class="pi pi-arrow-circle-left text-slate-300 text-5xl"></i>
                            <h3 class="text-xl font-bold text-slate-400 uppercase tracking-widest">Select a Level to Edit</h3>
                       </div>
                  </div>
             </div>

             <template #footer>
                <Button label="Discard" icon="pi pi-times" text severity="secondary" @click="showInstructionsModal = false" />
                <Button label="Save Changes" icon="pi pi-check" :loading="isSavingInst" :disabled="!selectedLevelForInst" @click="saveInstructions" />
             </template>
        </Dialog>
    </div>
  </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
