<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

const router = useRouter();
const toast = useToast();

const packages = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const fetchPackages = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/packages');
        packages.value = res.data;
    } catch (err) {
        console.error('Failed to load packages', err);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to access package registry.' });
    } finally {
        loading.value = false;
    }
};

const deletePackage = async (id) => {
    if (!confirm('Are you sure you want to delete this package configuration?')) return;
    try {
        await api.delete(`/admin/packages/${id}`);
        toast.add({ severity: 'success', summary: 'Decommissioned', detail: 'Package removed from matrix.' });
        fetchPackages();
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.error || 'Failed to delete package.' });
    }
};

const filteredPackages = computed(() => {
    if (!searchQuery.value) return packages.value;
    const query = searchQuery.value.toLowerCase();
    return packages.value.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.wp_package_id?.toString().includes(query) ||
        p.exam?.title?.toLowerCase().includes(query)
    );
});

// Stats
const totalPackages = computed(() => packages.value.length);
const avgSkills = computed(() => {
    if (packages.value.length === 0) return 0;
    const total = packages.value.reduce((acc, p) => acc + p.skills_count, 0);
    return (total / packages.value.length).toFixed(1);
});

onMounted(fetchPackages);
</script>

<template>
    <AdminLayout>
        <Toast />
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">
            
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between space-y-6 md:space-y-0">
                <div>
                     <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Assessment bundles</h1>
                     <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Configure skill matrices and e-commerce integrations</p>
                </div>
                <div class="flex items-center space-x-3">
                    <Button label="Initialize Package" icon="pi pi-plus" 
                        class="px-8 py-3 rounded-2xl bg-indigo-600 border-none shadow-lg shadow-indigo-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" 
                        @click="router.push('/admin/packages/create')" />
                </div>
            </div>

            <!-- Stats Bar -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Active Tiers</p>
                    <h4 class="text-2xl font-black text-slate-800 tracking-tight">{{ totalPackages }} <span class="text-slate-300 text-sm italic font-medium ml-1">Units</span></h4>
                </div>
                <div class="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100 transition-all hover:bg-white">
                    <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 italic">Average Depth</p>
                    <h4 class="text-2xl font-black text-indigo-900 tracking-tight">{{ avgSkills }} <span class="text-indigo-300 text-sm italic font-medium ml-1">Skills/Bundle</span></h4>
                </div>
                <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md group">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">WP Sync Status</p>
                        <h4 class="text-xs font-black text-emerald-600 uppercase tracking-wider group-hover:tracking-widest transition-all">Operational</h4>
                    </div>
                    <div class="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Unit Registry...</p>
            </div>

            <!-- Registry Table Card -->
            <Card v-else class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredPackages" dataKey="id" paginator :rows="10" 
                               class="p-datatable-sm text-sm" responsiveLayout="scroll">
                        
                        <template #header>
                            <div class="flex flex-col md:flex-row justify-end items-center gap-4 p-2 pb-4">
                                <div class="w-full md:w-80">
                                    <span class="relative">
                                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                                        <InputText v-model="searchQuery" placeholder="Search bundles..." class="pl-12 w-full shadow-sm rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300" />
                                    </span>
                                </div>
                            </div>
                        </template>

                        <Column header="ID" style="width: 80px">
                            <template #body="{ data }">
                                <span class="font-bold text-slate-300 italic">#{{ String(data.id).padStart(3, '0') }}</span>
                            </template>
                        </Column>

                        <Column header="Package Identity" style="min-width: 250px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4 py-2">
                                     <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shadow-sm border border-slate-200/50">
                                         <i class="pi pi-box text-lg"></i>
                                     </div>
                                     <div>
                                         <div class="font-black text-slate-700 uppercase tracking-tight">{{ data.name }}</div>
                                         <div class="text-[9px] font-bold text-slate-400 italic">{{ data.description || 'No descriptive narrative' }}</div>
                                     </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Capacity" style="width: 140px">
                            <template #body="{ data }">
                                <Tag :value="`${data.skills_count} Skills`" 
                                     class="text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100/50 px-3 py-1 rounded-lg" />
                            </template>
                        </Column>

                        <Column header="Linked Assessment" style="min-width: 180px">
                            <template #body="{ data }">
                                <div v-if="data.exam" class="flex flex-col">
                                    <span class="text-[10px] font-black text-slate-600 uppercase tracking-tight">{{ data.exam?.title }}</span>
                                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{{ data.exam?.category?.name || 'General' }} Matrix</span>
                                </div>
                                <span v-else class="text-[9px] font-black text-slate-300 uppercase tracking-widest italic flex items-center">
                                    <i class="pi pi-link-slash mr-2 text-[8px]"></i> Independent
                                </span>
                            </template>
                        </Column>

                        <Column header="WP ID" style="width: 120px">
                            <template #body="{ data }">
                                <code class="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 tracking-tighter shadow-inner">
                                    {{ data.wp_package_id || 'NULL' }}
                                </code>
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 150px" class="text-right pr-6">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end space-x-2">
                                     <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="router.push(`/admin/packages/${data.id}/edit`)" />
                                     <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deletePackage(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No bundle configurations established.</div>
                        </template>
                    </DataTable>
                </template>
            </Card>
        </div>
    </AdminLayout>
</template>

<style scoped>
@keyframes slide-in-bottom {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-in {
    animation: slide-in-bottom 0.8s ease-out;
}

:deep(.p-datatable-header) {
    background: transparent;
    border: none;
    padding: 1.5rem 1.5rem 0.5rem 1.5rem;
}
</style>
