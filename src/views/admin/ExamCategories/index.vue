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
import ProgressSpinner from 'primevue/progressspinner';

const { showAlert, showConfirm } = useModal();

const router = useRouter();

const categories = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل تصنيفات الاختبارات...",
        title: "تصنيفات الاختبارات",
        subtitle: "إدارة وتنظيم فئات واختبارات قياس المستوى الأكاديمية والمهنية وتصنيفها",
        createBtn: "تصنيف جديد",
        placeholderSearch: "البحث بالاسم، الاسم المعرف أو الوصف...",
        colCategory: "التصنيف / الفئة",
        colDescription: "الوصف والتعريف",
        colExamsCount: "الاختبارات المرتبطة",
        colStatus: "الحالة",
        emptyTelemetry: "لم يتم العثور على أي تصنيفات في النظام حالياً...",
        confirmDelete: "هل أنت متأكد من رغبتك في حذف هذا التصنيف؟ سيفشل الحذف إذا كانت هناك اختبارات مرتبطة به.",
        deleteSuccess: "تم حذف التصنيف بنجاح",
        deleteError: "فشل الحذف. تحقق من عدم وجود اختبارات مرتبطة بالتصنيف.",
        enabled: "نشط / مفعل",
        archived: "مؤرشف"
    },
    en: {
        loading: "Loading exam categories...",
        title: "Exam Classifications",
        subtitle: "Organize academic and vocational assessments into custom tracks and categories.",
        createBtn: "Create Category",
        placeholderSearch: "Filter by name, slug or description...",
        colCategory: "Category Name",
        colDescription: "Description",
        colExamsCount: "Linked Exams",
        colStatus: "Status",
        emptyTelemetry: "No exam categories found in the system registry...",
        confirmDelete: "Are you sure you want to delete this category? This will fail if exams are linked to it.",
        deleteSuccess: "Category deleted successfully",
        deleteError: "Check for linked exams.",
        enabled: "ENABLED",
        archived: "ARCHIVED"
    }
};

const filteredCategories = computed(() => {
    if (!searchQuery.value) return categories.value;
    const query = searchQuery.value.toLowerCase();
    return categories.value.filter(c => {
        return c.name.toLowerCase().includes(query) || 
               c.slug.toLowerCase().includes(query) || 
               c.description?.toLowerCase().includes(query);
    });
});

const fetchCategories = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/exam-categories');
        categories.value = res.data;
    } catch (err) {
        console.error('Failed to load categories', err);
        showAlert(currentLang.value === 'ar' ? 'خطأ' : 'Error', t[currentLang.value].loading);
    } finally {
        loading.value = false;
    }
};

const deleteCategory = async (id) => {
    if (!(await showConfirm(t[currentLang.value].confirmDelete))) return;
    
    try {
        await api.delete(`/admin/exam-categories/${id}`);
        showAlert(currentLang.value === 'ar' ? 'تم الحذف' : 'Deleted', t[currentLang.value].deleteSuccess);
        fetchCategories();
    } catch (err) {
        console.error(err);
        showAlert(currentLang.value === 'ar' ? 'فشل الحذف' : 'Deletion Failed', err.response?.data?.message || t[currentLang.value].deleteError);
    }
};

onMounted(fetchCategories);
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            
            <!-- Loading Indicator -->
            <div v-if="loading && categories.length === 0" class="flex flex-col items-center justify-center py-32 space-y-4">
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

                        <Button :label="t[currentLang].createBtn" icon="pi pi-plus" 
                            class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-1" 
                            @click="router.push('/admin/exam-categories/create')" />
                    </div>
                </div>

                <!-- Premium Search Bar -->
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <div class="relative w-full max-w-xl">
                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                        <InputText v-model="searchQuery" :placeholder="t[currentLang].placeholderSearch" class="w-full pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-bold shadow-sm" />
                    </div>
                </div>

                <!-- Premium DataTable Card -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-6">
                    <DataTable :value="filteredCategories" dataKey="id" paginator :rows="10" 
                        class="p-datatable-sm text-sm" responsiveLayout="scroll">

                        <!-- Category Name Column -->
                        <Column :header="t[currentLang].colCategory" style="min-width: 280px">
                            <template #body="{ data }">
                                <div class="flex items-center gap-4 py-2 group">
                                    <div class="w-12 h-12 rounded-2xl bg-slate-50 text-brand-primary flex items-center justify-center font-black text-lg border border-slate-100 shadow-sm transition-all duration-300 group-hover:bg-brand-primary group-hover:text-white">
                                        {{ data.name ? data.name[0].toUpperCase() : 'C' }}
                                    </div>
                                    <div>
                                        <div class="font-extrabold text-slate-800 uppercase tracking-tight leading-none mb-1.5">
                                            {{ data.name }}
                                        </div>
                                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-wider italic opacity-85">
                                            Slug: {{ data.slug }} • ID: {{ data.id }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <!-- Description Column -->
                        <Column :header="t[currentLang].colDescription" style="min-width: 350px">
                            <template #body="{ data }">
                                <p class="text-xs text-slate-500 font-bold leading-relaxed italic line-clamp-2">
                                    {{ data.description || '-' }}
                                </p>
                            </template>
                        </Column>

                        <!-- Exams Count Column -->
                        <Column :header="t[currentLang].colExamsCount" style="width: 140px" class="text-center">
                            <template #body="{ data }">
                                <span class="px-3.5 py-1.5 rounded-xl bg-brand-primary/5 text-brand-primary font-black text-[10px] tracking-wide border border-brand-primary/10 shadow-sm">
                                    {{ data.exams_count }} {{ currentLang === 'ar' ? 'اختبارات' : 'EXAMS' }}
                                </span>
                            </template>
                        </Column>

                        <!-- Status Column -->
                        <Column :header="t[currentLang].colStatus" style="width: 140px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.is_active ? t[currentLang].enabled : t[currentLang].archived" 
                                     :severity="data.is_active ? 'success' : 'secondary'" 
                                     class="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl" />
                            </template>
                        </Column>

                        <!-- Actions Column -->
                        <Column :exportable="false" style="min-width: 120px" class="text-right">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end gap-1">
                                    <Button icon="pi pi-pencil" text rounded severity="secondary" size="small" @click="router.push(`/admin/exam-categories/${data.id}/edit`)" />
                                    <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteCategory(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <!-- Empty state slot -->
                        <template #empty>
                            <div class="py-16 text-center space-y-3">
                                 <div class="text-4xl opacity-20">📁</div>
                                 <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].emptyTelemetry }}</p>
                            </div>
                        </template>
                    </DataTable>
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
