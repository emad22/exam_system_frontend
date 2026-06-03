<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useAdminStore } from '@/stores/admin';
import { useModal } from '@/composables/useModal';
import { useMediaUrl } from '@/composables/useMediaUrl';

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

const router = useRouter();
const vTooltip = Tooltip;
const questions = ref([]);
const first = ref(0);
const { showAlert, showConfirm } = useModal();
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

// Preview & Duplicate state
const showPreviewModal = ref(false);
const previewQuestion = ref(null);
const isLoadingPreview = ref(false);
const isDuplicating = ref(false);

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'en');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

// View Mode State
const viewMode = ref(localStorage.getItem('questions_view_mode') || 'table');
const setViewMode = (mode) => {
    viewMode.value = mode;
    localStorage.setItem('questions_view_mode', mode);
};

const t = {
    ar: {
        loading: "جاري تحميل بنك الأسئلة الشامل...",
        title: "بنك الأسئلة الشامل",
        subtitle: "تصميم وإدارة عناصر الأسئلة الإدراكية والتكيفية، وتوزيعها عبر المستويات والمهارات المختلفة",
        createBtn: "سؤال جديد",
        levelGuides: "أدلة المستويات",
        placeholderSearch: "البحث بنص السؤال أو الكلمات المفتاحية...",
        colId: "#",
        colQuestionContent: "نص السؤال ومحتواه",
        colType: "نوع السؤال",
        colLevel: "المستوى",
        colSkill: "المهارة",
        colPoints: "النقاط",
        colAuthorship: "المنشئ والمحرر",
        colActions: "إجراءات",
        emptyTelemetry: "لا توجد أسئلة مسجلة مطابقة لمعايير البحث الحالية...",
        confirmDelete: "حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء لاحقاً.",
        deleted: "تم الحذف",
        questionRemoved: "تم حذف السؤال بنجاح من بنك الأسئلة.",
        error: "خطأ",
        failedDelete: "فشل حذف السؤال.",
        duplicateQuestion: "تم نسخ السؤال بنجاح",
        previewQuestion: "معاينة السؤال",
        cognitiveAssets: "عنصر معرفي مدار",
        allExams: "جميع الاختبارات",
        allSkills: "كل المهارات",
        allTypes: "جميع الأنواع",
        allLevels: "جميع المستويات",
        examFilter: "الاختبار",
        skillFilter: "المهارة",
        typeFilter: "النوع",
        levelFilter: "المستوى",
        resetFilters: "إعادة ضبط الفلاتر",
        zeroResults: "لم يتم العثور على نتائج",
        adjustFilters: "يرجى تعديل معايير البحث أو التصفية للتضييق والوصول لما تريد",
        clearParams: "تصفية الفلاتر والبحث",
        system: "النظام",
        lastEditedBy: "آخر تعديل بواسطة",
        noTextContent: "لا يوجد محتوى نصي",
        levelGuidesTitle: "أدلة مستويات القياس",
        levelGuidesSubtitle: "تخصيص الإرشادات والنصوص والملفات الصوتية التوجيهية لكل مستوى تكيفي",
        textualGuidance: "التوجيه والنصوص الإرشادية للطلاب",
        textualGuidancePlaceholder: "اكتب هنا الإرشادات التي تظهر للطلاب عند دخول هذا المستوى التكيفي...",
        audioNarration: "التوجيه الصوتي / الملفات الصوتية المرفقة",
        noAudio: "لا يتوفر ملف توجيه صوتي مسجل حالياً للمستوى.",
        uploadAudio: "رفع ملف صوتي",
        changeAudio: "تغيير الملف الصوتي",
        audioSelected: "تم تحديد ملف صوتي جديد للرفع:",
        appliedChangesMsg: "تطبيق التغييرات فورياً على جميع الطلاب المسجلين في هذا المستوى.",
        discard: "إلغاء وتجاهل",
        pushChanges: "حفظ وتطبيق التغييرات",
        
        // Redesign labels
        statsTitle: "نظرة عامة على البيانات",
        statsTotalQuestions: "إجمالي بنك الأسئلة",
        statsMcqCount: "أسئلة الاختيار من متعدد",
        statsInteractiveCount: "الأسئلة الشفهية/التعبيرية",
        statsAvgPoints: "متوسط نقاط الصعوبة",
        viewTable: "عرض جدول",
        viewGrid: "عرض كروت",
        questionDetail: "تفاصيل السؤال",
        passageAssoc: "النص المرتبط",
        notSpecified: "غير محدد",
        pointsLabel: "نقاط",
        createdByLabel: "أنشئ بواسطة",
        updatedByLabel: "عدل بواسطة",
        activeTier: "المستوى النشط",
        selectLevelPrompt: "يرجى اختيار مستوى من القائمة لتعديله",
        searchLabel: "بحث",
    },
    en: {
        loading: "Accessing Matrix Repository...",
        title: "Comprehensive Question Bank",
        subtitle: "Manage adaptive exam items, multi-tier prompts, and cognitive assets across domains.",
        createBtn: "Add New Question",
        // levelGuides: "Level Guides",
        placeholderSearch: "Search by content or keywords...",
        colId: "#",
        colQuestionContent: "Question Content",
        colType: "Type",
        colLevel: "Level",
        colSkill: "Skill",
        colPoints: "Points",
        colAuthorship: "Authorship",
        colActions: "Actions",
        emptyTelemetry: "No matching questions discovered in current registry filter.",
        confirmDelete: "Delete this question? This action cannot be undone.",
        deleted: "Success",
        questionRemoved: "Question deleted successfully.",
        error: "Error",
        failedDelete: "Failed to delete question.",
        duplicateQuestion: "Question duplicated successfully",
        previewQuestion: "Question Preview",
        cognitiveAssets: "Cognitive Assets Managed",
        allExams: "All Exams",
        allSkills: "All Skills",
        allTypes: "All Types",
        allLevels: "All Levels",
        examFilter: "Exam",
        skillFilter: "Skill",
        typeFilter: "Type",
        levelFilter: "Level",
        resetFilters: "Reset Filters",
        zeroResults: "Zero Results Found",
        adjustFilters: "Adjust your filters to refine the search",
        clearParams: "Clear All Parameters",
        system: "System",
        lastEditedBy: "Last edited by",
        noTextContent: "No text content",
        // levelGuidesTitle: "Master Level Guides",
        levelGuidesSubtitle: "Configure cognitive tier instructions and media",
        textualGuidance: "Textual Guidance",
        textualGuidancePlaceholder: "Provide clear instructions for students entering this difficulty tier...",
        audioNarration: "Audio Narration",
        noAudio: "No audio instruction currently set.",
        uploadAudio: "Upload Audio",
        changeAudio: "Change File",
        audioSelected: "New file selected:",
        appliedChangesMsg: "Changes will be applied immediately to all students in this level.",
        discard: "Discard",
        pushChanges: "Push Changes",
        
        // Redesign labels
        statsTitle: "Core Telemetry Overview",
        statsTotalQuestions: "Total Bank Size",
        statsMcqCount: "Multiple Choice Items",
        statsInteractiveCount: "Speaking & Writing Tasks",
        statsAvgPoints: "Average Difficulty Points",
        viewTable: "Table Mode",
        viewGrid: "Card Grid Mode",
        questionDetail: "Question Detail",
        passageAssoc: "Passage Context",
        notSpecified: "N/A",
        createdByLabel: "Created by",
        updatedByLabel: "Updated by",
        activeTier: "Active Difficulty Tier",
        selectLevelPrompt: "Please select a difficulty level to configure",
        searchLabel: "Search",
        duplicateQuestion: "Question duplicated successfully",
        previewQuestion: "Question Preview",
    }
};

const questionTypeMeta = {
    mcq:            { severity: 'info',      icon: 'pi pi-check-square',    color: 'bg-blue-500 text-white',      borderColor: 'border-blue-200 bg-blue-50/50 text-blue-600' },
    true_false:     { severity: 'warn',      icon: 'pi pi-verified',        color: 'bg-orange-500 text-white',    borderColor: 'border-orange-200 bg-orange-50/50 text-orange-600' },
    short_answer:   { severity: 'success',   icon: 'pi pi-pencil',          color: 'bg-emerald-500 text-white',   borderColor: 'border-emerald-200 bg-emerald-50/50 text-emerald-600' },
    writing:        { severity: 'contrast',  icon: 'pi pi-file-edit',       color: 'bg-slate-700 text-white',     borderColor: 'border-slate-200 bg-slate-100 text-slate-700' },
    speaking:       { severity: 'danger',    icon: 'pi pi-microphone',      color: 'bg-rose-500 text-white',      borderColor: 'border-rose-200 bg-rose-50/50 text-rose-600' },
    upload:         { severity: 'secondary', icon: 'pi pi-upload',          color: 'bg-purple-500 text-white',    borderColor: 'border-purple-200 bg-purple-50/50 text-purple-600' },
    drag_drop:      { severity: 'info',      icon: 'pi pi-arrows-alt',      color: 'bg-cyan-500 text-white',      borderColor: 'border-cyan-200 bg-cyan-50/50 text-cyan-600' },
    fill_blank:     { severity: 'warn',      icon: 'pi pi-minus',           color: 'bg-amber-500 text-white',     borderColor: 'border-amber-200 bg-amber-50/50 text-amber-600' },
    matching:       { severity: 'success',   icon: 'pi pi-list',            color: 'bg-teal-500 text-white',      borderColor: 'border-teal-200 bg-teal-50/50 text-teal-600' },
    ordering:       { severity: 'help',      icon: 'pi pi-sort-numeric-down', color: 'bg-indigo-500 text-white',   borderColor: 'border-indigo-200 bg-indigo-50/50 text-indigo-600' },
    highlight:      { severity: 'warn',      icon: 'pi pi-sun',             color: 'bg-yellow-500 text-slate-800',borderColor: 'border-yellow-200 bg-yellow-50/50 text-yellow-700' },
    word_selection: { severity: 'info',      icon: 'pi pi-cursor-click',    color: 'bg-sky-500 text-white',       borderColor: 'border-sky-200 bg-sky-50/50 text-sky-600' },
};

const getQuestionTypeLabel = (type) => {
    const labels = {
        ar: {
            mcq: 'اختيار من متعدد',
            true_false: 'صح / خطأ',
            short_answer: 'إجابة قصيرة',
            writing: 'كتابة تعبيرية',
            speaking: 'محادثة ونطق',
            upload: 'رفع ملفات',
            drag_drop: 'سحب وإفلات',
            fill_blank: 'ملء فراغات',
            matching: 'توصيل / مطابقة',
            ordering: 'إعادة ترتيب',
            highlight: 'تحديد الكلمات',
            word_selection: 'اختيار كلمات'
        },
        en: {
            mcq: 'MCQ',
            true_false: 'True / False',
            short_answer: 'Short Answer',
            writing: 'Writing',
            speaking: 'Speaking',
            upload: 'Upload',
            drag_drop: 'Drag & Drop',
            fill_blank: 'Fill Blanks',
            matching: 'Matching',
            ordering: 'Ordering',
            highlight: 'Highlight',
            word_selection: 'Word Select'
        }
    };
    return labels[currentLang.value]?.[type] || type;
};

const deleteItem = async (id) => {
    const confirmed = await showConfirm(t[currentLang.value].confirmDelete, t[currentLang.value].deleted, 'danger');
    if (confirmed) {
        try {
            await api.delete(`/admin/questions/${id}`);
            fetchData();
            showAlert(t[currentLang.value].questionRemoved, t[currentLang.value].deleted, 'success');
        } catch (err) {
            showAlert(t[currentLang.value].failedDelete, t[currentLang.value].error, 'error');
        }
    }
};

const openPreview = async (id) => {
    isLoadingPreview.value = true;
    try {
        const res = await api.get(`/admin/questions/${id}/preview`);
        previewQuestion.value = res.data;
        showPreviewModal.value = true;
    } catch (err) {
        console.error('Failed to load preview', err);
        showAlert('فشل تحميل معاينة السؤال', t[currentLang.value].error, 'error');
    } finally {
        isLoadingPreview.value = false;
    }
};

const duplicateQuestion = async (id) => {
    isDuplicating.value = true;
    try {
        const res = await api.post(`/admin/questions/${id}/duplicate`);
        const newQuestionId = res.data.question?.id || res.data.id;
        
        const routeName = adminStore.user?.role === 'teacher' 
            ? 'teacher.questions.edit' 
            : 'admin.questions.edit';
            
        showAlert(
            currentLang.value === 'ar' ? 'تم نسخ السؤال بنجاح، جاري الانتقال للتعديل...' : 'Question duplicated successfully, redirecting to edit...', 
            t[currentLang.value].deleted, 
            'success'
        );
        
        router.push({ name: routeName, params: { id: newQuestionId } });
    } catch (err) {
        console.error('Failed to duplicate question', err);
        showAlert(
            currentLang.value === 'ar' ? 'فشل نسخ السؤال' : 'Failed to duplicate question', 
            t[currentLang.value].error, 
            'error'
        );
    } finally {
        isDuplicating.value = false;
    }
};

const fetchData = async () => {
    loading.value = true;
    try {
        const params = {};
        if (filterExam.value) params.exam_id = filterExam.value;
        if (filterLevel.value) params.level_id = filterLevel.value;

        const [qRes, sRes, eRes, slRes] = await Promise.all([
            api.get('/admin/questions', { params }), // Load all skills globally for reactive counters
            api.get('/admin/skills'),
            api.get('/admin/exams'),
            api.get('/admin/skills-with-levels').catch(() => ({ data: [] }))
        ]);
        questions.value = qRes.data.data || qRes.data;
        skills.value = sRes.data;
        exams.value = eRes.data;
        skillsWithLevels.value = slRes.data;
    } catch (err) {
       showAlert(t[currentLang.value].loadingError || 'Failed to load data', t[currentLang.value].error, 'error');
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
        showAlert(t[currentLang.value].appliedChangesMsg || 'Instructions saved!', t[currentLang.value].deleted, 'success');
    } catch (err) {
        console.error('Save failed', err);
        showAlert(t[currentLang.value].failedSaveInstructions || 'Failed to save instructions.', t[currentLang.value].error, 'error');
    } finally {
        isSavingInst.value = false;
    }
};

const { resolveUrl } = useMediaUrl();

// Dynamic counter for skill tab question counts
const getSkillQuestionCount = (skillId) => {
    if (!skillId) return questions.value.length;
    return questions.value.filter(q => q.skill_id === skillId || q.skill?.id === skillId).length;
};

const filteredQuestions = computed(() => {
    let filtered = questions.value;
    
    // Client-side dynamic skill filter pivot
    if (filterSkill.value) {
        filtered = filtered.filter(q => q.skill_id === filterSkill.value || q.skill?.id === filterSkill.value);
    }
    
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

// Dynamic stats derived from the global question set
const stats = computed(() => {
    const total = questions.value.length;
    const byType = {};
    
    
    const mcqCount = byType['mcq'] || 0;
    const speakingCount = byType['speaking'] || 0;
    const writingCount = byType['writing'] || 0;
    
    return {
        total,
        mcqCount,
        interactiveCount: speakingCount + writingCount,

    };
});

watch([filterExam, filterLevel], () => {
    first.value = 0;
    fetchData();
});

watch([filterSkill, filterType, searchQuery], () => {
    first.value = 0;
});

const isFirstInPassage = (data, index) => {
    if (!data.passage_id) return false;
    const globalIndex = first.value + index;
    if (globalIndex === 0) return true;
    const prevQuestion = filteredQuestions.value[globalIndex - 1];
    return !prevQuestion || prevQuestion.passage_id !== data.passage_id;
};

const isLastInPassage = (data, index) => {
    if (!data.passage_id) return false;
    const globalIndex = first.value + index;
    if (globalIndex === filteredQuestions.value.length - 1) return true;
    const nextQuestion = filteredQuestions.value[globalIndex + 1];
    return !nextQuestion || nextQuestion.passage_id !== data.passage_id;
};

const getRowClass = (data) => {
    const globalIndex = filteredQuestions.value.findIndex(q => q.id === data.id);
    if (globalIndex === -1 || !data.passage_id) return 'standalone-row';
    
    const prevQuestion = globalIndex > 0 ? filteredQuestions.value[globalIndex - 1] : null;
    const nextQuestion = globalIndex < filteredQuestions.value.length - 1 ? filteredQuestions.value[globalIndex + 1] : null;
    
    const isFirst = !prevQuestion || prevQuestion.passage_id !== data.passage_id;
    const isLast = !nextQuestion || nextQuestion.passage_id !== data.passage_id;
    
    return [
        'passage-row',
        isFirst ? 'passage-row-first' : '',
        isLast ? 'passage-row-last' : '',
        (!isFirst && !isLast) ? 'passage-row-middle' : ''
    ].filter(Boolean).join(' ');
};

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
      
      <!-- Loading Indicator -->
      <div v-if="loading && questions.length === 0" class="flex flex-col items-center justify-center py-32 space-y-4">
          <ProgressSpinner />
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
      </div>

      <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
          
          <!-- Premium Standardized Header Card -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100/80 shadow-md space-y-6 md:space-y-0 relative overflow-hidden group">
              <div class="absolute right-0 top-0 w-64 h-64 bg-brand-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-brand-primary/10 transition-all duration-1000"></div>
              <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/50 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
              
              <div class="relative z-10 space-y-2">
                   <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                       {{ t[currentLang].title }}
                   </h1>
                   <p class="text-xs font-bold text-slate-400 mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
                     <span class="w-2.5 h-2.5 bg-brand-primary rounded-full animate-ping"></span>
                     <span>{{ filteredQuestions.length }} {{ t[currentLang].cognitiveAssets }}</span>
                   </p>
              </div>
              
              <div class="flex flex-wrap items-center gap-4 relative z-10">
                    <!-- Language Selector Toggle -->
                    <button @click="toggleLang" class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 font-extrabold text-xs">
                        <i class="pi pi-globe text-brand-primary"></i>
                        <span>{{ currentLang === 'ar' ? 'English' : 'العربية' }}</span>
                    </button>
                   <Button :label="t[currentLang].createBtn" icon="pi pi-plus" 
                           class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-xs font-black tracking-wider uppercase transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 cursor-pointer"
                           @click="$router.push({ name: adminStore.user?.role === 'teacher' ? 'teacher.questions.create' : 'admin.questions.create' })" />
              </div>
          </div>
          <!-- Dynamic Premium Skill Tabs Bar -->
          <div class="flex items-center gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none" :class="{ 'space-x-reverse': currentLang === 'ar' }">
              <!-- "All Skills" Tab -->
              <button @click="filterSkill = null"
                      :class="filterSkill === null 
                          ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white border-brand-primary shadow-lg shadow-rose-100/70 scale-102 font-black' 
                          : 'bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 border border-slate-100/80 shadow-2xs'"
                      class="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer shrink-0 border select-none active:scale-95">
                  <i class="pi pi-th-large text-[10px]"></i>
                  <span>{{ t[currentLang].allSkills }}</span>
                  <span :class="filterSkill === null ? 'bg-white text-brand-primary font-black' : 'bg-slate-100 text-slate-600 font-bold'"
                        class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-[9px] min-w-[20px] transition-colors">
                      {{ getSkillQuestionCount(null) }}
                  </span>
              </button>

              <!-- Individual Skill Tabs -->
              <button v-for="skill in skills" :key="skill.id" 
                      @click="filterSkill = skill.id"
                      :class="filterSkill === skill.id 
                          ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white border-brand-primary shadow-lg shadow-rose-100/70 scale-102 font-black' 
                          : 'bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 border border-slate-100/80 shadow-2xs'"
                      class="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer shrink-0 border select-none active:scale-95">
                  <i class="pi pi-tag text-[10px]"></i>
                  <span>{{ skill.name }}</span>
                  <span :class="filterSkill === skill.id ? 'bg-white text-brand-primary font-black' : 'bg-slate-100 text-slate-600 font-bold'"
                        class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-[9px] min-w-[20px] transition-colors">
                      {{ getSkillQuestionCount(skill.id) }}
                  </span>
              </button>
          </div>

          <!-- Premium Filter & View Mode Control Bar -->
          <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md flex flex-col xl:flex-row justify-between items-center gap-6">
              
              <!-- Left side: Search & View Mode Switcher -->
              <div class="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                  <!-- Search -->
                  <div class="relative w-full sm:w-[280px]">
                      <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 text-xs" />
                      <InputText v-model="searchQuery" :placeholder="t[currentLang].placeholderSearch"
                          class="w-full pl-11 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:border-brand-primary focus:bg-white text-xs font-bold shadow-sm transition-all h-11" />
                  </div>
                  
                  <!-- View Mode segmented selector -->
                  <div class="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 w-full sm:w-auto shrink-0">
                      <button @click="setViewMode('table')" 
                              :class="viewMode === 'table' ? 'bg-white text-brand-primary shadow-sm font-black' : 'text-slate-500 hover:text-slate-800 font-bold'"
                              class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all duration-300 cursor-pointer active:scale-95">
                          <i class="pi pi-table"></i>
                          <span>{{ t[currentLang].viewTable }}</span>
                      </button>
                      <button @click="setViewMode('grid')" 
                              :class="viewMode === 'grid' ? 'bg-white text-brand-primary shadow-sm font-black' : 'text-slate-500 hover:text-slate-800 font-bold'"
                              class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all duration-300 cursor-pointer active:scale-95">
                          <i class="pi pi-th-large"></i>
                          <span>{{ t[currentLang].viewGrid }}</span>
                      </button>
                  </div>
              </div>

              <!-- Right side: Dropdown filter menus (Skill Filter removed to avoid redundancy) -->
              <div class="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                  <Select v-model="filterExam" :options="[{title: t[currentLang].allExams, id:null}, ...exams]" optionLabel="title" optionValue="id" :placeholder="t[currentLang].examFilter" class="h-11 rounded-2xl border-2 border-slate-100 text-xs font-bold min-w-[140px] focus:border-brand-primary transition-all flex items-center" />
                  <Select v-model="filterType" :options="[{label: t[currentLang].allTypes, value:''}, ...Object.entries(questionTypeMeta).map(([k,v])=>({label: getQuestionTypeLabel(k), value:k}))]" optionLabel="label" optionValue="value" :placeholder="t[currentLang].typeFilter" class="h-11 rounded-2xl border-2 border-slate-100 text-xs font-bold min-w-[140px] focus:border-brand-primary transition-all flex items-center" />
                  <Select v-model="filterLevel" :options="[{label: t[currentLang].allLevels, value:null}, ...Array.from({length:10}, (_,i)=>({label:`${currentLang === 'ar' ? 'المستوى' : 'Level'} ${i+1}`, value:i+1}))]" optionLabel="label" optionValue="value" :placeholder="t[currentLang].levelFilter" class="h-11 rounded-2xl border-2 border-slate-100 text-xs font-bold min-w-[120px] focus:border-brand-primary transition-all flex items-center" />
                  
                  <Button v-if="searchQuery || filterExam || filterLevel || filterType" 
                          icon="pi pi-filter-slash" severity="danger" rounded outlined 
                          @click="searchQuery=''; filterSkill=null; filterExam=null; filterLevel=null; filterType=''" 
                          v-tooltip.top="t[currentLang].resetFilters" class="h-11 w-11 shrink-0 cursor-pointer hover:bg-rose-50 hover:border-rose-400" />
              </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredQuestions.length === 0" class="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-slate-100 shadow-md gap-6 animate-in fade-in duration-500">
              <div class="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 text-3xl">
                  <i class="pi pi-search"></i>
              </div>
              <div class="text-center space-y-2">
                  <h3 class="text-xl font-black text-slate-800 tracking-tight leading-tight">{{ t[currentLang].zeroResults }}</h3>
                  <p class="text-xs font-bold text-slate-400 max-w-sm leading-relaxed">{{ t[currentLang].adjustFilters }}</p>
              </div>
              <Button :label="t[currentLang].clearParams" icon="pi pi-refresh" severity="secondary" outlined @click="searchQuery=''; filterSkill=null; filterExam=null; filterLevel=null; filterType=''" class="rounded-2xl font-black text-xs px-8 py-3 cursor-pointer border-slate-200 hover:border-brand-primary hover:text-brand-primary transition-all" />
          </div>

          <!-- Content View Mode Selector -->
          <div v-else class="animate-in fade-in zoom-in-95 duration-500">
              
              <!-- 1. COMPACT TABLE VIEW -->
              <div v-if="viewMode === 'table'" class="bg-white rounded-[2rem] border border-slate-100 shadow-md overflow-hidden">
                  <DataTable v-model:first="first" :value="filteredQuestions" paginator :rows="15" class="p-datatable-sm text-sm" responsiveLayout="scroll" :rowClass="getRowClass">
                    
                    <Column :header="t[currentLang].colId" style="width: 100px">
                      <template #body="{ data, index }">
                          <span class="text-[11px] font-mono font-black text-slate-400">{{ first + index + 1 }} (#{{ data.id }})</span>
                      </template>
                    </Column>

                    <Column :header="t[currentLang].colQuestionContent" style="min-width: 420px">
                      <template #body="{ data, index }">
                        <div class="flex flex-col w-full">
                          
                          <!-- Passage Header Banner (Only on the first question of the passage group) -->
                          <div v-if="isFirstInPassage(data, index)" 
                               class="mb-3 bg-gradient-to-r from-brand-primary/10 to-brand-secondary/5 border border-brand-primary/20 rounded-xl p-3 flex items-center justify-between shadow-2xs gap-4 animate-in fade-in duration-300">
                            <div class="flex items-center gap-2.5 min-w-0" :class="{ 'space-x-reverse': currentLang === 'ar' }">
                              <div class="w-8 h-8 rounded-lg bg-white border border-brand-primary/20 flex items-center justify-center shrink-0">
                                <i class="pi pi-book text-sm text-brand-primary"></i>
                              </div>
                              <div class="min-w-0 text-right">
                                <span class="text-[9px] font-black text-brand-primary/85 uppercase tracking-wider block">
                                  {{ currentLang === 'ar' ? 'أسئلة القطعة' : 'Passage Questions' }}
                                </span>
                                <span class="text-xs font-bold text-slate-800 block truncate max-w-[320px] mt-0.5">
                                  {{ data.passage.title }}
                                </span>
                              </div>
                            </div>
                            <span class="text-[9px] font-black text-slate-500 bg-white border border-slate-100 rounded-lg px-2.5 py-0.5 shrink-0">
                              ID: #{{ data.passage.id }}
                            </span>
                          </div>

                          <div class="flex items-center gap-4 py-2.5" :class="{ 'space-x-reverse': currentLang === 'ar' }">
                            
                            <!-- Dynamic Framed Image Preview with hover scale -->
                            <div v-if="data.image_url" 
                                 class="rounded-[1.25rem] overflow-hidden border border-slate-100 shadow-sm shrink-0 hover:shadow-md transition-shadow relative bg-slate-50"
                                 :class="{'w-14 h-14': !data.image_width && !data.image_height}"
                                 :style="data.image_width || data.image_height ? {
                                     width: data.image_width ? `${data.image_width}px` : 'auto',
                                     height: data.image_height ? `${data.image_height}px` : 'auto',
                                     maxWidth: '120px',
                                     maxHeight: '120px'
                                 } : {}">
                              <img :src="resolveUrl(data.image_url)" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                            </div>

                            <div class="min-w-0 flex-1">
                              <!-- Truncated HTML Preview with fine typography -->
                              <div class="text-xs font-black text-slate-700 truncate max-w-[400px] leading-relaxed ql-content" v-html="data.content || `<span class='italic text-slate-300'>${t[currentLang].noTextContent}</span>`"></div>
                              
                              <!-- Small Indicator instead of full redundant passage title if grouped -->
                              <div v-if="data.passage" class="inline-flex items-center gap-1.5 mt-1.5 bg-brand-primary/5 border border-brand-primary/10 rounded-lg px-2 py-0.5">
                                <i class="pi pi-book text-[8px] text-brand-primary"></i>
                                <span class="text-[9px] font-black text-brand-primary/80">
                                  {{ currentLang === 'ar' ? 'سؤال من قطعة' : 'Passage Question' }}
                                </span>
                              </div>
                            </div>
                          </div>

                        </div>
                      </template>
                    </Column>

                    <Column :header="t[currentLang].colType" style="width: 140px">
                      <template #body="{ data }">
                        <!-- Redesigned pill with custom icons -->
                        <span :class="questionTypeMeta[data.type]?.borderColor" class="inline-flex items-center gap-1.5 text-[10px] font-black uppercase rounded-xl px-3 py-1 border shadow-xs">
                          <i :class="questionTypeMeta[data.type]?.icon" class="text-[10px]"></i>
                          <span>{{ getQuestionTypeLabel(data.type) }}</span>
                        </span>
                      </template>
                    </Column>

                    <Column :header="t[currentLang].colLevel" style="width: 80px">
                      <template #body="{ data }">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black text-slate-700 shadow-xs">
                            L{{ data.level?.level_number || data.level_id }}
                        </span>
                      </template>
                    </Column>

                    <Column :header="t[currentLang].colSkill" style="width: 130px">
                      <template #body="{ data }">
                        <span class="text-xs font-extrabold text-slate-500 uppercase bg-slate-50 border border-slate-100/50 rounded-lg px-2 py-0.5">{{ data.skill?.name }}</span>
                      </template>
                    </Column>

                    <Column :header="t[currentLang].colPoints" class="text-center" style="width: 80px">
                      <template #body="{ data }">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-brand-primary/5 text-xs font-black text-brand-primary border border-brand-primary/10">
                            {{ data.points }}
                        </span>
                      </template>
                    </Column>

                    <Column :header="t[currentLang].colAuthorship" style="width: 160px">
                      <template #body="{ data }">
                        <div class="flex flex-col gap-1 text-[10px]">
                          <div v-if="data.creator" class="flex items-center gap-2">
                            <!-- Initials Avatar -->
                            <div class="w-5 h-5 rounded-full bg-slate-200 text-slate-600 border border-white shadow-xs flex items-center justify-center font-bold uppercase text-[9px] shrink-0">
                                {{ data.creator.first_name[0] }}
                            </div>
                            <span class="font-extrabold text-slate-600 truncate max-w-[110px]" v-tooltip.top="`${data.creator.first_name} ${data.creator.last_name}`">
                              {{ data.creator.first_name }} {{ data.creator.last_name }}
                            </span>
                          </div>
                          
                          <div v-if="data.updater && data.updated_by !== data.created_by" class="flex items-center gap-2 opacity-70">
                            <i class="pi pi-pencil text-[9px] text-slate-400 shrink-0"></i>
                            <span class="font-bold text-slate-500 truncate max-w-[110px]" v-tooltip.top="`${t[currentLang].lastEditedBy} ${data.updater.first_name}`">
                              {{ data.updater.first_name }}
                            </span>
                          </div>
                          
                          <span v-if="!data.creator" class="text-[9px] font-black text-slate-300 italic">{{ t[currentLang].system }}</span>
                        </div>
                      </template>
                    </Column>

                    <Column :header="t[currentLang].colActions" style="width: 130px" class="text-right">
                      <template #body="{ data, index }">
                        <!-- Show full action buttons for standalone questions OR first question of a passage group -->
                        <div v-if="!data.passage_id || isFirstInPassage(data, index)" class="flex justify-end gap-1.5">
                          <Button icon="pi pi-eye" rounded severity="info" outlined size="small"
                                  class="h-9 w-9 border-blue-200 bg-blue-50/20 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 cursor-pointer transition-all duration-300"
                                  @click="openPreview(data.id)"
                                  v-tooltip.top="'Preview Question'" :loading="isLoadingPreview" />
                          
                          <Button icon="pi pi-copy" rounded severity="success" outlined size="small"
                                  class="h-9 w-9 border-green-200 bg-green-50/20 text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 cursor-pointer transition-all duration-300"
                                  @click="duplicateQuestion(data.id)"
                                  v-tooltip.top="'duplicate Question'" :loading="isDuplicating" />
                          
                          <Button icon="pi pi-pencil" rounded severity="warning" outlined size="small"
                                  class="h-9 w-9 border-amber-200 bg-amber-50/20 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500 cursor-pointer transition-all duration-300"
                                  @click="$router.push({ name: adminStore.user?.role === 'teacher' ? 'teacher.questions.edit' : 'admin.questions.edit', params: { id: data.id } })" />
                          
                          <Button icon="pi pi-trash" rounded severity="danger" outlined size="small"
                                  class="h-9 w-9 border-rose-200 bg-rose-50/20 text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500 cursor-pointer transition-all duration-300"
                                  @click="deleteItem(data.id)" />
                        </div>
                        <!-- Passage sibling rows: just show a subtle linked indicator, no duplicate controls -->
                        <div v-else class="flex justify-end">
                          <span class="inline-flex items-center gap-1 text-[9px] font-black text-brand-primary/60 bg-brand-primary/5 border border-brand-primary/10 rounded-lg px-2 py-1">
                            <i class="pi pi-link text-[8px]"></i>
                            {{ currentLang === 'ar' ? 'مرتبط بالقطعة' : 'Part of passage' }}
                          </span>
                        </div>
                      </template>
                    </Column>
                  </DataTable>
              </div>

              <!-- 2. CREATIVE GRID CARD VIEW -->
              <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div v-for="data in filteredQuestions" :key="data.id" 
                       :class="data.passage ? 'border-brand-primary/25 bg-rose-50/5 shadow-sm' : 'border-slate-100 bg-white'"
                       class="relative rounded-[2rem] border hover:border-brand-primary/20 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
                      
                      <!-- Top Color Border Band based on question type severity (Only for standalone questions) -->
                      <div v-if="!data.passage" class="absolute top-0 left-0 right-0 h-1.5" :class="questionTypeMeta[data.type]?.color || 'bg-slate-300'"></div>
                      
                      <!-- Passage Group Header for Grid View -->
                      <div v-if="data.passage" 
                           class="bg-gradient-to-r from-brand-primary/10 to-brand-secondary/5 border-b border-brand-primary/10 px-6 py-3.5 flex items-center justify-between gap-4"
                           :class="{ 'flex-row-reverse': currentLang === 'ar' }">
                          <div class="flex items-center gap-2 min-w-0" :class="{ 'space-x-reverse': currentLang === 'ar' }">
                              <i class="pi pi-book text-xs text-brand-primary shrink-0"></i>
                              <span class="text-[10px] font-bold text-slate-700 truncate max-w-[160px]">
                                  {{ data.passage.title }}
                              </span>
                          </div>
                          <span class="text-[9px] font-black text-brand-primary/90 bg-white border border-brand-primary/10 rounded-lg px-2.5 py-0.5 shrink-0">
                              {{ currentLang === 'ar' ? 'سؤال قطعة' : 'Passage Q' }}
                          </span>
                      </div>

                      <!-- Card Header -->
                      <div class="flex items-center justify-between p-6 pb-3 border-b border-slate-50" :class="{ 'flex-row-reverse': currentLang === 'ar' }">
                          <!-- Level difficulty badge -->
                          <span class="inline-flex items-center gap-1 bg-brand-primary/5 text-brand-primary border border-brand-primary/10 rounded-xl px-3 py-1 text-xs font-black">
                            <span class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>
                            <span>{{ t[currentLang].levelFilter }} {{ data.level?.level_number || data.level_id }}</span>
                          </span>

                          <!-- Custom question type status badge -->
                          <span :class="questionTypeMeta[data.type]?.borderColor" class="inline-flex items-center gap-1.5 text-[10px] font-black uppercase rounded-xl px-2.5 py-1 border shadow-2xs">
                            <i :class="questionTypeMeta[data.type]?.icon" class="text-[9px]"></i>
                            <span>{{ getQuestionTypeLabel(data.type) }}</span>
                          </span>
                      </div>

                      <!-- Card Body -->
                      <div class="p-6 space-y-4 flex-1">
                          <!-- Question Content Rich-text box with multi-line clamping -->
                          <div class="text-xs font-bold text-slate-700 leading-relaxed ql-content line-clamp-3 min-h-[4.5rem]" 
                               v-html="data.content || `<span class='italic text-slate-300'>${t[currentLang].noTextContent}</span>`">
                          </div>

                          <!-- Associated Passage -->
                          <div v-if="data.passage" class="flex items-center gap-2.5 bg-brand-primary/5 border border-brand-primary/10 p-3 rounded-2xl" :class="{ 'space-x-reverse': currentLang === 'ar' }">
                              <div class="w-8 h-8 rounded-xl bg-white border border-brand-primary/10 flex items-center justify-center shrink-0">
                                  <i class="pi pi-book text-xs text-brand-primary"></i>
                              </div>
                              <div class="min-w-0">
                                  <div class="text-[9px] font-black text-brand-primary/80 uppercase tracking-widest">{{ t[currentLang].passageAssoc }}</div>
                                  <div class="text-[11px] font-extrabold text-slate-600 truncate max-w-[200px] mt-0.5">{{ data.passage.title }}</div>
                              </div>
                          </div>

                          <!-- Meta Tags (Skill) -->
                          <div class="flex items-center justify-between text-[11px] font-extrabold text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                              <span>{{ t[currentLang].skillFilter }}</span>
                              <span class="text-xs font-black text-slate-600 uppercase">{{ data.skill?.name || t[currentLang].notSpecified }}</span>
                          </div>

                          <!-- Question Image (If Uploaded) with hover zoom zoom effect -->
                          <div v-if="data.image_url" class="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 relative aspect-video shadow-2xs">
                              <img :src="resolveUrl(data.image_url)" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                      </div>

                      <!-- Card Footer -->
                      <div class="border-t border-slate-100 bg-slate-50/50 p-6 pt-4 flex items-center justify-between gap-4" :class="{ 'flex-row-reverse': currentLang === 'ar' }">
                          
                          <!-- Achievement Points Badge -->
                          <div class="inline-flex items-center gap-1.5 bg-brand-primary/5 text-brand-primary px-3.5 py-2 rounded-2xl border border-brand-primary/10 shrink-0">
                              <i class="pi pi-bolt text-xs animate-bounce"></i>
                              <span class="text-xs font-black">{{ data.points }} <span class="text-[9px] uppercase font-bold">{{ currentLang === 'ar' ? 'نقاط' : 'Pts' }}</span></span>
                          </div>

                          <!-- Author Attribution Profile -->
                          <div v-if="data.creator" class="flex items-center gap-2 min-w-0">
                              <!-- Avatar Circle -->
                              <div class="w-7 h-7 rounded-full bg-slate-200 text-slate-600 border-2 border-white shadow-sm flex items-center justify-center font-black uppercase text-[10px] shrink-0">
                                  {{ data.creator.first_name[0] }}
                              </div>
                              <div class="min-w-0 text-[10px] font-bold leading-tight">
                                  <div class="text-slate-700 truncate max-w-[80px]" v-tooltip.top="`${data.creator.first_name} ${data.creator.last_name}`">{{ data.creator.first_name }}</div>
                                  <div class="text-slate-400 font-bold text-[8px] mt-0.5 uppercase tracking-wide">{{ currentLang === 'ar' ? 'المنشئ' : 'Creator' }}</div>
                              </div>
                          </div>
                          <span v-else class="text-[9px] font-black text-slate-300 italic">{{ t[currentLang].system }}</span>

                          <!-- Custom Action Hub -->
                          <!-- Show full actions for standalone questions OR first card of a passage group -->
                          <template v-if="!data.passage_id || filteredQuestions.findIndex(q => q.id === data.id) === 0 || filteredQuestions[filteredQuestions.findIndex(q => q.id === data.id) - 1]?.passage_id !== data.passage_id">
                            <div class="flex items-center gap-1 shrink-0 ml-auto" :class="{ 'mr-auto ml-0': currentLang === 'ar' }">
                              <Button icon="pi pi-eye" rounded severity="info" outlined size="small"
                                      class="h-9 w-9 border-blue-200/80 bg-white text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 cursor-pointer transition-all duration-300"
                                      @click="openPreview(data.id)"
                                      v-tooltip.top="'معاينة السؤال'" :loading="isLoadingPreview" />
                              
                              <Button icon="pi pi-copy" rounded severity="success" outlined size="small"
                                      class="h-9 w-9 border-green-200/80 bg-white text-green-600 hover:bg-green-500 hover:text-white hover:border-green-500 cursor-pointer transition-all duration-300"
                                      @click="duplicateQuestion(data.id)"
                                      v-tooltip.top="'نسخ السؤال'" :loading="isDuplicating" />
                              
                              <Button icon="pi pi-pencil" rounded severity="warning" outlined size="small"
                                      class="h-9 w-9 border-amber-200/80 bg-white text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500 cursor-pointer transition-all duration-300"
                                      @click="$router.push({ name: adminStore.user?.role === 'teacher' ? 'teacher.questions.edit' : 'admin.questions.edit', params: { id: data.id } })" />
                              
                              <Button icon="pi pi-trash" rounded severity="danger" outlined size="small"
                                      class="h-9 w-9 border-rose-200/80 bg-white text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500 cursor-pointer transition-all duration-300"
                                      @click="deleteItem(data.id)" />
                            </div>
                          </template>
                          <!-- Non-first passage cards: subtle linked indicator -->
                          <template v-else>
                            <span class="inline-flex items-center gap-1 text-[9px] font-black text-brand-primary/60 bg-brand-primary/5 border border-brand-primary/10 rounded-xl px-2.5 py-1.5 ml-auto" :class="{ 'mr-auto ml-0': currentLang === 'ar' }">
                              <i class="pi pi-link text-[8px]"></i>
                              {{ currentLang === 'ar' ? 'مرتبط بالقطعة' : 'Part of passage' }}
                            </span>
                          </template>

                      </div>

                  </div>
              </div>

          </div>
      </div>

      
      
    </div>
  </AdminLayout>

  <!-- Preview Modal - Exam Style -->
<Teleport to="body">
  <div v-if="showPreviewModal"
       class="fixed inset-0 z-[9999] flex items-start justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto"
       @click.self="showPreviewModal = false">

    <div class="bg-white rounded-2xl w-full max-w-5xl my-6 overflow-hidden border border-slate-100 shadow-2xl flex flex-col" style="min-height: 580px">

      <!-- Exam-style dark header -->
      <div class="bg-slate-800 text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div class="flex flex-col gap-1.5">
          <span class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
            {{ t[currentLang].previewQuestion }}
          </span>
          <div class="flex items-center gap-2" v-if="previewQuestion">
            <span class="inline-flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-500/25 rounded-lg px-2.5 py-0.5 text-[10px] font-black">
              <i class="pi pi-chart-bar text-[9px]"></i>
              L{{ previewQuestion.level?.level_number || previewQuestion.level_id }}
            </span>
            <span :class="questionTypeMeta[previewQuestion.type]?.borderColor"
                  class="inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-black border bg-white/5">
              <i :class="questionTypeMeta[previewQuestion.type]?.icon" class="text-[9px]"></i>
              {{ getQuestionTypeLabel(previewQuestion.type) }}
            </span>
            <span class="inline-flex items-center gap-1 bg-slate-700 text-slate-300 border border-slate-600 rounded-lg px-2.5 py-0.5 text-[10px] font-black">
              <i class="pi pi-tag text-[9px]"></i>
              {{ previewQuestion.skill?.name }}
            </span>
            <span class="inline-flex items-center gap-1 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-lg px-2.5 py-0.5 text-[10px] font-black">
              <i class="pi pi-bolt text-[9px]"></i>
              {{ previewQuestion.points }} pts
            </span>
          </div>
        </div>
        <button @click="showPreviewModal = false"
                class="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
          <i class="pi pi-times text-xs"></i>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingPreview" class="flex-1 flex items-center justify-center py-20">
        <ProgressSpinner />
      </div>

      <!-- Exam Split Screen -->
      <div v-else-if="previewQuestion" class="flex flex-row flex-1 gap-px bg-slate-200 min-h-0" style="height: 500px">

        <!-- Response Pane (Left - 40%) -->
        <div class="flex flex-col bg-white overflow-hidden"
             :style="previewQuestion.passage ? 'width:40%' : 'width:100%'">
          <div class="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">

            <!-- Audio bar (if audio exists) -->
            <div v-if="previewQuestion.audio_url || previewQuestion.passage?.audio_url"
                 class="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div class="flex items-center gap-2 mb-2">
                <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audio</span>
              </div>
              <div class="w-full bg-slate-200 h-1 rounded-full">
                <div class="bg-rose-500 h-full rounded-full" style="width:0%"></div>
              </div>
            </div>

            <!-- Question Content -->
            <div class="text-base font-black text-slate-900 leading-snug ql-content"
                 v-html="previewQuestion.content" dir="auto"></div>

            <!-- Instructions -->
            <div v-if="previewQuestion.instructions"
                 class="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p class="text-[11px] font-bold text-slate-500" dir="auto">{{ previewQuestion.instructions }}</p>
            </div>

            <!-- MCQ / True-False Options -->
            <div v-if="previewQuestion.options?.length" class="space-y-2">
              <div v-for="(opt, idx) in previewQuestion.options" :key="idx"
                   :class="opt.is_correct
                     ? 'bg-green-50 border-green-300'
                     : 'bg-white border-slate-100 hover:border-slate-200'"
                   class="flex items-center gap-3 p-3 border rounded-xl transition-colors">
                <div :class="opt.is_correct ? 'bg-green-500 text-white border-green-500' : 'bg-slate-100 text-slate-500 border-slate-200'"
                     class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border shrink-0">
                  {{ idx + 1 }}
                </div>
                <span class="text-xs font-bold text-slate-700 flex-1">{{ opt.option_text }}</span>
                <span v-if="opt.is_correct"
                      class="text-[9px] font-black text-green-600 bg-green-100 px-2 py-0.5 rounded-lg shrink-0">
                  ✓ {{ currentLang === 'ar' ? 'صحيح' : 'Correct' }}
                </span>
              </div>
            </div>

            <!-- Writing/Short Answer placeholder -->
            <div v-if="['writing','short_answer'].includes(previewQuestion.type)"
                 class="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
              <i class="pi pi-file-edit text-2xl text-slate-300 mb-2 block"></i>
              <p class="text-xs font-bold text-slate-300 uppercase tracking-widest">
                {{ currentLang === 'ar' ? 'منطقة الإجابة الكتابية' : 'Written Response Area' }}
              </p>
            </div>

            <!-- Speaking placeholder -->
            <div v-if="previewQuestion.type === 'speaking'"
                 class="border-2 border-dashed border-rose-100 rounded-xl p-6 text-center">
              <i class="pi pi-microphone text-2xl text-rose-300 mb-2 block"></i>
              <p class="text-xs font-bold text-rose-300 uppercase tracking-widest">
                {{ currentLang === 'ar' ? 'منطقة التسجيل الصوتي' : 'Voice Recording Area' }}
              </p>
            </div>

          </div>
        </div>

        <!-- Stimulus Pane (Right - 60%) — only if passage exists -->
        <div v-if="previewQuestion.passage" class="flex-1 bg-white flex flex-col overflow-hidden">
          <div class="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <i class="pi pi-book text-slate-400 text-sm"></i>
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {{ t[currentLang].passageAssoc }}
              </span>
            </div>

            <!-- Passage Image -->
            <div v-if="previewQuestion.passage.image_url || previewQuestion.passage.image_path"
                 class="mb-4 flex justify-center">
              <img :src="resolveUrl(previewQuestion.passage.image_url || previewQuestion.passage.image_path)"
                   class="rounded-xl shadow border border-slate-100 max-w-full" />
            </div>

            <!-- Passage Title -->
            <h3 v-if="previewQuestion.passage.title"
                class="text-xl font-black text-slate-900 mb-4 leading-tight" dir="auto">
              {{ previewQuestion.passage.title }}
            </h3>

            <!-- Passage Content -->
            <div v-if="previewQuestion.passage.content"
                 class="text-sm text-slate-700 leading-relaxed ql-content text-justify"
                 v-html="previewQuestion.passage.content" dir="auto"></div>
          </div>
        </div>

        <!-- Question Image (no passage) -->
        <div v-else-if="previewQuestion.image_url"
             class="w-2/5 bg-slate-50 flex items-center justify-center p-6">
          <img :src="resolveUrl(previewQuestion.image_url)"
               class="max-w-full max-h-full rounded-xl shadow-md border border-slate-100" />
        </div>

      </div>

      <!-- Bottom nav bar -->
      <div class="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between shrink-0">
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          ID #{{ previewQuestion?.id }}
        </span>
        <div class="flex items-center gap-2">
          <Button icon="pi pi-pencil" :label="currentLang === 'ar' ? 'تعديل' : 'Edit'"
                  severity="warning" outlined size="small"
                  class="rounded-xl font-black text-xs cursor-pointer"
                  @click="showPreviewModal = false; $router.push({ name: adminStore.user?.role === 'teacher' ? 'teacher.questions.edit' : 'admin.questions.edit', params: { id: previewQuestion.id } })" />
          <Button icon="pi pi-copy" :label="currentLang === 'ar' ? 'نسخ' : 'Duplicate'"
                  severity="success" outlined size="small"
                  class="rounded-xl font-black text-xs cursor-pointer"
                  @click="showPreviewModal = false; duplicateQuestion(previewQuestion.id)" />
          <Button icon="pi pi-times" :label="currentLang === 'ar' ? 'إغلاق' : 'Close'"
                  severity="secondary" size="small"
                  class="rounded-xl font-black text-xs bg-slate-800 text-white border-slate-800 cursor-pointer"
                  @click="showPreviewModal = false" />
        </div>
      </div>

    </div>
  </div>
</Teleport>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.arabic-theme {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 1.25rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.arabic-theme :deep(.p-datatable-thead > tr > th) {
    text-align: right !important;
}
.arabic-theme :deep(.p-datatable-tbody > tr > td) {
    text-align: right !important;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}

.scrollbar-none::-webkit-scrollbar {
    display: none;
}
.scrollbar-none {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
}

/* Table grouping styling */
:deep(.passage-row) {
    background-color: rgba(244, 63, 94, 0.015) !important; /* Extremely subtle rose tint matching brand-primary */
}
:deep(.passage-row:hover) {
    background-color: rgba(244, 63, 94, 0.035) !important;
}

/* Side border indicator for the group - LTR */
:deep(.passage-row td:first-child) {
    border-left: 4px solid #f43f5e !important; /* brand-primary */
}

/* Side border indicator for the group - RTL (arabic-theme) */
.arabic-theme :deep(.passage-row td:first-child) {
    border-left: none !important;
    border-right: 4px solid #f43f5e !important; /* brand-primary */
}

/* First row in group */
:deep(.passage-row-first td) {
    border-top: 1.5px solid rgba(244, 63, 94, 0.25) !important;
}

/* Last row in group */
:deep(.passage-row-last td) {
    border-bottom: 1.5px solid rgba(244, 63, 94, 0.25) !important;
}

/* Middle rows in group */
:deep(.passage-row-middle td), :deep(.passage-row-first td:not(:last-child)) {
    border-bottom: 1px dashed rgba(244, 63, 94, 0.08) !important;
}
</style>
