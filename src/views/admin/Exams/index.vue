<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useAdminStore } from '@/stores/admin';

import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import InputNumber from 'primevue/inputnumber';

const { showAlert, showConfirm } = useModal();

const router = useRouter();
const exams = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل سجل الاختبارات...",
        title: "سجل الاختبارات المتاحة",
        subtitle: "إعداد وتصميم اختبارات قياس المستوى الأكاديمية والتكيفية وتوزيع الأسئلة للطلاب",
        createBtn: "اختبار جديد",
        placeholderSearch: "البحث بالعنوان، المهارة أو التصنيف الأكاديمي...",
        colExamInfo: "تفاصيل الاختبار",
        colStructure: "هيكل وتوزيع مهارات الاختبار",
        colAttempts: "المحاولات المنجزة",
        colActions: "إجراءات",
        emptyTelemetry: "لم يتم العثور على أي اختبارات في النظام حالياً...",
        totalExams: "إجمالي الاختبارات",
        defaultExams: "الاختبارات الافتراضية",
        active: "نشط",
        mapped: "معين",
        passingScore: "درجة النجاح",
        target: "المستهدف",
        default: "افتراضي",
        noDesc: "لا يوجد وصف محدد لهذا الاختبار",
        universal: "عالمي / شامل",
        confirmDelete: "هل أنت متأكد من رغبتك في حذف هذا الاختبار نهائياً؟",
        confirmDefault: "هل ترغب في تعيين \"{title}\" كاختبار افتراضي لتصنيف {category}؟",
        deleteSuccess: "تم حذف الاختبار بنجاح",
        deleteError: "فشل حذف الاختبار",
        defaultSuccess: "تم تعيين الاختبار كافتراضي",
        defaultError: "فشل تعيين الاختبار الافتراضي",
        rulesHeader: "قواعد وهيكل الأسئلة للاختبار: {title}",
        saveBtn: "حفظ القواعد",
        saving: "جاري الحفظ...",
        totalQs: "إجمالي {count} أسئلة",
        levelShort: "مستوى {num}",
        noQsMapped: "لا توجد أسئلة معينة لهذه المهارة",
        emptyExamsText: "ابدأ بإنشاء أول اختبار لك في النظام الآن.",
        createFirstBtn: "أنشئ أول اختبار",
        rulesModalTitle: "تعديل قواعد الأسئلة"
    },
    en: {
        loading: "Loading exams registry...",
        title: "Exams Registry",
        subtitle: "Design and deploy assessment templates, adaptive structures, and mastery scopes.",
        createBtn: "Create Exam",
        placeholderSearch: "Filter by title, domain, or classification...",
        colExamInfo: "Exam Information",
        colStructure: "Exam Structure",
        colAttempts: "Attempts",
        colActions: "Actions",
        emptyTelemetry: "No exams found in the system registry...",
        totalExams: "Total Exams",
        defaultExams: "Default Exams",
        active: "Active",
        mapped: "Mapped",
        passingScore: "Passing Score",
        target: "Target",
        default: "DEFAULT",
        noDesc: "No Description",
        universal: "UNIVERSAL",
        confirmDelete: "Are you sure you want to delete this exam permanently?",
        confirmDefault: "Set \"{title}\" as default for {category}?",
        deleteSuccess: "Exam deleted successfully",
        deleteError: "Failed to delete exam",
        defaultSuccess: "Exam set as default successfully",
        defaultError: "Failed to set default exam",
        rulesHeader: "Question Rules for {title}",
        saveBtn: "Save Rules",
        saving: "Saving...",
        totalQs: "Total: {count} Qs",
        levelShort: "L{num}",
        noQsMapped: "No questions mapped",
        emptyExamsText: "Get started by creating your first exam.",
        createFirstBtn: "Create First Exam",
        rulesModalTitle: "Configure Exam Rules"
    }
};

const filteredExams = computed(() => {
    if (!searchQuery.value) return exams.value;
    const query = searchQuery.value.toLowerCase();
    return exams.value.filter(e => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const cat = (e.category?.name || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || cat.includes(query);
    });
});

const stats = computed(() => {
    const total = exams.value.length;
    const defaultExams = exams.value.filter(e => e.is_default).length;
    return { total, defaultExams };
});

const showRulesModal = ref(false);
const selectedExam = ref(null);
const isSavingRules = ref(false);
const rulesForm = ref({
    skills: []
});

const fetchExams = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/exams');
        exams.value = res.data;
    } catch (err) {
        showAlert(currentLang.value === 'ar' ? 'فشل تحميل الاختبارات' : 'Failed to load exams', 'Error', 'error');
    } finally {
        loading.value = false;
    }
};

const openRules = async (exam) => {
    selectedExam.value = exam;
    showRulesModal.value = true;
    try {
        const [examRes, skillRes] = await Promise.all([
            api.get(`/admin/exams/${exam.id}`),
            api.get('/admin/skills-with-levels')
        ]);
        
        const fullExam = examRes.data;
        const allSkills = skillRes.data;
        
        rulesForm.value.skills = fullExam.skills.map(skill => {
            const skillDetails = allSkills.find(s => s.id === skill.id);
            const levelRules = (fullExam.question_rules || []).filter(r => r.skill_id === skill.id);
            
            const rules = (skillDetails?.levels || []).map(lvl => {
                const existing = levelRules.find(r => r.level_id === lvl.level_number);
                return {
                    id: existing?.id || null,
                    level_id: lvl.level_number,
                    quantity: existing?.quantity ?? 0,
                    standalone_quantity: existing?.standalone_quantity ?? 0,
                    passage_quantity: existing?.passage_quantity ?? 0
                };
            });

            return {
                skill_id: skill.id,
                name: skill.name,
                duration: skill.pivot.duration,
                is_optional: !!skill.pivot.is_optional,
                rules: rules
            };
        });
    } catch (err) {
        showAlert(currentLang.value === 'ar' ? 'فشل تحميل قواعد الاختبار' : 'Failed to load exam rules', 'Error', 'error');
    }
};

const saveRules = async () => {
    isSavingRules.value = true;
    try {
        await api.patch(`/admin/exams/${selectedExam.value.id}`, {
            title: selectedExam.value.title,
            passing_score: selectedExam.value.passing_score,
            exam_category_id: selectedExam.value.exam_category_id,
            language_id: selectedExam.value.language_id,
            is_adaptive: selectedExam.value.is_adaptive,
            skills: rulesForm.value.skills
        });
        showRulesModal.value = false;
        fetchExams();
    } catch (err) {
        showAlert(currentLang.value === 'ar' ? 'فشل حفظ القواعد' : 'Failed to save rules', 'Error', 'error');
    } finally {
        isSavingRules.value = false;
    }
};

const setDefaultExam = async (exam) => {
    const message = t[currentLang.value].confirmDefault
        .replace('{title}', exam.title)
        .replace('{category}', exam.category?.name || (currentLang.value === 'ar' ? 'عام' : 'General'));

    if (!(await showConfirm(message))) return;
    try {
        await api.patch(`/admin/exams/${exam.id}/set-default`);
        fetchExams();
    } catch (err) {
        showAlert(t[currentLang.value].defaultError, 'Error', 'error');
    }
};

const deleteExam = async (id) => {
    if (!(await showConfirm(t[currentLang.value].confirmDelete))) return;
    try {
        await api.delete(`/admin/exams/${id}`);
        fetchExams();
    } catch (err) {
        showAlert(t[currentLang.value].deleteError, 'Error', 'error');
    }
};

onMounted(fetchExams);
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            
            <!-- Loading Indicator -->
            <div v-if="loading && exams.length === 0" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
            </div>

            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
                
                <!-- Premium Header Section -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 space-y-2">
                        <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                            {{ t[currentLang].title }}
                        </h1>
                        <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                            {{ t[currentLang].subtitle }}
                        </p>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-4 relative z-10">
                        
                        <!-- Language Selector Toggle -->
                        <button @click="toggleLang" class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 font-extrabold text-xs">
                            <i class="pi pi-globe text-brand-primary"></i>
                            <span>{{ currentLang === 'ar' ? 'English' : 'العربية' }}</span>
                        </button>
                        <Button :label="t[currentLang].createBtn" icon="pi pi-plus" class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-1 animate-pulse" @click="router.push('/admin/exams/create')" />
                    </div>
                </div>

                <div v-if="exams.length > 0 || searchQuery" class="space-y-6">
                    
                    <!-- Integrated Search & HUD Stats -->
                    <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
                        <div class="relative w-full max-w-xl">
                            <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                            <InputText v-model="searchQuery" :placeholder="t[currentLang].placeholderSearch" class="w-full pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-bold shadow-sm" />
                        </div>
                        
                        <div class="hidden md:flex items-center gap-6 border-s border-slate-100 ps-6">
                            <div class="flex flex-col items-end">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].totalExams }}</span>
                                <span class="text-lg font-black text-slate-800 mt-0.5">{{ exams.length }} {{ t[currentLang].active }}</span>
                            </div>
                            <div class="w-px h-8 bg-slate-100"></div>
                            <div class="flex flex-col items-end">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].defaultExams }}</span>
                                <span class="text-lg font-black text-brand-primary mt-0.5">{{ stats.defaultExams }} {{ t[currentLang].mapped }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Premium DataTable Card -->
                    <Card class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden pb-4 bg-white">
                        <template #content>
                            <DataTable :value="filteredExams" dataKey="id" paginator :rows="10" 
                                class="p-datatable-sm text-sm" responsiveLayout="scroll">

                                <!-- Exam Information Column -->
                                <Column :header="t[currentLang].colExamInfo" style="min-width: 350px">
                                    <template #body="{ data }">
                                        <div class="flex items-center gap-4 py-3">
                                            <div @click="setDefaultExam(data)" :class="data.is_default ? 'bg-brand-primary text-white shadow-lg shadow-rose-200' : 'bg-slate-50 text-slate-400 border border-slate-100'"
                                                class="w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 transform hover:scale-105 shrink-0 cursor-pointer">
                                                 <i :class="data.is_default ? 'pi pi-star-fill' : 'pi pi-file-edit'" class="text-xl"></i>
                                            </div>
                                            <div class="min-w-0">
                                                 <div class="flex items-center gap-2">
                                                     <div class="font-extrabold text-slate-800 text-base truncate leading-tight">{{ data.title }}</div>
                                                     <Tag v-if="data.is_default" :value="t[currentLang].default" severity="success" class="text-[8px] font-black px-2.5 py-0.5 rounded-xl border-none shadow-sm" />
                                                 </div>
                                                 <div class="text-[10px] text-slate-400 font-bold line-clamp-1 italic mt-1">{{ data.description || t[currentLang].noDesc }}</div>
                                                 
                                                 <div class="flex items-center gap-2 mt-3">
                                                     <span class="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200 uppercase tracking-wider">
                                                         {{ data.language?.name || t[currentLang].universal }}
                                                     </span>
                                                     <span class="text-[9px] font-black bg-rose-50 text-brand-primary px-2 py-0.5 rounded-lg border border-rose-100 uppercase tracking-wider">
                                                         {{ t[currentLang].target }}: {{ data.passing_score }}%
                                                     </span>
                                                 </div>
                                            </div>
                                        </div>
                                    </template>
                                </Column>

                                <!-- Exam Structure Column -->
                                <Column :header="t[currentLang].colStructure" style="min-width: 320px">
                                    <template #body="{ data }">
                                        <div class="space-y-4 py-2">
                                            <div v-for="skill in data.skills" :key="skill.id" class="space-y-1">
                                                <div class="flex items-center justify-between border-b border-slate-50 pb-1">
                                                    <div class="flex items-center gap-1.5">
                                                        <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                        <span class="text-[10px] font-black text-slate-700 uppercase tracking-tight">{{ skill.name }}</span>
                                                    </div>
                                                    <span class="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                        {{ t[currentLang].totalQs.replace('{count}', data.breakdown?.filter(b => b.skill_id === skill.id).reduce((acc, curr) => acc + curr.count, 0) || 0) }}
                                                    </span>
                                                </div>
                                                <div class="flex flex-wrap gap-1 ml-4 rtl:mr-4 rtl:ml-0">
                                                    <div v-for="lvlBreakdown in data.breakdown?.filter(b => b.skill_id === skill.id).sort((a, b) => a.level_id - b.level_id)" 
                                                         :key="lvlBreakdown.level_id"
                                                         class="flex items-center bg-white border border-slate-100 px-2 py-0.5 rounded-md shadow-sm">
                                                        <span class="text-[8px] font-black text-slate-400 me-1.5">{{ t[currentLang].levelShort.replace('{num}', lvlBreakdown.level_id) }}</span>
                                                        <span class="text-[9px] font-black text-brand-primary">{{ lvlBreakdown.count }}</span>
                                                    </div>
                                                    <div v-if="!data.breakdown?.some(b => b.skill_id === skill.id)" class="text-[8px] font-bold text-slate-300 italic uppercase">
                                                        {{ t[currentLang].noQsMapped }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </Column>

                                <!-- Attempts Count Column -->
                                <Column :header="t[currentLang].colAttempts" style="width: 140px" class="text-center">
                                    <template #body="{ data }">
                                         <div class="flex flex-col items-center">
                                             <div class="font-black text-slate-800 text-base tracking-tighter">{{ data.attempts_count || 0 }}</div>
                                             <div class="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{{ t[currentLang].colAttempts }}</div>
                                         </div>
                                    </template>
                                </Column>

                                <!-- Actions Column -->
                                <Column :exportable="false" style="min-width: 120px" class="text-right">
                                    <template #body="{ data }">
                                        <div class="flex items-center justify-end gap-1">
                                            <Button icon="pi pi-pencil" text rounded severity="secondary" size="small" @click="router.push(`/admin/exams/${data.id}/edit`)" />
                                            <Button icon="pi pi-cog" text rounded severity="info" size="small" @click="openRules(data)" />
                                            <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteExam(data.id)" />
                                        </div>
                                    </template>
                                </Column>
                            </DataTable>
                        </template>
                    </Card>
                </div>

                <!-- Empty State -->
                <div v-else class="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-24 text-center mt-6 animate-in zoom-in-95 duration-700">
                    <div class="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-5xl shadow-inner">?</div>
                    <h3 class="text-2xl font-black text-slate-800 mb-4 tracking-tight uppercase">{{ t[currentLang].emptyTelemetry }}</h3>
                    <p class="text-slate-400 font-bold max-w-sm mx-auto mb-8 text-sm leading-relaxed tracking-wide opacity-80">
                        {{ t[currentLang].emptyExamsText }}
                    </p>
                    <Button :label="t[currentLang].createFirstBtn" icon="pi-arrow-right" iconPos="right" class="px-10 py-4 bg-brand-primary border-none rounded-2xl shadow-xl shadow-rose-100 font-black text-xs uppercase tracking-wider hover:-translate-y-1 transition-all" @click="router.push('/admin/exams/create')" />
                </div>
            </div>

            <!-- Rules Modal dialog in Cairo theme -->
            <Dialog v-model:visible="showRulesModal" :modal="true" :draggable="false" class="w-full max-w-3xl rounded-[2rem] overflow-hidden" :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
                <template #header>
                    <div class="flex flex-col">
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].rulesModalTitle }}</span>
                        <span class="text-base font-black text-slate-800 mt-1" v-if="selectedExam">{{ t[currentLang].rulesHeader.replace('{title}', selectedExam.title) }}</span>
                    </div>
                </template>
                
                <div v-if="selectedExam" class="space-y-6 p-4">
                    <div v-for="skill in rulesForm.skills" :key="skill.skill_id" class="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                            <span class="text-sm font-black text-slate-800 uppercase tracking-tight">{{ skill.name }}</span>
                            <span class="text-xs font-extrabold text-slate-400 bg-white px-3 py-1 rounded-xl border border-slate-200">
                                {{ skill.duration }} {{ currentLang === 'ar' ? 'دقائق' : 'minutes' }}
                            </span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div v-for="rule in skill.rules" :key="rule.level_id" class="bg-white p-4 rounded-xl border border-slate-100 space-y-3 shadow-sm">
                                <div class="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">
                                    {{ t[currentLang].levelShort.replace('{num}', rule.level_id) }}
                                </div>
                                <div class="flex flex-col space-y-1">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-wider">{{ currentLang === 'ar' ? 'عدد الأسئلة' : 'Questions Quantity' }}</label>
                                    <InputNumber v-model="rule.quantity" class="w-full text-xs font-bold" :min="0" showButtons />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button :label="currentLang === 'ar' ? 'إلغاء' : 'Cancel'" text severity="secondary" @click="showRulesModal = false" class="text-xs font-bold rounded-xl" />
                        <Button :label="isSavingRules ? t[currentLang].saving : t[currentLang].saveBtn" :loading="isSavingRules" class="bg-brand-primary border-none text-xs font-black px-6 py-2.5 rounded-xl shadow-lg shadow-rose-100" @click="saveRules" />
                    </div>
                </div>
            </Dialog>
        </div>
    </AdminLayout>
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
:deep(.p-dialog .p-dialog-header) {
    background: #fbfcfe;
    padding: 2rem;
    border-bottom: 1px solid #f1f5f9;
}
</style>
