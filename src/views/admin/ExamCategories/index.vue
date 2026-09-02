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
import DatePicker from 'primevue/datepicker';
import Tag from 'primevue/tag';
import CardListSkeleton from '@/components/skeletons/CardListSkeleton.vue';
import CustomPagination from '@/components/CustomPagination.vue';
import FilterBar from '@/components/FilterBar.vue';
import { watch } from 'vue';

const { showAlert, showConfirm } = useModal();

const router = useRouter();

const categories = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const dateFrom = ref(null);
const dateTo = ref(null);

const t = {
    loading: "Loading exam categories...",
    title: "Exam Categories",
    subtitle: "Organize academic and vocational assessments into custom tracks and categories.",
    createBtn: "Create Category",
    placeholderSearch: "Filter by name, slug or description...",
    colCategory: "Category Name",
    colDescription: "Description",
    colExamsCount: "Linked Exams",
    colStatus: "Status",
    emptyTelemetry: "No exam categories found.",
    confirmDelete: "Are you sure you want to delete this category? This will fail if exams are linked to it.",
    deleteSuccess: "Category deleted successfully",
    deleteError: "Check for linked exams.",
    enabled: "ENABLED",
    archived: "ARCHIVED"
};

const filteredCategories = computed(() => {
    let result = categories.value;

    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(c => {
            return c.name.toLowerCase().includes(query) || 
                   c.slug.toLowerCase().includes(query) || 
                   c.description?.toLowerCase().includes(query);
        });
    }

    if (dateFrom.value) {
        const fromTime = new Date(dateFrom.value).setHours(0, 0, 0, 0);
        result = result.filter(c => {
            if (!c.created_at) return false;
            return new Date(c.created_at).getTime() >= fromTime;
        });
    }

    if (dateTo.value) {
        const toTime = new Date(dateTo.value).setHours(23, 59, 59, 999);
        result = result.filter(c => {
            if (!c.created_at) return false;
            return new Date(c.created_at).getTime() <= toTime;
        });
    }

    return result;
});

const currentPage = ref(1);
const rowsPerPage = ref(15);

watch([searchQuery, dateFrom, dateTo], () => {
    currentPage.value = 1;
});

const resetFilters = () => {
    searchQuery.value = '';
    dateFrom.value = null;
    dateTo.value = null;
    currentPage.value = 1;
};

const paginatedCategories = computed(() => {
    const start = (currentPage.value - 1) * rowsPerPage.value;
    return filteredCategories.value.slice(start, start + rowsPerPage.value);
});

const fetchCategories = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/exam-categories');
        categories.value = res.data;
    } catch (err) {
        console.error('Failed to load categories', err);
        showAlert('Error', t.loading);
    } finally {
        loading.value = false;
    }
};

const deleteCategory = async (id) => {
    if (!(await showConfirm(t.confirmDelete))) return;
    
    try {
        await api.delete(`/admin/exam-categories/${id}`);
        showAlert('Deleted', t.deleteSuccess);
        fetchCategories();
    } catch (err) {
        console.error(err);
        showAlert('Deletion Failed', err.response?.data?.message || t.deleteError);
    }
};

onMounted(fetchCategories);
</script>

<template>
    <AdminLayout>
        <div class="w-full">
            
            <!-- Loading Indicator -->
            <div v-if="loading && categories.length === 0" class="mt-6 px-4 md:px-8">
                <CardListSkeleton :rows="5" />
            </div>

            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
                
                <!-- Premium Header Section -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 space-y-2">
                        <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                            {{ t.title }}
                        </h1>
                        <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                            {{ t.subtitle }}
                        </p>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-4 relative z-10">
                        <Button :label="t.createBtn" icon="pi pi-plus" 
                            class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-xs font-black tracking-wider uppercase transition-all hover:-translate-y-1" 
                            @click="router.push('/admin/exam-categories/create')" />
                    </div>
                </div>

                <!-- Filter Bar -->
                <FilterBar
                    v-model="searchQuery"
                    :search-placeholder="t.placeholderSearch"
                    v-model:dateFrom="dateFrom"
                    v-model:dateTo="dateTo"
                    @reset="resetFilters"
                />

                <!-- Premium DataTable Card -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-6">
                    <DataTable :value="paginatedCategories" dataKey="id"
                        class="p-datatable-sm text-sm" responsiveLayout="scroll">

                        <!-- Category Name Column -->
                        <Column :header="t.colCategory" style="min-width: 280px">
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
                        <Column :header="t.colDescription" style="min-width: 350px">
                            <template #body="{ data }">
                                <p class="text-xs text-slate-500 font-bold leading-relaxed italic line-clamp-2">
                                    {{ data.description || '-' }}
                                </p>
                            </template>
                        </Column>

                        <!-- Exams Count Column -->
                        <Column :header="t.colExamsCount" style="width: 140px" class="text-center">
                            <template #body="{ data }">
                                <span class="px-3.5 py-1.5 rounded-xl bg-brand-primary/5 text-brand-primary font-black text-[10px] tracking-wide border border-brand-primary/10 shadow-sm">
                                    {{ data.exams_count }} EXAMS
                                </span>
                            </template>
                        </Column>

                        <!-- Status Column -->
                        <Column :header="t.colStatus" style="width: 140px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.is_active ? t.enabled : t.archived" 
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
                                 <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t.emptyTelemetry }}</p>
                            </div>
                        </template>
                    </DataTable>

                    <!-- Pagination -->
                    <CustomPagination :totalRecords="filteredCategories.length" v-model:currentPage="currentPage" v-model:rowsPerPage="rowsPerPage" />
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
