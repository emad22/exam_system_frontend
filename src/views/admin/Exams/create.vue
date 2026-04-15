<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Dialog from 'primevue/dialog';

const router = useRouter();
const route = useRoute();

const examId = ref(route.params.id || null);
const availableSkills = ref([]);
const languages = ref([]);
const currentStep = ref(1); // 1: Identity, 2: Skills, 3: Questions/Levels, 4: Review

const form = ref({
    title: '',
    description: '',
    language_id: null,
    exam_type: 'adult',
    passing_score: 60,
    is_adaptive: false,
    selectedSkills: [] 
});

// For Step 3: Local storage of questions being added
// Structure: { skillId: { levelNum: [questions] } }
const localQuestions = ref({}); 

const isSubmitting = ref(false);
const isLoading = ref(false);
const errorMsg = ref('');

const isEditMode = computed(() => !!examId.value);

onMounted(async () => {
    isLoading.value = true;
    try {
        const [langRes, skillRes] = await Promise.all([
            api.get('/admin/languages'),
            api.get('/admin/skills-with-levels')
        ]);
        
        languages.value = langRes.data;
        // Auto-select Arabic if it exists
        const arabic = languages.value.find(l => l.name.toLowerCase().includes('arab'));
        if (arabic) form.value.language_id = arabic.id;
        else if (languages.value.length > 0) form.value.language_id = languages.value[0].id;

        availableSkills.value = skillRes.data;
        
        if (isEditMode.value) {
            const examRes = await api.get(`/admin/exams/${examId.value}`);
            const exam = examRes.data;
            
            form.value = {
                title: exam.title,
                language_id: exam.language_id,
                exam_type: exam.exam_type || 'adult',
                passing_score: exam.passing_score ?? 60,
                is_adaptive: false,
                selectedSkills: exam.skills.map(skill => {
                    return {
                        skill_id: skill.id,
                        duration: skill.pivot.duration,
                        is_optional: !!skill.pivot.is_optional,
                        rules: [] // We'll manage questions directly now
                    };
                })
            };
        }
    } catch (err) {
        console.error('Failed to load pre-requisites', err);
        errorMsg.value = 'Failed to load exam data.';
    } finally {
        isLoading.value = false;
    }
});

const nextStep = () => {
    if (currentStep.value < 4) currentStep.value++;
};

const prevStep = () => {
    if (currentStep.value > 1) currentStep.value--;
};

const toggleSkill = (skillId) => {
    const idx = form.value.selectedSkills.findIndex(s => s.skill_id === skillId);
    if (idx === -1) {
        form.value.selectedSkills.push({ 
            skill_id: skillId, 
            duration: 30, 
            is_optional: false,
            rules: []
        });
        if (!localQuestions.value[skillId]) localQuestions.value[skillId] = {};
    } else {
        form.value.selectedSkills.splice(idx, 1);
    }
};

const isSkillSelected = (skillId) => {
    return form.value.selectedSkills.some(s => s.skill_id === skillId);
};

// Question Builder Logic
const activeSkillForQuestions = ref(null);
const activeLevelForQuestions = ref(null);
const showQuestionForm = ref(false);
const isPassageMode = ref(false);
const passageContent = ref('');

// Bank Selector Logic
const showBankModal = ref(false);
const bankQuestions = ref([]);
const bankLoading = ref(false);

const openBankSelector = async (skillId, levelNum) => {
    activeSkillForQuestions.value = skillId;
    activeLevelForQuestions.value = levelNum;
    showBankModal.value = true;
    bankLoading.value = true;
    
    try {
        const res = await api.get('/admin/questions', {
            params: { skill_id: skillId, difficulty_level: levelNum }
        });
        bankQuestions.value = res.data.data; // Assuming pagination structure
    } catch (err) {
        console.error('Failed to load bank questions', err);
    } finally {
        bankLoading.value = false;
    }
};

const isAlreadyAdded = (questionId) => {
    const questions = localQuestions.value[activeSkillForQuestions.value]?.[activeLevelForQuestions.value] || [];
    return questions.some(q => q.original_id === questionId);
};

const importQuestion = (q) => {
    if (isAlreadyAdded(q.id)) return;

    // Map existing question to our local format (duplicate without ID to force re-creation with new tag)
    const cloned = {
        type: q.type,
        content: q.content,
        points: q.points,
        passage_content: q.passage_content,
        passage_group_id: q.passage_group_id,
        passage_randomize: q.passage_randomize,
        options: q.options.map(o => ({ 
            option_text: o.option_text, 
            is_correct: o.is_correct 
        })),
        original_id: q.id // Keep track to prevent duplicates
    };
    
    if (!localQuestions.value[activeSkillForQuestions.value]) {
        localQuestions.value[activeSkillForQuestions.value] = {};
    }
    if (!localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value]) {
        localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value] = [];
    }
    
    localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value].push(cloned);
};

const newQuestion = ref({
    type: 'mcq',
    content: '',
    points: 1,
    options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false }
    ],
    passage_content: null,
    passage_group_id: null,
    passage_randomize: true
});

const openQuestionBuilder = (skillId, levelNum, isPassage = false) => {
    activeSkillForQuestions.value = skillId;
    activeLevelForQuestions.value = levelNum;
    isPassageMode.value = isPassage;
    passageContent.value = '';
    
    if (!localQuestions.value[skillId]) localQuestions.value[skillId] = {};
    if (!localQuestions.value[skillId][levelNum]) localQuestions.value[skillId][levelNum] = [];
    
    resetNewQuestion();
    showQuestionForm.value = true;
};

const resetNewQuestion = () => {
    newQuestion.value = {
        type: 'mcq',
        content: '',
        points: 1,
        options: [
            { option_text: '', is_correct: true },
            { option_text: '', is_correct: false }
        ],
        passage_content: isPassageMode.value ? passageContent.value : null,
        passage_group_id: currentGroupId.value || null,
        passage_randomize: true
    };
};

const addOption = () => {
    newQuestion.value.options.push({ option_text: '', is_correct: false });
};

const removeOption = (idx) => {
    if (newQuestion.value.options.length > 1) newQuestion.value.options.splice(idx, 1);
};

const generateGroupId = () => {
    return 'grp_' + Math.random().toString(36).substr(2, 9);
};

const currentGroupId = ref(null);

const commitQuestion = () => {
    if (!newQuestion.value.content) return;
    
    let sanitizedOptions = JSON.parse(JSON.stringify(newQuestion.value.options));
    
    // Auto-fill True/False if not explicitly clicked but type is set
    if (newQuestion.value.type === 'true_false' && sanitizedOptions[0].option_text === '') {
        sanitizedOptions = [
            { option_text: 'True', is_correct: true },
            { option_text: 'False', is_correct: false }
        ];
    }

    // Filter out completely empty options for MCQ
    if (newQuestion.value.type === 'mcq') {
        sanitizedOptions = sanitizedOptions.filter(o => o.option_text.trim() !== '');
    }

    // For short_answer, writing, speaking - options might be optional or handle keyword matching
    if (['writing', 'speaking', 'short_answer'].includes(newQuestion.value.type)) {
        if (sanitizedOptions.every(o => o.option_text === '')) {
            sanitizedOptions = []; // Send empty array if no keywords provided
        }
    }

    const questionToSave = {
        ...newQuestion.value,
        options: sanitizedOptions
    };

    if (isPassageMode.value) {
        if (!currentGroupId.value) currentGroupId.value = generateGroupId();
        questionToSave.passage_group_id = currentGroupId.value;
        questionToSave.passage_content = passageContent.value;
    }

    if (!localQuestions.value[activeSkillForQuestions.value]) {
        localQuestions.value[activeSkillForQuestions.value] = {};
    }
    if (!localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value]) {
        localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value] = [];
    }

    localQuestions.value[activeSkillForQuestions.value][activeLevelForQuestions.value].push(questionToSave);

    resetNewQuestion();
};

const finishPassage = () => {
    currentGroupId.value = null;
    showQuestionForm.value = false;
};

const removeLocalQuestion = (skillId, levelNum, idx) => {
    localQuestions.value[skillId][levelNum].splice(idx, 1);
};

const getTotalQuestions = () => {
    let total = 0;
    Object.values(localQuestions.value).forEach(skillLevels => {
        Object.values(skillLevels).forEach(questions => {
            total += questions.length;
        });
    });
    return total;
};

const saveExam = async () => {
    isSubmitting.value = true;
    errorMsg.value = '';
    
    try {
        // 1. Save all questions first
        for (const skillId in localQuestions.value) {
            for (const levelNum in localQuestions.value[skillId]) {
                const questions = localQuestions.value[skillId][levelNum];
                for (const q of questions) {
                    await api.post('/admin/questions', {
                        ...q,
                        skill_id: skillId,
                        difficulty_level: levelNum,
                        group_tag: form.value.title
                    });
                }
            }
        }

        // 2. Prepare Rules (quantity = count of questions we just added)
        const skillsWithRules = form.value.selectedSkills.map(s => {
            const rules = [];
            if (localQuestions.value[s.skill_id]) {
                Object.keys(localQuestions.value[s.skill_id]).forEach(lvlNum => {
                    const count = localQuestions.value[s.skill_id][lvlNum].length;
                    if (count > 0) {
                        rules.push({
                            difficulty_level: parseInt(lvlNum),
                            quantity: count,
                            group_tag: form.value.title,
                            randomize: true
                        });
                    }
                });
            }
            return {
                ...s,
                rules: rules
            };
        });

        const payload = {
            ...form.value,
            skills: skillsWithRules
        };

        if (isEditMode.value) {
            await api.patch(`/admin/exams/${examId.value}`, payload);
        } else {
            await api.post('/admin/exams', payload);
        }
        
        alert('Exam and associated questions saved successfully!');
        router.push('/admin/exams');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to initialize exam sequence.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
  <AdminLayout>
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-32 space-y-4">
        <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading exam details...</p>
    </div>
    
    <div v-else class="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">
        <!-- Header -->
        <div class="flex items-center justify-between mb-12">
            <div class="flex items-center space-x-6">
                <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/exams')" />
                <div>
                     <h1 class="text-3xl font-black text-slate-800 tracking-tight">{{ isEditMode ? 'Edit Exam' : 'Create Exam' }}</h1>
                     <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Guided Assessment Constructor</p>
                </div>
            </div>
            
            <!-- Stepper Indicator -->
            <div class="hidden lg:flex items-center space-x-4 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                <div v-for="s in 4" :key="s" class="flex items-center space-x-2">
                    <div :class="currentStep === s ? 'bg-indigo-600' : (currentStep > s ? 'bg-emerald-500' : 'bg-slate-100')" 
                         class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black transition-all">
                         <i v-if="currentStep > s" class="pi pi-check"></i>
                         <span v-else>{{ s }}</span>
                    </div>
                    <span v-if="s < 4" class="w-4 h-0.5 bg-slate-100"></span>
                </div>
            </div>
        </div>

        <div v-if="errorMsg" class="mb-8 bg-rose-50 border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest p-5 rounded-2xl">
            ⚠️ Sequence Error: {{ errorMsg }}
        </div>

        <!-- STEP 1: IDENTITY -->
        <div v-if="currentStep === 1" class="space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <div class="premium-card p-12 md:p-16 relative overflow-hidden">
                <div class="absolute -right-24 -top-24 w-64 h-64 bg-indigo-50/40 rounded-full blur-3xl"></div>
                <div class="relative z-10 space-y-12">
                    <div>
                        <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Step 1: Exam Identity</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Specify core assessment parameters</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div class="space-y-3">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Logical Designation (Exam Title)</label>
                            <input v-model="form.title" type="text" 
                                class="premium-input text-sm font-bold uppercase" 
                                placeholder="E.G. MIDTERM_ALPHAV1">
                        </div>
                        <div class="space-y-3">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Target Audience Stratum</label>
                            <select v-model="form.exam_type" class="premium-input text-xs font-black uppercase tracking-widest cursor-pointer">
                                <option value="adult">Adult (Professional Matrix)</option>
                                <option value="children">Children (Foundation Tier)</option>
                            </select>
                        </div>
                    </div>

                    <div class="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 flex items-center space-x-6">
                        <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                            <i class="pi pi-globe text-xl"></i>
                        </div>
                        <div>
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Language Context</p>
                            <p class="text-xs font-black text-slate-700 uppercase">Universal Arabic Assessment Protocol</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- STEP 2: SKILLS SELECTION -->
        <div v-if="currentStep === 2" class="space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
            <div class="flex flex-col md:flex-row justify-between items-end mb-4">
                 <div>
                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Step 2: Cognitive Modules</h3>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Select the skills to be evaluated in this exam</p>
                </div>
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100">
                    Selected: {{ form.selectedSkills.length }} Modules
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div v-for="skill in availableSkills" :key="skill.id" 
                     @click="toggleSkill(skill.id)"
                     :class="isSkillSelected(skill.id) ? 'border-indigo-600 bg-white ring-4 ring-indigo-500/5' : 'border-slate-50 bg-slate-50 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'"
                     class="group p-8 rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer text-center relative overflow-hidden">
                    <div v-if="isSkillSelected(skill.id)" class="absolute top-4 right-4 text-indigo-600">
                        <i class="pi pi-check-circle text-lg"></i>
                    </div>
                    <div :class="isSkillSelected(skill.id) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'" 
                         class="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm transform group-hover:scale-110 transition-transform">
                         {{ skill.icon || '🧠' }}
                    </div>
                    <h4 class="text-sm font-black uppercase tracking-tight">{{ skill.name }}</h4>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{{ skill.levels?.length || 0 }} Levels Available</p>
                </div>
            </div>
        </div>

        <!-- STEP 3: MATRIX & QUESTIONS -->
        <div v-if="currentStep === 3" class="space-y-12 animate-in fade-in slide-in-from-right-10 duration-500">
            <div class="flex flex-col md:flex-row justify-between items-end">
                <div>
                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Step 3: Level Configuration</h3>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure difficulty levels and add questions</p>
                </div>
            </div>

            <div v-if="form.selectedSkills.length === 0" class="p-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                <p class="text-xs font-black text-slate-400 uppercase tracking-widest italic">No skills selected. Return to Step 2 to proceed.</p>
            </div>

            <div v-else class="space-y-16">
                <div v-for="selected in form.selectedSkills" :key="selected.skill_id" class="space-y-8">
                    <div class="flex items-center space-x-4">
                        <div class="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                        <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">
                            {{ availableSkills.find(s => s.id === selected.skill_id)?.name }} Matrix
                        </h3>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div v-for="level in (availableSkills.find(s => s.id === selected.skill_id)?.levels || []).filter(l => l.is_active)" :key="level.id"
                             class="premium-card p-2 group relative overflow-hidden border border-slate-100 hover:border-indigo-200 transition-all">
                             
                             <div class="flex items-center space-x-6 p-6">
                                <div class="w-12 h-12 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <span class="text-[8px] font-black opacity-40">LVL</span>
                                    <span class="text-lg font-black leading-none">{{ level.level_number }}</span>
                                </div>
                                <div class="flex-1">
                                    <p class="text-[10px] font-black text-slate-800 uppercase tracking-tight">{{ level.name }}</p>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{{ localQuestions[selected.skill_id]?.[level.level_number]?.length || 0 }} Added</p>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <button @click="openQuestionBuilder(selected.skill_id, level.level_number)"
                                            class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"
                                            title="Add Single Question">
                                        <i class="pi pi-plus text-xs"></i>
                                    </button>
                                    <button @click="openQuestionBuilder(selected.skill_id, level.level_number, true)"
                                            class="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-all"
                                            title="Add Passage Group">
                                        <i class="pi pi-align-left text-xs"></i>
                                    </button>
                                    <button @click="openBankSelector(selected.skill_id, level.level_number)"
                                            class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"
                                            title="Import from Bank">
                                        <i class="pi pi-search text-xs"></i>
                                    </button>
                                </div>
                             </div>

                             <!-- List of questions inside the card -->
                             <div v-if="localQuestions[selected.skill_id]?.[level.level_number]?.length > 0" class="px-6 pb-6 space-y-2">
                                <div v-for="(q, qIdx) in localQuestions[selected.skill_id][level.level_number]" :key="qIdx" 
                                     :class="q.passage_group_id ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100 bg-slate-50'"
                                     class="flex justify-between items-center text-[9px] p-2 rounded-lg border">
                                    <div class="flex items-center space-x-2 truncate">
                                        <i v-if="q.passage_group_id" class="pi pi-link text-indigo-400 text-[8px]"></i>
                                        <span class="font-bold text-slate-600 truncate">{{ q.content }}</span>
                                    </div>
                                    <button @click="removeLocalQuestion(selected.skill_id, level.level_number, qIdx)" class="text-rose-500">
                                        <i class="pi pi-trash text-[8px]"></i>
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- STEP 4: REVIEW -->
        <div v-if="currentStep === 4" class="space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <div class="premium-card p-12 md:p-16 text-center space-y-12">
                 <div>
                    <h3 class="text-3xl font-black text-slate-800 uppercase tracking-tight">Step 4: Review Sequence</h3>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Final validation of the assessment structure</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    <div class="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Exam Model</p>
                        <p class="text-xl font-black text-slate-800 uppercase mt-1">{{ form.title || 'UNNAMED_ASSET' }}</p>
                    </div>
                    <div class="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100">
                        <p class="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Active Modules</p>
                        <p class="text-xl font-black text-indigo-600 uppercase mt-1">{{ form.selectedSkills.length }} Selected</p>
                    </div>
                    <div class="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100">
                        <p class="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Total Inventory</p>
                        <p class="text-xl font-black text-emerald-600 uppercase mt-1">{{ getTotalQuestions() }} Unique Items</p>
                    </div>
                </div>

                <div class="pt-12">
                    <Button :label="isSubmitting ? 'SYNCHRONIZING...' : 'INITIALIZE PROTOCOL ➜'" 
                           :loading="isSubmitting" 
                           size="large" 
                           @click="saveExam" 
                           class="w-full md:w-auto px-20 block mx-auto" />
                </div>
            </div>
        </div>

        <!-- Footer Navigation -->
        <div class="mt-16 flex items-center justify-between border-t border-slate-100 pt-10">
            <Button v-if="currentStep > 1" label="Previous" icon="pi pi-arrow-left" severity="secondary" outlined @click="prevStep" />
            <div v-else class="w-10"></div>
            
            <Button v-if="currentStep < 4" label="Next Sequence" icon="pi pi-arrow-right" iconPos="right" @click="nextStep" />
        </div>

        <!-- Question Builder Modal -->
        <Dialog v-model:visible="showQuestionForm" 
               :header="isPassageMode ? 'Passage Group Constructor' : 'Add New Cognitive Item'" 
               class="max-w-2xl w-full" 
               modal 
               :closable="!isPassageMode">
            <div class="space-y-8 p-6">
                <!-- Passage Content Area -->
                <div v-if="isPassageMode" class="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <div class="flex justify-between items-center">
                        <label class="block text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">📖 Shared Passage Content</label>
                        <div class="flex items-center space-x-2">
                             <input type="checkbox" v-model="newQuestion.passage_randomize" class="w-4 h-4 rounded">
                             <span class="text-[8px] font-black text-slate-400 uppercase">Randomize Internal Order</span>
                        </div>
                    </div>
                    <textarea v-model="passageContent" rows="5" class="premium-input text-sm bg-white" placeholder="Enter the main passage/text here..."></textarea>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                        <select v-model="newQuestion.type" class="premium-input text-xs uppercase cursor-pointer">
                            <option value="mcq">MCQ (Multiple Choice)</option>
                            <option value="true_false">True / False</option>
                            <option value="short_answer">Short Answer</option>
                        </select>
                    </div>
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Difficulty Points</label>
                        <InputNumber v-model="newQuestion.points" :min="1" class="w-full" inputClass="font-black p-3" />
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Content</label>
                    <textarea v-model="newQuestion.content" rows="3" class="premium-input text-sm resize-none" :placeholder="isPassageMode ? 'Enter a question related to the passage above...' : ''"></textarea>
                </div>

                <!-- MCQ Options -->
                <div v-if="newQuestion.type === 'mcq'" class="space-y-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Choice Matrix</label>
                        <button @click="addOption" class="text-indigo-600 text-[10px] font-black uppercase">+ Add Choice</button>
                    </div>
                    <div v-for="(opt, idx) in newQuestion.options" :key="idx" class="flex items-center space-x-3">
                        <div class="flex-1 relative">
                            <input v-model="opt.option_text" type="text" 
                                   class="premium-input text-xs pr-12" 
                                   :placeholder="'Choice ' + (idx + 1)">
                            <div class="absolute right-4 top-1/2 -translate-y-1/2">
                                <input type="checkbox" v-model="opt.is_correct" 
                                       class="w-5 h-5 text-indigo-600 rounded-lg cursor-pointer"
                                       title="Mark as correct">
                            </div>
                        </div>
                        <button v-if="newQuestion.options.length > 2" @click="removeOption(idx)" class="text-rose-400 hover:text-rose-600">
                            <i class="pi pi-minus-circle text-lg"></i>
                        </button>
                    </div>
                </div>

                <!-- True / False Options (Only 2) -->
                <div v-if="newQuestion.type === 'true_false'" class="flex space-x-4">
                    <div @click="newQuestion.options = [{option_text: 'True', is_correct: true}, {option_text: 'False', is_correct: false}]" 
                         :class="newQuestion.options[0]?.is_correct ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'"
                         class="flex-1 p-4 rounded-xl text-center font-black text-xs cursor-pointer transition-all">
                         TRUE
                    </div>
                    <div @click="newQuestion.options = [{option_text: 'True', is_correct: false}, {option_text: 'False', is_correct: true}]" 
                         :class="newQuestion.options[1]?.is_correct ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'"
                         class="flex-1 p-4 rounded-xl text-center font-black text-xs cursor-pointer transition-all">
                         FALSE
                    </div>
                </div>

                <div class="pt-6 border-t border-slate-50 flex space-x-4">
                    <Button :label="isPassageMode ? 'Add to Group' : 'Commit Item to Level'" icon="pi pi-check" size="large" class="flex-1" @click="commitQuestion" />
                    <Button v-if="isPassageMode" label="Finish Group" icon="pi pi-flag" severity="secondary" outlined size="large" @click="finishPassage" />
                </div>
            </div>
        </Dialog>

        <!-- Question Bank Selector Modal -->
        <Dialog v-model:visible="showBankModal" 
               header="Question Bank Repository" 
               class="max-w-4xl w-full" 
               modal>
            <div class="space-y-6 p-4">
                <div class="flex justify-between items-center mb-4">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Available items for this module sequence
                    </p>
                    <div v-if="bankQuestions.length > 0" class="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">
                        {{ bankQuestions.length }} Items Found
                    </div>
                </div>

                <div v-if="bankLoading" class="flex flex-col items-center py-20 animate-pulse">
                    <i class="pi pi-spin pi-spinner text-4xl text-indigo-600 mb-4"></i>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Neural Repository...</p>
                </div>

                <div v-else-if="bankQuestions.length === 0" class="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                    <p class="text-xs font-black text-slate-400 uppercase tracking-widest">No existing items found for this level in the bank.</p>
                </div>

                <div v-else class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    <div v-for="bq in bankQuestions" :key="bq.id" 
                         class="group bg-white p-6 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all flex justify-between items-center">
                        <div class="space-y-1 pr-10">
                            <div class="flex items-center space-x-3 mb-1">
                                <span class="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest">{{ bq.type }}</span>
                                <span class="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{{ bq.points }} Points</span>
                                <span v-if="bq.passage_group_id" class="text-[8px] font-black text-amber-500 uppercase tracking-widest">Passage Linked</span>
                            </div>
                            <h5 class="text-xs font-bold text-slate-700 leading-relaxed">{{ bq.content }}</h5>
                        </div>
                        <button @click="importQuestion(bq)" 
                                :disabled="isAlreadyAdded(bq.id)"
                                :class="isAlreadyAdded(bq.id) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'"
                                class="shrink-0 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
                            {{ isAlreadyAdded(bq.id) ? 'Added ✓' : 'Import +' }}
                        </button>
                    </div>
                </div>

                <div class="pt-6 border-t border-slate-50 flex justify-end">
                    <Button label="Close Repository" icon="pi pi-times" severity="secondary" outlined @click="showBankModal = false" />
                </div>
            </div>
        </Dialog>
    </div>
  </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
