<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

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

const filteredQuestions = () => {
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
};

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
                <div class="flex items-center space-x-4">
                    <button @click="openInstructions" class="bg-white border border-slate-200 text-slate-500 font-black text-[10px] tracking-widest uppercase px-6 py-3.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm">
                        Manage Instructions
                    </button>
                    <button class="bg-white border border-slate-200 text-slate-500 font-black text-[10px] tracking-widest uppercase px-6 py-3.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm">
                        Import Batch (CSV)
                    </button>
                    <router-link to="/admin/questions/create" class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                        Add Question +
                    </router-link>
                </div>
            </div>

            <!-- Filter HUD -->
            <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-wrap gap-6 items-center">
                 <!-- Search -->
                 <div class="relative flex-1 min-w-[300px]">
                    <svg class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input v-model="searchQuery" type="text" placeholder="Search questions content..."
                        class="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all placeholder:text-slate-300 font-bold text-slate-700 shadow-sm">
                 </div>

                 <div class="w-px h-6 bg-slate-100 hidden md:block"></div>

                 <div class="flex items-center space-x-4">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skill</label>
                      <select v-model="filterSkill" class="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition uppercase">
                          <option value="">All Skills</option>
                          <option v-for="skill in skills" :key="skill.id" :value="skill.name">{{ skill.name }}</option>
                      </select>
                 </div>
                 
                 <div class="flex items-center space-x-4">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                      <select v-model="filterType" class="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition uppercase">
                          <option value="">All Types</option>
                          <option value="mcq">Multiple Choice</option>
                          <option value="true_false">True / False</option>
                          <option value="short_answer">Short Text</option>
                      </select>
                 </div>
                 <div class="ml-auto text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      Matched: {{ filteredQuestions().length }}
                 </div>
            </div>
        </div>

        <!-- Data Grid -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading questions...</p>
        </div>

        <div v-else>
            <div v-if="filteredQuestions().length > 0" class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50 text-slate-300 text-[10px] uppercase font-black tracking-[0.2em]">
                            <tr>
                                <th class="px-10 py-8">QUESTION</th>
                                <th class="px-10 py-8">TYPE</th>
                                <th class="px-10 py-8">TAG / GROUP</th>
                                <th class="px-10 py-8 text-center">DIFFICULTY</th>
                                <th class="px-10 py-8 text-center">POINTS</th>
                                <th class="px-10 py-8 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 text-sm">
                            <tr v-for="q in filteredQuestions()" :key="q.id" class="hover:bg-slate-50/50 transition-colors group">
                                <td class="px-10 py-6 max-w-md">
                                    <div class="flex items-start space-x-4">
                                         <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6 mt-1 shrink-0">
                                             #{{ q.id }}
                                         </div>
                                         <div>
                                              <p class="font-black text-slate-700 tracking-tight leading-relaxed line-clamp-2 uppercase text-sm">{{ q.content }}</p>
                                               <div class="flex items-center space-x-3 mt-2">
                                                    <span class="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded border border-indigo-100">{{ q.skill?.name || 'General' }}</span>
                                                    <span v-if="q.media_path" class="flex items-center text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                                         <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm0-2c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6zM9 13l6-4v8l-6-4z"/></svg> Media
                                                    </span>
                                               </div>
                                         </div>
                                    </div>
                                </td>
                                <td class="px-10 py-6">
                                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 px-3 py-1.5 rounded-lg bg-slate-50">
                                        {{ q.type }}
                                    </span>
                                </td>
                                <td class="px-10 py-6">
                                    <span v-if="q.group_tag" class="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono uppercase tracking-widest border border-slate-200">
                                        {{ q.group_tag }}
                                    </span>
                                    <span v-else class="text-[10px] text-slate-200 font-bold uppercase tracking-widest italic">No Tag</span>
                                </td>
                                <td class="px-10 py-6 text-center">
                                    <span :class="getDifficultyStyles(q.difficulty_level)" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border">
                                        Level {{ q.difficulty_level }}
                                    </span>
                                </td>
                                <td class="px-10 py-6 text-center">
                                     <div class="font-black text-slate-800 text-lg tracking-tighter">{{ q.points }}</div>
                                     <div class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Points</div>
                                </td>
                                <td class="px-10 py-6 text-right">
                                    <router-link :to="`/admin/questions/${q.id}/edit`" class="bg-white border border-slate-200 text-slate-500 font-black text-[9px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm active:scale-95">
                                        EDIT
                                    </router-link>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group">
                <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500">📥</div>
                <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">No Questions Found</h3>
                <p class="text-slate-400 font-medium max-w-sm mx-auto mb-12 text-sm leading-relaxed italic">
                    Your question bank is empty. Start adding questions or import from CSV.
                </p>
                <router-link to="/admin/questions/create" class="inline-block bg-indigo-600 text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs">
                    Add First Question ➜
                </router-link>
            </div>
        </div>

        <!-- Level Instructions Modal -->
        <div v-if="showInstructionsModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-hidden">
             <!-- Backdrop -->
             <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-300" @click="showInstructionsModal = false"></div>
             
             <!-- Modal Content -->
             <div class="relative bg-white w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                  <!-- Sidebar: Skills & Levels -->
                  <div class="w-full md:w-80 bg-slate-50 border-r border-slate-100 flex flex-col p-8 space-y-6">
                       <div>
                             <h3 class="text-xl font-black text-slate-800 tracking-tight">Level Settings</h3>
                             <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure audio & text instructions</p>
                       </div>

                       <div class="space-y-4 overflow-y-auto no-scrollbar pb-10">
                             <div v-for="skill in skillsWithLevels" :key="skill.id" class="space-y-2">
                                  <div class="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">{{ skill.name }}</div>
                                  <div class="grid grid-cols-4 gap-2">
                                       <button v-for="level in skill.levels" :key="level.id"
                                               @click="selectedSkillForInst = skill; selectLevel(level)"
                                               :class="selectedLevelForInst?.id === level.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100'"
                                               class="h-10 rounded-xl font-black text-xs transition-all active:scale-95 border border-transparent shadow-sm flex items-center justify-center">
                                           L{{ level.level_number }}
                                       </button>
                                  </div>
                             </div>
                       </div>
                  </div>

                  <!-- Editor Panel -->
                  <div class="flex-1 flex flex-col min-h-0 bg-white p-10 space-y-8 overflow-y-auto no-scrollbar">
                       <div v-if="selectedLevelForInst" class="animate-in fade-in slide-in-from-right-4 duration-500">
                            <div class="flex items-center space-x-6 mb-10">
                                 <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-2xl shadow-sm">
                                      {{ selectedSkillForInst?.name.charAt(0) }}
                                 </div>
                                 <div>
                                      <h2 class="text-2xl font-black text-slate-800 tracking-tight uppercase">{{ selectedSkillForInst?.name }} — LEVEL {{ selectedLevelForInst.level_number }}</h2>
                                      <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editing instructions for this specific difficulty</p>
                                 </div>
                                 <button @click="showInstructionsModal = false" class="ml-auto w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors">
                                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                 </button>
                            </div>

                            <div class="space-y-8">
                                 <!-- Text Instructions -->
                                 <div class="space-y-3">
                                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                           <svg class="w-3.5 h-3.5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                           Text Instructions
                                      </label>
                                      <textarea v-model="instructionsText" rows="6" placeholder="Enter level instructions here..."
                                                class="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all resize-none"></textarea>
                                 </div>

                                 <!-- Audio Instructions -->
                                 <div class="space-y-3">
                                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                           <svg class="w-3.5 h-3.5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                           Audio Guidance
                                      </label>
                                      <div class="flex flex-col space-y-4">
                                           <div v-if="selectedLevelForInst.instructions_audio_url" class="p-4 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-100">
                                                <div class="flex items-center space-x-3">
                                                     <div class="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                                                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7-7 7V5z" /></svg>
                                                     </div>
                                                     <span class="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Active Audio Attached</span>
                                                </div>
                                                <audio :src="selectedLevelForInst.instructions_audio_url" controls class="h-8 w-48 no-scrollbar"></audio>
                                           </div>
                                           <input type="file" @change="handleAudioUpload" accept="audio/*" 
                                                  class="block w-full text-xs text-slate-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-slate-100 file:text-slate-500 hover:file:bg-slate-200 transition-all" />
                                      </div>
                                 </div>

                                 <!-- Save Button -->
                                 <div class="pt-6 border-t border-slate-50 flex justify-end items-center space-x-6">
                                      <span v-if="isSavingInst" class="text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">Synchronizing...</span>
                                      <button @click="saveInstructions" :disabled="isSavingInst"
                                              :class="isSavingInst ? 'opacity-50 grayscale' : 'hover:bg-indigo-700 active:scale-95 shadow-xl shadow-indigo-100'"
                                              class="bg-indigo-600 text-white font-black py-4 px-12 rounded-2xl transition-all uppercase tracking-[0.2em] text-[10px]">
                                          Save Changes
                                      </button>
                                 </div>
                            </div>
                       </div>
                       <div v-else class="flex flex-col items-center justify-center h-full space-y-6 text-center">
                            <div class="text-6xl animate-bounce">👈</div>
                            <h3 class="text-xl font-black text-slate-300 uppercase tracking-widest">Select a Level to Edit</h3>
                       </div>
                  </div>
             </div>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
