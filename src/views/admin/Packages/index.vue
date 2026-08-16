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
import ProgressSpinner from 'primevue/progressspinner';


const { showAlert, showConfirm } = useModal();

const router = useRouter();


const packages = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const t = {
    loading: "Loading packages...",
    title: "Packages",
    subtitle: "Create and manage subscription packages and skill bundles",
    createBtn: "Create Package",
    placeholderSearch: "Filter by bundle name or payment gateway ID...",
    colPackage: "Package Name",
    colCapability: "Capability",
    colPrice: "Pricing Scale",
    colDuration: "Duration",
    colStudentLimit: "Student Limit",
    colStatus: "Package Status",
    colActions: "Actions",
    emptyTelemetry: "No packages found.",
    confirmDelete: "Are you sure you want to delete this package configuration?",
    deleted: "Decommissioned",
    packageRemoved: "Package removed.",
    error: "Error",
    failedDelete: "Failed to delete package.",
    activeSkills: "Active Skills",
    wpIdentifier: "WP Identifier",
    localOnly: "Local Only",
    independent: "Independent Configuration",
    tierMatrix: "Tier Structure",
    statsActiveTiers: "Active Bundles",
    statsMasteryDepth: "Mastery Depth",
    statsSyncStatus: "WP Cloud Sync",
    statsSyncOptimized: "Sync Complete",
    statsSkillsPerBundle: "Skills/Bundle",
    statsUnits: "Units",
    wpCloudSync: "WP Cloud Sync"
};

const fetchPackages = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/packages');
        packages.value = res.data;
    } catch (err) {
        console.error('Failed to load packages', err);
        showAlert(t.error, 'Failed to load packages.');
    } finally {
        loading.value = false;
    }
};

const deletePackage = async (id) => {
    if (!(await showConfirm(t.confirmDelete))) return;
    try {
        await api.delete(`/admin/packages/${id}`);
        showAlert(t.deleted, t.packageRemoved);
        fetchPackages();
    } catch (err) {
        console.error(err);
        showAlert(t.error, err.response?.data?.error || t.failedDelete);
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
        <div class="w-full">
            
            <!-- Loading Indicator -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t.loading }}</p>
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
                            @click="router.push('/admin/packages/create')" />
                    </div>
                </div>

                <!-- Stats Bar -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Stat Card 1 -->
                    <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md group relative overflow-hidden">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-10 h-10 rounded-xl bg-brand-primary/5 flex items-center justify-center text-brand-primary border border-brand-primary/10">
                                <i class="pi pi-box"></i>
                            </div>
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t.statsActiveTiers }}</span>
                        </div>
                        <h4 class="text-3xl font-black text-slate-800 tracking-tight">
                            {{ totalPackages }} 
                            <span class="text-slate-300 text-xs italic font-medium ml-1 lowercase">{{ t.statsUnits }}</span>
                        </h4>
                    </div>

                    <!-- Stat Card 2 (Accented) -->
                    <div class="bg-rose-50/20 p-8 rounded-[2rem] border border-brand-primary/10 transition-all hover:bg-white group relative overflow-hidden">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                                <i class="pi pi-chart-line"></i>
                            </div>
                            <span class="text-[9px] font-black text-brand-primary/50 uppercase tracking-widest">{{ t.statsMasteryDepth }}</span>
                        </div>
                        <h4 class="text-3xl font-black text-brand-primary tracking-tight">
                            {{ avgSkills }} 
                            <span class="text-rose-300 text-xs italic font-medium ml-1 lowercase">{{ t.statsSkillsPerBundle }}</span>
                        </h4>
                    </div>

                    <!-- Stat Card 3 -->
                    <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md group relative overflow-hidden">
                        <div class="space-y-4 w-full">
                            <div class="flex items-center justify-between">
                                <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100">
                                    <i class="pi pi-cloud animate-bounce"></i>
                                </div>
                                <div class="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            </div>
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{{ t.wpCloudSync }}</p>
                                <h4 class="text-xs font-black text-emerald-600 uppercase tracking-wider group-hover:tracking-widest transition-all">{{ t.statsSyncOptimized }}</h4>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Premium Search Bar -->
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <div class="relative w-full max-w-xl">
                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                        <InputText v-model="searchQuery"
                            :placeholder="t.placeholderSearch"
                            class="w-full pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-bold shadow-sm" />
                    </div>
                </div>

                <!-- Registry Table Card -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <DataTable :value="filteredPackages" dataKey="id" paginator :rows="10" 
                               class="p-datatable-sm text-sm" responsiveLayout="scroll">
                        
                        <Column :header="t.colPackage" style="min-width: 280px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4 py-2">
                                     <div class="w-11 h-11 rounded-2xl bg-slate-50 text-brand-primary flex items-center justify-center border border-slate-100 shadow-sm">
                                         <i class="pi pi-box text-lg"></i>
                                     </div>
                                     <div>
                                         <div class="font-black text-slate-800 uppercase tracking-tight leading-none mb-1.5">{{ data.name }}</div>
                                         <div class="text-[10px] font-bold text-slate-400 italic tracking-wide">{{ data.description || 'Institutional Metadata Not Configured' }}</div>
                                     </div>
                                 </div>
                             </template>
                         </Column>

                         <Column :header="t.colCapability" style="width: 160px" class="text-center">
                             <template #body="{ data }">
                                 <Tag :value="`${data.skills_count} ${t.activeSkills}`" 
                                      class="text-[9px] font-black uppercase tracking-widest bg-rose-50 text-brand-primary border border-brand-primary/10 px-4 py-1.5 rounded-xl shadow-sm" />
                             </template>
                         </Column>

                         <Column :header="t.colPackage" style="min-width: 220px">
                             <template #body="{ data }">
                                 <div v-if="data.exam" class="flex flex-col space-y-1">
                                     <span class="text-xs font-black text-slate-800 uppercase tracking-tight">{{ data.exam?.title }}</span>
                                     <div class="flex items-center space-x-2">
                                         <div class="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></div>
                                         <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{{ data.exam?.category?.name || 'General' }} {{ t.tierMatrix }}</span>
                                     </div>
                                 </div>
                                 <span v-else class="text-[9px] font-black text-slate-300 uppercase tracking-widest italic flex items-center bg-slate-50 px-3 py-1 rounded-lg">
                                     <i class="pi pi-link-slash text-[8px] mr-2"></i> 
                                     {{ t.independent }}
                                 </span>
                             </template>
                         </Column>

                         <Column :header="t.wpIdentifier" style="width: 140px">
                             <template #body="{ data }">
                                 <code class="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 tracking-tighter shadow-inner">
                                     {{ data.wp_package_id || t.localOnly }}
                                 </code>
                             </template>
                         </Column>

                         <Column :header="t.colActions" style="width: 120px" class="text-right">
                             <template #body="{ data }">
                                 <div class="flex justify-end gap-1.5">
                                      <Button icon="pi pi-pencil" text rounded severity="warning" size="small" @click="router.push(`/admin/packages/${data.id}/edit`)" />
                                      <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deletePackage(data.id)" />
                                 </div>
                             </template>
                         </Column>

                         <template #empty>
                             <div class="py-16 text-center space-y-3">
                                  <div class="text-4xl opacity-20">📦</div>
                                  <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t.emptyTelemetry }}</p>
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
