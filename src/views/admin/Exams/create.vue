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
import Card from 'primevue/card';
import { useModal } from '@/composables/useModal';

const router = useRouter();
const route = useRoute();

const { showAlert, showConfirm } = useModal();

const examId = ref(route.params.id || null);
const availableSkills = ref([]);
const languages = ref([]);
const categories = ref([]);
const currentStep = ref(1); // 1: Identity, 2: Skills, 3: Finalize
const activeSkillTab = ref(null);

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

// Translation Dictionary
const t = {
    ar: {
        activeSystem: "نظام إعداد الاختبارات النشط",
        createExam: "إنشاء اختبار جديد",
        editExam: "تعديل الاختبار",
        stepText: "الخطوة {step} من 3: {stepName}",
        stepNames: {
            1: "إعدادات الهوية",
            2: "تحديد المهارات",
            3: "المراجعة والحفظ"
        },
        sequenceError: "خطأ في التسلسل والتهيئة الأساسية:",
        examDetails: "تفاصيل وهوية الاختبار",
        examDetailsDesc: "أدخل عنوان الاختبار والتصنيف العام المناسب لإعداد المعايير.",
        examTitleLabel: "عنوان الاختبار الأكاديمي",
        enterExamTitle: "أدخل عنوان الاختبار...",
        examCategoryLabel: "تصنيف الاختبار",
        selectCategory: "اختر تصنيف الاختبار...",
        descriptionLabel: "الوصف التفصيلي للاختبار (اختياري)",
        enterDescription: "أدخل وصفاً أو ملاحظات توضيحية لهذا الاختبار الأكاديمي",
        examSubjects: "المهارات والموضوعات المشمولة",
        examSubjectsDesc: "حدد المهارات والمواد المطلوب إدراجها لقياس أداء المرشحين.",
        selectedSubjects: "الموضوعات النشطة:",
        subjectsCountSelected: "مهارات محددة بالباقة",
        clickToSelect: "انقر للتحديد وتعديل المعايير",
        duration: "المدة الزمنية",
        minutes: "دقيقة",
        maxPoints: "الحد الأقصى للنقاط",
        ptsCap: "نقطة كحد أقصى",
        readyToSave: "تأكيد وحفظ بنية الاختبار",
        readyToSaveDesc: "تم إعداد البنية الأساسية بنجاح، يمكنك إدارة وبناء الأسئلة التفصيلية فور الحفظ.",
        examSummary: "ملخص هيكل الاختبار",
        saveExam: "حفظ وتأكيد الاختبار",
        saving: "جاري الحفظ والتهيئة...",
        saveBtnText: "حفظ وتأكيد الاختبار ➜",
        saveBtnTextEdit: "تحديث وتأكيد التعديلات ➜",
        saveDesc: "سيقوم هذا بحفظ اختبارك والعودة لإدارة الاختبارات للبدء ببناء بنك الأسئلة والمهام.",
        backToStep: "العودة للخطوة",
        nextStep: "الخطوة التالية",
        validationWarning: "يرجى إدخال عنوان الاختبار وتحديد التصنيف المناسب للمتابعة.",
        validationTitle: "تنبيه التحقق",
        successMsg: "تم حفظ الاختبار وتأكيد البنية بنجاح!"
    },
    en: {
        activeSystem: "Active Exam Configurator",
        createExam: "Create Exam",
        editExam: "Edit Exam",
        stepText: "Step {step} of 3: {stepName}",
        stepNames: {
            1: "Identity Settings",
            2: "Skills Alignment",
            3: "Review & Save"
        },
        sequenceError: "Sequence Error & Initialization failure:",
        examDetails: "Exam Details & Identity",
        examDetailsDesc: "Enter the title and category for the exam setup.",
        examTitleLabel: "Academic Exam Title",
        enterExamTitle: "Enter Exam Title...",
        examCategoryLabel: "Exam Category",
        selectCategory: "Select Exam Category...",
        descriptionLabel: "Detailed Exam Description (Optional)",
        enterDescription: "Enter a brief descriptive note for this academic exam",
        examSubjects: "Included Skills & Subjects",
        examSubjectsDesc: "Select the subjects to be included in this assessment package.",
        selectedSubjects: "Active Subjects:",
        subjectsCountSelected: "Skills Selected",
        clickToSelect: "Click to Select & Config",
        duration: "Duration",
        minutes: "min",
        maxPoints: "Max Points",
        ptsCap: "pts cap",
        readyToSave: "Commit & Save Exam Structure",
        readyToSaveDesc: "The general exam structure has been provisioned. You can manage questions right after saving.",
        examSummary: "Exam Structure Summary",
        saveExam: "Save Exam Details",
        saving: "Saving configuration...",
        saveBtnText: "SAVE EXAM DETAILS ➜",
        saveBtnTextEdit: "UPDATE EXAM DETAILS ➜",
        saveDesc: "This will commit the exam and return you to the dashboard directory to manage question papers.",
        backToStep: "Back to Step",
        nextStep: "Next Step",
        validationWarning: "Please provide an Exam Title and select a Category to proceed.",
        validationTitle: "Validation Warning",
        successMsg: "Exam saved successfully!"
    }
};

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
                is_adaptive: false,
                selectedSkills: exam.skills.map(skill => {
                    return {
                        skill_id: skill.id,
                        duration: skill.pivot.duration,
                        is_optional: !!skill.pivot.is_optional,
                        max_points: skill.pivot.max_points || 0,
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
        errorMsg.value = 'Failed to synchronize with administrative services.';
        showAlert(currentLang.value === 'ar' ? 'خطأ' : 'Error', errorMsg.value);
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
            showAlert(t[currentLang.value].validationWarning, t[currentLang.value].validationTitle, 'warning');
            return;
        }
    }
    if (currentStep.value < 3) currentStep.value++;
};
const prevStep = () => { if (currentStep.value > 1) currentStep.value--; };

const toggleSkill = (skillId) => {
    const idx = form.value.selectedSkills.findIndex(s => s.skill_id === skillId);
    if (idx === -1) {
        form.value.selectedSkills.push({ skill_id: skillId, duration: 30, is_optional: false, max_points: 0 });
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
    const name = (skill.name || '').toLowerCase();
    const isProductive = ['W', 'S', 'WR', 'SP', 'WRIT', 'SPEAK', 'WRITING', 'SPEAKING'].includes(code)
        || name.includes('writ') || name.includes('speak');
    return !isProductive;
};

const openLevelManager = async (skill) => {
    editingSkill.value = skill;
    showLevelModal.value = true;
    try {
        const res = await api.get('/admin/levels', { params: { skill_id: skill.id } });
        editingLevels.value = res.data;
    } catch (err) {
        showAlert('Failed to query level matrix.', 'Level Error', 'error');
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
        showAlert('Matrix Updated. Cognitive tiers redistributed.', 'Success', 'success');
    } catch (err) {
        showAlert('Failed to propagate levels.', 'Sync Failure', 'error');
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
    showAlert('The attached audio protocol failed to initialize.', 'Audio Error', 'error');
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
            is_optional: s.is_optional,
            max_points: s.max_points || 0,
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

        showAlert(t[currentLang.value].successMsg, currentLang.value === 'ar' ? 'تمت العملية' : 'Success', 'success');
        router.push('/admin/exams');
    } catch (err) {
        showAlert('Failed to save exam.', 'Save Error', 'error');
    } finally { isSubmitting.value = false; }
};
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-40">
                <div class="w-16 h-16 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin mb-8"></div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Loading...</p>
            </div>

            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20 mt-6 px-4">
                
                <!-- Unified Premium Header Card -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 flex items-center gap-6">
                        <Button :icon="currentLang === 'ar' ? 'pi pi-arrow-right' : 'pi pi-arrow-left'" severity="secondary" outlined rounded @click="router.push('/admin/exams')" class="w-12 h-12 flex items-center justify-center border border-slate-200 hover:border-slate-300 shadow-sm bg-white" />
                        <div>
                            <div class="flex items-center gap-2 text-xs font-extrabold text-brand-primary uppercase tracking-wider">
                                <i class="pi pi-sparkles text-brand-accent animate-pulse"></i>
                                <span>{{ t[currentLang].activeSystem }}</span>
                            </div>
                            <h1 class="text-2xl font-black text-slate-800 tracking-tight leading-tight mt-1">
                                {{ isEditMode ? t[currentLang].editExam : t[currentLang].createExam }}
                            </h1>
                            <p class="text-xs font-bold text-slate-400 mt-0.5">
                                {{ t[currentLang].stepText.replace('{step}', currentStep).replace('{stepName}', t[currentLang].stepNames[currentStep]) }}
                            </p>
                        </div>
                    </div>

                    <!-- Step Tracker capsules -->
                    <div class="flex items-center space-x-2 bg-slate-50/50 px-5 py-3.5 rounded-2xl border border-slate-100 relative z-10 rtl:space-x-reverse">
                        <div v-for="s in 3" :key="s" class="flex items-center">
                            <div :class="currentStep === s ? 'bg-brand-primary text-white shadow-lg shadow-rose-100 scale-110' : (currentStep > s ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300')"
                                class="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black transition-all duration-500">
                                <i v-if="currentStep > s" class="pi pi-check text-[8px]"></i>
                                <span v-else>{{ s }}</span>
                            </div>
                            <div v-if="s < 3" class="w-8 h-1 bg-slate-100 mx-1.5 rounded-full overflow-hidden">
                                <div :class="currentStep > s ? 'w-full' : 'w-0'" class="h-full bg-emerald-400 transition-all duration-700"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="errorMsg" class="p-6 bg-rose-50 border border-rose-100 text-rose-500 text-xs font-black rounded-[1.5rem] flex items-center gap-4">
                    <span class="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center select-none font-bold">!</span>
                    <span>{{ t[currentLang].sequenceError }} {{ errorMsg }}</span>
                </div>

                <form @submit.prevent class="max-w-5xl mx-auto">
                    
                    <!-- STEP 1: IDENTITY -->
                    <div v-if="currentStep === 1" class="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <Card class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
                            <template #content>
                                <div class="p-8 md:p-10 space-y-8">
                                    <div class="flex items-center gap-3 pb-4 border-b border-slate-50">
                                        <div class="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-md shadow-rose-200">
                                            <i class="pi pi-file text-sm"></i>
                                        </div>
                                        <div>
                                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">{{ t[currentLang].examDetails }}</h3>
                                            <p class="text-[10px] font-bold text-slate-400 mt-1">{{ t[currentLang].examDetailsDesc }}</p>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <!-- Title input -->
                                        <div class="flex flex-col space-y-1.5">
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].examTitleLabel }}</label>
                                            <div class="relative">
                                                <i :class="[currentLang === 'ar' ? 'right-4' : 'left-4', 'pi pi-pencil absolute top-1/2 -translate-y-1/2 text-slate-300']"></i>
                                                <InputText v-model="form.title" type="text"
                                                    :class="[currentLang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4', 'w-full rounded-xl bg-slate-50 border-slate-100 focus:bg-white transition-all shadow-sm font-bold uppercase tracking-tight']"
                                                    :placeholder="t[currentLang].enterExamTitle" />
                                            </div>
                                        </div>

                                        <!-- Category select -->
                                        <div class="flex flex-col space-y-1.5">
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].examCategoryLabel }}</label>
                                            <div class="relative">
                                                <i :class="[currentLang === 'ar' ? 'right-4' : 'left-4', 'pi pi-users absolute top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none']"></i>
                                                <select v-model="form.exam_category_id"
                                                    :class="[currentLang === 'ar' ? 'pr-12 pl-10' : 'pl-12 pr-10', 'w-full bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs font-black uppercase tracking-wider focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all cursor-pointer appearance-none shadow-sm']">
                                                    <option :value="null" disabled>{{ t[currentLang].selectCategory }}</option>
                                                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                                                </select>
                                                <i :class="[currentLang === 'ar' ? 'left-4' : 'right-4', 'pi pi-chevron-down absolute top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none']"></i>
                                            </div>
                                        </div>

                                        <!-- Description textarea -->
                                        <div class="md:col-span-2 flex flex-col space-y-1.5">
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].descriptionLabel }}</label>
                                            <div class="relative">
                                                <i :class="[currentLang === 'ar' ? 'right-4' : 'left-4', 'pi pi-align-left absolute top-5 text-slate-300']"></i>
                                                <textarea v-model="form.description" rows="3"
                                                    :class="[currentLang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4', 'w-full bg-slate-50 border border-slate-100 p-4.5 rounded-xl text-sm font-bold tracking-tight focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all shadow-sm']"
                                                    :placeholder="t[currentLang].enterDescription"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Card>
                    </div>

                    <!-- STEP 2: SKILLS SELECTION -->
                    <div v-if="currentStep === 2" class="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div class="text-center space-y-2 py-4">
                            <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tight">{{ t[currentLang].examSubjects }}</h2>
                            <p class="text-xs font-bold text-slate-400 max-w-xl mx-auto leading-relaxed">{{ t[currentLang].examSubjectsDesc }}</p>
                            
                            <div class="flex justify-center pt-2">
                                <div class="bg-white/70 backdrop-blur-md px-5 py-2 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm">
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider">{{ t[currentLang].selectedSubjects }}</span>
                                    <span class="text-[9px] font-black text-brand-primary uppercase bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100/60 shadow-inner">
                                        {{ form.selectedSkills.length }} {{ t[currentLang].subjectsCountSelected }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Subjects Listing Matrix -->
                        <div class="space-y-3">
                            <div v-for="skill in availableSkills" :key="skill.id"
                                class="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 bg-white border border-slate-100 rounded-[2rem] hover:border-rose-200 transition-all shadow-sm group hover:-translate-y-0.5 duration-300 gap-4">
                                
                                <div class="flex items-center gap-4">
                                    <!-- Custom Checkbox -->
                                    <div @click="toggleSkill(skill.id)" 
                                        class="w-7 h-7 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-300 shrink-0"
                                        :class="isSkillSelected(skill.id) ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 group-hover:border-slate-300'">
                                        <i v-if="isSkillSelected(skill.id)" class="pi pi-check text-[9px] font-black"></i>
                                    </div>

                                    <div @click="toggleSkill(skill.id)" class="cursor-pointer">
                                        <h4 class="text-sm font-black text-slate-800 tracking-tight uppercase leading-tight">{{ skill.name }}</h4>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{{ skill.short_code || 'SUBJECT' }}</p>
                                    </div>
                                </div>

                                <!-- Compact Duration + Max Points Control -->
                                <div v-if="isSkillSelected(skill.id)"
                                    class="flex items-center gap-6 bg-slate-50/50 px-4 py-3 rounded-2xl border border-slate-100/70 animate-in slide-in-from-bottom-2 duration-300 self-start md:self-auto w-full md:w-auto overflow-hidden">
                                    
                                    <!-- Duration -->
                                    <div class="flex flex-col">
                                        <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{{ t[currentLang].duration }}</span>
                                        <div class="flex items-center gap-2">
                                            <button type="button" @click.stop="setSkillDuration(skill.id, Math.max(5, getSkillDuration(skill.id) - 5))"
                                                class="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-950 hover:bg-white rounded-md border border-transparent hover:border-slate-100 transition-all shadow-sm">
                                                <i class="pi pi-minus text-[7px] font-black"></i>
                                            </button>
                                            <span class="text-xs font-black text-slate-900 w-8 text-center tabular-nums leading-none">{{ getSkillDuration(skill.id) }}</span>
                                            <button type="button" @click.stop="setSkillDuration(skill.id, Math.min(120, getSkillDuration(skill.id) + 5))"
                                                class="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-950 hover:bg-white rounded-md border border-transparent hover:border-slate-100 transition-all shadow-sm">
                                                <i class="pi pi-plus text-[7px] font-black"></i>
                                            </button>
                                            <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].minutes }}</span>
                                        </div>
                                    </div>

                                    <!-- Max Points — only for non-leveled (Writing/Speaking) skills -->
                                    <div v-if="!isLeveledSkill(skill)" class="flex flex-col border-l border-slate-150 pl-4 pr-4 border-r-0 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4">
                                        <span class="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">{{ t[currentLang].maxPoints }}</span>
                                        <div class="flex items-center gap-1.5">
                                            <input type="number" min="0" step="10"
                                                :value="form.selectedSkills.find(s => s.skill_id === skill.id)?.max_points || 0"
                                                @input="e => { const s = form.selectedSkills.find(x => x.skill_id === skill.id); if(s) s.max_points = parseInt(e.target.value) || 0; }"
                                                class="w-16 h-6.5 text-center text-xs font-black text-indigo-600 bg-white border-2 border-indigo-50 rounded-xl focus:border-indigo-300 outline-none transition-all" />
                                            <span class="text-[8px] font-black text-slate-400 uppercase">{{ t[currentLang].ptsCap }}</span>
                                        </div>
                                    </div>
                                </div>

                                <div v-else class="hidden md:block pr-4 pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">{{ t[currentLang].clickToSelect }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 3: FINALIZE -->
                    <div v-if="currentStep === 3" class="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div class="text-center space-y-3 py-4">
                            <div class="w-16 h-16 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-2xl mx-auto mb-4 text-2xl shadow-sm border border-emerald-100">
                                <i class="pi pi-check-circle animate-bounce"></i>
                            </div>
                            <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tight">{{ t[currentLang].readyToSave }}</h2>
                            <p class="text-xs font-bold text-slate-400 max-w-md mx-auto leading-relaxed">{{ t[currentLang].readyToSaveDesc }}</p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <!-- Summary list -->
                            <Card class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
                                <template #content>
                                    <div class="p-8 space-y-6">
                                        <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4">
                                            {{ t[currentLang].examSummary }}
                                        </h4>
                                        <div class="space-y-4">
                                            <div class="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                                                <span class="text-[9px] font-black text-slate-400 uppercase">{{ t[currentLang].examTitleLabel }}</span>
                                                <span class="text-xs font-black text-slate-700 truncate max-w-[220px] uppercase">{{ form.title }}</span>
                                            </div>
                                            
                                            <div class="space-y-2">
                                                <h5 class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].selectedSubjects }}</h5>
                                                <div class="grid grid-cols-1 gap-2">
                                                    <div v-for="selected in form.selectedSkills" :key="selected.skill_id"
                                                        class="flex justify-between items-center bg-rose-50/10 p-3.5 rounded-xl border border-rose-100/40">
                                                        <div class="flex items-center gap-2">
                                                            <span class="text-xs font-black text-slate-700 uppercase">{{ availableSkills.find(s => s.id === selected.skill_id)?.name }}</span>
                                                        </div>
                                                        <div class="flex items-center gap-1.5">
                                                            <span class="text-[8px] font-black text-brand-primary bg-white px-2 py-0.5 rounded border border-rose-100 shadow-sm">{{ selected.duration }}{{ t[currentLang].minutes }}</span>
                                                            <span v-if="!isLeveledSkill(availableSkills.find(s => s.id === selected.skill_id))"
                                                                class="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                {{ selected.max_points || 0 }} {{ t[currentLang].ptsCap }}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </Card>

                            <!-- Save Call to Action Card -->
                            <Card class="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-slate-900 text-white relative flex flex-col justify-center min-h-[300px]">
                                <div class="absolute right-0 top-0 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl"></div>
                                <template #content>
                                    <div class="p-8 md:p-10 space-y-6 text-center relative z-10 flex flex-col justify-between h-full">
                                        <div class="space-y-1">
                                            <p class="text-[9px] font-black text-rose-300 uppercase tracking-[0.3em]">{{ t[currentLang].saveExam }}</p>
                                            <p class="text-[10px] font-bold text-slate-400 max-w-xs mx-auto leading-relaxed">{{ t[currentLang].saveDesc }}</p>
                                        </div>
                                        
                                        <Button :label="isSubmitting ? t[currentLang].saving : (isEditMode ? t[currentLang].saveBtnTextEdit : t[currentLang].saveBtnText)"
                                            :loading="isSubmitting" @click="saveExam"
                                            class="w-full bg-white border-none text-slate-900 font-black text-xs py-5.5 rounded-2xl shadow-xl hover:bg-brand-primary hover:text-white transition-all transform hover:-translate-y-1 uppercase tracking-wider" />
                                    </div>
                                </template>
                            </Card>
                        </div>
                    </div>

                    <!-- Guided Navigation Footer -->
                    <div class="mt-16 flex items-center justify-between border-t border-slate-100/80 pt-10">
                        <button type="button" v-if="currentStep > 1" @click="prevStep"
                            class="flex items-center gap-2.5 text-slate-400 hover:text-slate-950 transition-colors group">
                            <i :class="[currentLang === 'ar' ? 'pi-angle-right group-hover:translate-x-1' : 'pi-angle-left group-hover:-translate-x-1', 'pi text-lg transition-transform']"></i>
                            <span class="text-[10px] font-black uppercase tracking-widest">{{ t[currentLang].backToStep }} {{ currentStep - 1 }}</span>
                        </button>
                        <div v-else></div>

                        <button type="button" v-if="currentStep < 3" @click="nextStep"
                            class="bg-brand-primary text-white px-10 py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 flex items-center gap-3.5 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-primary/10">
                            <span>{{ t[currentLang].nextStep }}</span>
                            <i :class="[currentLang === 'ar' ? 'pi-angle-left' : 'pi-angle-right', 'pi text-lg']"></i>
                        </button>
                    </div>

                </form>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.arabic-theme {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

:deep(.p-card-body) {
    padding: 0;
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
