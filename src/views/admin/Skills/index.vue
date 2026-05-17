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

const { showAlert, showConfirm } = useModal();

const skills = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const filteredSkills = computed(() => {
    if (!searchQuery.value) return skills.value;
    const query = searchQuery.value.toLowerCase();
    return skills.value.filter(s => s.name.toLowerCase().includes(query) || s.short_code?.toLowerCase().includes(query));
});

// Edit Logic
const showEditModal = ref(false);
const editingSkill = ref({ id: null, name: '', short_code: '' });
const isSaving = ref(false);

const openEditModal = async (skill) => {
    editingSkill.value = { 
        id: skill.id, 
        name: skill.name,
        short_code: skill.short_code || ''
    };
    showEditModal.value = true;
};

const updateSkill = async () => {
    if (!editingSkill.value.name) return;
    isSaving.value = true;
    try {
        await api.patch(`/admin/skills/${editingSkill.value.id}`, {
            name: editingSkill.value.name,
            short_code: editingSkill.value.short_code
        });
        showEditModal.value = false;
        fetchSkills(); 
    } catch (err) {
        showAlert(err.response?.data?.message || 'Failed to update skill.');
    } finally {
        isSaving.value = false;
    }
};

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
    if (!(await showConfirm('Are you sure you want to delete this skill? This will affect all bound questions.'))) return;
    try {
        await api.delete(`/admin/skills/${id}`);
        fetchSkills(); 
    } catch (err) {
        showAlert(err.response?.data?.error || 'Failed to delete skill.');
    }
};

onMounted(fetchSkills);
</script>

<template>
    <AdminLayout>
        <div class="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-12">
            
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Academic Domains</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Registry of skill modules and competencies</p>
                </div>
                <Button label="Register Domain" icon="pi pi-plus" 
                    class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" 
                    @click="$router.push('/admin/skills/create')" />
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Domain Matrix...</p>
            </div>

            <!-- Registry Table Card -->
            <Card v-else class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredSkills" dataKey="id" paginator :rows="10" 
                        class="p-datatable-sm text-sm" responsiveLayout="scroll">
                        
                        <template #header>
                            <div class="flex justify-end p-2 pb-4">
                                <span class="relative">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                    <InputText v-model="searchQuery" placeholder="Filter by name or code..." class="pl-10 w-full md:w-80 shadow-sm rounded-xl border-slate-100" />
                                </span>
                            </div>
                        </template>

                        <Column header="Institutional Asset" style="min-width: 250px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4">
                                     <div class="w-10 h-10 rounded-xl bg-slate-50 text-brand-primary flex items-center justify-center font-black text-lg border border-slate-100 shadow-sm">
                                         {{ (data.name?.[0] || 'S').toUpperCase() }}
                                     </div>
                                     <div>
                                         <div class="font-black text-slate-700 uppercase tracking-tight">{{ data.name }}</div>
                                         <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Master Identity Code: {{ data.id }}</div>
                                     </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Short Code" style="min-width: 100px">
                            <template #body="{ data }">
                                <code class="bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg text-slate-600 text-[10px] font-black uppercase tracking-widest italic">
                                    {{ data.short_code || '---' }}
                                </code>
                            </template>
                        </Column>

                        <Column header="Complexity Tiers" style="min-width: 150px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="(data.levels_count || 0) + ' Masteries'" severity="success" class="text-[9px] uppercase tracking-wider px-3" />
                            </template>
                        </Column>

                        <Column header="Logic Density" style="min-width: 150px" class="text-center">
                            <template #body="{ data }">
                                <div class="flex flex-col items-center">
                                     <span class="font-black text-slate-800 text-sm tracking-tighter">{{ data.questions_count || 0 }}</span>
                                     <span class="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Validated Items</span>
                                </div>
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 200px" class="text-right">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end space-x-2">
                                    <Button label="LAYERS" severity="info" text class="text-[9px] font-black uppercase tracking-widest px-4 hover:bg-rose-50" @click="$router.push(`/admin/skills/${data.id}/levels`)" />
                                    <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="openEditModal(data)" />
                                    <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deleteSkill(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-12 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">No domain definitions discovered in system.</div>
                        </template>
                    </DataTable>
                </template>
            </Card>
        </div>

        <!-- Update Modal - Institutional Design -->
        <div v-if="showEditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/60 backdrop-blur-md animate-in fade-in duration-300">
            <div class="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-200">
                <!-- Header -->
                <div class="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div>
                        <h3 class="text-xl font-black text-slate-800 tracking-tight uppercase">Domain Refinement</h3>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Adjusting Institutional Competency Profile</p>
                    </div>
                    <button @click="showEditModal = false" class="w-10 h-10 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-white hover:shadow-sm transition-all shadow-none">
                        <i class="pi pi-times"></i>
                    </button>
                </div>

                <!-- Form Body -->
                <div class="p-10 space-y-8">
                    <div class="space-y-6">
                        <div class="space-y-3">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cognitive Segment Name</label>
                            <input v-model="editingSkill.name" type="text"
                                class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-700 focus:bg-white focus:ring-4 focus:ring-rose-50/50 focus:border-brand-primary/20 transition-all outline-none shadow-sm"
                                placeholder="Module Designation">
                        </div>
                        <div class="space-y-3">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identification Key (Short Code)</label>
                            <input v-model="editingSkill.short_code" type="text" maxlength="5"
                                class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-brand-primary placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-rose-50/50 focus:border-brand-primary/20 transition-all outline-none shadow-sm uppercase tracking-widest"
                                placeholder="E.G. LISTEN">
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-10 py-8 bg-slate-50/50 border-t border-slate-50 flex justify-end space-x-4">
                    <Button label="Discard" outlined severity="secondary" @click="showEditModal = false" class="px-8 font-black text-[10px] uppercase tracking-widest" />
                    <Button :label="isSaving ? 'PERSISTING...' : 'COMMIT UPDATE'" 
                            :loading="isSaving"
                            @click="updateSkill" 
                            class="px-10 bg-brand-primary border-none font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100" />
                </div>
            </div>
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
:deep(.p-datatable-tbody > tr) {
    transition: all 0.3s ease;
}
:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
    transform: translateX(4px);
}
</style>
