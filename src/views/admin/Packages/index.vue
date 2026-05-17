<script setup>
import { useModal } from '@/composables/useModal';
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

const { showAlert, showConfirm } = useModal();

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
    if (!(await showConfirm('Are you sure you want to delete this package configuration?'))) return;
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
        <div class="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-12">
            
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
                <div>
                     <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Assessment Bundles</h1>
                     <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Configure skill matrices and e-commerce integrations</p>
                </div>
                <div class="flex items-center space-x-3">
                    <Button label="Initialize Bundle" icon="pi pi-plus" 
                        class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" 
                        @click="router.push('/admin/packages/create')" />
                </div>
            </div>

            <!-- Stats Bar -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Stat Card 1 -->
                <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md group">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-10 h-10 rounded-xl bg-brand-primary/5 flex items-center justify-center text-brand-primary">
                            <i class="pi pi-box"></i>
                        </div>
                        <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Active Tiers</span>
                    </div>
                    <h4 class="text-3xl font-black text-slate-800 tracking-tight">{{ totalPackages }} <span class="text-slate-300 text-xs italic font-medium ml-1 lowercase">Units</span></h4>
                </div>

                <!-- Stat Card 2 (Accented) -->
                <div class="bg-rose-50/50 p-8 rounded-3xl border border-brand-primary/10 transition-all hover:bg-white group">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                            <i class="pi pi-chart-line"></i>
                        </div>
                        <span class="text-[8px] font-black text-brand-primary/50 uppercase tracking-widest">Mastery Depth</span>
                    </div>
                    <h4 class="text-3xl font-black text-brand-primary tracking-tight">{{ avgSkills }} <span class="text-rose-300 text-xs italic font-medium ml-1 lowercase">Skills/Bundle</span></h4>
                </div>

                <!-- Stat Card 3 -->
                <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md group">
                    <div class="space-y-4 w-full">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                                <i class="pi pi-cloud"></i>
                            </div>
                            <div class="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">WP Cloud Sync</p>
                            <h4 class="text-xs font-black text-emerald-600 uppercase tracking-wider group-hover:tracking-widest transition-all">Protocol Optimized</h4>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Unit Registry...</p>
            </div>

            <!-- Registry Table Card -->
            <Card v-else class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredPackages" dataKey="id" paginator :rows="10" 
                               class="p-datatable-sm text-sm" responsiveLayout="scroll">
                        
                        <template #header>
                            <div class="flex flex-col md:flex-row justify-end items-center gap-4 p-2 pb-4">
                                <div class="w-full md:w-80">
                                    <span class="relative">
                                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                                        <InputText v-model="searchQuery" placeholder="Filter by bundle name..." class="pl-12 w-full shadow-sm rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300" />
                                    </span>
                                </div>
                            </div>
                        </template>

                        <Column header="Institutional Asset" style="min-width: 280px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4 py-2">
                                     <div class="w-11 h-11 rounded-2xl bg-slate-50 text-brand-primary flex items-center justify-center border border-slate-100 shadow-sm group-hover:bg-brand-primary group-hover:text-white transition-all">
                                         <i class="pi pi-box text-lg"></i>
                                     </div>
                                     <div>
                                         <div class="font-black text-slate-800 uppercase tracking-tight leading-none mb-1.5">{{ data.name }}</div>
                                         <div class="text-[9px] font-bold text-slate-400 italic tracking-wide">{{ data.description || 'Institutional Metadata Not Configured' }}</div>
                                     </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Capability" style="width: 160px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="`${data.skills_count} ACTIVE SKILLS`" 
                                     class="text-[9px] font-black uppercase tracking-widest bg-rose-50 text-brand-primary border border-brand-primary/10 px-4 py-1.5 rounded-xl shadow-sm" />
                            </template>
                        </Column>

                        <Column header="Matrix Mapping" style="min-width: 220px">
                            <template #body="{ data }">
                                <div v-if="data.exam" class="flex flex-col space-y-1">
                                    <span class="text-[10px] font-black text-slate-800 uppercase tracking-tight">{{ data.exam?.title }}</span>
                                    <div class="flex items-center space-x-2">
                                        <div class="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></div>
                                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">{{ data.exam?.category?.name || 'General' }} Tier matrix</span>
                                    </div>
                                </div>
                                <span v-else class="text-[9px] font-black text-slate-300 uppercase tracking-widest italic flex items-center bg-slate-50 px-3 py-1 rounded-lg">
                                    <i class="pi pi-link-slash mr-2 text-[8px]"></i> Independent Configuration
                                </span>
                            </template>
                        </Column>

                        <Column header="WP Identifier" style="width: 140px">
                            <template #body="{ data }">
                                <code class="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 tracking-tighter shadow-inner group-hover:text-brand-primary transition-colors">
                                    {{ data.wp_package_id || 'LOCAL-ONLY' }}
                                </code>
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 150px" class="text-right">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end space-x-2">
                                     <Button icon="pi pi-pencil" text severity="warning" size="small" @click="router.push(`/admin/packages/${data.id}/edit`)" />
                                     <Button icon="pi pi-trash" text severity="danger" size="small" @click="deletePackage(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-16 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">Operational registry is currently empty.</div>
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
