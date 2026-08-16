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

const labels = {
    loading: "Loading skills...",
    title: "Skills",
    subtitle: "Manage skill domains and their configured levels",
    createBtn: "Add Skill",
    searchPlaceholder: "Search by name or code...",
    colSkill: "Skill Name",
    colShortCode: "Short Code",
    colTiers: "Levels Configured",
    colDensity: "Questions Count",
    colActions: "Actions",
    masterCode: "ID",
    tiersCount: "Levels",
    validatedItems: "Questions",
    btnLayers: "Levels",
    emptySearch: "No skills match your search query.",
    emptyTitle: "No Skills",
    emptySubtitle: "Add your first skill to start building assessments.",
    emptyBtn: "Add First Skill",
    confirmDelete: "Are you sure you want to delete this skill? This will affect all bound questions.",
    deleteSuccess: "Skill removed successfully.",
    deleteFailed: "Failed to remove skill.",
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
    if (!(await showConfirm(labels.confirmDelete))) return;
    try {
        await api.delete(`/admin/skills/${id}`);
        fetchSkills(); 
        showAlert(labels.deleteSuccess, 'Success', 'success');
    } catch (err) {
        showAlert(err.response?.data?.error || labels.deleteFailed, 'Error', 'danger');
    }
};

onMounted(fetchSkills);
</script>

<template>
    <AdminLayout>
        <div dir="ltr" class="w-full">
            <!-- Loading Spinner -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ labels.loading }}</p>
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
                         <p class="text-sm font-bold text-slate-500 max-w-xl leading-relaxed">
                              {{ labels.subtitle }}
                          </p>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-4 relative z-10">
                         
                         <!-- Primary Action Button (Create) -->
                         <Button :label="labels.createBtn" icon="pi pi-plus" 
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
                                            <i class="pi pi-search absolute text-slate-400 z-10 left-3 top-1/2 -translate-y-1/2" />
                                            <InputText v-model="searchQuery" :placeholder="labels.searchPlaceholder" class="w-full md:w-80 shadow-sm rounded-xl pl-10" />
                                        </span>
                                    </div>
                                </template>

                                <Column :header="labels.colSkill" style="min-width: 250px">
                                    <template #body="{ data }">
                                        <div class="flex items-center space-x-4">
                                             <div class="w-10 h-10 rounded-xl bg-slate-50 text-brand-primary flex items-center justify-center font-black text-lg border border-slate-100 shadow-sm shrink-0">
                                                 {{ (data.name?.[0] || 'S').toUpperCase() }}
                                             </div>
                                             <div>
                                                 <div class="font-extrabold text-slate-700 tracking-tight text-sm">{{ data.name }}</div>
                                                 <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{{ labels.masterCode }}: {{ data.id }}</div>
                                             </div>
                                        </div>
                                    </template>
                                </Column>

                                <Column :header="labels.colShortCode" style="min-width: 100px">
                                    <template #body="{ data }">
                                         <code class="bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg text-slate-600 text-xs font-black uppercase tracking-widest italic">
                                             {{ data.short_code || '---' }}
                                         </code>
                                    </template>
                                </Column>

                                <Column :header="labels.colTiers" style="min-width: 150px">
                                    <template #body="{ data }">
                                        <Tag :value="`${data.levels_count || 0} ${labels.tiersCount}`" severity="success" class="text-[9px] uppercase tracking-wider px-3 py-1 rounded-lg font-extrabold" />
                                    </template>
                                </Column>

                                <Column :header="labels.colDensity" style="min-width: 150px">
                                    <template #body="{ data }">
                                        <div class="flex flex-col items-start">
                                             <span class="font-black text-slate-800 text-sm tracking-tighter">{{ data.questions_count || 0 }}</span>
                                              <span class="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{{ labels.validatedItems }}</span>
                                        </div>
                                    </template>
                                </Column>

                                <Column :header="labels.colActions" :exportable="false" style="min-width: 200px">
                                    <template #body="{ data }">
                                        <div class="flex items-center gap-1.5">
                                            <Button :label="labels.btnLayers" severity="info" text class="text-xs font-bold uppercase tracking-wider px-4 hover:bg-rose-50 rounded-xl" @click="$router.push(`/admin/skills/${data.id}/levels`)" />
                                            <Button icon="pi pi-pencil" text rounded severity="warning" size="small" @click="$router.push(`/admin/skills/${data.id}/edit`)" />
                                            <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="deleteSkill(data.id)" />
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
                        <i class="pi pi-tags"></i>
                    </div>
                    <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight">{{ labels.emptyTitle }}</h3>
                    <p class="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                        {{ labels.emptySubtitle }}
                    </p>
                    <Button :label="labels.emptyBtn" icon="pi pi-arrow-right" iconPos="right" @click="$router.push('/admin/skills/create')" />
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
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}


:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
</style>
