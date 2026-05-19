<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useAdminStore } from '@/stores/admin';

import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import InputNumber from 'primevue/inputnumber';

const { showAlert, showConfirm } = useModal();

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
        showAlert('Failed to load exams', 'Error', 'error');
    } finally {
        loading.value = false;
    }
};

const openRules = async (exam) => {
    selectedExam.value = exam;
    showRulesModal.value = true;
    try {
        const [examRes, skillRes] = await Promise.all([
            api.get(`/admin/exams/${exam.id}`),
            api.get('/admin/skills-with-levels')
        ]);
        
        const fullExam = examRes.data;
        const allSkills = skillRes.data;
        
        rulesForm.value.skills = fullExam.skills.map(skill => {
            const skillDetails = allSkills.find(s => s.id === skill.id);
            const levelRules = (fullExam.question_rules || []).filter(r => r.skill_id === skill.id);
            
            // Map each available level to a rule (existing or new)
            const rules = (skillDetails?.levels || []).map(lvl => {
                const existing = levelRules.find(r => r.level_id === lvl.level_number);
                return {
                    id: existing?.id || null,
                    level_id: lvl.level_number,
                    quantity: existing?.quantity ?? 0,
                    standalone_quantity: existing?.standalone_quantity ?? 0,
                    passage_quantity: existing?.passage_quantity ?? 0
                };
            });

            return {
                skill_id: skill.id,
                name: skill.name,
                duration: skill.pivot.duration,
                is_optional: !!skill.pivot.is_optional,
                rules: rules
            };
        });
    } catch (err) {
        showAlert('Failed to load exam rules', 'Error', 'error');
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
        showAlert('Failed to save rules', 'Error', 'error');
    } finally {
        isSavingRules.value = false;
    }
};

const getCategorySeverity = async (category) => {
    if (!category) return 'secondary';
    const slug = (category.slug || '').toLowerCase();
    if (slug.includes('adult')) return 'info';
    if (slug.includes('child')) return 'warn';
    return 'info';
}

const setDefaultExam = async (exam) => {
    if (!(await showConfirm(`Set "${exam.title}" as default for ${exam.category?.name || 'General'}?`))) return;
    try {
        await api.patch(`/admin/exams/${exam.id}/set-default`);
        fetchExams();
    } catch (err) {
        showAlert('Failed to set default exam', 'Error', 'error');
    }
};

const deleteExam = async (id) => {
    if (!(await showConfirm('Are you sure you want to delete this exam?'))) return;
    try {
        await api.delete(`/admin/exams/${id}`);
        fetchExams();
    } catch (err) {
        showAlert('Failed to delete exam', 'Error', 'error');
    }
};

onMounted(fetchExams);
</script>

<template>
    <AdminLayout>
        <div class="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-12">
            
            <!-- Standardized Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
                <div>
                     <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Exams</h1>
                     <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manage and organize your exams</p>
                </div>
                <div class="flex items-center space-x-3">
                    <Button label="Create Exam" icon="pi pi-plus" class="bg-brand-primary border-none text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-rose-100 transition-all hover:-translate-y-1" @click="router.push('/admin/exams/create')" />
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading Exams...</p>
            </div>

            <div v-else>
                <div v-if="exams.length > 0 || searchQuery" class="space-y-6">
                    
                    <!-- Integrated Search HUD -->
                    <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center">
                        <div class="relative w-full max-w-xl">
                            <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                            <InputText v-model="searchQuery" placeholder="Filter by title, domain, or classification..." class="w-full pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-black uppercase tracking-tight shadow-sm" />
                        </div>
                        <div class="ml-auto hidden md:flex items-center space-x-4">
                            <div class="flex flex-col items-end">
                                <span class="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Total Exams</span>
                                <span class="text-lg font-black text-slate-800 tracking-tighter">{{ exams.length }} Active</span>
                            </div>
                            <div class="w-px h-8 bg-slate-50"></div>
                            <div class="flex flex-col items-end">
                                <span class="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Default Exams</span>
                                <span class="text-lg font-black text-brand-primary tracking-tighter">{{ stats.defaultExams }} Mapped</span>
                            </div>
                        </div>
                    </div>

                    <Card class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden pb-4">
                        <template #content>
                            <DataTable :value="filteredExams" dataKey="id" paginator :rows="10" 
                                class="p-datatable-sm" responsiveLayout="scroll">

                                <Column header="Exam Information" style="min-width: 350px">
                                    <template #body="{ data }">
                                        <div class="flex items-center space-x-6 py-4">
                                            <div :class="data.is_default ? 'bg-brand-primary text-white shadow-lg shadow-rose-100' : 'bg-slate-50 text-slate-400 border border-slate-100'"
                                                class="w-14 h-14 rounded-3xl flex items-center justify-center transition-all transform group-hover:scale-105 shrink-0">
                                                 <i :class="data.is_default ? 'pi pi-star-fill' : 'pi pi-file-edit'" class="text-xl"></i>
                                            </div>
                                            <div class="min-w-0">
                                                 <div class="flex items-center gap-3">
                                                     <div class="font-black text-slate-800 uppercase tracking-tight text-lg truncate">{{ data.title }}</div>
                                                     <Tag v-if="data.is_default" value="DEFAULT" severity="success" class="text-[7px] font-black px-2 py-0.5 rounded-full" />
                                                 </div>
                                                 <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest line-clamp-1 italic opacity-80 mt-1">{{ data.description || 'No Description' }}</div>
                                                 
                                                 <div class="flex items-center space-x-2 mt-4">
                                                     <span class="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase tracking-widest border border-slate-200">
                                                         {{ data.language?.name || 'UNIVERSAL' }}
                                                     </span>
                                                     <span class="text-[8px] font-black bg-rose-50 text-brand-primary px-2 py-1 rounded-lg uppercase tracking-widest border border-rose-100">
                                                         Target: {{ data.passing_score }}%
                                                     </span>
                                                 </div>
                                            </div>
                                        </div>
                                    </template>
                                </Column>

                                <Column header="Exam Structure" style="min-width: 320px">
                                    <template #body="{ data }">
                                        <div class="space-y-6 py-2">
                                            <div v-for="skill in data.skills" :key="skill.id" class="space-y-2">
                                                <div class="flex items-center justify-between border-b border-slate-50 pb-2">
                                                    <div class="flex items-center space-x-2">
                                                        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                        <span class="text-[10px] font-black text-slate-800 uppercase tracking-tight">{{ skill.name }}</span>
                                                    </div>
                                                    <span class="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                        Total: {{ data.breakdown?.filter(b => b.skill_id === skill.id).reduce((acc, curr) => acc + curr.count, 0) || 0 }} Qs
                                                    </span>
                                                </div>
                                                <div class="flex flex-wrap gap-1.5 ml-4">
                                                    <div v-for="lvlBreakdown in data.breakdown?.filter(b => b.skill_id === skill.id).sort((a, b) => a.level_id - b.level_id)" 
                                                         :key="lvlBreakdown.level_id"
                                                         class="flex items-center bg-white border border-slate-100 px-2 py-1 rounded-md shadow-sm">
                                                        <span class="text-[8px] font-black text-slate-400 mr-2">L{{ lvlBreakdown.level_id }}</span>
                                                        <span class="text-[9px] font-black text-brand-primary">{{ lvlBreakdown.count }}</span>
                                                    </div>
                                                    <div v-if="!data.breakdown?.some(b => b.skill_id === skill.id)" class="text-[8px] font-bold text-slate-300 italic uppercase">
                                                        No questions mapped
                                                    </div>
                                                </div>
                                            </div>
                                           
                                        </div>
                                    </template>
                                </Column>

                                <Column header="Attempts" style="width: 140px" class="text-center">
                                    <template #body="{ data }">
                                         <div class="flex flex-col items-center">
                                             <div class="font-black text-slate-800 text-base tracking-tighter">{{ data.attempts_count || 0 }}</div>
                                             <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Total Attempts</div>
                                         </div>
                                    </template>
                                </Column>

                                <Column :exportable="false" style="min-width: 120px" class="text-right pr-6">
                                    <template #body="{ data }">
                                        <div class="flex items-center justify-end space-x-2">
                                            <Button icon="pi pi-pencil" text severity="secondary" @click="router.push(`/admin/exams/${data.id}/edit`)" />
                                            <Button icon="pi pi-trash" text severity="danger" @click="deleteExam(data.id)" />
                                        </div>
                                    </template>
                                </Column>
                            </DataTable>
                        </template>
                    </Card>
                </div>

                <!-- Empty State -->
                <div v-else class="bg-white rounded-[4rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-32 text-center mt-6 animate-in zoom-in-95 duration-700">
                    <div class="w-28 h-28 bg-slate-50 rounded-[3rem] flex items-center justify-center mx-auto mb-10 text-6xl shadow-inner italic">?</div>
                    <h3 class="text-3xl font-black text-slate-800 mb-6 tracking-tight uppercase">No Exams Found</h3>
                    <p class="text-slate-400 font-bold max-w-sm mx-auto mb-12 text-sm leading-relaxed uppercase tracking-wide opacity-80">
                        Get started by creating your first exam.
                    </p>
                    <Button label="Create First Exam" icon="pi pi-arrow-right" iconPos="right" class="px-12 py-5 bg-brand-primary border-none rounded-3xl shadow-xl shadow-rose-100 font-black text-[10px] uppercase tracking-widest hover:-translate-y-1 transition-all" @click="router.push('/admin/exams/create')" />
                </div>
            </div>
        </div>
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
