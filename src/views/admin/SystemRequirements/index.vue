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
import CardListSkeleton from '@/components/skeletons/CardListSkeleton.vue';


const { showAlert, showConfirm } = useModal();

const router = useRouter();


const requirements = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');

const labels = {
    loading: "Loading system requirements...",
    title: "System Requirements",
    subtitle: "Manage browser, network, and hardware checks for assessment enrollment",
    createBtn: "Add Requirement",
    searchPlaceholder: "Search requirements...",
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
    confirmDelete: "Are you sure you want to delete this requirement?",
    deleteSuccess: "Requirement removed successfully",
    deleteFailed: "Failed to remove requirement.",
    emptyTitle: "No Requirements",
    emptySubtitle: "Add your first system requirement to ensure candidate environments are compatible.",
    emptyBtn: "Add First Requirement",
    confirmArchive: "Are you sure you want to archive this requirement?",
    archiveSuccess: "Requirement archived successfully",
    archiveFailed: "Failed to archive requirement.",
    confirmRestore: "Are you sure you want to restore this requirement?",
    restoreSuccess: "Requirement restored successfully",
    restoreFailed: "Failed to restore requirement.",
};

const fetchRequirements = async () => {
    isLoading.value = true;
    try {
        const res = await api.get('/admin/system-requirements');
        requirements.value = res.data;
    } catch (err) {
        console.error(err);
        showAlert('Error', 'Failed to load requirements.');
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
    if (c === 'browser') return labels.catBrowser;
    if (c === 'internet') return labels.catInternet;
    if (c === 'hardware') return labels.catHardware;
    return labels.catOther;
};

const deleteRequirement = async (id) => {
    if (!(await showConfirm(labels.confirmDelete))) return;
    try {
        await api.delete(`/admin/system-requirements/${id}`);
        showAlert('Deleted', labels.deleteSuccess);
        fetchRequirements();
    } catch (err) {
        console.error(err);
        showAlert('Error', labels.deleteFailed);
    }
};

onMounted(fetchRequirements);
</script>

<template>
    <AdminLayout>

        <div dir="ltr" class="w-full">
            <!-- Loading Skeleton -->
            <div v-if="isLoading" class="mt-6 px-4 md:px-8">
                <CardListSkeleton :rows="5" />
            </div>

            <!-- Main Content -->
            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
                
                <!-- Premium Standardized Header Card -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 space-y-2">
                         <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                             {{ labels.title }}
                         </h1>
                         <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                             {{ labels.subtitle }}
                         </p>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-4 relative z-10">
                         <!-- Primary Action Button (Create) -->
                         <Button :label="labels.createBtn" icon="pi pi-plus" 
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
                                            <i class="pi pi-search absolute text-slate-400 z-10 left-3 top-1/2 -translate-y-1/2" />
                                            <InputText v-model="searchQuery" :placeholder="labels.searchPlaceholder" class="w-full md:w-80 shadow-sm rounded-xl pl-10" />
                                        </span>
                                    </div>
                                </template>

                                <Column :header="labels.colOrder" style="width: 80px">
                                    <template #body="{ data }">
                                        <span class="font-black text-slate-400">#{{ data.order }}</span>
                                    </template>
                                </Column>

                                <Column :header="labels.colModule" style="min-width: 250px">
                                    <template #body="{ data }">
                                        <div class="flex items-center py-2 space-x-4">
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

                                <Column :header="labels.colImportance" style="width: 150px">
                                    <template #body="{ data }">
                                        <Tag :value="data.is_mandatory ? labels.mandatory : labels.optional"
                                             :severity="data.is_mandatory ? 'danger' : 'info'"
                                             class="text-[9px] uppercase tracking-wider px-3 font-extrabold" />
                                    </template>
                                </Column>

                                <Column :header="labels.colStatus" style="width: 120px">
                                    <template #body="{ data }">
                                        <Tag :value="data.is_active ? labels.active : labels.archived"
                                             :severity="data.is_active ? 'success' : 'secondary'"
                                             class="text-[9px] uppercase tracking-wider px-3 font-extrabold" />
                                    </template>
                                </Column>

                                <Column :header="labels.colActions" :exportable="false" style="min-width: 150px">
                                    <template #body="{ data }">
                                        <div class="flex items-center space-x-2">
                                             <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="router.push(`/admin/system-requirements/${data.id}/edit`)" />
                                             <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deleteRequirement(data.id)" />
                                        </div>
                                    </template>
                                </Column>

                                <template #empty>
                                    <div class="p-8 text-center text-slate-400 font-medium">{{ labels.emptySearch }}</div>
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
                    <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight">{{ labels.emptyTitle }}</h3>
                    <p class="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                        {{ labels.emptySubtitle }}
                    </p>
                    <Button :label="labels.emptyBtn" icon="pi pi-arrow-right" iconPos="right" @click="router.push('/admin/system-requirements/create')" />
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

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


:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
</style>
