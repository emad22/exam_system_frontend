<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

const router = useRouter();
const route = useRoute();
const toast = useToast();

const examId = ref(route.params.id || null);
const availableSkills = ref([]);
const languages = ref([]);
const categories = ref([]);
const currentStep = ref(1); // 1: Identity, 2: Skills, 3: Matrix, 4: Finalize
const activeSkillTab = ref(null);


const form = ref({
    title: '',
    description: '',
    language_id: null,
    exam_category_id: null,
    passing_score: 60,
    is_adaptive: false,
    selectedSkills: [] 
});

// For Step 3: Local storage of questions being added
// Structure: { skillId: { levelNum: [questions] } }
const localQuestions = ref({}); 
// To track which questions are NEW (to be saved) vs IMPORTED (already in bank)
const newQuestionQueue = ref([]); 

const isSubmitting = ref(false);
const isLoading = ref(false);
const errorMsg = ref('');

const isEditMode = computed(() => !!examId.value);

onMounted(async () => {
    isLoading.value = true;
    try {
        const [langRes, skillRes, catRes] = await Promise.all([
            api.get('/admin/languages'),
            api.get('/admin/skills-with-levels'),
            api.get('/admin/exam-categories')
        ]);
        
        languages.value = langRes.data;
        categories.value = catRes.data;
        
        // Auto-select Arabic if Universal
        const arabic = languages.value.find(l => l.name.toLowerCase().includes('arab'));
        if (arabic) form.value.language_id = arabic.id;
        else if (languages.value.length > 0) form.value.language_id = languages.value[0].id;

        availableSkills.value = skillRes.data;
        
        if (isEditMode.value) {
            const examRes = await api.get(`/admin/exams/${examId.value}`);
            const exam = examRes.data;
            
            form.value = {
                title: exam.title,
                description: exam.description ?? '',
                language_id: exam.language_id,
                exam_category_id: exam.exam_category_id,
                passing_score: exam.passing_score ?? 60,
                is_adaptive: !!exam.is_adaptive,
                selectedSkills: exam.skills.map(skill => {
                    return {
                        skill_id: skill.id,
                        duration: skill.pivot.duration,
                        is_optional: !!skill.pivot.is_optional,
                        rules: []
                    };
                })
            };

            // Initialize localQuestions from fetched questions
            if (exam.questions && exam.questions.length > 0) {
                exam.questions.forEach(q => {
                    const sId = q.skill_id;
                    const lNum = q.difficulty_level;
                    if (!localQuestions.value[sId]) localQuestions.value[sId] = {};
                    if (!localQuestions.value[sId][lNum]) localQuestions.value[sId][lNum] = [];
                    
                    localQuestions.value[sId][lNum].push({
                        id: q.id, // Existing questions HAVE an ID
                        type: q.type,
                        content: q.content,
                        points: q.points,
                        passage_content: q.passage_content,
                        passage_group_id: q.passage_group_id,
                        passage_randomize: !!q.passage_randomize,
                        passage_limit: q.passage_limit,
                        media_path: q.media_path,
                         options: (q.options || []).map(o => ({
                            option_text: o.option_text,
                            is_correct: !!o.is_correct
                        }))
                    });
                });
            }
        }
    } catch (err) {
        console.error('Core loading failure:', err);
        errorMsg.value = 'Failed to synchronize with administrative services.';
    } finally {
        isLoading.value = false;
        if (form.value.selectedSkills.length > 0) {
            activeSkillTab.value = form.value.selectedSkills[0].skill_id;
        }
    }
});

watch(() => form.value.selectedSkills, (newSkills) => {
    if (newSkills.length > 0 && !activeSkillTab.value) {
        activeSkillTab.value = newSkills[0].skill_id;
    } else if (newSkills.length === 0) {
        activeSkillTab.value = null;
    }
}, { deep: true });


const nextStep = () => { 
    if (currentStep.value === 1) {
        if (!form.value.title?.trim() || !form.value.exam_category_id) {
            toast.add({ 
                severity: 'warn', 
                summary: 'Required Fields', 
                detail: 'Please provide an Exam Title and select a Category to proceed.',
                life: 3000
            });
            return;
        }
    }
    if (currentStep.value < 4) currentStep.value++; 
};
const prevStep = () => { if (currentStep.value > 1) currentStep.value--; };

const toggleSkill = (skillId) => {
    const idx = form.value.selectedSkills.findIndex(s => s.skill_id === skillId);
    if (idx === -1) {
        form.value.selectedSkills.push({ skill_id: skillId, duration: 30, is_optional: false, rules: [] });
        if (!localQuestions.value[skillId]) localQuestions.value[skillId] = {};
    } else {
        form.value.selectedSkills.splice(idx, 1);
    }
};

const isSkillSelected = (skillId) => form.value.selectedSkills.some(s => s.skill_id === skillId);

// Level Manager
const showLevelModal = ref(false);
const editingSkill = ref(null);
const editingLevels = ref([]);
const isSavingLevels = ref(false);

const isLeveledSkill = (skill) => {
    if (!skill) return false;
    const code = (skill.short_code || '').toUpperCase();
    return !['W', 'S'].includes(code);
};

const openLevelManager = async (skill) => {
    editingSkill.value = skill;
    showLevelModal.value = true;
    try {
        const res = await api.get('/admin/levels', { params: { skill_id: skill.id } });
        editingLevels.value = res.data;
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Level Error', detail: 'Failed to query level matrix.' });
    }
};

const addLevel = () => {
    const nextNum = editingLevels.value.length > 0 ? Math.max(...editingLevels.value.map(l => l.level_number)) + 1 : 1;
    editingLevels.value.push({
        id: null, skill_id: editingSkill.value.id, name: `Tier ${nextNum}`, level_number: nextNum,
        min_score: (nextNum - 1) * 10, max_score: nextNum * 10, pass_threshold: 70, instructions: '', is_active: true
    });
};

const saveLevels = async () => {
    isSavingLevels.value = true;
    try {
        await api.post(`/admin/skills/${editingSkill.value.id}/levels/bulk`, { levels: editingLevels.value });
        const skillRes = await api.get('/admin/skills-with-levels');
        availableSkills.value = skillRes.data;
        showLevelModal.value = false;
        toast.add({ severity: 'success', summary: 'Matrix Updated', detail: 'Cognitive tiers redistributed.' });
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Sync Failure', detail: 'Failed to propagate levels.' });
    } finally { isSavingLevels.value = false; }
};

// Question Builder
const activeSkillForQuestions = ref(null);
const activeLevelForQuestions = ref(null);
const showQuestionForm = ref(false);
const isPassageMode = ref(false);
const passageContent = ref('');
const showBankModal = ref(false);
const bankQuestions = ref([]);
const bankLoading = ref(false);
const bankSearchQuery = ref('');

const filteredBankQuestions = computed(() => {
    if (!bankSearchQuery.value) return bankQuestions.value;
    const query = bankSearchQuery.value.toLowerCase();
    return bankQuestions.value.filter(q => 
        q.content?.toLowerCase().includes(query) || 
        q.type?.toLowerCase().includes(query)
    );
});


const openBankSelector = async (skillId, levelNum) => {
    activeSkillForQuestions.value = skillId;
    activeLevelForQuestions.value = levelNum;
    showBankModal.value = true;
    bankLoading.value = true;
    bankSearchQuery.value = ''; // Reset search
    try {
        const res = await api.get('/admin/questions', { params: { skill_id: skillId, difficulty_level: levelNum } });
        bankQuestions.value = res.data.data;
    } finally { bankLoading.value = false; }
};


const isAlreadyAdded = (qId) => {
    const list = localQuestions.value[activeSkillForQuestions.value]?.[activeLevelForQuestions.value] || [];
    return list.some(q => q.id === qId);
};

const importQuestion = (q) => {
    if (isAlreadyAdded(q.id)) return;
    const cloned = { ...q, options: q.options.map(o => ({ option_text: o.option_text, is_correct: !!o.is_correct })) };
    if (!localQuestions.value[activeSkillForQuestions.value]) localQuestions.value[activeSkillForQuestions.value] = {};
    if (!localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value]) localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value] = [];
    localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value].push(cloned);
};

const newQuestion = ref({ type: 'mcq', content: '', points: 1, options: [{option_text: '', is_correct: true}, {option_text: '', is_correct: false}] });
const passageLimit = ref(5);
const isUploadingMedia = ref(false);

const handleMediaUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    isUploadingMedia.value = true;
    const formData = new FormData(); formData.append('file', file);
    try {
        const res = await api.post('/admin/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        newQuestion.value.media_path = res.data.path;
        newQuestion.value.media_url = res.data.url;
    } finally { isUploadingMedia.value = false; }
};

const openQuestionBuilder = (skillId, levelNum, isPassage = false) => {
    activeSkillForQuestions.value = skillId; activeLevelForQuestions.value = levelNum; isPassageMode.value = isPassage;
    passageContent.value = ''; showQuestionForm.value = true; resetNewQuestion();
};

const resetNewQuestion = () => {
    newQuestion.value = {
        type: 'mcq', content: '', points: 1, 
        options: [{option_text: '', is_correct: true}, {option_text: '', is_correct: false}],
        passage_content: isPassageMode.value ? passageContent.value : null,
        passage_randomize: true, passage_limit: isPassageMode.value ? passageLimit.value : null
    };
};

const currentGroupId = ref(null);
const commitQuestion = () => {
    if (!newQuestion.value.content) return;
    let q = { ...newQuestion.value };
    if (q.type === 'true_false') q.options = [{option_text: 'True', is_correct: q.options[0].is_correct}, {option_text: 'False', is_correct: q.options[1].is_correct}];
    if (isPassageMode.value) {
        if (!currentGroupId.value) currentGroupId.value = 'grp_' + Math.random().toString(36).substr(2, 9);
        q.passage_group_id = currentGroupId.value; q.passage_content = passageContent.value; q.passage_limit = passageLimit.value;
    }
    if (!localQuestions.value[activeSkillForQuestions.value]) localQuestions.value[activeSkillForQuestions.value] = {};
    if (!localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value]) localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value] = [];
    localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value].push(q);
    resetNewQuestion();
};

const removeLocalQuestion = (sId, lNum, idx) => localQuestions.value[sId][lNum].splice(idx, 1);
const getGroupedQuestions = (qs) => {
    if (!qs) return {}; const g = { independent: [] };
    qs.forEach(q => { if (q.passage_group_id) { (g[q.passage_group_id] = g[q.passage_group_id] || []).push(q); } else g.independent.push(q); });
    if (g.independent.length === 0) delete g.independent;
    return g;
};

const saveExam = async () => {
    isSubmitting.value = true;
    try {
        // 1. Process Questions: Detect NEW vs EXISTING
        for (const sId in localQuestions.value) {
            for (const lNum in localQuestions.value[sId]) {
                for (const q of localQuestions.value[sId][lNum]) {
                    if (!q.id) { // ONLY SAVE NEW ITEMS TO BANK
                        const res = await api.post('/admin/questions', { ...q, skill_id: sId, difficulty_level: lNum, group_tag: form.value.title });
                        q.id = res.data.question.id; // Map back to prevent duplicate on next edit
                    }
                }
            }
        }

        // 2. Build Rules
        const skillsWithRules = form.value.selectedSkills.map(s => {
            const rules = [];
            if (localQuestions.value[s.skill_id]) {
                Object.entries(localQuestions.value[s.skill_id]).forEach(([lvl, qs]) => {
                    if (qs.length > 0) rules.push({ difficulty_level: parseInt(lvl), quantity: qs.length, group_tag: form.value.title, randomize: true });
                });
            }
            return { ...s, rules };
        });

        const payload = { ...form.value, skills: skillsWithRules };
        if (isEditMode.value) await api.patch(`/admin/exams/${examId.value}`, payload);
        else await api.post('/admin/exams', payload);
        
        toast.add({ severity: 'success', summary: 'Assessment Initialized', detail: 'The logic matrix has been deployed successfully.' });
        router.push('/admin/exams');
    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Sequence Failure during deployment.';
    } finally { isSubmitting.value = false; }
};
</script>

<template>
  <AdminLayout>
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-40">
        <div class="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Calibrating Constructor...</p>
    </div>
    
    <div v-else class="animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-16 max-w-7xl mx-auto">
        <!-- Unified Header Section -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 space-y-8 md:space-y-0 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div class="absolute -right-16 -top-16 w-48 h-48 bg-indigo-50/50 rounded-full blur-3xl"></div>
            <div class="relative z-10">
                <div class="flex items-center space-x-6">
                    <button @click="router.push('/admin/exams')" class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-all transform hover:-translate-x-1 shadow-sm">
                        <i class="pi pi-arrow-left"></i>
                    </button>
                    <div>
                         <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">{{ isEditMode ? 'Modify Assessment' : 'Initialize Exam' }}</h1>
                         <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Phase {{ currentStep }} of 4: Protocol Construction</p>
                    </div>
                </div>
            </div>
            
            <div class="hidden lg:flex items-center space-x-2 bg-slate-50/50 px-6 py-4 rounded-[1.8rem] border border-slate-100 relative z-10">
                <div v-for="s in 4" :key="s" class="flex items-center">
                    <div :class="currentStep === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : (currentStep > s ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300')" 
                         class="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black transition-all duration-500">
                         <i v-if="currentStep > s" class="pi pi-check text-[10px]"></i>
                         <span v-else>{{ s }}</span>
                    </div>
                    <div v-if="s < 4" class="w-10 h-1 bg-slate-100 mx-1 rounded-full">
                        <div :class="currentStep > s ? 'w-full' : 'w-0'" class="h-full bg-emerald-400 transition-all duration-700"></div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="errorMsg" class="mb-10 p-6 bg-rose-50 border border-rose-100 text-rose-500 text-[11px] font-black uppercase tracking-widest rounded-3xl flex items-center space-x-4">
            <span class="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center -rotate-12 select-none">!</span>
            <span>Sequence Error: {{ errorMsg }}</span>
        </div>

        <!-- STEP 1: IDENTITY -->
        <div v-if="currentStep === 1" class="space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div class="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.03)] space-y-12">
                    <div class="space-y-4">
                        <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Logical Identity</h3>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Specify the administrative title and audience category for this assessment.</p>
                    </div>
                    <div class="space-y-8">
                        <div class="space-y-3">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Logical Designation (Title)</label>
                            <input v-model="form.title" type="text" class="w-full bg-slate-50 border border-slate-100 p-6 rounded-[1.5rem] text-sm font-bold uppercase tracking-tight focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all" placeholder="E.G. ALPH_CORE_2024">
                        </div>
                        <div class="space-y-3">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Audience Class (Category)</label>
                            <select v-model="form.exam_category_id" class="w-full bg-slate-50 border border-slate-100 p-6 rounded-[1.5rem] text-xs font-black uppercase tracking-widest focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all cursor-pointer">
                                <option :value="null" disabled>Select Evaluation Segment</option>
                                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-800 p-12 rounded-[3.5rem] text-white flex flex-col justify-center space-y-12 relative overflow-hidden group">
                    <div class="absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-400/30 transition-all duration-1000"></div>
                    <div class="space-y-4">
                        <h3 class="text-xl font-black uppercase tracking-tight">Environmental Metrics</h3>
                        <p class="text-[10px] font-bold text-indigo-300/60 uppercase tracking-widest leading-relaxed">Configure success threshold parameters.</p>
                    </div>
                    <div class="space-y-10">
                        <div class="space-y-4">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Success Threshold (%)</label>
                            <InputNumber v-model="form.passing_score" :min="0" :max="100" class="w-full" inputClass="bg-white/5 border-none text-white font-black text-2xl p-6 text-center rounded-3xl" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- STEP 2: SKILLS SELECTION -->
        <div v-if="currentStep === 2" class="space-y-12 animate-in fade-in slide-in-from-right-12 duration-700">
            <div class="text-center space-y-4">
                 <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tight">Cognitive Modules</h2>
                 <p class="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Select the domains to be evaluated in this sequence</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div v-for="skill in availableSkills" :key="skill.id" 
                     @click="toggleSkill(skill.id)"
                     :class="isSkillSelected(skill.id) ? 'bg-white border-indigo-600 shadow-2xl shadow-indigo-500/10' : 'bg-slate-50 border-slate-50 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'"
                     class="group p-10 rounded-[3rem] border-2 transition-all duration-500 cursor-pointer text-center relative">
                    <div v-if="isSkillSelected(skill.id)" class="absolute top-6 right-6 text-indigo-600 animate-in zoom-in group-hover:scale-110">
                        <i class="pi pi-check-circle text-xl"></i>
                    </div>
                    <div :class="isSkillSelected(skill.id) ? 'bg-indigo-600 text-white rotate-6' : 'bg-white text-slate-300'" 
                         class="w-20 h-20 rounded-[1.8rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-sm transition-all duration-700 group-hover:-translate-y-2">
                         {{ skill.icon || '🧠' }}
                    </div>
                    <h4 class="text-sm font-black uppercase tracking-widest">{{ skill.name }}</h4>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-2 italic">{{ skill.levels?.length || 0 }} Tier Matrix Available</p>
                </div>
            </div>
        </div>

        <!-- STEP 3: THE MATRIX -->
        <div v-if="currentStep === 3" class="space-y-16 animate-in fade-in slide-in-from-right-12 duration-700">
            <div class="bg-indigo-600 p-12 rounded-[4rem] text-white flex flex-col md:flex-row justify-between items-center shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
                <div class="absolute inset-0 bg-white/5 pointer-events-none" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
                <div class="relative z-10 space-y-2 text-center md:text-left">
                    <h3 class="text-3xl font-black uppercase tracking-tight">Logic Matrix</h3>
                    <p class="text-[10px] font-bold text-indigo-100 uppercase tracking-[0.2em] opacity-80">Configure tier-specific content modules</p>
                </div>
                <div v-if="form.selectedSkills.length > 0" class="relative z-10 mt-8 md:mt-0 px-8 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                    Active: {{ form.selectedSkills.length }} Modalities
                </div>
            </div>

            <div v-if="form.selectedSkills.length === 0" class="bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200 p-32 text-center group transition-colors hover:border-indigo-300">
                <div class="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-sm transition-transform group-hover:scale-110 duration-500">🚫</div>
                <p class="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">No modalities selected. Return to sequence 2.</p>
                <button @click="currentStep = 2" class="mt-8 text-indigo-600 text-[10px] font-black uppercase tracking-widest underline underline-offset-8">Configure Skills Matrix ➜</button>
            </div>

            <div v-else class="space-y-12">
                <!-- Skill Selection Pills -->
                <div class="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-[2rem] border border-slate-100">
                    <button v-for="selected in form.selectedSkills" :key="selected.skill_id"
                        @click="activeSkillTab = selected.skill_id"
                        :class="activeSkillTab === selected.skill_id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white text-slate-400 hover:bg-white hover:text-slate-800'"
                        class="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center space-x-3">
                        <span class="w-2 h-2 rounded-full" :class="activeSkillTab === selected.skill_id ? 'bg-indigo-300' : 'bg-slate-200'"></span>
                        <span>{{ availableSkills.find(s => s.id === selected.skill_id)?.name }}</span>
                    </button>
                </div>

                <!-- Active Skill Workspace -->
                <div v-if="activeSkillTab" class="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div class="bg-white rounded-[3.5rem] border border-slate-100 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.03)] overflow-hidden">
                        <!-- Workplace Header -->
                        <div class="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div class="flex items-center space-x-6">
                                <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl rotate-3">
                                    {{ availableSkills.find(s => s.id === activeSkillTab)?.icon || '🧠' }}
                                </div>
                                <div>
                                    <h4 class="text-2xl font-black text-slate-800 uppercase tracking-tight">{{ availableSkills.find(s => s.id === activeSkillTab)?.name }} Protocol</h4>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure item distribution for this cognitive modality</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-3">
                                <div class="bg-slate-50 px-6 py-3 rounded-xl border border-slate-100">
                                    <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{{ form.selectedSkills.find(s => s.skill_id === activeSkillTab)?.duration || 30 }}m Allocation</span>
                                </div>
                                <Button label="Tier Matrix" icon="pi pi-table" text class="text-[9px] font-black uppercase px-6" 
                                    @click="openLevelManager(availableSkills.find(s => s.id === activeSkillTab))" />
                            </div>
                        </div>

                        <!-- Focused Tier List -->
                        <div class="p-10 space-y-6">
                            <div v-for="level in (availableSkills.find(s => s.id === activeSkillTab)?.levels || []).filter(l => l.is_active || !isLeveledSkill(availableSkills.find(as => as.id === activeSkillTab)))" :key="level.id"
                                 class="group flex flex-col md:flex-row items-center justify-between p-6 bg-slate-50/50 rounded-[2.5rem] border border-white hover:bg-white hover:border-indigo-100 hover:shadow-2xl transition-all duration-500 gap-6">
                                
                                <!-- Tier Info -->
                                <div class="flex items-center space-x-6 min-w-[240px]">
                                    <div class="w-12 h-12 rounded-xl bg-white group-hover:bg-indigo-600 group-hover:text-white flex flex-col items-center justify-center transition-all shadow-sm">
                                        <span class="text-[7px] font-black opacity-30 leading-none">TIER</span>
                                        <span class="text-sm font-black">{{ level.level_number || 1 }}</span>
                                    </div>
                                    <div>
                                        <h5 class="text-xs font-black uppercase text-slate-800 tracking-wider">{{ level.name || 'Universal Pool' }}</h5>
                                        <div class="flex items-center space-x-2 mt-1">
                                            <div class="w-1 h-1 rounded-full bg-emerald-500"></div>
                                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{{ localQuestions[activeSkillTab]?.[level.level_number || 1]?.length || 0 }} Items Active</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Toolbar -->
                                <div class="flex items-center gap-2">
                                    <button @click="openBankSelector(activeSkillTab, level.level_number || 1)" 
                                        class="px-5 py-3 rounded-xl bg-white border border-slate-100 text-emerald-600 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm flex items-center space-x-2">
                                        <i class="pi pi-search text-[8px]"></i>
                                        <span>Query Bank</span>
                                    </button>
                                    <div class="w-px h-4 bg-slate-200 mx-1"></div>
                                    <button @click="openQuestionBuilder(activeSkillTab, level.level_number || 1, false)" 
                                        class="px-5 py-3 rounded-xl bg-white border border-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all shadow-sm flex items-center space-x-2">
                                        <i class="pi pi-plus text-[8px]"></i>
                                        <span>Add MCQ</span>
                                    </button>
                                    <button @click="openQuestionBuilder(activeSkillTab, level.level_number || 1, true)" 
                                        class="px-5 py-3 rounded-xl bg-white border border-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all shadow-sm flex items-center space-x-2">
                                        <i class="pi pi-book text-[8px]"></i>
                                        <span>Passage</span>
                                    </button>
                                </div>

                                <!-- Question Quick View (Small Toggle) -->
                                <div v-if="localQuestions[activeSkillTab]?.[level.level_number || 1]?.length > 0">
                                    <div class="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-600">
                                        <i class="pi pi-check-circle text-[10px]"></i>
                                        <span class="text-[9px] font-black tracking-widest uppercase">Verified</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- STEP 4: FINALIZE -->
        <div v-if="currentStep === 4" class="space-y-16 animate-in fade-in zoom-in-95 duration-700">
            <div class="text-center space-y-6">
                 <div class="w-24 h-24 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-[2.5rem] mx-auto mb-10 text-4xl shadow-sm border border-emerald-100">
                     <i class="pi pi-check-circle"></i>
                 </div>
                 <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tight">Deployment Ready</h2>
                 <p class="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-lg mx-auto leading-relaxed">Verification of the Logic Matrix complete. Commencing final persistence protocols.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div class="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-10">
                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-6">Final Metadata Summary</h4>
                    <div class="space-y-8">
                        <div class="flex justify-between items-center bg-slate-50 p-6 rounded-3xl">
                            <span class="text-[10px] font-black text-slate-400 uppercase">Assessment Title</span>
                            <span class="text-xs font-black text-slate-700 truncate max-w-[200px] uppercase">{{ form.title }}</span>
                        </div>
                        <div class="flex justify-between items-center bg-slate-50 p-6 rounded-3xl">
                            <span class="text-[10px] font-black text-slate-400 uppercase">Active Modalities</span>
                            <span class="text-xs font-black text-indigo-600">{{ form.selectedSkills.length }} Modules</span>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-800 p-12 rounded-[4rem] text-white flex flex-col justify-center text-center space-y-10 shadow-2xl shadow-slate-900/10">
                    <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Execution Phase</p>
                    <Button :label="isSubmitting ? 'PERSISTING DATA...' : 'INITIALIZE PROTOCOL ➜'" 
                            :loading="isSubmitting" 
                            @click="saveExam" 
                            class="bg-white border-none text-slate-900 font-black text-[11px] py-10 rounded-[2.5rem] shadow-2xl hover:bg-indigo-500 hover:text-white transition-all transform hover:-translate-y-2 uppercase tracking-[0.2em]" />
                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest opacity-60">This action will propagate the exam to all administrative endpoints</p>
                </div>
            </div>
        </div>

        <!-- Guided Navigation Footer -->
        <div class="mt-24 flex items-center justify-between border-t border-slate-100 pt-16">
            <button v-if="currentStep > 1" @click="prevStep" class="flex items-center space-x-3 text-slate-400 hover:text-slate-800 transition-colors group">
                <i class="pi pi-angle-left text-xl group-hover:-translate-x-1 transition-transform"></i>
                <span class="text-[10px] font-black uppercase tracking-widest">Return to Phase {{ currentStep - 1 }}</span>
            </button>
            <div v-else></div>
            
            <button v-if="currentStep < 4" @click="nextStep" class="bg-indigo-600 text-white px-12 py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center space-x-4 transition-all hover:-translate-y-1 hover:shadow-indigo-500/10">
                <span>Advance Sequence</span>
                <i class="pi pi-angle-right text-xl"></i>
            </button>
        </div>

        <!-- Premium Clarity Question Builder -->
        <Dialog v-model:visible="showQuestionForm" :style="{ width: '50vw' }" modal class="rounded-[3rem] overflow-hidden border-none shadow-2xl info-dialog" :breakpoints="{'960px': '85vw', '641px': '100vw'}">
            <template #header>
                <div class="flex items-center w-full justify-between pr-8">
                    <div class="flex items-center space-x-6">
                        <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                            <i :class="isPassageMode ? 'pi pi-book' : 'pi pi-plus-circle'" class="text-xl"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">{{ isPassageMode ? 'New Passage Resource' : 'Add New Question' }}</h3>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">إضافة سؤال جديد إلى الاختبار</p>
                        </div>
                    </div>
                </div>
            </template>

            <div class="pt-6 space-y-10 max-h-[75vh] overflow-y-auto no-scrollbar pr-4 p-6">
                <!-- 1. Question Type Selection -->
                <div class="space-y-4">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Choose Question Type / اختر نوع السؤال</label>
                    <div class="grid grid-cols-3 gap-4">
                        <div @click="newQuestion.type = 'mcq'" 
                             :class="newQuestion.type === 'mcq' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'"
                             class="p-4 rounded-2xl border border-transparent cursor-pointer transition-all text-center">
                            <i class="pi pi-list text-lg mb-2 block"></i>
                            <span class="text-[9px] font-black uppercase tracking-tight">MCQ</span>
                        </div>
                        <div @click="newQuestion.type = 'true_false'" 
                             :class="newQuestion.type === 'true_false' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'"
                             class="p-4 rounded-2xl border border-transparent cursor-pointer transition-all text-center">
                            <i class="pi pi-sliders-h text-lg mb-2 block"></i>
                            <span class="text-[9px] font-black uppercase tracking-tight">True/False</span>
                        </div>
                        <div @click="newQuestion.type = 'short_answer'" 
                             :class="newQuestion.type === 'short_answer' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'"
                             class="p-4 rounded-2xl border border-transparent cursor-pointer transition-all text-center">
                            <i class="pi pi-pencil text-lg mb-2 block"></i>
                            <span class="text-[9px] font-black uppercase tracking-tight">Final Entry</span>
                        </div>
                    </div>
                </div>

                <!-- 2. Content & Points -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="md:col-span-3 space-y-4">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Question Text / نص السؤال</label>
                        <div class="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 focus-within:bg-white focus-within:ring-8 focus-within:ring-indigo-500/5 transition-all">
                             <textarea v-model="newQuestion.content" rows="4" class="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 outline-none resize-none no-scrollbar" placeholder="Start typing the question content here..."></textarea>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Points / الدرجة</label>
                        <div class="bg-slate-900 p-6 rounded-[2rem] text-white text-center">
                             <InputNumber v-model="newQuestion.points" :min="1" inputClass="bg-transparent border-none p-0 font-black text-3xl text-white outline-none w-full text-center" />
                             <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest block mt-2">Weight</span>
                        </div>
                    </div>
                </div>

                <!-- 3. Audio Context (Optional) -->
                <div class="space-y-4">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">3. Audio Resource (Optional) / ملف صوتي</label>
                    <div v-if="newQuestion.media_path" class="flex items-center space-x-4 p-4 bg-indigo-50 rounded-2xl">
                         <audio :src="newQuestion.media_url" controls class="h-8 flex-1"></audio>
                         <button @click="newQuestion.media_path = null; newQuestion.media_url = null" class="w-8 h-8 rounded-lg bg-white text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                              <i class="pi pi-trash text-xs"></i>
                         </button>
                    </div>
                    <div v-else class="relative group">
                         <input type="file" @change="handleMediaUpload" accept="audio/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                         <div class="p-6 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2rem] flex items-center justify-center space-x-4 group-hover:bg-indigo-50 transition-all">
                              <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 shadow-sm transition-all">
                                   <i :class="isUploadingMedia ? 'pi pi-spinner animate-spin' : 'pi pi-upload'" class="text-lg"></i>
                              </div>
                              <p class="text-[9px] font-black uppercase text-slate-400 group-hover:text-indigo-600 transition-colors">{{ isUploadingMedia ? 'Syncing...' : 'Click to add audio file' }}</p>
                         </div>
                    </div>
                </div>

                <!-- 4. Shared Resource Context (Bilingual) -->
                <div v-if="isPassageMode" class="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in duration-500">
                    <div class="flex justify-between items-center relative z-10">
                        <div class="flex items-center space-x-4">
                             <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                  <i class="pi pi-book"></i>
                             </div>
                             <div>
                                 <label class="text-[10px] font-black uppercase tracking-widest text-indigo-100">Reading Context / نص القطعة المشترك</label>
                                 <p class="text-[8px] font-bold text-indigo-200 mt-0.5 uppercase tracking-widest italic">Shared logic across artifacts</p>
                             </div>
                        </div>
                        <div class="flex items-center space-x-3 bg-indigo-500/30 px-5 py-3 rounded-2xl border border-white/10">
                             <span class="text-[8px] font-black uppercase text-indigo-200">Sync Limit</span>
                             <InputNumber v-model="passageLimit" :min="1" :max="20" inputClass="w-8 text-center text-[10px] font-black border-none bg-transparent text-white" />
                        </div>
                    </div>
                    <textarea v-model="passageContent" rows="4" class="w-full bg-white/10 border border-white/10 rounded-[2rem] p-8 text-sm font-bold text-white placeholder:text-indigo-300 outline-none resize-none transition-all focus:bg-white/20 relative z-10" placeholder="Paste or type the shared reading text here..."></textarea>
                    
                    <!-- Pattern Background -->
                    <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                </div>

                <!-- 5. Question Logic Formulation -->
                <div v-if="newQuestion.type === 'mcq'" class="space-y-6">
                    <div class="flex justify-between items-center ml-1">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">4. Choice Matrix / الاختيارات</label>
                        <button @click="newQuestion.options.push({option_text: '', is_correct: false})" class="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">+ Append Entry</button>
                    </div>
                    <div class="space-y-3">
                        <div v-for="(opt, idx) in newQuestion.options" :key="idx" 
                             :class="opt.is_correct ? 'border-emerald-200 bg-emerald-50/30 ring-8 ring-emerald-500/5 shadow-lg' : 'border-slate-100 bg-white shadow-sm'"
                             class="flex items-center space-x-4 p-5 rounded-[2.2rem] border transition-all duration-300 group">
                            
                            <div :class="opt.is_correct ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-100 text-slate-400'" 
                                 class="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all shadow-md">
                                {{ String.fromCharCode(65 + idx) }}
                            </div>
                            
                            <input v-model="opt.option_text" type="text" class="flex-1 bg-transparent border-none text-[11px] font-bold text-slate-700 focus:ring-0 outline-none" :placeholder="'Define choice ' + (idx + 1) + '...'">
                            
                            <div class="flex items-center space-x-4">
                                 <label class="flex items-center px-4 py-2 rounded-xl cursor-pointer transition-all border border-transparent" :class="opt.is_correct ? 'bg-emerald-500 text-white' : 'hover:bg-slate-50 border-slate-100 text-slate-300'">
                                      <span class="text-[8px] font-black uppercase tracking-widest mr-2">{{ opt.is_correct ? 'CORRECT' : 'SELECT' }}</span>
                                      <input type="checkbox" v-model="opt.is_correct" class="hidden">
                                      <i class="pi" :class="opt.is_correct ? 'pi-check-circle' : 'pi-circle-off'"></i>
                                 </label>
                                 <button v-if="newQuestion.options.length > 2" @click="newQuestion.options.splice(idx, 1)" class="w-8 h-8 rounded-lg text-slate-200 hover:text-rose-500 transition-colors">
                                      <i class="pi pi-trash text-sm"></i>
                                 </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 5. Binary Logic Formulation (True/False) -->
                <div v-else-if="newQuestion.type === 'true_false'" class="space-y-6">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">4. Select Logical Truth / حدد الحالة الصحيحة</label>
                    <div class="grid grid-cols-2 gap-6">
                        <div @click="newQuestion.options[0].is_correct = true; newQuestion.options[1].is_correct = false" 
                             :class="newQuestion.options[0].is_correct ? 'bg-emerald-600 text-white shadow-2xl -translate-y-1' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 shadow-inner shadow-slate-200/50'"
                             class="p-10 rounded-[3rem] border-2 border-transparent cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 group">
                             <div :class="newQuestion.options[0].is_correct ? 'bg-white/20' : 'bg-slate-200'" class="w-16 h-16 rounded-3xl flex items-center justify-center transition-colors">
                                 <i class="pi pi-check text-2xl"></i>
                             </div>
                             <div class="text-center">
                                 <h4 class="text-xl font-black uppercase tracking-tighter">TRUE</h4>
                                 <p class="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-1">صـــــواب</p>
                             </div>
                        </div>
                        <div @click="newQuestion.options[1].is_correct = true; newQuestion.options[0].is_correct = false" 
                             :class="newQuestion.options[1].is_correct ? 'bg-rose-600 text-white shadow-2xl -translate-y-1' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 shadow-inner shadow-slate-200/50'"
                             class="p-10 rounded-[3rem] border-2 border-transparent cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 group">
                             <div :class="newQuestion.options[1].is_correct ? 'bg-white/20' : 'bg-slate-200'" class="w-16 h-16 rounded-3xl flex items-center justify-center transition-colors">
                                 <i class="pi pi-times text-2xl"></i>
                             </div>
                             <div class="text-center">
                                 <h4 class="text-xl font-black uppercase tracking-tighter">FALSE</h4>
                                 <p class="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-1">خـــــطأ</p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex space-x-4 pt-6 p-8 border-t border-slate-50">
                    <button class="flex-1 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.2em] py-6 rounded-[2rem] shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center space-x-4 group" @click="commitQuestion">
                        <span>Save and Add to Exam</span>
                        <i class="pi pi-arrow-right group-hover:translate-x-2 transition-transform"></i>
                    </button>
                    <button v-if="isPassageMode" class="px-8 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors" @click="showQuestionForm = false">
                        Cancel
                    </button>
                </div>
            </template>
        </Dialog>

        <!-- Global Repository Selector: Studio Redesign -->
        <Dialog v-model:visible="showBankModal" :style="{ width: '65vw' }" modal class="rounded-[4rem] overflow-hidden border-none shadow-2xl creator-studio-modal">
            <template #header>
                <div class="flex items-center w-full justify-between pr-8">
                    <div class="flex items-center space-x-6">
                        <div class="w-14 h-14 rounded-[1.8rem] bg-emerald-600 text-white flex items-center justify-center shadow-2xl">
                            <i class="pi pi-database text-2xl"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Global Item Bank</h3>
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5 opacity-70">Querying Central Repository // Tier {{ activeLevelForQuestions }} Protocol</p>
                        </div>
                    </div>
                </div>
            </template>

            <div class="pt-8 space-y-10 max-h-[70vh] overflow-y-auto no-scrollbar pr-4 bg-slate-50/30 p-8 rounded-[3.5rem]">
                <!-- Integrated Search Bar -->
                <div class="relative group">
                    <i class="pi pi-search absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors"></i>
                    <input v-model="bankSearchQuery" type="text" placeholder="Scan repository for keyword, content, or item logic..." 
                        class="w-full bg-white border border-slate-100 p-8 pl-20 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest outline-none focus:ring-8 focus:ring-emerald-500/5 transition-all shadow-xl shadow-slate-200/20" />
                </div>

                <div v-if="bankLoading" class="flex flex-col items-center py-32 space-y-6">
                    <div class="w-10 h-10 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Cross-referencing global indices...</p>
                </div>

                <div v-else-if="filteredBankQuestions.length === 0" class="py-20 text-center space-y-4">
                    <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <i class="pi pi-search text-3xl"></i>
                    </div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching artifacts found in repository</p>
                </div>

                <div v-else class="grid grid-cols-1 gap-4">
                    <div v-for="bq in filteredBankQuestions" :key="bq.id" 
                         class="group bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-indigo-600 hover:shadow-2xl transition-all duration-500 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div class="flex-1 space-y-4">
                            <div class="flex items-center space-x-3">
                                <span class="text-[8px] font-black bg-slate-50 text-slate-400 px-3 py-1 rounded-lg uppercase tracking-widest border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">{{ bq.type }}</span>
                                <div class="w-1 h-1 rounded-full bg-slate-200"></div>
                                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">{{ bq.points }} Weighted Units</span>
                            </div>
                            <h5 class="text-[11px] font-bold text-slate-700 leading-relaxed uppercase tracking-tight line-clamp-2 md:max-w-md">{{ bq.content }}</h5>
                        </div>
                        <button @click="importQuestion(bq)" 
                                :disabled="isAlreadyAdded(bq.id)"
                                :class="isAlreadyAdded(bq.id) ? 'bg-slate-50 text-slate-300' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:-translate-y-1 hover:shadow-indigo-500/20'"
                                class="shrink-0 px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            {{ isAlreadyAdded(bq.id) ? 'LINKED ✓' : 'SYNC TO EXAM' }}
                        </button>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-center pt-8 border-t border-slate-50">
                    <Button label="Terminate Connection" icon="pi pi-times" severity="secondary" text class="font-black text-[9px] uppercase tracking-widest" @click="showBankModal = false" />
                </div>
            </template>
        </Dialog>


        <!-- Tier Manager Redesign -->
        <Dialog v-model:visible="showLevelModal" :header="'Matrix Tier Calibration'" :style="{ width: '85vw' }" modal class="rounded-[3rem] overflow-hidden border-none shadow-2xl">
            <template #header>
                <div class="flex justify-between items-center w-full pr-12">
                    <div class="flex flex-col">
                        <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Matrix Tier Calibration</h3>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Modifying architecture for {{ editingSkill?.name }} Domain</p>
                    </div>
                    <Button label="Append Tier" icon="pi pi-plus" class="bg-indigo-600 border-none font-black text-[9px] uppercase tracking-widest px-8 rounded-xl shadow-lg shadow-indigo-100" @click="addLevel" />
                </div>
            </template>

            <div class="pt-6">
                <DataTable :value="editingLevels" class="p-datatable-sm overflow-hidden" responsiveLayout="scroll">
                    <Column header="Tier" style="width: 80px">
                        <template #body="slotProps">
                            <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-[10px] uppercase">
                                #{{ slotProps.data.level_number }}
                            </div>
                        </template>
                    </Column>
                    <Column header="Logical Name">
                        <template #body="slotProps">
                            <InputText v-model="slotProps.data.name" class="w-full bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase p-4 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                        </template>
                    </Column>
                    <Column header="Logic Range (Points)" style="width: 250px">
                        <template #body="slotProps">
                            <div class="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl w-fit border border-slate-100">
                                <InputNumber v-model="slotProps.data.min_score" inputClass="w-12 border-none bg-transparent text-center font-black text-[10px]" />
                                <span class="text-slate-300 font-bold">➜</span>
                                <InputNumber v-model="slotProps.data.max_score" inputClass="w-12 border-none bg-transparent text-center font-black text-[10px]" />
                            </div>
                        </template>
                    </Column>
                    <Column header="Success %" style="width: 150px">
                        <template #body="slotProps">
                            <div class="bg-indigo-50/50 p-2 rounded-xl flex justify-center">
                                <InputNumber v-model="slotProps.data.pass_threshold" suffix="%" inputClass="w-16 border-none bg-transparent text-center font-black text-[11px] text-indigo-600" />
                            </div>
                        </template>
                    </Column>
                    <Column header="Administrative Actions" style="width: 100px">
                        <template #body="slotProps">
                             <Button icon="pi pi-trash" severity="danger" text rounded @click="removeLevel(slotProps.data, slotProps.index)" class="hover:bg-rose-50" />
                        </template>
                    </Column>
                </DataTable>
            </div>

            <template #footer>
                <div class="flex justify-end p-6 bg-slate-50/50 border-t border-slate-50 space-x-4">
                    <Button label="Discard Changes" severity="secondary" text class="font-black text-[10px] uppercase tracking-widest px-8" @click="showLevelModal = false" />
                    <Button label="Persist Matrix Globally" icon="pi pi-save" :loading="isSavingLevels" class="bg-indigo-600 border-none font-black text-[10px] uppercase tracking-widest px-10 rounded-2xl shadow-xl shadow-indigo-100" @click="saveLevels" />
                </div>
            </template>
        </Dialog>

        <Toast />
    </div>
  </AdminLayout>
</template>

<style scoped>
:deep(.p-datatable-thead > tr > th) {
    background: transparent;
    color: #94a3b8;
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    padding: 1.5rem 1rem;
    border-bottom: 2px solid #f1f5f9;
}
:deep(.p-datatable-tbody > tr > td) {
    padding: 1.5rem 1rem;
    border-bottom: 1px solid #f8fafc;
}
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
@keyframes slide-in-top {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
