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
const currentStep = ref(1); // 1: Identity, 2: Skills, 3: Finalize
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
                selectedSkills: exam.skills.map(skill => {
                    return {
                        skill_id: skill.id,
                        duration: skill.pivot.duration,
                        is_optional: !!skill.pivot.is_optional,
                        rules: (exam.question_rules || []).filter(r => r.skill_id === skill.id).map(r => ({
                            level_id: r.level_id,
                            quantity: r.quantity,
                            randomize: !!r.randomize
                        }))
                    };
                })
            };

            // Initialize localQuestions from fetched questions
            if (exam.questions && exam.questions.length > 0) {
                exam.questions.forEach(q => {
                    const sId = q.skill_id;
                    const lNum = q.level?.level_number || 1; // Use the level number for matrix mapping
                    if (!localQuestions.value[sId]) localQuestions.value[sId] = {};
                    if (!localQuestions.value[sId][lNum]) localQuestions.value[sId][lNum] = [];

                    localQuestions.value[sId][lNum].push({
                        id: q.id,
                        type: q.type,
                        content: q.content,
                        instructions: q.instructions,
                        points: q.points,
                        passage_id: q.passage_id,
                        passage: q.passage,
                        media_path: q.media_path,
                        media_url: q.media_url,
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
    if (currentStep.value < 3) currentStep.value++;
};
const prevStep = () => { if (currentStep.value > 1) currentStep.value--; };

const toggleSkill = (skillId) => {
    const idx = form.value.selectedSkills.findIndex(s => s.skill_id === skillId);
    if (idx === -1) {
        form.value.selectedSkills.push({ skill_id: skillId, duration: 30, is_optional: false });
    } else {
        form.value.selectedSkills.splice(idx, 1);
    }
};

const isSkillSelected = (skillId) => form.value.selectedSkills.some(s => s.skill_id === skillId);

const getSkillDuration = (skillId) => {
    const skill = form.value.selectedSkills.find(s => s.skill_id === skillId);
    return skill ? skill.duration : 30;
};

const setSkillDuration = (skillId, val) => {
    const skill = form.value.selectedSkills.find(s => s.skill_id === skillId);
    if (skill) skill.duration = val;
};

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
const hideAssignedQuestions = ref(false);

const filteredBankQuestions = computed(() => {
    let filtered = bankQuestions.value;
    if (hideAssignedQuestions.value) {
        filtered = filtered.filter(q => (q.exams_count || 0) === 0);
    }
    if (bankSearchQuery.value) {
        const query = bankSearchQuery.value.toLowerCase();
        filtered = filtered.filter(q =>
            q.content?.toLowerCase().includes(query) ||
            q.type?.toLowerCase().includes(query)
        );
    }
    return filtered;
});


const openBankSelector = async (skillId, levelNum) => {
    activeSkillForQuestions.value = skillId;
    activeLevelForQuestions.value = levelNum;
    showBankModal.value = true;
    bankLoading.value = true;
    bankSearchQuery.value = ''; // Reset search
    try {
        const res = await api.get('/admin/questions', { params: { skill_id: skillId, level_id: levelNum } });
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

const newQuestion = ref({ type: 'mcq', content: '', points: 1, options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] });
const passageLimit = ref(5);
const isUploadingMedia = ref(false);
const isAudioPlayingInModal = ref(false);

const levelQuantities = ref({});
const passages = ref([]);

const questionTypes = [
    { label: 'Multiple Choice', value: 'mcq', icon: 'pi-check-square' },
    { label: 'True / False', value: 'true_false', icon: 'pi-verified' },
    { label: 'Short Answer', value: 'short_answer', icon: 'pi-pencil' },
    { label: 'Writing Task', value: 'writing', icon: 'pi-file-edit' },
    { label: 'Speaking Task', value: 'speaking', icon: 'pi-microphone' },
    { label: 'File Upload', value: 'upload', icon: 'pi-upload' },
];

const getLevelQuantity = (skillId, levelNum) => {
    const manual = levelQuantities.value[skillId]?.[levelNum];
    if (manual !== undefined && manual !== null) return manual;
    const skill = availableSkills.value.find(s => s.id === skillId);
    const level = skill?.levels?.find(l => l.level_number === levelNum);
    return level?.default_question_count || null;
};

const setLevelQuantity = (skillId, levelNum, val) => {
    if (!levelQuantities.value[skillId]) levelQuantities.value[skillId] = {};
    levelQuantities.value[skillId][levelNum] = val;
};

const fetchPassages = async () => {
    if (passages.value.length > 0) return;
    try { const res = await api.get('/admin/passages'); passages.value = res.data; } catch (e) {}
};

const handleTypeChangeInDialog = () => {
    const q = newQuestion.value;
    if (q.type === 'true_false') {
        q.options = [{option_text:'True',is_correct:true},{option_text:'False',is_correct:false}];
    } else if (['writing','speaking','upload'].includes(q.type)) {
        q.options = [];
    } else if (q.type === 'short_answer') {
        q.options = [{option_text:'',is_correct:true}];
    } else if (!q.options || q.options.length < 2) {
        q.options = [{option_text:'',is_correct:true},{option_text:'',is_correct:false}];
    }
};

const handlePassageMediaUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    newQuestion.value.passage_media_file = file;
    newQuestion.value.passage_media_preview = { url: URL.createObjectURL(file), type: file.type };
};

const handleQMediaUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    newQuestion.value.q_media = file;
    newQuestion.value.q_media_preview = {url: URL.createObjectURL(file), type: file.type};
    newQuestion.value.content = '';
};

const handleMediaUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    isUploadingMedia.value = true;
    const formData = new FormData(); formData.append('file', file);
    try {
        const res = await api.post('/admin/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        newQuestion.value.media_path = res.data.path;
        newQuestion.value.media_url = res.data.url;
        // Reset player state
        isAudioPlayingInModal.value = false;
    } finally { isUploadingMedia.value = false; }
};

const handleAudioError = (e) => {
    console.error('Modal audio error:', e);
    toast.add({ severity: 'error', summary: 'Audio Error', detail: 'The attached audio protocol failed to initialize.', life: 3000 });
};

const openQuestionBuilder = (skillId, levelNum, isPassage = false) => {
    activeSkillForQuestions.value = skillId;
    activeLevelForQuestions.value = levelNum;
    isPassageMode.value = isPassage;
    showQuestionForm.value = true;
    resetNewQuestion();
    fetchPassages();
};

const resetNewQuestion = () => {
    newQuestion.value = {
        type: 'mcq',
        content_mode: 'text',
        content: '',
        instructions: '',
        points: 1,
        q_media: null,
        q_media_preview: null,
        options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }],
        passage_mode: isPassageMode.value ? 'new' : 'none',
        passage_id: null,
        passage_title: '',
        passage_type: 'text',
        passage_content: '',
        passage_randomize: true,
        passage_limit: isPassageMode.value ? passageLimit.value : null,
        min_words: null,
        max_words: null
    };
};

const currentGroupId = ref(null);

const setTrueFalseAnswer = (isTrue) => {
    if (!newQuestion.value.options[0]) newQuestion.value.options[0] = { option_text: '', is_correct: false };
    if (!newQuestion.value.options[1]) newQuestion.value.options[1] = { option_text: '', is_correct: false };
    newQuestion.value.options[0].is_correct = isTrue;
    newQuestion.value.options[1].is_correct = !isTrue;
};

const commitQuestion = () => {
    if (!newQuestion.value.content && !newQuestion.value.q_media) return;
    let q = { ...newQuestion.value };
    if (q.type === 'true_false') q.options = [{ option_text: 'True', is_correct: q.options[0]?.is_correct || false }, { option_text: 'False', is_correct: q.options[1]?.is_correct || false }];

    if (isPassageMode.value) {
        if (!currentGroupId.value) currentGroupId.value = 'grp_' + Math.random().toString(36).substr(2, 9);
        q.temp_group_id = currentGroupId.value; // Temporary ID for grouping in UI before save
    }

    if (!localQuestions.value[activeSkillForQuestions.value]) localQuestions.value[activeSkillForQuestions.value] = {};
    if (!localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value]) localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value] = [];
    localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value].push(q);

    // Partially reset but keep passage if same group
    const oldPassageMode = q.passage_mode;
    const oldPassageContent = q.passage_content;
    const oldPassageTitle = q.passage_title;

    resetNewQuestion();

    if (isPassageMode.value) {
        newQuestion.value.passage_mode = oldPassageMode;
        newQuestion.value.passage_content = oldPassageContent;
        newQuestion.value.passage_title = oldPassageTitle;
    }
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
        const skills = form.value.selectedSkills.map(s => ({
            skill_id: s.skill_id,
            duration: s.duration,
            is_optional: s.is_optional
        }));

        const payload = {
            title: form.value.title,
            description: form.value.description,
            language_id: form.value.language_id,
            exam_category_id: form.value.exam_category_id,
            passing_score: form.value.passing_score,
            skills: skills
        };

        if (isEditMode.value) await api.patch(`/admin/exams/${examId.value}`, payload);
        else await api.post('/admin/exams', payload);

        toast.add({ severity: 'success', summary: 'Assessment Created', detail: 'The exam shell has been initialized successfully.' });
        router.push('/admin/exams');
    } catch (err) {
        console.error('Final Save Error:', err);
        errorMsg.value = err.response?.data?.message || 'Sequence Failure during deployment.';
    } finally { isSubmitting.value = false; }
};
</script>

<template>
    <AdminLayout>
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-40">
            <div class="w-16 h-16 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin mb-8">
            </div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Calibrating Constructor...</p>
        </div>

        <div v-else
            class="animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-16 max-w-7xl mx-auto">
            <!-- Unified Header Section -->
            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 space-y-8 md:space-y-0 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div class="absolute -right-16 -top-16 w-48 h-48 bg-rose-50/50 rounded-full blur-3xl"></div>
                <div class="relative z-10">
                    <div class="flex items-center space-x-6">
                        <button @click="router.push('/admin/exams')"
                            class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-all transform hover:-translate-x-1 shadow-sm">
                            <i class="pi pi-arrow-left"></i>
                        </button>
                        <div>
                            <h1
                                class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">
                                {{ isEditMode ? 'Modify Assessment' : 'Initialize Exam' }}</h1>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Phase
                                {{ currentStep }} of 3: Protocol Construction</p>
                        </div>
                    </div>
                </div>

                <div
                    class="hidden lg:flex items-center space-x-2 bg-slate-50/50 px-6 py-4 rounded-[1.8rem] border border-slate-100 relative z-10">
                    <div v-for="s in 3" :key="s" class="flex items-center">
                        <div :class="currentStep === s ? 'bg-brand-primary text-white shadow-lg shadow-rose-100' : (currentStep > s ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300')"
                            class="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black transition-all duration-500">
                            <i v-if="currentStep > s" class="pi pi-check text-[10px]"></i>
                            <span v-else>{{ s }}</span>
                        </div>
                        <div v-if="s < 3" class="w-10 h-1 bg-slate-100 mx-1 rounded-full">
                            <div :class="currentStep > s ? 'w-full' : 'w-0'"
                                class="h-full bg-emerald-400 transition-all duration-700"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="errorMsg"
                class="mb-10 p-6 bg-rose-50 border border-rose-100 text-rose-500 text-[11px] font-black uppercase tracking-widest rounded-3xl flex items-center space-x-4">
                <span
                    class="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center -rotate-12 select-none">!</span>
                <span>Sequence Error: {{ errorMsg }}</span>
            </div>

            <!-- STEP 1: IDENTITY -->
            <div v-if="currentStep === 1" class="space-y-10 animate-in fade-in zoom-in-95 duration-700">
                <div class="max-w-3xl mx-auto">
                    <div
                        class="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.03)] space-y-12">
                        <div class="space-y-4">
                            <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Logical Identity</h3>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                Specify the administrative title and audience category for this assessment.</p>
                        </div>
                        <div class="space-y-8">
                            <div class="space-y-3">
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Logical
                                    Designation (Title)</label>
                                <div class="relative">
                                    <i class="pi pi-pencil absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
                                    <input v-model="form.title" type="text"
                                        class="w-full bg-slate-50 border border-slate-100 p-6 pl-16 rounded-[1.5rem] text-sm font-bold uppercase tracking-tight focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all"
                                        placeholder="E.G. ALPH_CORE_2024">
                                </div>
                            </div>
                            <div class="space-y-3">
                                <label
                                    class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Audience
                                    Class (Category)</label>
                                <div class="relative">
                                    <i class="pi pi-users absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
                                    <select v-model="form.exam_category_id"
                                        class="w-full bg-slate-50 border border-slate-100 p-6 pl-16 rounded-[1.5rem] text-xs font-black uppercase tracking-widest focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all cursor-pointer appearance-none">
                                        <option :value="null" disabled>Select Evaluation Segment</option>
                                        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}
                                        </option>
                                    </select>
                                    <i class="pi pi-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- STEP 2: SKILLS SELECTION -->
            <div v-if="currentStep === 2"
                class="relative space-y-16 animate-in fade-in slide-in-from-right-12 duration-700">
                <!-- Decorative Background Elements -->
                <div
                    class="absolute -top-24 -left-24 w-96 h-96 bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none">
                </div>
                <div
                    class="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-accent/5 rounded-full blur-[120px] pointer-events-none">
                </div>

                <div class="text-center space-y-6 relative z-10">
                    <h2 class="text-4xl font-black text-slate-800 uppercase tracking-tighter">Cognitive Modules</h2>
                    <p
                        class="text-[12px] font-bold text-slate-400 uppercase tracking-[0.3em] max-w-xl mx-auto leading-relaxed">
                        Select the strategic domains to be synchronized for this assessment sequence.
                    </p>
                    <div class="flex justify-center mt-8">
                        <div
                            class="bg-white/50 backdrop-blur-md px-6 py-2 rounded-2xl border border-slate-100 flex items-center space-x-4 shadow-sm">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active
                                Sequence:</span>
                            <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">{{
                                form.selectedSkills.length }} Modules Synchronized</span>
                        </div>
                    </div>
                </div>

                <div class="max-w-2xl mx-auto space-y-4 relative z-10 pb-12">
                    <div v-for="skill in availableSkills" :key="skill.id"
                        class="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[2rem] hover:border-slate-200 transition-all shadow-sm group">
                        
                        <div class="flex items-center space-x-6">
                            <!-- Custom Checkbox -->
                            <div @click="toggleSkill(skill.id)" 
                                class="w-8 h-8 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all duration-300"
                                :class="isSkillSelected(skill.id) ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 group-hover:border-slate-300'">
                                <i v-if="isSkillSelected(skill.id)" class="pi pi-check text-[10px] font-black"></i>
                            </div>

                            <div @click="toggleSkill(skill.id)" class="cursor-pointer space-y-0.5">
                                <h4 class="text-sm font-black text-slate-800 tracking-tight uppercase">{{ skill.name }}</h4>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{{ skill.short_code || 'MODALITY' }}</p>
                            </div>
                        </div>

                        <!-- Compact Duration Control -->
                        <div v-if="isSkillSelected(skill.id)" 
                            class="flex items-center space-x-6 bg-slate-50/50 px-6 py-3 rounded-2xl border border-slate-100 animate-in slide-in-from-right-4 duration-500">
                            <div class="flex flex-col">
                                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Time Limit</span>
                                <div class="flex items-center space-x-4">
                                    <button @click.stop="setSkillDuration(skill.id, Math.max(5, getSkillDuration(skill.id) - 5))" 
                                        class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all">
                                        <i class="pi pi-minus text-[8px]"></i>
                                    </button>
                                    <span class="text-xs font-black text-slate-900 w-8 text-center tabular-nums">{{ getSkillDuration(skill.id) }}</span>
                                    <button @click.stop="setSkillDuration(skill.id, Math.min(120, getSkillDuration(skill.id) + 5))" 
                                        class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all">
                                        <i class="pi pi-plus text-[8px]"></i>
                                    </button>
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">min</span>
                                </div>
                            </div>
                        </div>

                        <div v-else class="pr-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span class="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Click to Synchronize</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- STEP 3: FINALIZE -->
            <div v-if="currentStep === 3" class="space-y-16 animate-in fade-in zoom-in-95 duration-700">
                <div class="text-center space-y-6">
                    <div
                        class="w-24 h-24 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-[2.5rem] mx-auto mb-10 text-4xl shadow-sm border border-emerald-100">
                        <i class="pi pi-check-circle"></i>
                    </div>
                    <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tight">Deployment Ready</h2>
                    <p
                        class="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-lg mx-auto leading-relaxed">
                        The exam shell is ready for initialization. You can add questions from the item bank after saving.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div class="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-10">
                        <h4
                            class="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-6">
                            Final Metadata Summary</h4>
                        <div class="space-y-6">
                            <div class="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <span class="text-[10px] font-black text-slate-400 uppercase">Assessment Title</span>
                                <span class="text-xs font-black text-slate-700 truncate max-w-[200px] uppercase">{{
                                    form.title }}</span>
                            </div>
                            
                            <div class="space-y-4">
                                <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Active Modalities</h5>
                                <div class="grid grid-cols-1 gap-3">
                                    <div v-for="selected in form.selectedSkills" :key="selected.skill_id" 
                                        class="flex justify-between items-center bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                                        <div class="flex items-center space-x-3">
                                            <span class="text-lg">{{ availableSkills.find(s => s.id === selected.skill_id)?.icon }}</span>
                                            <span class="text-[11px] font-black text-slate-700 uppercase">{{ availableSkills.find(s => s.id === selected.skill_id)?.name }}</span>
                                        </div>
                                        <span class="text-[10px] font-black text-brand-primary bg-white px-3 py-1 rounded-lg shadow-sm border border-brand-primary/10">{{ selected.duration }}m</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        class="bg-slate-800 p-12 rounded-[4rem] text-white flex flex-col justify-center text-center space-y-10 shadow-2xl shadow-slate-900/10">
                        <p class="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em]">Execution Phase</p>
                        <Button :label="isSubmitting ? 'PERSISTING DATA...' : 'INITIALIZE PROTOCOL ➜'"
                            :loading="isSubmitting" @click="saveExam"
                            class="bg-white border-none text-slate-900 font-black text-[11px] py-10 rounded-[2.5rem] shadow-2xl hover:bg-brand-accent hover:text-white transition-all transform hover:-translate-y-2 uppercase tracking-[0.2em]" />
                        <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest opacity-60">This action
                            will propagate the exam to all administrative endpoints</p>
                    </div>
                </div>
            </div>

            <!-- Guided Navigation Footer -->
            <div class="mt-24 flex items-center justify-between border-t border-slate-100 pt-16">
                <button v-if="currentStep > 1" @click="prevStep"
                    class="flex items-center space-x-3 text-slate-400 hover:text-slate-800 transition-colors group">
                    <i class="pi pi-angle-left text-xl group-hover:-translate-x-1 transition-transform"></i>
                    <span class="text-[10px] font-black uppercase tracking-widest">Return to Phase {{ currentStep - 1
                        }}</span>
                </button>
                <div v-else></div>

                <button v-if="currentStep < 3" @click="nextStep"
                    class="bg-brand-primary text-white px-12 py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-100 flex items-center space-x-4 transition-all hover:-translate-y-1 hover:shadow-brand-primary/10">
                    <span>Advance Sequence</span>
                    <i class="pi pi-angle-right text-xl"></i>
                </button>
            </div>

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
    from {
        opacity: 0;
        transform: translateY(-20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
