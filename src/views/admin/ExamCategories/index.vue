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
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import ProgressSpinner from 'primevue/progressspinner';

const { showAlert, showConfirm } = useModal();

const router = useRouter();
const toast = useToast();
const categories = ref([]);
const loading = ref(true);
const searchQuery = ref('');

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
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load categories.' });
    } finally {
        loading.value = false;
    }
};

const deleteCategory = async (id) => {
    if (!(await showConfirm('Are you sure you want to delete this category? This will fail if exams are linked to it.'))) return;
    
    try {
        await api.delete(`/admin/exam-categories/${id}`);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Category removed.' });
        fetchCategories();
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Deletion Failed', detail: err.response?.data?.message || 'Check for linked exams.' });
    }
};

onMounted(fetchCategories);
</script>

<template>
    <AdminLayout>
        <Toast />
        <div class="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-12">
            
            <!-- Standardized Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Assessment Tiers</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Classification and Lifecycle Management</p>
                </div>
                <Button label="Register Category" icon="pi pi-plus" 
                    class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" 
                    @click="router.push('/admin/exam-categories/create')" />
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Classification Registry...</p>
            </div>

            <!-- Registry Table Card -->
            <Card v-else class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredCategories" dataKey="id" paginator :rows="10" 
                        class="p-datatable-sm text-sm" responsiveLayout="scroll">
                        
                        <template #header>
                            <div class="flex justify-end p-2 pb-4">
                                <span class="relative">
                                    <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                                    <InputText v-model="searchQuery" placeholder="Filter by name, slug or metadata..." class="pl-12 w-full md:w-96 shadow-sm rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-bold uppercase tracking-tight" />
                                </span>
                            </div>
                        </template>

                        <Column header="Institutional Entity" style="min-width: 280px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-6 py-2">
                                    <div class="w-12 h-12 rounded-2xl bg-slate-50 text-brand-primary flex items-center justify-center font-black text-lg border border-slate-100 shadow-sm group-hover:bg-brand-primary group-hover:text-white transition-all">
                                        {{ data.name[0].toUpperCase() }}
                                    </div>
                                    <div>
                                        <div class="font-black text-slate-800 uppercase tracking-tight leading-none mb-1.5">
                                            {{ data.name }}
                                        </div>
                                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] italic opacity-80">
                                            Ref: {{ data.slug }} • Registry ID: {{ data.id }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Institutional Narrative" style="min-width: 350px">
                            <template #body="{ data }">
                                <p class="text-xs text-slate-500 font-medium leading-relaxed italic line-clamp-2">
                                    {{ data.description || 'No descriptive narrative has been assigned to this classification tier.' }}
                                </p>
                            </template>
                        </Column>

                        <Column header="Logic Density" style="width: 140px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.exams_count + ' ACTIVE MATRICES'" class="text-[9px] font-black uppercase tracking-widest bg-rose-50 text-brand-primary border border-brand-primary/5 px-4 py-1.5 rounded-xl shadow-sm" />
                            </template>
                        </Column>

                        <Column header="Operational Status" style="width: 140px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.is_active ? 'ENABLED' : 'ARCHIVED'" 
                                     :severity="data.is_active ? 'success' : 'secondary'" 
                                     class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 150px" class="text-right pr-6">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end space-x-2">
                                    <Button icon="pi pi-pencil" text severity="secondary" @click="router.push(`/admin/exam-categories/${data.id}/edit`)" />
                                    <Button icon="pi pi-trash" text severity="danger" @click="deleteCategory(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-16 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">No classification discovery data in operational registry.</div>
                        </template>
                    </DataTable>
                </template>
            </Card>
        </div>
    </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
:deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 1.5rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
}
:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
</style>
