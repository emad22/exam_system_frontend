<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
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

const router = useRouter();
const exams = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const filteredExams = computed(() => {
    if (!searchQuery.value) return exams.value;
    const query = searchQuery.value.toLowerCase();
    return exams.value.filter(e => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const cat = (e.category?.name || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || cat.includes(query);
    });
});

const stats = computed(() => {
    const total = exams.value.length;
    const defaultExams = exams.value.filter(e => e.is_default).length;
    return { total, defaultExams };
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
            rules: (fullExam.question_rules || []).filter(r => r.skill_id === skill.id).map(r => ({
                id: r.id,
                difficulty_level: r.difficulty_level,
                quantity: r.quantity,
                group_tag: r.group_tag
            }))
        }));
    } catch (err) {
        console.error('Failed to load exam rules', err);
    }
};

const saveRules = async () => {
    isSavingRules.value = true;
    try {
        await api.patch(`/admin/exams/${selectedExam.value.id}`, {
            title: selectedExam.value.title,
            passing_score: selectedExam.value.passing_score,
            exam_category_id: selectedExam.value.exam_category_id,
            language_id: selectedExam.value.language_id,
            is_adaptive: selectedExam.value.is_adaptive,
            skills: rulesForm.value.skills
        });
        showRulesModal.value = false;
        fetchExams();
    } catch (err) {
        console.error('Failed to save rules', err);
    } finally {
        isSavingRules.value = false;
    }
};

const getCategorySeverity = (category) => {
    if (!category) return 'secondary';
    const slug = (category.slug || '').toLowerCase();
    if (slug.includes('adult')) return 'info';
    if (slug.includes('child')) return 'warn';
    return 'info';
}

const setDefaultExam = async (exam) => {
    if (!window.confirm(`Set "${exam.title}" as default for ${exam.category?.name || 'General'}?`)) return;
    try {
        await api.patch(`/admin/exams/${exam.id}/set-default`);
        fetchExams();
    } catch (err) {
        console.error(err);
    }
};

const deleteExam = async (id) => {
    if (!window.confirm('IRREVERSIBLE ACTION: Delete this exam and all associated data?')) return;
    try {
        await api.delete(`/admin/exams/${id}`);
        fetchExams();
    } catch (err) {
        console.error(err);
    }
};

onMounted(fetchExams);
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">
            
            <!-- Standardized Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-2xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Assessment Matrix</h1>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry of administrative templates</p>
                </div>
                <div class="flex items-center space-x-3">
                    <Button label="Import Asset" icon="pi pi-download" severity="secondary" outlined class="text-[10px] font-black uppercase tracking-widest px-6" @click="router.push('/admin/exams/import')" />
                    <Button label="Initialize Exam" icon="pi pi-plus" class="bg-indigo-600 border-none text-[10px] font-black uppercase tracking-widest px-6 shadow-lg shadow-indigo-100 transition-all hover:-translate-y-1" @click="router.push('/admin/exams/create')" />
                </div>
            </div>

            

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Exam Data...</p>
            </div>

            <div v-else>
                <div v-if="exams.length > 0 || searchQuery" class="space-y-6">
                    
                    <!-- Integrated Search -->
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div class="relative w-full md:max-w-md">
                            <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <InputText v-model="searchQuery" placeholder="Filter by title, category, or content..." class="w-full pl-12 rounded-xl border-slate-200 text-xs font-bold uppercase tracking-tight" />
                        </div>
                    </div>

                    <Card class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden pb-4">
                        <template #content>
                            <DataTable :value="filteredExams" dataKey="id" paginator :rows="10" 
                                class="p-datatable-sm" responsiveLayout="scroll">

                                <Column header="Assessment Entity" style="min-width: 350px">
                                    <template #body="{ data }">
                                        <div class="flex items-center space-x-4">
                                            <div :class="data.is_default ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'"
                                                class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all transform">
                                                 <i :class="data.is_default ? 'pi pi-star-fill' : 'pi pi-file'" class="text-xl"></i>
                                            </div>
                                            <div>
                                                 <div class="flex items-center gap-2">
                                                     <div class="font-black text-slate-800 uppercase tracking-tight">{{ data.title }}</div>
                                                     <Tag v-if="data.is_default" value="PRIMARY_NODE" severity="success" class="text-[8px] font-black px-2 py-0.5 rounded-full" />
                                                 </div>
                                                 <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest line-clamp-1 italic">{{ data.description || 'No descriptive metadata' }}</div>
                                            </div>
                                        </div>
                                    </template>
                                </Column>

                                <Column header="Category" style="min-width: 140px">
                                    <template #body="{ data }">
                                        <Tag :value="data.category?.name || 'GENERIC'" :severity="getCategorySeverity(data.category)" class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border-none" />
                                    </template>
                                </Column>



                                <Column header="Engagement" style="min-width: 120px" class="text-center">
                                    <template #body="{ data }">
                                         <div class="flex flex-col items-center">
                                             <div class="font-black text-slate-800 tracking-tighter">{{ data.attempts_count || 0 }}</div>
                                             <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Attempts</div>
                                         </div>
                                    </template>
                                </Column>

                                <Column :exportable="false" style="min-width: 200px" class="text-right">
                                    <template #body="{ data }">
                                        <div class="flex items-center justify-end space-x-2">
                                            <Button v-if="!data.is_default" icon="pi pi-bookmark" outlined rounded severity="secondary" @click="setDefaultExam(data)" v-tooltip.top="'Promote to Default'" />
                                            <Button label="RULES" text severity="info" class="text-[9px] font-black tracking-widest uppercase hover:bg-indigo-50" @click="openRules(data)" />
                                            <Button icon="pi pi-pencil" rounded severity="warn" text @click="router.push(`/admin/exams/${data.id}/edit`)" />
                                            <Button icon="pi pi-trash" rounded severity="danger" text @click="deleteExam(data.id)" />
                                        </div>
                                    </template>
                                </Column>
                            </DataTable>
                        </template>
                    </Card>
                </div>

                <!-- Empty State -->
                <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center mt-6 animate-in zoom-in-95 duration-700">
                    <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl">📄</div>
                    <h3 class="text-2xl font-black text-slate-800 mb-4 tracking-tight uppercase">Isolated Logic Pool</h3>
                    <p class="text-slate-400 font-bold max-w-sm mx-auto mb-12 text-sm leading-relaxed">
                        No examination templates have been initialized. Commencing setup is required for student evaluation.
                    </p>
                    <Button label="Initialize Workflow" icon="pi pi-arrow-right" iconPos="right" class="px-10 py-5 bg-indigo-600 border-none rounded-2xl shadow-xl shadow-indigo-100 font-black text-[10px] uppercase tracking-widest" @click="router.push('/admin/exams/create')" />
                </div>
            </div>
        </div>

        <!-- Rules Modal Redesign -->
        <Dialog v-model:visible="showRulesModal" :header="'Logic Configuration — ' + selectedExam?.title" :style="{ width: '70vw' }" modal class="rounded-[2rem] overflow-hidden border-none shadow-2xl" :breakpoints="{'960px': '90vw', '641px': '100vw'}">
            <template #header>
                <div class="flex flex-col">
                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Logic Configuration</h3>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Adjust question distribution metrics</p>
                </div>
            </template>
            
            <div class="pt-6 space-y-12 max-h-[60vh] overflow-y-auto no-scrollbar pr-4">
                <div v-for="skill in rulesForm.skills" :key="skill.skill_id" class="space-y-6">
                    <div class="flex items-center space-x-4 sticky top-0 bg-white z-10 py-2">
                            <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-[10px] uppercase shadow-lg shadow-indigo-100">{{ skill.name.charAt(0) }}</div>
                            <h3 class="text-sm font-black text-slate-700 uppercase tracking-wider">{{ skill.name }}</h3>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 ml-14">
                            <div v-for="(rule, rIdx) in skill.rules" :key="rIdx" class="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col space-y-4">
                                <div class="flex justify-between items-center">
                                        <span class="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center">
                                            <i class="pi pi-filter mr-2 text-indigo-400"></i> Level {{ rule.difficulty_level || 'General' }}
                                        </span>
                                        <Tag v-if="rule.group_tag" :value="rule.group_tag" class="text-[8px] font-black uppercase tracking-tighter bg-indigo-600 text-white border-none px-2" />
                                </div>
                                <div class="pt-4 border-t border-slate-200">
                                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Item Quantity</label>
                                        <InputNumber v-model="rule.quantity" showButtons buttonLayout="horizontal" :step="1" :min="1"
                                            decrementButtonIcon="pi pi-minus" incrementButtonIcon="pi pi-plus" 
                                            class="w-full" inputClass="text-center font-black text-sm border-none bg-transparent" />
                                </div>
                            </div>
                    </div>
                </div>
            </div>
            
            <template #footer>
                <div class="flex justify-end pt-6 border-t border-slate-50 space-x-3">
                    <Button label="Discard" outlined severity="secondary" class="text-[10px] font-black uppercase tracking-widest px-8" @click="showRulesModal = false" />
                    <Button label="Persist Architecture" :loading="isSavingRules" class="bg-indigo-600 border-none text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-indigo-50" @click="saveRules" />
                </div>
            </template>
        </Dialog>
    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
:deep(.p-datatable-header) {
    background: transparent;
    border: none;
}
:deep(.p-datatable-thead > tr > th) {
    background: #f8fafc;
    color: #64748b;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 1.5rem 1rem;
    border-bottom: 1px solid #f1f5f9;
}
:deep(.p-datatable-tbody > tr > td) {
    padding: 1.5rem 1rem;
    border-bottom: 1px solid #f8fafc;
}
:deep(.p-inputtext) {
    padding: 0.8rem 1.2rem;
}
@keyframes slide-in-bottom {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-in {
    animation: slide-in-bottom 0.8s ease-out;
}
</style>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
