<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';

const { showAlert, showConfirm } = useModal();

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const selectedStudent = ref(null);
const skills = ref([]);
const packages = ref([]);
const studentId = route.params.id;

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

// Translation Dictionary
const t = {
    ar: {
        institutionalIdentity: "الهوية المؤسسية والتعليمية",
        unifiedPerformanceView: "عرض الأداء الموحد والتفصيلي للطالب بالمنظومة",
        editProfile: "تعديل هوية الطالب",
        reloadData: "تحديث السجلات",
        registryProfile: "ملف التسجيل والقبول",
        performanceMatrix: "مؤشرات وإتقان الأداء",
        candidateName: "اسم المرشح الأكاديمي",
        digitalIdentifier: "المعرف الرقمي (البريد الإلكتروني)",
        contactChannel: "قناة الاتصال والاتصال الهاتفي",
        parentKey: "رمز ولي الأمر أو المتابع الأكاديمي",
        localization: "الموقع الجغرافي والمنشأ",
        registeredAddress: "العنوان المسجل والمعتمد",
        configuration: "تكوين وإعدادات المسار",
        enabledModalities: "المهارات المعتمدة والأقسام النشطة",
        skillMasteryMatrix: "مصفوفة إتقان المهارات التفصيلية",
        calculatedExitPoints: "نقاط الخروج والتحصيل المحتسبة عبر المحاولات السابقة",
        evaluationSessionHistory: "سجل وجلسات التقييم والامتحانات السابقة",
        sessionId: "رقم الجلسة",
        assessmentModule: "وحدة التقييم والمهارة",
        exitPoints: "نقاط الخروج",
        lastActivity: "النشاط الأخير",
        outcome: "النتيجة والتحصيل",
        status: "حالة الجلسة",
        completionDate: "تاريخ الاكتمال",
        queryLoading: "جاري الاستعلام ومزامنة سجل البيانات من المنظومة...",
        noSessionHistory: "لا يوجد سجل جلسات تقييم متوفر لهذا الطالب",
        noEvaluationData: "لا توجد بيانات تقييم مسجلة لهذا المرشح حتى الآن في المنظومة.",
        institutionalReport: "تقرير وتفاصيل هوية المرشح الأكاديمية",
        proficiencyLevel: "مستوى الكفاءة المحقق",
        rawScore: "الدرجة الكلية (الخام)",
        maxReached: "أقصى مستوى محقق",
        terminationPoint: "نقطة التوقف / الإنهاء للمهارة",
        studentChoice: "إجابة الطالب",
        correctAnswer: "الإجابة الصحيحة",
        exitPoint: "نقطة الخروج",
        last5Total: "آخر 5 إجابات إجمالاً",
        born: "تاريخ الميلاد:",
        unknown: "غير معروف",
        directEnrollment: "تسجيل مباشر",
        notConfigured: "غير مهيأ",
        curriculum: "المنهج الدراسي المعتمد",
        protocol: "البروتوكول والاختبار",
        type: "نوع الطالب",
        workflow: "سير عمل المسار",
        linear: "خطي ثابت",
        adaptive: "مستمر",
        regular: "متقطع",
        placement: "تحديد مستوى",
        standard: "قياسي مبسط",
        customAllowed: "تخصيص حر مسموح به",
        skillsCompleted: "اكتملت المهارة بنجاح",
        lastMeasured: "آخر قياس:",
        candidateCardTitle: "معلومات الهوية والاتصال المعتمدة",
        systemSettings: "إعدادات وتصنيفات النظام"
    },
    en: {
        institutionalIdentity: "Institutional Identity",
        unifiedPerformanceView: "Unified student identity and comprehensive performance view",
        editProfile: "Edit Profile",
        reloadData: "Reload Data",
        registryProfile: "Registry Profile",
        performanceMatrix: "Performance Matrix",
        candidateName: "Candidate Name",
        digitalIdentifier: "Digital Identifier",
        contactChannel: "Contact Channel",
        parentKey: "Parent Key",
        localization: "Localization",
        registeredAddress: "Registered Address",
        configuration: "Workflow Configuration",
        enabledModalities: "Enabled Modalities",
        skillMasteryMatrix: "Skill Mastery Matrix",
        calculatedExitPoints: "Calculated exit points across all attempts",
        evaluationSessionHistory: "Evaluation Session History",
        sessionId: "Session ID",
        assessmentModule: "Assessment Module",
        exitPoints: "Exit Points",
        lastActivity: "Last Activity",
        outcome: "Outcome",
        status: "Status",
        completionDate: "Completion Date",
        queryLoading: "Querying Database Matrix...",
        noSessionHistory: "No evaluation session history available",
        noEvaluationData: "No evaluation data recorded for this identity.",
        institutionalReport: "Institutional Identity Report",
        proficiencyLevel: "Proficiency Level",
        rawScore: "Raw Score",
        maxReached: "Max Reached",
        terminationPoint: "Termination Point",
        studentChoice: "Student Choice",
        correctAnswer: "Correct Answer",
        exitPoint: "Exit Point",
        last5Total: "Last 5 Total",
        born: "Born:",
        unknown: "Unknown",
        directEnrollment: "Direct Enrollment",
        notConfigured: "Not Configured",
        curriculum: "Curriculum",
        protocol: "Protocol",
        type: "Type",
        workflow: "Workflow",
        linear: "Linear",
        adaptive: "Continuous",
        regular: "Discontinuous",
        placement: "Placement",
        standard: "Standard",
        customAllowed: "Custom Allowed",
        skillsCompleted: "Skill Completed Successfully",
        lastMeasured: "Last Measured:",
        candidateCardTitle: "Candidate Contact Details",
        systemSettings: "System Categories"
    }
};

const loadData = async () => {
    loading.value = true;
    try {
        const [studentRes, pctRes, skillRes] = await Promise.all([
            api.get(`/admin/students/${studentId}`),
            api.get('/admin/packages'),
            api.get('/admin/skills')
        ]);

        selectedStudent.value = studentRes.data;
        packages.value = pctRes.data;
        skills.value = skillRes.data;
    } catch (err) {
        console.error(err);
        showAlert('Failed to load student data');
        router.push('/admin/students');
    } finally {
        loading.value = false;
    }
};

const levelMap = {
    1: 'Novice Low',
    2: 'Novice Mid',
    3: 'Novice High',
    4: 'Intermediate Low',
    5: 'Intermediate Mid',
    6: 'Intermediate High',
    7: 'Advanced Low',
    8: 'Advanced Mid',
    9: 'Advanced High'
};

const getHighestLevel = async (skillId) => {
    const studentSkills = selectedStudent.value?.attempts?.flatMap(a => a.attempt_skills || []) || [];
    const skillAttempts = studentSkills.filter(s => s.skill_id === skillId);
    if (skillAttempts.length === 0) return 'Not Started';
    
    // Use achieved level (N-1 if not completed)
    const levels = skillAttempts.map(s => {
        return s.status === 'completed' ? s.max_level_reached : Math.max(s.max_level_reached - 1, 1);
    });
    
    const maxLevel = Math.max(...levels);
    return levelMap[maxLevel] || `Level ${maxLevel}`;
};

const skillMastery = computed(() => {
    if (!selectedStudent.value?.attempts) return [];

    // Aggregate best results across all attempts
    const mastery = {};

    selectedStudent.value.attempts.forEach(attempt => {
        if (!attempt.attempt_skills) return;

        attempt.attempt_skills.forEach(as => {
            const skillId = as.skill_id;
            if (!mastery[skillId] || as.max_level_reached > mastery[skillId].max_level) {
                mastery[skillId] = {
                    name: as.skill?.name || 'Unknown',
                    short_code: as.skill?.short_code,
                    max_level: as.max_level_reached,
                    level_name: as.level_name,
                    score: as.score,
                    status: as.status,
                    date: attempt.finished_at || attempt.created_at
                };
            }
        });
    });

    return Object.values(mastery);
});

const scoreColor = (score) => {
    if (!score && score !== 0) return 'text-slate-400 dark:text-slate-500';
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
};

const getSkillName = (skillId) => {
    if (!skillId) return '';
    const clean = String(skillId).toUpperCase().trim();
    const found = skills.value.find(s => {
        const sCode = String(s.short_code).toUpperCase().trim();
        return sCode === clean || 
               (clean === 'WRITT' && sCode === 'WRIT') ||
               (clean === 'WRIT' && sCode === 'WRITT') ||
               (clean === 'SPEK' && sCode === 'SPEAK') ||
               (clean === 'SPEAK' && sCode === 'SPEK');
    });
    return found ? found.name : skillId;
};

onMounted(() => {
    loadData();
});
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            
            <!-- Loading Backdrop Matrix -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{{ t[currentLang].queryLoading }}</p>
            </div>

            <div v-else class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">

                <!-- Premium Identity & Navigation Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 flex items-center gap-6">
                        <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded 
                            @click="router.push('/admin/students')" 
                            class="w-12 h-12 flex items-center justify-center border border-slate-200 hover:border-slate-300 shadow-sm bg-white shrink-0" />
                        <div>
                            <div class="flex items-center gap-2 text-xs font-extrabold text-brand-primary uppercase tracking-wider">
                                <i class="pi pi-sparkles text-brand-accent"></i>
                                <span>{{ t[currentLang].institutionalIdentity }}</span>
                            </div>
                            <h1 class="text-2xl font-black text-slate-800 tracking-tight leading-tight mt-1">
                                {{ selectedStudent.user?.first_name }} {{ selectedStudent.user?.last_name }}
                            </h1>
                            <p class="text-xs font-bold text-slate-400 mt-0.5">
                                {{ t[currentLang].unifiedPerformanceView }}
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3 relative z-10 shrink-0">
                        <Button icon="pi pi-pencil" :label="t[currentLang].editProfile" severity="secondary" outlined
                            class="text-xs font-extrabold uppercase px-6 py-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 shadow-sm transition-all"
                            @click="router.push(`/admin/students/${studentId}/edit`)" />
                        <Button icon="pi pi-refresh" :label="t[currentLang].reloadData" text
                            class="text-xs font-extrabold uppercase py-3.5 hover:text-brand-primary" 
                            @click="loadData" />
                    </div>
                </div>

                <!-- Custom Elegant Floating Tab System -->
                <Tabs value="0">
                    <TabList class="bg-transparent border-none mb-8 flex gap-4 p-0">
                        <Tab value="0" class="group p-0 border-none bg-transparent">
                            <div class="flex items-center gap-3 px-8 py-4 rounded-2xl transition-all duration-300 cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-100 group-aria-selected:bg-brand-primary group-aria-selected:text-white group-aria-selected:shadow-lg group-aria-selected:shadow-rose-100">
                                <i class="pi pi-user text-xs"></i>
                                <span class="text-xs font-black uppercase tracking-wider">{{ t[currentLang].registryProfile }}</span>
                            </div>
                        </Tab>
                        <Tab value="1" class="group p-0 border-none bg-transparent">
                            <div class="flex items-center gap-3 px-8 py-4 rounded-2xl transition-all duration-300 cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-100 group-aria-selected:bg-brand-primary group-aria-selected:text-white group-aria-selected:shadow-lg group-aria-selected:shadow-rose-100">
                                <i class="pi pi-chart-bar text-xs"></i>
                                <span class="text-xs font-black uppercase tracking-wider">{{ t[currentLang].performanceMatrix }}</span>
                            </div>
                        </Tab>
                    </TabList>

                    <TabPanels class="bg-transparent p-0">
                        <!-- Tab 1: Registry Profile Desk -->
                        <TabPanel value="0">
                            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div class="lg:col-span-2 space-y-8">
                                    <Card class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
                                        <template #content>
                                            <div class="p-8 space-y-12">
                                                <!-- Core Identity Detail Header -->
                                                <div class="flex flex-col md:flex-row items-center md:items-start gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100/80">
                                                    <div class="w-24 h-24 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-4xl font-black shadow-xl shrink-0">
                                                        {{ selectedStudent.user?.first_name?.[0] || 'S' }}
                                                    </div>
                                                    <div class="flex-1 space-y-4 text-center md:text-start">
                                                        <div class="space-y-1">
                                                            <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">{{ t[currentLang].candidateName }}</p>
                                                            <h3 class="text-3xl font-black text-slate-800 tracking-tight uppercase">
                                                                {{ selectedStudent.user?.first_name }} {{ selectedStudent.user?.last_name }}
                                                            </h3>
                                                        </div>
                                                        <div class="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                                                            <Tag :value="'CODE: ' + (selectedStudent.student_code || 'UNCODED')"
                                                                severity="info"
                                                                class="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg bg-rose-50 text-brand-primary border border-rose-100" />
                                                            <Tag :value="selectedStudent.user?.gender || 'N/A'"
                                                                severity="secondary"
                                                                class="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg bg-slate-100 text-slate-600" />
                                                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                                {{ t[currentLang].born }} {{ selectedStudent.user?.birth_date || t[currentLang].unknown }}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Identity Grid details -->
                                                <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div class="space-y-6">
                                                        <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                                            <i class="pi pi-phone text-brand-primary"></i> 
                                                            <span>{{ t[currentLang].candidateCardTitle }}</span>
                                                        </h4>
                                                        <div class="grid grid-cols-1 gap-4">
                                                            <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{{ t[currentLang].digitalIdentifier }}</p>
                                                                <p class="text-xs font-extrabold text-slate-700 truncate" :title="selectedStudent.user?.email">{{ selectedStudent.user?.email }}</p>
                                                            </div>
                                                            <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{{ t[currentLang].contactChannel }}</p>
                                                                <p class="text-xs font-extrabold text-slate-700 truncate">{{ selectedStudent.user?.phone || t[currentLang].notConfigured }}</p>
                                                            </div>
                                                            <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{{ t[currentLang].parentKey }}</p>
                                                                <p class="text-xs font-extrabold text-slate-700 truncate">{{ selectedStudent.parent_code || t[currentLang].directEnrollment }}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div class="space-y-6">
                                                        <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                                            <i class="pi pi-map-marker text-brand-primary"></i> 
                                                            <span>{{ t[currentLang].localization }}</span>
                                                        </h4>
                                                        <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 min-h-[140px] flex flex-col justify-center">
                                                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{{ t[currentLang].registeredAddress }}</p>
                                                            <p class="text-sm font-extrabold text-slate-700 leading-relaxed">{{ selectedStudent.user?.address || t[currentLang].notConfigured }}</p>
                                                            <p class="text-xs font-black text-brand-primary uppercase mt-4 tracking-widest">
                                                                {{ selectedStudent.user?.city || 'No City' }} / {{ selectedStudent.user?.country || 'Earth' }}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                    </Card>
                                </div>

                                <div class="space-y-8">
                                    <!-- Configuration System Block -->
                                    <Card class="border-none shadow-sm rounded-[2rem] overflow-hidden bg-slate-900 text-white relative">
                                        <div class="absolute right-0 top-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl"></div>
                                        <template #content>
                                            <div class="p-8 space-y-8 relative z-10">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                                                        <i class="pi pi-cog text-xs"></i>
                                                    </div>
                                                    <h3 class="text-xs font-black uppercase tracking-widest">{{ t[currentLang].configuration }}</h3>
                                                </div>
                                                <div class="space-y-4">
                                                    <div v-for="(val, key) in { 
                                                        [t[currentLang].curriculum]: selectedStudent.package?.name || t[currentLang].standard, 
                                                        [t[currentLang].protocol]: selectedStudent.category?.name || t[currentLang].placement, 
                                                        [t[currentLang].type]: selectedStudent.student_type || t[currentLang].regular, 
                                                        [t[currentLang].workflow]: selectedStudent.is_continue ? t[currentLang].continuous : t[currentLang].discontinuous 
                                                    }" :key="key" class="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                                                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ key }}</span>
                                                        <span class="text-[11px] font-black uppercase text-indigo-300">{{ val }}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                    </Card>

                                    <!-- Modalities Block -->
                                    <Card class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
                                        <template #content>
                                            <div class="p-8 space-y-6">
                                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].enabledModalities }}</p>
                                                <div class="flex flex-wrap gap-2">
                                                    <Tag v-for="skillId in selectedStudent.assigned_skills" :key="skillId"
                                                        :value="getSkillName(skillId)"
                                                        severity="secondary"
                                                        class="text-[9px] font-black uppercase tracking-widest px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200" />
                                                </div>
                                            </div>
                                        </template>
                                    </Card>
                                </div>
                            </div>
                        </TabPanel>

                        <!-- Tab 2: Performance Evaluation Matrix -->
                        <TabPanel value="1">
                            <div class="space-y-12">
                                <!-- Skill Mastery Matrix -->
                                <div class="space-y-6">
                                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4">
                                        <h4 class="text-sm font-black text-slate-800 uppercase tracking-[0.15em] flex items-center gap-3">
                                            <i class="pi pi-verified text-emerald-500"></i> 
                                            <span>{{ t[currentLang].skillMasteryMatrix }}</span>
                                        </h4>
                                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider italic">
                                            {{ t[currentLang].calculatedExitPoints }}
                                        </span>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div v-for="mastery in skillMastery" :key="mastery.short_code"
                                            class="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm group hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden">
                                            <div class="absolute right-0 top-0 w-24 h-24 bg-slate-50/60 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:bg-brand-primary/5"></div>
                                            <div class="relative z-10">
                                                <div class="flex justify-between items-start mb-6">
                                                    <div class="w-10 h-10 rounded-xl bg-brand-primary/5 text-brand-primary flex items-center justify-center font-black text-xs shrink-0">
                                                        {{ mastery.short_code }}
                                                    </div>
                                                    <Tag :value="mastery.level_name" severity="info"
                                                        class="text-[9px] font-black uppercase tracking-wider px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100" />
                                                </div>
                                                <div class="space-y-1">
                                                    <p class="text-lg font-black text-slate-800 tracking-tight uppercase leading-none truncate" :title="mastery.name">
                                                        {{ mastery.name }}
                                                    </p>
                                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                        {{ t[currentLang].proficiencyLevel }}
                                                    </p>
                                                </div>
                                                <div class="mt-8 flex items-end justify-between">
                                                    <span :class="scoreColor(mastery.score)" class="text-3xl font-black italic tracking-tighter">{{ mastery.score }}</span>
                                                    <div class="text-[8px] font-black text-slate-400 uppercase tracking-widest text-right leading-relaxed">
                                                        {{ t[currentLang].lastMeasured }}<br />
                                                        <span class="text-slate-600">{{ new Date(mastery.date).toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-GB') }}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div v-if="!skillMastery.length"
                                            class="lg:col-span-4 bg-slate-50 rounded-[2.5rem] p-16 text-center border-2 border-dashed border-slate-200">
                                            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-300">
                                                <i class="pi pi-inbox text-2xl"></i>
                                            </div>
                                            <p class="text-xs font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].noEvaluationData }}</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Evaluation History Workspace -->
                                <div class="space-y-6">
                                    <h4 class="text-sm font-black text-slate-800 uppercase tracking-[0.15em] flex items-center gap-3 px-4">
                                        <i class="pi pi-history text-indigo-500"></i> 
                                        <span>{{ t[currentLang].evaluationSessionHistory }}</span>
                                    </h4>

                                    <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                                        <div class="overflow-x-auto">
                                            <table class="w-full text-start border-collapse">
                                                <thead class="bg-slate-50/50 border-b border-slate-100 uppercase text-[9px] font-black text-slate-400 tracking-widest">
                                                    <tr>
                                                        <th class="p-6 text-start">{{ t[currentLang].sessionId }}</th>
                                                        <th class="p-6 text-start">{{ t[currentLang].assessmentModule }}</th>
                                                        <th class="p-6 text-start">{{ t[currentLang].exitPoints }}</th>
                                                        <th class="p-6 text-start">{{ t[currentLang].lastActivity }}</th>
                                                        <th class="p-6 text-center">{{ t[currentLang].outcome }}</th>
                                                        <th class="p-6 text-center">{{ t[currentLang].status }}</th>
                                                        <th class="p-6 pr-8 text-end">{{ t[currentLang].completionDate }}</th>
                                                    </tr>
                                                </thead>
                                                <tbody v-if="!selectedStudent.attempts?.length">
                                                    <tr>
                                                        <td colspan="7" class="p-16 text-center">
                                                            <div class="flex flex-col items-center space-y-4">
                                                                <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 shadow-inner">
                                                                    <i class="pi pi-inbox text-2xl"></i>
                                                                </div>
                                                                <div class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{{ t[currentLang].noSessionHistory }}</div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                                <tbody v-else>
                                                    <template v-for="attempt in selectedStudent.attempts" :key="attempt.id">
                                                        <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                                            <td class="p-6">
                                                                <div class="flex items-center gap-4">
                                                                    <div class="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black text-xs group-hover:bg-brand-primary group-hover:text-white transition-all">
                                                                        #{{ attempt.id }}
                                                                    </div>
                                                                    <div>
                                                                        <div class="font-black text-slate-800 tracking-tight">
                                                                            {{ attempt.exam?.title || 'Main Proficiency Exam' }}
                                                                        </div>
                                                                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                            {{ t[currentLang].protocol }}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td class="p-6">
                                                                <div class="flex flex-wrap gap-2">
                                                                    <Tag v-for="as in attempt.attempt_skills" :key="as.id"
                                                                        :value="`${as.skill?.short_code}: ${as.level_name}`"
                                                                        severity="secondary" class="text-[8px] font-black px-2 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-md" />
                                                                </div>
                                                            </td>
                                                            <td class="p-6">
                                                                <div v-if="attempt.attempt_skills?.length > 0" class="space-y-6 max-w-[280px]">
                                                                    <div v-for="as in attempt.attempt_skills" :key="as.id" class="space-y-3 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                                                                        <!-- Skill Badge -->
                                                                        <div class="flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-full w-fit">
                                                                            <span class="text-[8px] font-black uppercase tracking-tighter">{{ as.skill?.name }}</span>
                                                                            <div class="w-1 h-1 rounded-full bg-rose-500"></div>
                                                                            <span class="text-[8px] font-bold">{{ as.level_name }}</span>
                                                                        </div>
                                                                        
                                                                        <!-- Termination Point for THIS skill -->
                                                                        <div v-if="as.termination_point" class="space-y-2">
                                                                            <div class="text-[11px] leading-relaxed text-slate-600 font-bold italic border-r-2 border-l-2 border-brand-primary px-3 py-2 bg-brand-primary/5 rounded-lg" :title="as.termination_point.question_text">
                                                                                <div class="flex items-center justify-between mb-1">
                                                                                    <span class="text-brand-primary font-black not-italic">{{ t[currentLang].exitPoint }}:</span>
                                                                                    <span class="bg-brand-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded">ID: #{{ as.termination_point.question_id }}</span>
                                                                                </div>
                                                                                "{{ as.termination_point.question_text }}"
                                                                            </div>

                                                                            <div class="flex flex-col gap-1.5">
                                                                                <div v-if="as.termination_point.student_answer" class="text-[9px] bg-rose-50 text-rose-700 font-black px-2 py-1 rounded border border-rose-100 flex items-center gap-1.5">
                                                                                    <span class="bg-rose-600 text-white px-1.5 rounded-[3px] text-[7px] uppercase">{{ t[currentLang].studentChoice }}</span>
                                                                                    {{ as.termination_point.student_answer }}
                                                                                </div>

                                                                                <div v-if="as.termination_point.correct_answer" class="text-[9px] bg-emerald-50 text-emerald-700 font-black px-2 py-1 rounded border border-emerald-100 flex items-center gap-1.5">
                                                                                    <span class="bg-emerald-600 text-white px-1.5 rounded-[3px] text-[7px] uppercase">{{ t[currentLang].correctAnswer }}</span>
                                                                                    {{ as.termination_point.correct_answer }}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div v-else-if="as.status === 'completed'" class="text-[10px] font-black text-emerald-600 italic flex items-center gap-1.5">
                                                                            <i class="pi pi-check-circle"></i> {{ t[currentLang].skillsCompleted }}
                                                                        </div>
                                                                    </div>

                                                                    <!-- Global Recent History (Dots) -->
                                                                    <div v-if="attempt.recent_answers?.length > 0" class="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                                                                        <div v-for="(ans, idx) in attempt.recent_answers" :key="idx" 
                                                                            :class="ans.is_correct ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.2)]'"
                                                                            class="w-1.5 h-1.5 rounded-full cursor-help transition-transform hover:scale-150"
                                                                            :title="(ans.is_correct ? 'Correct: ' : 'Wrong: ') + ans.question_text + ' (' + ans.time + ')'">
                                                                        </div>
                                                                        <span class="text-[8px] font-black text-slate-300 uppercase ml-1.5 mr-1.5">{{ t[currentLang].last5Total }}</span>
                                                                    </div>
                                                                </div>
                                                                <div v-else class="text-slate-300 italic text-xs">{{ t[currentLang].notConfigured }}</div>
                                                            </td>
                                                            <td class="p-6 text-center">
                                                                <div v-if="attempt.attempt_skills?.length > 0" class="space-y-1 mb-2">
                                                                    <div v-for="as in attempt.attempt_skills" :key="as.id" class="text-[10px] font-black text-slate-700">
                                                                        {{ as.skill?.short_code }}: {{ as.score }} <span class="text-slate-300 font-normal">/ 900</span>
                                                                    </div>
                                                                </div>
                                                                <div class="pt-2 border-t border-slate-50">
                                                                    <div class="font-black text-brand-primary tracking-tight text-xs">{{ attempt.score_display }}</div>
                                                                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                                        {{ attempt.outcome_text }}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td class="p-6 text-center">
                                                                <Tag :value="attempt.status"
                                                                    :severity="attempt.status === 'completed' ? 'success' : (attempt.status === 'voided' ? 'danger' : 'warning')"
                                                                    class="text-[9px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-lg" />
                                                            </td>
                                                            <td class="p-6 pr-8 text-end font-black text-slate-400">
                                                                {{ attempt.finished_at ? new Date(attempt.finished_at).toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-GB') : 'Incomplete' }}
                                                            </td>
                                                        </tr>

                                                        <!-- Institutional details subrow details -->
                                                        <tr v-if="attempt.attempt_skills?.length > 0" class="bg-slate-50/20">
                                                            <td colspan="7" class="p-0 border-b border-slate-100/50">
                                                                <div class="px-12 py-8">
                                                                    <div class="flex items-center gap-3 mb-6">
                                                                        <div class="w-2.5 h-4 bg-brand-primary rounded-full"></div>
                                                                        <h4 class="text-xs font-black uppercase tracking-widest text-slate-800">{{ t[currentLang].institutionalReport }}</h4>
                                                                    </div>
                                                                    
                                                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        <div v-for="as in attempt.attempt_skills" :key="as.id" 
                                                                            class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:border-brand-primary/20 transition-all duration-300">
                                                                            <div class="absolute right-0 top-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-12 -mt-12 group-hover:bg-brand-primary/5 transition-colors"></div>
                                                                            
                                                                            <div class="relative z-10 space-y-4">
                                                                                <div class="flex items-center justify-between">
                                                                                    <span class="text-xs font-black text-brand-primary uppercase tracking-wider bg-rose-50 px-3 py-1 rounded-lg border border-rose-100/30">
                                                                                        {{ as.skill?.name }}
                                                                                    </span>
                                                                                    <Tag :value="as.status" 
                                                                                        :severity="as.status === 'completed' ? 'success' : 'danger'"
                                                                                        class="text-[8px] font-black uppercase px-2.5 py-1 rounded-md" />
                                                                                </div>
                                                                                
                                                                                <div class="space-y-4">
                                                                                    <div>
                                                                                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{{ t[currentLang].proficiencyLevel }}</div>
                                                                                        <div class="text-xs font-black text-slate-800">{{ as.level_name }}</div>
                                                                                    </div>
                                                                                    
                                                                                    <div class="flex items-center justify-between border-t border-slate-50 pt-3">
                                                                                        <div>
                                                                                            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{{ t[currentLang].rawScore }}</div>
                                                                                            <div class="text-xs font-black text-slate-800">{{ as.score }} <span class="text-[9px] text-slate-300 font-normal">/ 900</span></div>
                                                                                        </div>
                                                                                        <div class="text-end">
                                                                                            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{{ t[currentLang].maxReached }}</div>
                                                                                            <div class="text-xs font-black text-slate-500">L{{ as.max_level_reached }}</div>
                                                                                        </div>
                                                                                    </div>

                                                                                    <!-- Specific Exit Point for this skill -->
                                                                                    <div v-if="as.termination_point" class="mt-4 pt-4 border-t-2 border-dashed border-slate-100">
                                                                                        <div class="text-[9px] font-bold text-brand-primary uppercase tracking-wider mb-2.5 flex items-center gap-2">
                                                                                            <i class="pi pi-sign-out text-[9px]"></i> 
                                                                                            <span>{{ t[currentLang].terminationPoint }}</span>
                                                                                        </div>
                                                                                        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100/80 space-y-3">
                                                                                            <div class="flex items-center justify-between">
                                                                                                <span class="text-[9px] font-black text-slate-400 uppercase">Question #{{ as.termination_point.question_id }}</span>
                                                                                                <span class="text-[9px] font-black text-brand-primary uppercase">Level {{ as.termination_point.level_number }}</span>
                                                                                            </div>
                                                                                            <p class="text-[10px] font-bold text-slate-600 italic leading-relaxed">"{{ as.termination_point.question_text }}"</p>
                                                                                            
                                                                                            <div class="space-y-1.5 pt-1">
                                                                                                <div class="text-[9px] bg-rose-50 text-rose-700 font-black px-2.5 py-1.5 rounded-lg border border-rose-100/60 flex items-center gap-2">
                                                                                                    <span class="bg-rose-600 text-white px-1.5 py-0.5 rounded text-[8px] uppercase shrink-0">{{ t[currentLang].studentChoice }}</span>
                                                                                                    <span class="truncate" :title="as.termination_point.student_answer">{{ as.termination_point.student_answer }}</span>
                                                                                                </div>
                                                                                                <div class="text-[9px] bg-emerald-50 text-emerald-700 font-black px-2.5 py-1.5 rounded-lg border border-emerald-100/60 flex items-center gap-2">
                                                                                                    <span class="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[8px] uppercase shrink-0">{{ t[currentLang].correctAnswer }}</span>
                                                                                                    <span class="truncate" :title="as.termination_point.correct_answer">{{ as.termination_point.correct_answer }}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </template>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.arabic-theme {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

:deep(.p-tab) {
    padding: 0;
    border: none;
    background: transparent;
}

:deep(.p-tab-list) {
    border: none;
}

:deep(.p-tabpanels) {
    padding: 0;
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
