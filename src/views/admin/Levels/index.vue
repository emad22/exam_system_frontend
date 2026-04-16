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
    return skills.value.find(s => s.id === skillId) || { name: 'Unknown', icon: '🧠' };
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
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">
        
        <!-- Header Section -->
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between space-y-6 md:space-y-0">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Adaptive tiers</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Configure difficulty matrices and mastery thresholds</p>
            </div>
            <div class="flex items-center space-x-3">
                <Button label="Initialize Tier" icon="pi pi-plus" 
                    class="px-8 py-3 rounded-2xl bg-indigo-600 border-none shadow-lg shadow-indigo-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" 
                    @click="router.push('/admin/levels/create')" />
            </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Level Matrix...</p>
        </div>

        <!-- Registry Table Card -->
        <Card v-else class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
            <template #content>
            <DataTable :value="filteredLevels" dataKey="id" paginator :rows="10" 
                       class="p-datatable-sm text-sm" responsiveLayout="scroll">
                
                <template #header>
                    <div class="flex flex-col md:flex-row justify-between items-center gap-4 p-2 pb-4">
                        <div class="flex items-center space-x-4 w-full md:w-auto">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">Filter Module</span>
                            <Select v-model="selectedSkill" :options="skills" optionLabel="name" placeholder="All Skills" 
                                     class="w-full md:w-64 rounded-xl border-slate-100 bg-slate-50 text-xs font-bold" showClear />
                        </div>
                        <div class="w-full md:w-80">
                            <span class="relative">
                                <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                <InputText v-model="searchQuery" placeholder="Search difficulty metadata..." class="pl-10 w-full shadow-sm rounded-xl border-slate-100" />
                            </span>
                        </div>
                    </div>
                </template>

                <Column field="level_number" header="#" style="width: 80px">
                    <template #body="{ data }">
                        <span class="font-black text-slate-400">#{{ data.level_number }}</span>
                    </template>
                </Column>

                <Column header="Identity Module" style="min-width: 250px">
                    <template #body="{ data }">
                        <div class="flex items-center space-x-4 py-2">
                             <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shadow-sm">
                                 {{ getSkill(data.skill_id).icon }}
                             </div>
                             <div>
                                 <div class="font-black text-slate-700 uppercase tracking-tight">{{ getSkill(data.skill_id).name }}</div>
                                 <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Skill Association</div>
                             </div>
                        </div>
                    </template>
                </Column>

                <Column field="name" header="Designation" style="min-width: 150px">
                    <template #body="{ data }">
                        <span class="font-bold text-slate-600 uppercase tracking-tight">{{ data.name }}</span>
                    </template>
                </Column>

                <Column header="Precision Range" style="width: 150px">
                    <template #body="{ data }">
                        <div class="flex items-center space-x-2">
                             <span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black border border-indigo-100">{{ data.min_score }}</span>
                             <span class="text-slate-200">/</span>
                             <span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black border border-indigo-100">{{ data.max_score }}</span>
                        </div>
                    </template>
                </Column>

                <Column header="Mastery Threshold" style="width: 150px">
                    <template #body="{ data }">
                        <div class="space-y-1.5 pt-1">
                             <div class="flex justify-between items-center px-1">
                                 <span class="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{{ data.pass_threshold }}% Threshold</span>
                             </div>
                             <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden p-0.5 border border-slate-50">
                                  <div class="bg-indigo-500 h-full rounded-full" :style="{ width: data.pass_threshold + '%' }"></div>
                             </div>
                        </div>
                    </template>
                </Column>

                <Column header="Status" style="width: 120px" class="text-center">
                    <template #body="{ data }">
                        <Tag :value="data.is_active ? 'Active' : 'Deactivated'"
                             :severity="data.is_active ? 'success' : 'secondary'"
                             class="text-[9px] uppercase tracking-wider px-3" />
                    </template>
                </Column>

                <Column :exportable="false" style="min-width: 150px" class="text-right pr-6">
                    <template #body="{ data }">
                        <div class="flex items-center justify-end space-x-2">
                             <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="router.push(`/admin/levels/${data.id}/edit`)" />
                             <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deleteLevel(data.id)" />
                        </div>
                    </template>
                </Column>

                <template #empty>
                    <div class="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No configuration matrix found in system.</div>
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
</style>
