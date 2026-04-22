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

const questionTypeMeta = {
    mcq:          { label: 'MCQ',          severity: 'info',      icon: 'pi-check-square' },
    true_false:   { label: 'True / False', severity: 'warn',      icon: 'pi-verified' },
    short_answer: { label: 'Short Answer', severity: 'success',   icon: 'pi-pencil' },
    writing:      { label: 'Writing',      severity: 'contrast',  icon: 'pi-file-edit' },
    speaking:     { label: 'Speaking',     severity: 'danger',    icon: 'pi-microphone' },
    upload:       { label: 'Upload',       severity: 'secondary', icon: 'pi-upload' },
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
        const [qRes, sRes, slRes] = await Promise.all([
            api.get('/admin/questions'),
            api.get('/admin/skills'),
            api.get('/admin/skills-with-levels').catch(() => ({ data: [] }))
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
        fetchData();
        alert('Instructions saved!');
    } catch (err) {
        console.error('Save failed', err);
    } finally {
        isSavingInst.value = false;
    }
};

const isAudio = (url) => url?.match(/\.(mp3|wav|ogg|m4a)$/i);
const isImage = (url) => url?.match(/\.(jpeg|png|jpg|gif|svg|webp)$/i);

const filteredQuestions = computed(() => {
    let filtered = questions.value;
    if (filterSkill.value) filtered = filtered.filter(q => q.skill?.name === filterSkill.value);
    if (filterType.value)  filtered = filtered.filter(q => q.type === filterType.value);
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        filtered = filtered.filter(item =>
            item.content?.toLowerCase().includes(q) ||
            item.instructions?.toLowerCase().includes(q) ||
            item.passage?.title?.toLowerCase().includes(q)
        );
    }
    return filtered;
});

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24 mt-6 px-4 md:px-12">

        <!-- Page Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm gap-6">
            <div>
                <h1 class="text-3xl font-black text-slate-800 tracking-tight">Questions</h1>
                <p class="text-xs font-semibold text-slate-400 mt-1">Manage all exam questions and their passage contexts</p>
            </div>
            <div class="flex items-center gap-3">
                <Button label="Level Guides" icon="pi pi-cog" severity="secondary" outlined @click="openInstructions" class="font-bold text-sm" />
                <Button label="Add Question" icon="pi pi-plus" @click="$router.push('/admin/questions/create')" class="font-bold text-sm shadow-md" />
            </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-wrap gap-6 items-end">
            <div class="flex-1 min-w-[240px] space-y-2">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Search</label>
                <div class="relative">
                    <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10 text-sm"></i>
                    <InputText v-model="searchQuery" placeholder="Search by question content..." class="w-full pl-10 rounded-xl bg-slate-50 border-slate-100 font-semibold text-sm" />
                </div>
            </div>

            <div class="flex flex-col gap-2 min-w-[180px]">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Skill</label>
                <Select v-model="filterSkill"
                    :options="[{name:'All Skills', value:''}, ...skills.map(s => ({name: s.name, value: s.name}))]"
                    optionLabel="name" optionValue="value"
                    class="w-full rounded-xl text-sm font-semibold" />
            </div>

            <div class="flex flex-col gap-2 min-w-[180px]">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</label>
                <Select v-model="filterType"
                    :options="[
                        {label:'All Types',      value:''},
                        {label:'MCQ',            value:'mcq'},
                        {label:'True / False',   value:'true_false'},
                        {label:'Short Answer',   value:'short_answer'},
                        {label:'Writing',        value:'writing'},
                        {label:'Speaking',       value:'speaking'},
                        {label:'File Upload',    value:'upload'},
                    ]"
                    optionLabel="label" optionValue="value"
                    class="w-full rounded-xl text-sm font-semibold" />
            </div>

            <div class="ml-auto bg-indigo-50 px-5 py-2.5 rounded-xl border border-indigo-100">
                <span class="text-xs font-black text-indigo-600 uppercase tracking-widest">{{ filteredQuestions.length }} Questions</span>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-32 gap-4">
            <ProgressSpinner />
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading questions...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredQuestions.length === 0" class="flex flex-col items-center justify-center py-32 bg-white rounded-[2rem] border border-slate-100 gap-6">
            <div class="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                <i class="pi pi-inbox text-5xl"></i>
            </div>
            <div class="text-center">
                <p class="text-xl font-black text-slate-700 tracking-tight">
                    {{ searchQuery || filterSkill || filterType ? 'No Matching Questions' : 'No Questions Yet' }}
                </p>
                <p class="text-sm text-slate-400 mt-2 font-medium">
                    {{ searchQuery || filterSkill || filterType
                        ? 'Try adjusting your filters to find what you\'re looking for.'
                        : 'Start building your question bank by adding the first question.' }}
                </p>
            </div>
            <Button v-if="!searchQuery && !filterSkill && !filterType"
                label="Add First Question" icon="pi pi-plus"
                @click="$router.push('/admin/questions/create')"
                class="font-bold text-sm px-8 shadow-md" />
            <Button v-else label="Clear Filters" icon="pi pi-times" severity="secondary" outlined
                @click="searchQuery=''; filterSkill=''; filterType=''"
                class="font-bold text-sm px-8" />
        </div>

        <!-- Table -->
        <Card v-else class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden">
            <template #content>
                <DataTable :value="filteredQuestions" dataKey="id" paginator :rows="12"
                    class="p-datatable-sm text-sm" responsiveLayout="scroll">

                    <!-- Question Content -->
                    <Column header="Question" style="min-width: 460px">
                        <template #body="{ data }">
                            <div class="flex items-start gap-4 py-4">
                                <!-- ID Badge -->
                                <div class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black border border-slate-100 text-xs shrink-0">
                                    #{{ data.id }}
                                </div>

                                <div class="flex-1 space-y-2 min-w-0">
                                    <!-- Passage badge -->
                                    <div v-if="data.passage" class="flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full w-fit">
                                        <i class="pi pi-book text-[10px] text-amber-600"></i>
                                        <span class="text-[10px] font-black text-amber-700 uppercase tracking-wider">{{ data.passage.title || 'Passage' }}</span>
                                    </div>

                                    <!-- Media preview -->
                                    <div v-if="data.media_url && isImage(data.media_url)" class="w-20 h-16 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                                        <img :src="data.media_url" class="w-full h-full object-cover" />
                                    </div>

                                    <!-- Question text -->
                                    <p class="font-bold text-slate-800 leading-snug line-clamp-2 text-sm">
                                        {{ data.content || '— No content —' }}
                                    </p>

                                    <!-- Audio -->
                                    <audio v-if="data.media_url && isAudio(data.media_url)" :src="data.media_url" controls class="h-7 w-48 opacity-80"></audio>

                                    <!-- Instructions -->
                                    <p v-if="data.instructions" class="text-xs text-slate-400 italic line-clamp-1 border-l-2 border-slate-100 pl-2.5">
                                        {{ data.instructions }}
                                    </p>

                                    <!-- Badges row -->
                                    <div class="flex items-center gap-2 flex-wrap pt-1">
                                        <span class="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                                            {{ data.skill?.name || 'No Skill' }}
                                        </span>
                                        <span v-if="data.exams && data.exams.length" class="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                                            {{ data.exams.map(e => e.title).join(', ') }}
                                        </span>
                                        <span v-if="data.media_url" class="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                                            <i class="pi pi-paperclip text-[9px] mr-1"></i>Media
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <!-- Type -->
                    <Column header="Type" style="width: 130px">
                        <template #body="{ data }">
                            <div class="flex items-center gap-2">
                                <i :class="['pi', questionTypeMeta[data.type]?.icon || 'pi-question', 'text-sm', 'text-slate-400']"></i>
                                <Tag :value="questionTypeMeta[data.type]?.label || data.type"
                                    :severity="questionTypeMeta[data.type]?.severity || 'secondary'"
                                    class="text-[10px] font-bold uppercase tracking-wide rounded-lg px-2.5 py-1" />
                            </div>
                        </template>
                    </Column>

                    <!-- Level -->
                    <Column header="Level" style="width: 90px">
                        <template #body="{ data }">
                            <span :class="[
                                'px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm',
                                (data.level?.level_number || data.level_id) <= 3 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                (data.level?.level_number || data.level_id) <= 6 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                            ]">
                                L{{ data.level?.level_number || data.level_id }}
                            </span>
                        </template>
                    </Column>

                    <!-- Points -->
                    <Column header="Points" style="width: 80px" class="text-center">
                        <template #body="{ data }">
                            <div class="text-center">
                                <div class="font-black text-slate-700 text-lg leading-none">{{ data.points }}</div>
                                <div class="text-[9px] font-bold text-slate-300 uppercase">pts</div>
                            </div>
                        </template>
                    </Column>

                    <!-- Actions -->
                    <Column style="width: 100px" class="text-right">
                        <template #body="{ data }">
                            <div class="flex items-center justify-end gap-1">
                                <Button icon="pi pi-pencil" text severity="secondary" size="small"
                                    v-tooltip.top="'Edit'"
                                    @click="$router.push(`/admin/questions/${data.id}/edit`)" />
                                <Button icon="pi pi-trash" text severity="danger" size="small"
                                    v-tooltip.top="'Delete'"
                                    @click="deleteItem(data.id)" />
                            </div>
                        </template>
                    </Column>

                </DataTable>
            </template>
        </Card>

        <!-- Level Instructions Modal -->
        <Dialog v-model:visible="showInstructionsModal" header="Level Instructions" :style="{ width: '80vw' }" maximizable modal class="rounded-[2rem]">
            <template #header>
                <div>
                    <h3 class="text-xl font-black text-slate-800">Level Instructions</h3>
                    <p class="text-xs font-semibold text-slate-400 mt-1">Set text and audio instructions per skill level</p>
                </div>
            </template>

            <div class="flex flex-col md:flex-row h-full gap-6 pt-4 min-h-[50vh]">
                <!-- Sidebar -->
                <div class="w-full md:w-64 bg-slate-50 rounded-2xl p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                    <div v-for="skill in skillsWithLevels" :key="skill.id" class="space-y-3">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ skill.name }}</p>
                        <div class="grid grid-cols-3 gap-2">
                            <button v-for="level in skill.levels" :key="level.id"
                                @click="selectedSkillForInst = skill; selectLevel(level)"
                                :class="selectedLevelForInst?.id === level.id
                                    ? 'bg-indigo-600 text-white shadow-md scale-105'
                                    : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'"
                                class="h-9 rounded-xl font-black text-[10px] transition-all border border-slate-100">
                                L{{ level.level_number }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Editor -->
                <div class="flex-1 space-y-6">
                    <div v-if="selectedLevelForInst" class="animate-in fade-in duration-300">
                        <h4 class="text-lg font-black text-slate-800 mb-6">
                            {{ selectedSkillForInst?.name }} — Level {{ selectedLevelForInst.level_number }}
                        </h4>

                        <div class="space-y-6">
                            <div class="space-y-2">
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Instructions Text</label>
                                <Textarea v-model="instructionsText" autoResize rows="5"
                                    placeholder="Write instructions for this level..."
                                    class="w-full rounded-2xl border-slate-100 bg-slate-50 p-5 text-sm font-semibold focus:bg-white transition-all" />
                            </div>

                            <div class="space-y-2">
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Audio Instructions</label>
                                <div v-if="selectedLevelForInst.instructions_audio_url" class="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4">
                                    <i class="pi pi-volume-up text-emerald-600 text-lg"></i>
                                    <audio :src="selectedLevelForInst.instructions_audio_url" controls class="h-8 flex-1"></audio>
                                </div>
                                <input type="file" @change="handleAudioUpload" accept="audio/*"
                                    class="block w-full text-xs font-semibold text-slate-500
                                    file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0
                                    file:text-xs file:font-bold file:bg-indigo-600 file:text-white
                                    hover:file:bg-indigo-700 cursor-pointer bg-slate-50 border border-slate-100 rounded-xl p-2 transition-all" />
                            </div>
                        </div>
                    </div>
                    <div v-else class="flex items-center justify-center h-full text-slate-300 text-sm font-semibold">
                        Select a level from the left panel
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-3 pt-2">
                    <Button label="Cancel" severity="secondary" outlined @click="showInstructionsModal = false" class="font-bold" />
                    <Button label="Save Instructions" :loading="isSavingInst" :disabled="!selectedLevelForInst"
                        @click="saveInstructions" class="font-bold px-8" />
                </div>
            </template>
        </Dialog>

    </div>
  </AdminLayout>
</template>

<style scoped>
:deep(.p-datatable-thead > tr > th) {
    background: #f8fafc;
    border-bottom: 2px solid #f1f5f9;
    padding: 1rem 1.25rem;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}
:deep(.p-datatable-tbody > tr) {
    border-bottom: 1px solid #f8fafc;
}
:deep(.p-datatable-tbody > tr:hover) {
    background: #fafbff;
}
:deep(.p-datatable-tbody > tr > td) {
    padding: 0.5rem 1.25rem;
    vertical-align: top;
}
</style>
