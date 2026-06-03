<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
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

const router = useRouter();


const requirements = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل شروط الجاهزية الفنية...",
        title: "جاهزية وتوافق النظام",
        subtitle: "إدارة وتعديل متطلبات توافق الأجهزة ومواصفات المتصفح وسرعة الإنترنت المطلوبة للاختبارات",
        createBtn: "إضافة فحص جديد",
        searchPlaceholder: "بحث في شروط الجاهزية الفنية...",
        colOrder: "الترتيب",
        colModule: "تفاصيل الفحص / القسم",
        colImportance: "أهمية الفحص",
        colStatus: "الحالة",
        colActions: "العمليات",
        catLabel: "تصنيف",
        catBrowser: "متصفح الويب",
        catInternet: "سرعة الإنترنت",
        catHardware: "مواصفات الجهاز",
        catOther: "أخرى",
        mandatory: "إلزامي (حرج)",
        optional: "اختياري (موصى به)",
        active: "نشط ومفعل",
        archived: "مؤرشف",
        confirmDelete: "هل أنت متأكد من رغبتك في حذف شرط الجاهزية هذا نهائياً؟",
        deleteSuccess: "تم حذف شرط الجاهزية بنجاح",
        deleteFailed: "فشل حذف شرط الجاهزية.",
        emptyTitle: "لا توجد متطلبات فنية",
        emptySubtitle: "قم بإضافة أول فحص توافق للتأكد من قدرة الطلاب على دخول بيئة الاختبار بأمان وبلا مشاكل تقنية.",
        emptyBtn: "إضافة أول فحص",
        emptySearch: "لم يتم العثور على أي شروط توافق فنية مطابقة لعملية البحث."
    },
    en: {
        loading: "Loading compatibility settings...",
        title: "System Compatibility Checks",
        subtitle: "Verify browser features, network speed, and device hardware metrics before assessment enrollment",
        createBtn: "Define Check",
        searchPlaceholder: "Search prerequisites...",
        colOrder: "Order",
        colModule: "Check Details / Category",
        colImportance: "Failure Severity",
        colStatus: "Activation Status",
        colActions: "Actions",
        catLabel: "Category",
        catBrowser: "Browser Features",
        catInternet: "Internet Connection",
        catHardware: "Hardware Metrics",
        catOther: "Other",
        mandatory: "Mandatory (Blocker)",
        optional: "Optional (Warning)",
        active: "Active",
        archived: "Archived",
        confirmDelete: "Are you sure you want to delete this technical prerequisite?",
        deleteSuccess: "Technical prerequisite removed successfully",
        deleteFailed: "Failed to remove technical prerequisite.",
        emptyTitle: "No Technical Prerequisites",
        emptySubtitle: "Create your first system requirements check to ensure candidate environments are fully compatible.",
        emptyBtn: "Define First Check",
        emptySearch: "No technical prerequisites match your search queries."
    }
};

const fetchRequirements = async () => {
    isLoading.value = true;
    try {
        const res = await api.get('/admin/system-requirements');
        requirements.value = res.data;
    } catch (err) {
        console.error(err);
        showAlert(currentLang.value === 'ar' ? 'خطأ' : 'Error', 'Failed to load requirements.');
    } finally {
        isLoading.value = false;
    }
};

const filteredRequirements = computed(() => {
    if (!searchQuery.value) return requirements.value;
    const query = searchQuery.value.toLowerCase();
    return requirements.value.filter(r => {
        return r.title.toLowerCase().includes(query) || 
               r.category.toLowerCase().includes(query) ||
               r.description?.toLowerCase().includes(query);
    });
});

const getCategoryLabel = (cat) => {
    const c = cat.toLowerCase();
    if (c === 'browser') return t[currentLang.value].catBrowser;
    if (c === 'internet') return t[currentLang.value].catInternet;
    if (c === 'hardware') return t[currentLang.value].catHardware;
    return t[currentLang.value].catOther;
};

const deleteRequirement = async (id) => {
    if (!(await showConfirm(t[currentLang.value].confirmDelete))) return;
    try {
        await api.delete(`/admin/system-requirements/${id}`);
        showAlert(currentLang.value === 'ar' ? 'تم الحذف' : 'Deleted', t[currentLang.value].deleteSuccess);
        fetchRequirements();
    } catch (err) {
        console.error(err);
        showAlert(currentLang.value === 'ar' ? 'خطأ' : 'Error', t[currentLang.value].deleteFailed);
            detail: t[currentLang.value].deleteFailed 
        }
   
};

onMounted(fetchRequirements);
</script>

<template>
    <AdminLayout>

        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            <!-- Loading Spinner -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-32 space-y-4">
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
                                 @click="router.push('/admin/system-requirements/create')" />
                    </div>
                </div>

                <!-- Registry Table Card -->
                <div v-if="requirements.length > 0 || searchQuery">
                    <Card class="border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] overflow-hidden">
                        <template #content>
                            <DataTable :value="filteredRequirements" dataKey="id" paginator :rows="10" 
                                       class="p-datatable-sm text-sm" responsiveLayout="scroll">
                                
                                <template #header>
                                    <div class="flex justify-end p-2 pb-4">
                                        <span class="relative">
                                            <i class="pi pi-search absolute text-slate-400 z-10" :class="currentLang === 'ar' ? 'right-3 top-1/2 -translate-y-1/2' : 'left-3 top-1/2 -translate-y-1/2'" />
                                            <InputText v-model="searchQuery" :placeholder="t[currentLang].searchPlaceholder" class="w-full md:w-80 shadow-sm rounded-xl" :class="currentLang === 'ar' ? 'pr-10' : 'pl-10'" />
                                        </span>
                                    </div>
                                </template>

                                <Column :header="t[currentLang].colOrder" style="width: 80px">
                                    <template #body="{ data }">
                                        <span class="font-black text-slate-400">#{{ data.order }}</span>
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colModule" style="min-width: 250px">
                                    <template #body="{ data }">
                                        <div class="flex items-center py-2" :class="currentLang === 'ar' ? 'space-x-reverse space-x-4' : 'space-x-4'">
                                             <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
                                                 <i :class="data.category === 'Browser' ? 'pi pi-compass' : 
                                                            data.category === 'Internet' ? 'pi pi-wifi' : 
                                                            data.category === 'Hardware' ? 'pi pi-desktop' : 'pi pi-cog'" 
                                                    class="text-lg"></i>
                                             </div>
                                             <div>
                                                 <div class="font-extrabold text-slate-700 tracking-tight text-sm">{{ data.title }}</div>
                                                 <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{{ getCategoryLabel(data.category) }}</div>
                                             </div>
                                        </div>
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colImportance" style="width: 150px">
                                    <template #body="{ data }">
                                        <Tag :value="data.is_mandatory ? t[currentLang].mandatory : t[currentLang].optional"
                                             :severity="data.is_mandatory ? 'danger' : 'info'"
                                             class="text-[9px] uppercase tracking-wider px-3 font-extrabold" />
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colStatus" style="width: 120px">
                                    <template #body="{ data }">
                                        <Tag :value="data.is_active ? t[currentLang].active : t[currentLang].archived"
                                             :severity="data.is_active ? 'success' : 'secondary'"
                                             class="text-[9px] uppercase tracking-wider px-3 font-extrabold" />
                                    </template>
                                </Column>

                                <Column :header="t[currentLang].colActions" :exportable="false" style="min-width: 150px">
                                    <template #body="{ data }">
                                        <div class="flex items-center space-x-2" :class="currentLang === 'ar' ? 'space-x-reverse' : ''">
                                             <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="router.push(`/admin/system-requirements/${data.id}/edit`)" />
                                             <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deleteRequirement(data.id)" />
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
                        <i class="pi pi-cog"></i>
                    </div>
                    <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight">{{ t[currentLang].emptyTitle }}</h3>
                    <p class="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                        {{ t[currentLang].emptySubtitle }}
                    </p>
                    <Button :label="t[currentLang].emptyBtn" icon="pi pi-arrow-right" iconPos="right" @click="router.push('/admin/system-requirements/create')" />
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
