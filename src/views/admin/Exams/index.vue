<script setup>
import { ref, onMounted, computed } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import InputNumber from 'primevue/inputnumber';

const exams = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const filteredExams = computed(() => {
    if (!searchQuery.value) return exams.value;
    const query = searchQuery.value.toLowerCase();
    return exams.value.filter(e => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        return title.includes(query) || desc.includes(query);
    });
});

const showRulesModal = ref(false);
const selectedExam = ref(null);
const isSavingRules = ref(false);
const rulesForm = ref({
    skills: []
});

const fetchExams = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/exams');
        exams.value = res.data;
    } catch (err) {
        console.error('Failed to load exams', err);
    } finally {
        loading.value = false;
    }
};

const openRules = async (exam) => {
    selectedExam.value = exam;
    showRulesModal.value = true;
    try {
        const res = await api.get(`/admin/exams/${exam.id}`);
        const fullExam = res.data;
        
        rulesForm.value.skills = fullExam.skills.map(skill => ({
            skill_id: skill.id,
            name: skill.name,
            duration: skill.pivot.duration,
            is_optional: !!skill.pivot.is_optional,
            rules: fullExam.question_rules.filter(r => r.skill_id === skill.id).map(r => ({
                id: r.id,
                difficulty_level: r.difficulty_level,
                quantity: r.quantity,
                group_tag: r.group_tag
            }))
        }));
    } catch (err) {
        console.error('Failed to load exam rules', err);
        alert('Failed to load rules.');
    }
};

const saveRules = async () => {
    isSavingRules.value = true;
    try {
        await api.patch(`/admin/exams/${selectedExam.value.id}`, {
            title: selectedExam.value.title,
            passing_score: selectedExam.value.passing_score,
            exam_type: selectedExam.value.exam_type,
            language_id: selectedExam.value.language_id,
            is_adaptive: selectedExam.value.is_adaptive,
            skills: rulesForm.value.skills
        });
        alert('Rules updated successfully!');
        showRulesModal.value = false;
        fetchExams();
    } catch (err) {
        console.error('Failed to save rules', err);
        alert('Failed to save rules.');
    } finally {
        isSavingRules.value = false;
    }
};

const getCategorySeverity = (type) => {
    switch(type) {
        case 'adult': return 'success';
        case 'children': return 'warn';
        default: return 'secondary';
    }
}

const setDefaultExam = async (exam) => {
    if (!window.confirm(`Are you sure you want to set "${exam.title}" as the default exam for ${exam.exam_type} registration?`)) return;
    try {
        await api.patch(`/admin/exams/${exam.id}/set-default`);
        alert('Universal Default Exam updated.');
        fetchExams();
    } catch (err) {
        console.error('Failed to set default exam', err);
        alert('Action failure.');
    }
};

const deleteExam = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
        await api.delete(`/admin/exams/${id}`);
        fetchExams();
    } catch (err) {
        console.error('Failed to delete exam', err);
        alert('Deletion failure.');
    }
};

onMounted(fetchExams);
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Manage Exams</h1>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">View and configure exam templates</p>
                </div>
                <div class="flex items-center space-x-3">
                    <Button label="Import Exam" icon="pi pi-download" severity="secondary" outlined size="small" @click="$router.push('/admin/exams/import')" />
                    <Button label="Create Exam" icon="pi pi-plus" size="small" @click="$router.push('/admin/exams/create')" />
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading exams...</p>
            </div>

            <div v-else>
                <div v-if="exams.length > 0 || searchQuery" class="space-y-6">
                    
                    <!-- Search Bar -->
                    <Card class="border border-slate-100 shadow-sm rounded-3xl">
                        <template #content>
                            <div class="relative w-full md:max-w-md">
                                <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10"></i>
                                <InputText v-model="searchQuery" placeholder="Search exams by title or content..." class="w-full pl-12 rounded-2xl shadow-sm" />
                            </div>
                        </template>
                    </Card>

                    <Card v-if="filteredExams.length > 0" class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden pb-4">
                        <template #content>
                            <DataTable :value="filteredExams" dataKey="id" paginator :rows="10" 
                                class="p-datatable-sm text-sm" responsiveLayout="scroll">

                                <Column header="Exam" style="min-width: 350px">
                                    <template #body="{ data }">
                                        <div class="flex items-center space-x-4">
                                            <div :class="data.is_default ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'"
                                                class="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all transform"
                                                :title="data.is_default ? 'Primary Enrollment Node' : 'Standard Exam'">
                                                 <i :class="data.is_default ? 'pi pi-star-fill' : 'pi pi-file'" class="text-lg"></i>
                                            </div>
                                            <div>
                                                 <div class="flex items-center gap-2">
                                                     <div class="font-bold text-slate-700 uppercase tracking-tight">{{ data.title }}</div>
                                                     <Tag v-if="data.is_default" value="DEFAULT" severity="info" class="text-[8px] font-black px-1" />
                                                 </div>
                                                 <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest line-clamp-1 italic">{{ data.description || 'No description' }}</div>
                                            </div>
                                        </div>
                                    </template>
                                </Column>

                                <Column header="Category" style="min-width: 120px">
                                    <template #body="{ data }">
                                        <Tag :value="data.exam_type || 'General'" :severity="getCategorySeverity(data.exam_type)" class="text-[9px] uppercase tracking-widest" />
                                    </template>
                                </Column>

                                <Column header="Language" style="min-width: 120px">
                                    <template #body="{ data }">
                                        <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ data.language?.name || 'Universal' }}</span>
                                    </template>
                                </Column>

                                <Column header="Type" style="min-width: 120px">
                                    <template #body="{ data }">
                                        <Tag :value="data.is_adaptive ? 'Adaptive' : 'Standard'" :severity="data.is_adaptive ? 'info' : 'secondary'" rounded class="text-[9px] uppercase tracking-wider" />
                                    </template>
                                </Column>

                                <Column header="Attempts" style="min-width: 100px" class="text-center">
                                    <template #body="{ data }">
                                         <div class="font-black text-slate-800 text-lg tracking-tighter">{{ data.attempts_count || 0 }}</div>
                                    </template>
                                </Column>

                                <Column :exportable="false" style="min-width: 150px" class="text-right">
                                    <template #body="{ data }">
                                        <div class="flex items-center justify-end space-x-2">
                                            <Button v-if="!data.is_default" icon="pi pi-bookmark" outlined rounded severity="secondary" size="small" 
                                                v-tooltip.top="'Set as Global Default'" @click="setDefaultExam(data)" />
                                            <Button label="RULES" outlined rounded severity="info" size="small" @click="openRules(data)" class="text-[9px]" />
                                            <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="$router.push(`/admin/exams/${data.id}/edit`)" />
                                        </div>
                                    </template>
                                </Column>
                            </DataTable>
                        </template>
                    </Card>

                    <!-- Empty Search -->
                    <Card v-else class="border border-slate-100 shadow-sm rounded-3xl mt-6">
                        <template #content>
                            <div class="p-20 text-center">
                                <i class="pi pi-search text-slate-300 text-6xl mb-6"></i>
                                <h4 class="text-xl font-black text-slate-400 uppercase tracking-widest">No matching exams found</h4>
                                <p class="text-xs text-slate-300 font-bold mt-2">Try adjusting your search query</p>
                            </div>
                        </template>
                    </Card>
                </div>

                <!-- Empty State -->
                <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center mt-6">
                    <i class="pi pi-file text-slate-300 text-6xl mb-6"></i>
                    <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">No Exams Found</h3>
                    <p class="text-slate-400 font-bold mb-8">
                        Create your first exam template to start evaluating students.
                    </p>
                    <Button label="Create First Exam" icon="pi pi-arrow-right" iconPos="right" @click="$router.push('/admin/exams/create')" />
                </div>
            </div>
        </div>

        <!-- Rules Modal -->
        <Dialog v-model:visible="showRulesModal" :header="'Exam Rule Config — ' + selectedExam?.title" :style="{ width: '80vw', height: '80vh' }" maximizable modal>
            <div class="h-full flex flex-col pt-4">
                <p class="text-xs font-bold text-slate-500 uppercase tracking-widest -mt-6 mb-8">Adjust question counts for each skill & level</p>

                <div class="flex-1 overflow-y-auto space-y-12 no-scrollbar pr-2">
                    <div v-for="skill in rulesForm.skills" :key="skill.skill_id" class="space-y-6">
                        <div class="flex items-center space-x-4">
                                <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm uppercase">{{ skill.name.charAt(0) }}</div>
                                <h3 class="text-lg font-black text-slate-700 uppercase tracking-tight">{{ skill.name }}</h3>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-14">
                                <div v-for="(rule, rIdx) in skill.rules" :key="rIdx" class="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col space-y-4 transition-colors">
                                    <div class="flex justify-between items-start">
                                            <span class="font-black text-slate-800 text-sm uppercase flex items-center"><i class="pi pi-filter mr-2 text-indigo-400"></i> Level {{ rule.difficulty_level || 'Any' }}</span>
                                            <span v-if="rule.group_tag" class="font-mono text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase font-black tracking-widest border border-slate-200">{{ rule.group_tag }}</span>
                                    </div>
                                    <div class="pt-4 border-t border-slate-100 flex flex-col">
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Question Count</label>
                                            <InputNumber v-model="rule.quantity" showButtons buttonLayout="horizontal" :step="1" :min="1"
                                                decrementButtonIcon="pi pi-minus" incrementButtonIcon="pi pi-plus" 
                                                class="w-full" inputClass="text-center font-black" />
                                    </div>
                                </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text severity="secondary" @click="showRulesModal = false" />
                <Button label="Update Counts" icon="pi pi-check" :loading="isSavingRules" @click="saveRules" />
            </template>
        </Dialog>
    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
