<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Toast from 'primevue/toast';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const skills = ref([]);
const levels = ref([]);
const loading = ref(true);
const selectedSkill = ref(null);
const searchQuery = ref('');

const fetchData = async () => {
    loading.value = true;
    try {
        const [skillRes, levelRes] = await Promise.all([
            api.get('/admin/skills-with-levels'),
            api.get('/admin/levels')
        ]);
        
        skills.value = skillRes.data || [];
        levels.value = levelRes.data || [];

        if (route.params.id) {
            const found = skills.value.find(s => s.id == route.params.id);
            if (found) selectedSkill.value = found;
        }
    } catch (err) {
        console.error('Failed to load data', err);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load levels data.' });
    } finally {
        loading.value = false;
    }
};

const getSkill = (skillId) => {
    return skills.value.find(s => s.id === skillId) || { name: 'Unknown', icon: '🎯' };
};

const filteredLevels = computed(() => {
    let result = levels.value;
    
    if (selectedSkill.value) {
        result = result.filter(l => l.skill_id === selectedSkill.value.id);
    }
    
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(l => {
            const skillIcon = getSkill(l.skill_id).icon;
            const skillName = getSkill(l.skill_id).name.toLowerCase();
            return l.name.toLowerCase().includes(query) || 
                   skillIcon.includes(query) || 
                   skillName.includes(query);
        });
    }
    
    return result;
});

const groupedLevels = computed(() => {
    const groups = {};
    filteredLevels.value.forEach(level => {
        if (!groups[level.skill_id]) {
            groups[level.skill_id] = {
                skill: getSkill(level.skill_id),
                levels: []
            };
        }
        groups[level.skill_id].levels.push(level);
    });
    
    // Sort levels within each group
    Object.values(groups).forEach(group => {
        group.levels.sort((a, b) => a.level_number - b.level_number);
    });
    
    return groups;
});

const deleteLevel = async (id) => {
    if (!confirm('Are you sure you want to delete this level globally?')) return;
    
    try {
        await api.delete(`/admin/levels/${id}`);
        levels.value = levels.value.filter(l => l.id !== id);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Level removed.' });
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete level.' });
    }
};

onMounted(fetchData);

watch(selectedSkill, (newVal) => {
    // Optional: Sync URL if needed
});
</script>

<template>
  <AdminLayout>
    <Toast />
    <div class="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-12">
        
        <!-- Standardized Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Adaptive Tiers</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Configure difficulty matrices and mastery thresholds</p>
            </div>
            <div class="flex items-center space-x-3">
                <Button label="Initialize Tier" icon="pi pi-plus" 
                    class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" 
                    @click="router.push('/admin/levels/create')" />
            </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Level Matrix...</p>
        </div>

        <!-- Registry Table Card -->
        <Card v-else class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden mt-6 bg-white">
            <template #content>
            <DataTable :value="filteredLevels" rowGroupMode="subheader" groupRowsBy="skill_id"
                       sortField="skill_id" :sortOrder="1"
                       class="p-datatable-sm" responsiveLayout="scroll">
                
                <template #header>
                    <div class="flex flex-col md:flex-row justify-between items-center gap-6 p-2 pb-4">
                        <div class="flex items-center space-x-4 w-full md:w-auto bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0 ml-2">Domain Filter</span>
                            <Select v-model="selectedSkill" :options="skills" optionLabel="name" placeholder="All Domains" 
                                     class="w-full md:w-64 rounded-xl border-none bg-white text-xs font-bold shadow-sm" showClear />
                        </div>
                        <div class="w-full md:w-80">
                            <span class="relative">
                                <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                                <InputText v-model="searchQuery" placeholder="Filter tier registry..." class="pl-12 w-full shadow-sm rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-bold" />
                            </span>
                        </div>
                    </div>
                </template>

                <template #rowgroupheader="slotProps">
                    <div class="flex items-center space-x-4 py-3 px-6 bg-slate-50/50 backdrop-blur-sm border-y border-slate-100/50">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Sequence: {{ getSkill(slotProps.data.skill_id).name }}</span>
                    </div>
                </template>

                <Column field="level_number" header="#" style="width: 70px" class="pl-12">
                    <template #body="{ data }">
                        <span class="font-black text-slate-300 italic">#{{ data.level_number }}</span>
                    </template>
                </Column>

                <Column header="Skill Domain" style="width: 220px">
                    <template #body="{ data }">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-lg bg-slate-100 text-brand-primary flex items-center justify-center text-sm border border-slate-200">
                                {{ getSkill(data.skill_id).icon }}
                            </div>
                            <span class="font-black text-slate-700 uppercase tracking-tight text-[11px]">{{ getSkill(data.skill_id).name }}</span>
                        </div>
                    </template>
                </Column>

                <Column field="name" header="Designation" style="min-width: 200px">
                    <template #body="{ data }">
                        <div class="flex flex-col">
                            <span class="font-black text-slate-700 uppercase tracking-tight text-xs">{{ data.name }}</span>
                            <span class="text-[9px] text-slate-400 italic">{{ data.instructions ? data.instructions.substring(0, 40) + '...' : 'No instructions set' }}</span>
                        </div>
                    </template>
                </Column>

                <Column header="Score Matrix" style="width: 180px" class="text-center">
                    <template #body="{ data }">
                        <div class="flex items-center justify-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                             <span class="text-[10px] font-black text-slate-500">{{ data.min_score }}</span>
                             <i class="pi pi-arrows-h text-[8px] text-slate-300"></i>
                             <span class="text-[10px] font-black text-slate-800">{{ data.max_score }}</span>
                        </div>
                    </template>
                </Column>

                <Column header="Default Count" style="width: 140px" class="text-center">
                    <template #body="{ data }">
                        <Tag :value="data.default_question_count || 2" severity="info" class="font-black px-4 rounded-lg" />
                    </template>
                </Column>

                <Column header="Threshold" style="width: 150px">
                    <template #body="{ data }">
                        <div class="flex items-center space-x-3">
                            <div class="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div class="bg-brand-primary h-full rounded-full" :style="{ width: data.pass_threshold + '%' }"></div>
                            </div>
                            <span class="text-[10px] font-black text-slate-600">{{ data.pass_threshold }}%</span>
                        </div>
                    </template>
                </Column>

                <Column header="Visibility" style="width: 120px" class="text-center">
                    <template #body="{ data }">
                        <i :class="data.is_active ? 'pi pi-eye text-emerald-500' : 'pi pi-eye-slash text-slate-300'" class="text-lg"></i>
                    </template>
                </Column>

                <Column :exportable="false" style="min-width: 120px" class="text-right">
                    <template #body="{ data }">
                        <div class="flex items-center justify-end space-x-1">
                             <Button icon="pi pi-pencil" text severity="secondary" size="small" @click="router.push(`/admin/levels/${data.id}/edit`)" />
                             <Button icon="pi pi-trash" text severity="danger" size="small" @click="deleteLevel(data.id)" />
                        </div>
                    </template>
                </Column>

                <template #empty>
                    <div class="p-16 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">No adaptive configurations discovered in system registry.</div>
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
