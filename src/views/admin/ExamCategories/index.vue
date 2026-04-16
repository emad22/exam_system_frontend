<script setup>
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
    if (!confirm('Are you sure you want to delete this category? This will fail if exams are linked to it.')) return;
    
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
            
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Assessment Tiers</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Classification Registry</p>
                </div>
                <Button label="Register Category" icon="pi pi-plus" 
                    class="px-8 py-3 rounded-2xl bg-indigo-600 border-none shadow-lg shadow-indigo-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" 
                    @click="router.push('/admin/exam-categories/create')" />
            </div>

            <!-- Registry Table Card -->
            <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredCategories" dataKey="id" paginator :rows="10" 
                        class="p-datatable-sm text-sm" responsiveLayout="scroll">
                        
                        <template #header>
                            <div class="flex justify-end p-2 pb-4">
                                <span class="relative">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                    <InputText v-model="searchQuery" placeholder="Search categories..." class="pl-10 w-full md:w-80 shadow-sm rounded-xl" />
                                </span>
                            </div>
                        </template>

                        <Column header="Classification Info" style="min-width: 250px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4">
                                    <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                                        {{ data.name[0] }}
                                    </div>
                                    <div>
                                        <div class="font-bold text-slate-700 uppercase tracking-tight">
                                            {{ data.name }}
                                        </div>
                                        <div class="text-xs text-slate-400 mt-0.5">
                                            {{ data.slug }} • ID: {{ data.id }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Metadata" style="min-width: 300px">
                            <template #body="{ data }">
                                <p class="text-xs text-slate-500 font-medium leading-relaxed italic line-clamp-2">
                                    {{ data.description || 'No descriptive context assigned to this tier.' }}
                                </p>
                            </template>
                        </Column>

                        <Column header="Capacity" style="min-width: 100px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.exams_count + ' Exams'" severity="info" class="text-[10px] uppercase tracking-wider" />
                            </template>
                        </Column>

                        <Column header="Status" style="min-width: 120px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.is_active ? 'Active' : 'Archived'" 
                                     :severity="data.is_active ? 'success' : 'danger'" 
                                     class="text-[10px] uppercase tracking-wider" />
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 150px" class="text-right">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end space-x-2">
                                    <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="router.push(`/admin/exam-categories/${data.id}/edit`)" />
                                    <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deleteCategory(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-8 text-center text-slate-400">No categories discovered in system registry.</div>
                        </template>
                    </DataTable>
                </template>
            </Card>
        </div>
    </AdminLayout>
</template>

<style scoped>
.p-datatable-custom :deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 2rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
}

.p-datatable-custom :deep(.p-datatable-tbody > tr) {
    border-bottom: 1px solid #f8fafc;
    transition: all 0.2s ease;
}

.p-datatable-custom :deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}

.p-datatable-custom :deep(.p-datatable-tbody > tr > td) {
    padding: 1rem;
}

@keyframes slide-in-bottom {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-in {
    animation: slide-in-bottom 0.8s ease-out;
}
</style>
