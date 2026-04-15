<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';

const route = useRoute();
const skillId = route.params.id;

const skill = ref(null);
const loading = ref(true);
const isSaving = ref(false);
const showLevelModal = ref(false);
const isEditing = ref(false);
const editingLevel = ref({});
const fileInput = ref(null);
const activeTab = ref('logic'); // 'logic' or 'guidance'

// Question Management
const questions = ref([]);
const showQuestionsModal = ref(false);
const selectedLevelForQuestions = ref(null);
const isUpdatingQuestions = ref(false);

const fetchData = async () => {
    loading.value = true;
    try {
        const [skillRes, qRes] = await Promise.all([
            api.get(`/admin/skills/${skillId}/levels`),
            api.get(`/admin/skills/${skillId}/questions`)
        ]);
        skill.value = skillRes.data;
        questions.value = qRes.data;
    } catch (err) {
        console.error('Failed to load levels', err);
    } finally {
        loading.value = false;
    }
};

const openQuestionsModal = (level) => {
    selectedLevelForQuestions.value = level;
    showQuestionsModal.value = true;
};

const getQuestionsForLevel = (levelNumber) => {
    return questions.value.filter(q => q.difficulty_level === levelNumber);
};

const getAvailableQuestions = () => {
    if (!selectedLevelForQuestions.value) return [];
    return questions.value.filter(q => q.difficulty_level !== selectedLevelForQuestions.value.level_number);
};

const toggleQuestionAssignment = async (questionId, targetLevelNumber) => {
    isUpdatingQuestions.value = true;
    try {
        await api.post('/admin/questions/bulk-level', {
            question_ids: [questionId],
            difficulty_level: targetLevelNumber
        });
        
        // Update local state
        const qIdx = questions.value.findIndex(q => q.id === questionId);
        if (qIdx !== -1) {
            questions.value[qIdx].difficulty_level = targetLevelNumber;
        }
    } catch (err) {
        console.error('Failed to update question level', err);
        alert('Failed to update question level.');
    } finally {
        isUpdatingQuestions.value = false;
    }
};

const openAddModal = () => {
    isEditing.value = false;
    const nextLevelNumber = skill.value.levels.length > 0 
        ? Math.max(...skill.value.levels.map(l => l.level_number)) + 1 
        : 1;
        
    editingLevel.value = {
        skill_id: skillId,
        name: `Level ${nextLevelNumber}`,
        level_number: nextLevelNumber,
        min_score: 0,
        max_score: 100,
        pass_threshold: 50,
        instructions: '',
        new_audio: null,
        new_audio_url: null,
        is_active: true
    };
    activeTab.value = 'logic';
    showLevelModal.value = true;
};

const openEditModal = (level) => {
    isEditing.value = true;
    editingLevel.value = JSON.parse(JSON.stringify(level)); // Local copy
    editingLevel.value.new_audio = null;
    editingLevel.value.new_audio_url = null;
    activeTab.value = 'logic';
    showLevelModal.value = true;
};

const handleAudioUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        editingLevel.value.new_audio = file;
        // Generate a preview URL for the new file
        editingLevel.value.new_audio_url = URL.createObjectURL(file);
    }
};

const removeAudio = () => {
    if (editingLevel.value.new_audio_url) {
        URL.revokeObjectURL(editingLevel.value.new_audio_url);
    }
    editingLevel.value.new_audio = null;
    editingLevel.value.new_audio_url = null;
};

const saveLevel = async () => {
    isSaving.value = true;
    try {
        const formData = new FormData();
        formData.append('skill_id', editingLevel.value.skill_id);
        formData.append('name', editingLevel.value.name);
        formData.append('level_number', editingLevel.value.level_number);
        formData.append('min_score', editingLevel.value.min_score);
        formData.append('max_score', editingLevel.value.max_score);
        formData.append('pass_threshold', editingLevel.value.pass_threshold);
        formData.append('instructions', editingLevel.value.instructions || '');
        formData.append('is_active', editingLevel.value.is_active ? 1 : 0);
        
        if (editingLevel.value.new_audio) {
            formData.append('instructions_audio', editingLevel.value.new_audio);
        }

        let res;
        if (isEditing.value) {
            formData.append('_method', 'PATCH');
            res = await api.post(`/admin/levels/${editingLevel.value.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Update local list
            const idx = skill.value.levels.findIndex(l => l.id === editingLevel.value.id);
            if (idx !== -1) skill.value.levels[idx] = res.data.level;
        } else {
            res = await api.post('/admin/levels', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Add to local list and resort
            skill.value.levels.push(res.data.level);
            skill.value.levels.sort((a, b) => a.level_number - b.level_number);
        }
        
        if (editingLevel.value.new_audio_url) {
            URL.revokeObjectURL(editingLevel.value.new_audio_url);
        }
        showLevelModal.value = false;
        alert(isEditing.value ? 'Level updated successfully.' : 'Level created successfully.');
    } catch (err) {
        console.error(err);
        alert('Failed to save level.');
    } finally {
        isSaving.value = false;
    }
};

const deleteLevel = async (id) => {
    if (!confirm('Are you sure you want to delete this level? assessments and questions tied to it may be affected.')) return;
    
    isSaving.value = true;
    try {
        await api.delete(`/admin/levels/${id}`);
        skill.value.levels = skill.value.levels.filter(l => l.id !== id);
    } catch (err) {
        console.error(err);
        alert('Failed to delete level.');
    } finally {
        isSaving.value = false;
    }
};

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p class="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Config...</p>
    </div>

    <div v-else-if="skill" class="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4 md:px-12 mt-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-12">
            <div class="flex items-center space-x-6">
                <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/skills')" />
                <div>
                     <div class="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        <span @click="router.push('/admin/skills')" class="hover:text-indigo-500 transition cursor-pointer">Skills</span>
                        <span>/</span>
                        <span class="text-indigo-600">{{ skill.name }}</span>
                    </div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Adaptive Leveling Matrix</h1>
                </div>
            </div>
            <Button label="Add New Level" icon="pi pi-plus" size="large" @click="openAddModal" />
        </div>

        <!-- Adaptive Matrix Roadmap -->
        <div class="space-y-6">
            <div v-for="(level, index) in skill.levels" :key="level.id" 
                 class="group relative bg-white rounded-[2.5rem] border border-slate-100 p-2 pr-10 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 hover:-translate-y-1">
                
                <!-- Decorative Timeline Element -->
                <div v-if="index !== skill.levels.length - 1" 
                     class="absolute left-12 top-[80%] bottom-[-40%] w-0.5 bg-slate-100 z-0"></div>

                <div class="relative z-10 flex items-center gap-8">
                    <!-- Step Indicator -->
                    <div class="flex-shrink-0 w-24 h-24 rounded-[2rem] bg-slate-50 flex flex-col items-center justify-center transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                        <span class="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Level</span>
                        <span class="text-3xl font-black leading-none">{{ level.level_number }}</span>
                    </div>

                    <!-- Main Info -->
                    <div class="flex-1 min-w-0 py-4">
                        <div class="flex items-center space-x-3 mb-2">
                            <h3 class="text-xl font-black text-slate-800 tracking-tight">{{ level.name }}</h3>
                            <div :class="level.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'" 
                                 class="px-3 py-1 rounded-full text-[8px] font-black uppercase border">
                                {{ level.is_active ? 'Active' : 'Deactivated' }}
                            </div>
                            <div :class="level.pass_threshold > 80 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'" 
                                 class="px-3 py-1 rounded-full text-[8px] font-black uppercase border border-opacity-50">
                                {{ level.pass_threshold > 80 ? 'Rigorous' : (level.pass_threshold > 50 ? 'Balanced' : 'Learning') }}
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-8">
                            <!-- Score Range -->
                            <div class="flex flex-col">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Precision Range</span>
                                <div class="flex items-center space-x-2">
                                    <span class="text-sm font-black text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{{ level.min_score }}</span>
                                    <span class="w-4 h-px bg-slate-200"></span>
                                    <span class="text-sm font-black text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{{ level.max_score }}</span>
                                </div>
                            </div>

                            <!-- Mastery Threshold -->
                            <div class="flex-1 max-w-[200px]">
                                <div class="flex justify-between items-end mb-2">
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mastery threshold</span>
                                    <span class="text-sm font-black text-indigo-600">{{ level.pass_threshold }}%</span>
                                </div>
                                <div class="h-2 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                                    <div class="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-1000 group-hover:from-indigo-600 group-hover:to-indigo-500" 
                                         :style="{ width: `${level.pass_threshold}%` }"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Manage Questions (High Proximity) -->
                    <div class="flex-shrink-0 px-8 border-x border-slate-50 ml-auto">
                        <button @click="openQuestionsModal(level)" 
                                class="group/btn relative flex items-center space-x-4 bg-indigo-50/50 text-indigo-600 pl-6 pr-4 py-3.5 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95 border border-indigo-100/50">
                            <div class="text-left">
                                <p class="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5">Assigned Bank</p>
                                <p class="text-xs font-black">{{ getQuestionsForLevel(level.level_number).length }} Questions</p>
                            </div>
                            <div class="w-8 h-8 rounded-xl bg-indigo-600/10 group-hover:bg-white/20 flex items-center justify-center group-hover/btn:translate-x-1 transition-transform">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </button>
                    </div>

                    <!-- Quick Actions -->
                    <div class="flex items-center space-x-2">
                         <button @click="openEditModal(level)" :disabled="isSaving"
                             class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                         </button>
                         <button @click="deleteLevel(level.id)" :disabled="isSaving"
                             class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bottom Guidance -->
        <div class="mt-12 flex flex-col items-center text-center">
            <div class="w-12 h-1 w-24 bg-slate-200 rounded-full mb-6"></div>
            <p class="text-slate-400 text-xs font-medium max-w-sm leading-relaxed uppercase tracking-widest space-y-2">
                <span>Adaptive exams will stop the current skill once a student fails to hit the threshold.</span>
                <span class="block mt-2 text-indigo-400 opacity-70">Changes must be saved manually to take effect.</span>
            </p>
        </div>
    </div>

    <!-- Level Form Modal -->
    <div v-if="showLevelModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
        <div class="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 h-[85vh] flex flex-col">
            <!-- Modal Header -->
            <div class="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-white flex-shrink-0">
                <div>
                    <h3 class="text-2xl font-black text-slate-800 tracking-tight">{{ isEditing ? 'Edit Logic & Guidance' : 'New Adaptive Level' }}</h3>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{{ skill.name }} • CONFIGURATION PROTOCOL</p>
                </div>
                <button @click="showLevelModal = false" class="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div class="flex-1 flex min-h-0">
                <!-- Sidebar Tabs -->
                <div class="w-64 bg-slate-50/50 border-r border-slate-100 p-6 space-y-2">
                    <button @click="activeTab = 'logic'" 
                        :class="activeTab === 'logic' ? 'bg-white text-indigo-600 shadow-sm border-slate-200' : 'text-slate-400 hover:bg-white/50'"
                        class="w-full flex items-center space-x-3 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border border-transparent">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        <span>Decision Logic</span>
                    </button>
                    <button @click="activeTab = 'guidance'" 
                        :class="activeTab === 'guidance' ? 'bg-white text-indigo-600 shadow-sm border-slate-200' : 'text-slate-400 hover:bg-white/50'"
                        class="w-full flex items-center space-x-3 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border border-transparent">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        <span>Student Support</span>
                    </button>
                    
                    <div class="mt-8 pt-6 border-t border-slate-100">
                        <div class="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/30">
                            <p class="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Live Status</p>
                            <p class="text-xs font-black text-slate-600">{{ isEditing ? 'Editing Existing' : 'Drafting Prototype' }}</p>
                        </div>
                    </div>
                </div>

                <!-- Content Area -->
                <div class="flex-1 overflow-y-auto p-12 custom-scrollbar">
                    
                    <!-- TAB: LOGIC -->
                    <div v-if="activeTab === 'logic'" class="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                        <!-- Identity -->
                        <div class="space-y-6">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Identification</h4>
                            <div class="grid grid-cols-2 gap-8">
                                <div class="space-y-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Internal Name</label>
                                    <input v-model="editingLevel.name" type="text" required
                                        class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-black text-slate-700">
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Evolution Sequence</label>
                                    <input v-model.number="editingLevel.level_number" type="number" required
                                        class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-black text-center text-slate-700">
                                </div>
                            </div>
                        </div>

                        <!-- Scoring -->
                        <div class="space-y-6">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Statistical Constraints</h4>
                            <div class="grid grid-cols-3 gap-8 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100/50">
                                <div class="space-y-2 text-center">
                                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Floor Score</label>
                                    <input v-model.number="editingLevel.min_score" type="number" 
                                        class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-center shadow-sm">
                                </div>
                                <div class="space-y-2 text-center">
                                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Ceiling Score</label>
                                    <input v-model.number="editingLevel.max_score" type="number"
                                        class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-center shadow-sm">
                                </div>
                                <div class="space-y-2 text-center">
                                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Pass Ratio</label>
                                    <div class="relative">
                                        <input v-model.number="editingLevel.pass_threshold" type="number" min="0" max="100"
                                            class="w-full bg-indigo-600 border-0 rounded-xl px-4 py-3 text-white text-sm font-black text-center shadow-indigo-100 shadow-lg">
                                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 font-black text-[10px]">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Active Toggle -->
                        <div class="pt-8 border-t border-slate-100">
                             <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Production Status</h4>
                             <label class="flex items-center cursor-pointer group w-fit">
                                 <div class="relative">
                                     <input type="checkbox" v-model="editingLevel.is_active" class="sr-only peer">
                                     <div class="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                 </div>
                                 <div class="ml-4">
                                     <span class="block text-[10px] font-black text-slate-700 uppercase tracking-widest group-hover:text-indigo-600 transition">Enable Level in Matrix</span>
                                     <span class="block text-[8px] text-slate-300 font-bold uppercase tracking-tight">Deactivated levels will be hidden from new exam configurations</span>
                                 </div>
                             </label>
                        </div>
                    </div>

                    <!-- TAB: GUIDANCE -->
                    <div v-if="activeTab === 'guidance'" class="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                        <!-- Vocal Guidance (MOST PROMINENT) -->
                        <div class="space-y-6">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Vocal Direction</h4>
                            
                            <div class="grid grid-cols-1 gap-6">
                                <!-- Audio Player & Upload Area -->
                                <div class="space-y-6">
                                    <!-- Player Column -->
                                    <div v-if="editingLevel.instructions_audio_url || editingLevel.new_audio_url" class="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100">
                                        <div class="flex items-center space-x-6">
                                            <div class="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                                                <svg class="w-8 h-8 text-indigo-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                            </div>
                                            <div class="flex-1">
                                                <div class="flex justify-between items-center mb-4">
                                                    <div>
                                                        <p class="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Instructional Audio Stream</p>
                                                        <p class="text-xs font-black">{{ editingLevel.new_audio ? 'Draft: ' + editingLevel.new_audio.name : 'Master Recording Active' }}</p>
                                                    </div>
                                                    <button v-if="editingLevel.new_audio" @click="removeAudio" class="text-[9px] font-black text-rose-400 uppercase hover:underline tracking-widest">Delete Draft</button>
                                                </div>
                                                <audio controls :src="editingLevel.new_audio_url || editingLevel.instructions_audio_url" class="h-10 w-full rounded-full bg-transparent"></audio>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Upload Column -->
                                    <div class="group relative">
                                        <label class="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-100 border-dashed rounded-[2.5rem] cursor-pointer bg-slate-50/30 hover:bg-white hover:border-indigo-400 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-50/50">
                                            <div class="flex flex-col items-center justify-center p-6 text-center">
                                                <div class="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                    <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                </div>
                                                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-loose">
                                                    {{ editingLevel.new_audio ? 'Exchange Recording' : 'DEPLOY VOCAL GUIDANCE' }}
                                                    <br/><span class="text-indigo-600 opacity-60">MP3 / WAV / Professional Standard</span>
                                                </p>
                                            </div>
                                            <input type="file" @change="handleAudioUpload" class="hidden" accept="audio/*" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Text Guidance -->
                        <div class="space-y-4">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Textual Manifest</h4>
                            <textarea v-model="editingLevel.instructions" rows="6" 
                                class="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-8 py-6 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium leading-relaxed text-slate-700"
                                placeholder="Formalized instructions for the student..."></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="px-10 py-8 border-t border-slate-50 flex justify-end space-x-4 bg-white flex-shrink-0">
                <Button label="Abort Changes" severity="secondary" text @click="showLevelModal = false" :disabled="isSaving" />
                <Button :label="isSaving ? 'Executing...' : (isEditing ? 'COMMIT UPDATES' : 'INITIALIZE LEVEL')" 
                       icon="pi pi-check" :loading="isSaving" @click="saveLevel" />
            </div>
        </div>
    </div>

    <!-- Question Management Modal -->
    <div v-if="showQuestionsModal" class="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
         <div class="bg-white w-full max-w-4xl h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
              <!-- Modal Header -->
              <div class="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center flex-shrink-0">
                   <div>
                        <h2 class="text-2xl font-black text-slate-800 tracking-tight uppercase">Level {{ selectedLevelForQuestions?.level_number }} — Question Bank</h2>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Assign or remove questions for this specific difficulty</p>
                   </div>
                   <div class="flex items-center space-x-4">
                        <router-link :to="`/admin/questions/create?skill_id=${skillId}&difficulty_level=${selectedLevelForQuestions?.level_number}`"
                            class="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg shadow-indigo-100">
                             + Quick Add Question
                        </router-link>
                        <button @click="showQuestionsModal = false" class="w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-50 transition-colors">
                             ✕
                        </button>
                   </div>
              </div>

              <!-- Modal Content -->
              <div class="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                   <!-- Sidebar: Current Selection -->
                   <div class="w-full md:w-1/2 flex flex-col border-r border-slate-50 overflow-hidden">
                        <div class="p-6 bg-indigo-50/30 border-b border-indigo-50/50 flex items-center justify-between">
                             <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Assigned to Level {{ selectedLevelForQuestions?.level_number }}</span>
                             <span class="px-2 py-1 bg-indigo-600 text-white rounded text-[9px] font-black">{{ getQuestionsForLevel(selectedLevelForQuestions?.level_number).length }}</span>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                             <div v-for="q in getQuestionsForLevel(selectedLevelForQuestions?.level_number)" :key="q.id" 
                                  class="group bg-white border border-slate-100 p-4 rounded-2xl hover:border-indigo-200 transition-all flex items-start space-x-4">
                                  <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">#{{ q.id }}</div>
                                  <div class="flex-1 min-w-0">
                                       <p class="text-[11px] font-bold text-slate-700 line-clamp-2 leading-relaxed">{{ q.content }}</p>
                                       <div class="flex items-center space-x-2 mt-2">
                                            <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{{ q.type }}</span>
                                            <span v-if="q.group_tag" class="text-[8px] font-mono text-slate-300 font-black uppercase">{{ q.group_tag }}</span>
                                       </div>
                                  </div>
                                  <button @click="toggleQuestionAssignment(q.id, 0)" :disabled="isUpdatingQuestions"
                                          class="w-8 h-8 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                                       ←
                                  </button>
                             </div>
                             <div v-if="getQuestionsForLevel(selectedLevelForQuestions?.level_number).length === 0" class="py-20 text-center">
                                  <div class="text-3xl mb-4 opacity-20">📥</div>
                                  <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">No questions assigned</p>
                             </div>
                        </div>
                   </div>

                   <!-- Main: Available Questions -->
                   <div class="w-full md:w-1/2 flex flex-col bg-slate-50/30 overflow-hidden">
                        <div class="p-6 border-b border-slate-50 flex items-center justify-between">
                             <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available from Bank (Skill: {{ skill.name }})</span>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                             <div v-for="q in getAvailableQuestions()" :key="q.id" 
                                  class="group bg-white border border-slate-100 p-4 rounded-2xl hover:border-emerald-200 transition-all flex items-start space-x-4">
                                  <button @click="toggleQuestionAssignment(q.id, selectedLevelForQuestions.level_number)" :disabled="isUpdatingQuestions"
                                          class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-500 hover:text-white">
                                       →
                                  </button>
                                  <div class="flex-1 min-w-0">
                                       <p class="text-[11px] font-bold text-slate-400 line-clamp-2 leading-relaxed">{{ q.content }}</p>
                                       <div class="flex items-center space-x-2 mt-2">
                                            <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Lvl {{ q.difficulty_level }}</span>
                                            <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">•</span>
                                            <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">{{ q.type }}</span>
                                       </div>
                                  </div>
                                  <div class="w-8 h-8 rounded-lg bg-slate-50 text-slate-300 flex items-center justify-center font-black text-xs">#{{ q.id }}</div>
                             </div>
                        </div>
                   </div>
              </div>
         </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
