<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';

const { showAlert, showConfirm } = useModal();

const skills = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل مهارات القياس...",
        title: "مهارات القياس والتقييم",
        subtitle: "إدارة وتصنيف مجالات ومهارات التقييم المعتمدة وتوزيع مستويات الصعوبة والأسئلة المرتبطة بها",
        createBtn: "إضافة مهارة جديدة",
        searchPlaceholder: "بحث عن مهارة بالاسم أو الرمز...",
        colSkill: "المهارة / المجال الأكاديمي",
        colShortCode: "الرمز المختصر",
        colTiers: "مستويات الصعوبة",
        colDensity: "كثافة الأسئلة",
        colActions: "العمليات",
        masterCode: "الكود الرئيسي",
        tiersCount: "مستويات مفعّلة",
        validatedItems: "سؤال معتمد",
        btnLayers: "المستويات والتدرج",
        emptySearch: "لم يتم العثور على أي مهارات تطابق عملية البحث.",
        emptyTitle: "لا توجد مهارات قياس حالياً",
        emptySubtitle: "قم بإضافة مهارات قياس وأقسام تقييم جديدة لتتمكن من إنشاء وتصنيف الأسئلة والاختبارات.",
        emptyBtn: "إضافة أول مهارة",
        confirmDelete: "هل أنت متأكد من رغبتك في حذف مهارة القياس هذه؟ سيؤثر هذا الإجراء على جميع الأسئلة المرتبطة بها.",
        deleteSuccess: "تم حذف مهارة القياس بنجاح.",
        deleteFailed: "فشل حذف مهارة القياس.",
        
        // Modal
        modalTitle: "تعديل بيانات مهارة القياس",
        modalSubtitle: "تحديث وتعديل مهارات القياس والرموز التقييمية الخاصة بالطلاب",
        fieldName: "اسم المهارة الأكاديمية",
        fieldCode: "الرمز التعريفي (الرمز المختصر)",
        placeholderName: "مثال: مهارة الاستماع",
        placeholderCode: "مثال: LISTEN",
        btnDiscard: "إلغاء وتراجع",
        btnSyncing: "جاري الحفظ والتحميل...",
        btnCommit: "حفظ التعديلات",
        updateSuccess: "تم تحديث مهارة القياس بنجاح.",
        updateFailed: "فشل تحديث بيانات مهارة القياس."
    },
    en: {
        loading: "Loading assessment domains...",
        title: "Assessment Domains",
        subtitle: "Define core academic skills, domain categories, difficulty levels, and associated items",
        createBtn: "Create Domain",
        searchPlaceholder: "Filter by name or code...",
        colSkill: "Skill Domain Name",
        colShortCode: "Short Code",
        colTiers: "Levels Configured",
        colDensity: "Logic Density",
        colActions: "Actions",
        masterCode: "Master Identity Code",
        tiersCount: "Masteries",
        validatedItems: "Validated Items",
        btnLayers: "LAYERS",
        emptySearch: "No domain definitions match your search query.",
        emptyTitle: "No Academic Domains",
        emptySubtitle: "Create your first cognitive skill domain to begin cataloging questions and structuring assessments.",
        emptyBtn: "Register First Domain",
        confirmDelete: "Are you sure you want to delete this skill? This will affect all bound questions.",
        deleteSuccess: "Skill domain removed successfully.",
        deleteFailed: "Failed to remove skill domain.",

        // Modal
        modalTitle: "Domain Refinement",
        modalSubtitle: "Adjusting Institutional Competency Profile",
        fieldName: "Cognitive Segment Name",
        fieldCode: "Identification Key (Short Code)",
        placeholderName: "Module Designation",
        placeholderCode: "E.G. LISTEN",
        btnDiscard: "Discard",
        btnSyncing: "PERSISTING...",
        btnCommit: "COMMIT UPDATE",
        updateSuccess: "Skill domain updated successfully.",
        updateFailed: "Failed to update skill."
    }
};

const filteredSkills = computed(() => {
    if (!searchQuery.value) return skills.value;
    const query = searchQuery.value.toLowerCase();
    return skills.value.filter(s => s.name.toLowerCase().includes(query) || s.short_code?.toLowerCase().includes(query));
});


const fetchSkills = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/skills');
        skills.value = res.data;
    } catch (err) {
        console.error('Failed to load skills', err);
    } finally {
        loading.value = false;
    }
};

const deleteSkill = async (id) => {
    if (!(await showConfirm(t[currentLang.value].confirmDelete))) return;
    try {
        await api.delete(`/admin/skills/${id}`);
        fetchSkills(); 
        showAlert(t[currentLang.value].deleteSuccess, 'Success', 'success');
    } catch (err) {
        showAlert(err.response?.data?.error || t[currentLang.value].deleteFailed, 'Error', 'danger');
    }
};

onMounted(fetchSkills);
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            <!-- Loading Spinner -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
            </div>

            <!-- Main Content -->
            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
                
                <!-- Premium Standardized Header Card -->
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
                         <!-- Primary Action Button (Create) -->
                         <Button :label="t[currentLang].createBtn" icon="pi pi-plus" 
                                 class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-1"
                                 @click="$router.push('/admin/skills/create')" />
                    </div>
                </div>

                <!-- Registry Table Card -->
                <div v-if="skills.length > 0 || searchQuery">
                    <Card class="border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] overflow-hidden">
                        <template #content>
                            <DataTable :value="filteredSkills" dataKey="id" paginator :rows="10" 
                                class="p-datatable-sm text-sm" responsiveLayout="scroll">
                                
                                <template #header>
                                    <div class="flex justify-end p-2 pb-4">
                                        <span class="relative">
                                            <i class="pi pi-search absolute text-slate-400 z-10" :class="currentLang === 'ar' ? 'right-3 top-1/2 -translate-y-1/2' : 'left-3 top-1/2 -translate-y-1/2'" />
                                            <InputText v-model="searchQuery" :placeholder="t[currentLang].searchPlaceholder" class="w-full md:w-80 shadow-sm rounded-xl" :class="currentLang === 'ar' ? 'pr-10' : 'pl-10'" />
                                        </span>
                                    </div>
                                </template>

                                <Column :header="t[currentLang].colSkill" style="min-width: 250px">
                                    <template #body="{ data }">
                                        <div class="flex items-center" :class="currentLang === 'ar' ? 'space-x-reverse space-x-4' : 'space-x-4'">
                                             <div class="w-10 h-10 rounded-xl bg-slate-50 text-brand-primary flex items-center justify-center font-black text-lg border border-slate-100 shadow-sm shrink-0">
                                                 {{ (data.name?.[0] || 'S').toUpperCase() }}
                                             </div>
                                             <div>
                                                 <div class="font-extrabold text-slate-700 tracking-tight text-sm">{{ data.name }}</div>
                                                 <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{{ t[currentLang].masterCode }}: {{ data.id }}</div>
                                             </div>
                                        </div>
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colShortCode" style="min-width: 100px">
                                    <template #body="{ data }">
                                        <code class="bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg text-slate-600 text-[10px] font-black uppercase tracking-widest italic">
                                            {{ data.short_code || '---' }}
                                        </code>
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colTiers" style="min-width: 150px">
                                    <template #body="{ data }">
                                        <Tag :value="`${data.levels_count || 0} ${t[currentLang].tiersCount}`" severity="success" class="text-[9px] uppercase tracking-wider px-3 py-1 rounded-lg font-extrabold" />
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colDensity" style="min-width: 150px">
                                    <template #body="{ data }">
                                        <div class="flex flex-col items-start">
                                             <span class="font-black text-slate-800 text-sm tracking-tighter">{{ data.questions_count || 0 }}</span>
                                             <span class="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">{{ t[currentLang].validatedItems }}</span>
                                        </div>
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colActions" :exportable="false" style="min-width: 200px">
                                    <template #body="{ data }">
                                        <div class="flex items-center gap-1.5" :class="currentLang === 'ar' ? 'space-x-reverse' : ''">
                                            <Button :label="t[currentLang].btnLayers" severity="info" text class="text-xs font-bold uppercase tracking-wider px-4 hover:bg-rose-50 rounded-xl" @click="$router.push(`/admin/skills/${data.id}/levels`)" />
                                            <Button icon="pi pi-pencil" text rounded severity="warning" size="small" @click="$router.push(`/admin/skills/${data.id}/edit`)" />
                                            <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteSkill(data.id)" />
                                        </div>
                                    </template>
                                </Column>

                                <template #empty>
                                    <div class="p-8 text-center text-slate-400 font-medium">{{ t[currentLang].emptySearch }}</div>
                                </template>
                            </DataTable>
                        </template>
                    </Card>
                </div>

                <!-- Empty Global State -->
                <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group mt-6">
                    <div class="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500 text-brand-accent">
                        <i class="pi pi-tags"></i>
                    </div>
                    <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight">{{ t[currentLang].emptyTitle }}</h3>
                    <p class="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                        {{ t[currentLang].emptySubtitle }}
                    </p>
                    <Button :label="t[currentLang].emptyBtn" icon="pi pi-arrow-right" iconPos="right" @click="$router.push('/admin/skills/create')" />
                </div>
            </div>
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
</style>
