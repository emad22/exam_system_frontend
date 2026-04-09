<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const exams = ref([]);
const loading = ref(true);
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
    // Load full exam details to get detailed skills/rules
    try {
        const res = await api.get(`/admin/exams/${exam.id}`);
        const fullExam = res.data;
        
        // Transform rules into a handy format for editing
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
        // We use the patch endpoint for exams to update skills array
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

const getCategoryStyles = (type) => {
    switch(type) {
        case 'adult': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'children': return 'bg-orange-50 text-orange-600 border-orange-100';
        default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
}

const deleteExam = async (id) => {
    if (!window.confirm('CRITICAL_DELETION_CONFIRM: This will permanently purge the exam and all its associated questions and rules. Continue?')) return;

    try {
        await api.delete(`/admin/exams/${id}`);
        fetchExams();
    } catch (err) {
        console.error('Failed to delete exam', err);
        alert('DELETION_FAILURE: System could not executive the destructive command.');
    }
};

onMounted(fetchExams);
</script>

<template>
  <AdminLayout>
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight">Manage Exams</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">View and configure exam templates</p>
            </div>
            <div class="flex items-center space-x-4">
                <router-link to="/admin/exams/import" class="bg-white border border-slate-200 text-slate-500 font-black text-[10px] tracking-widest uppercase px-6 py-3.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm">
                    Import Exam (Folders)
                </router-link>
                <router-link to="/admin/exams/create" class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                    Create Exam +
                </router-link>
            </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading exams...</p>
        </div>

        <div v-else>
            <div v-if="exams.length > 0" class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50 text-slate-300 text-[10px] uppercase font-black tracking-[0.2em]">
                            <tr>
                                <th class="px-10 py-8">EXAM TITLE</th>
                                <th class="px-10 py-8">CATEGORY</th>
                                <th class="px-10 py-8">LANGUAGE</th>
                                <th class="px-10 py-8">TYPE</th>
                                <th class="px-10 py-8 text-center">ATTEMPTS</th>
                                <th class="px-10 py-8 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 text-sm">
                            <tr v-for="exam in exams" :key="exam.id" class="hover:bg-slate-50/50 transition-colors group">
                                <td class="px-10 py-6">
                                    <div class="flex items-center space-x-4">
                                         <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                         </div>
                                         <div>
                                              <div class="font-black text-slate-700 tracking-tight leading-none mb-1 uppercase text-sm">{{ exam.title }}</div>
                                              <div class="text-[10px] text-slate-300 font-bold uppercase tracking-widest line-clamp-1 italic">{{ exam.description || 'No description' }}</div>
                                         </div>
                                    </div>
                                </td>
                                <td class="px-10 py-6">
                                    <span :class="getCategoryStyles(exam.exam_type)" 
                                          class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border">
                                        {{ exam.exam_type || 'General' }}
                                    </span>
                                </td>
                                <td class="px-10 py-6">
                                    <div class="flex items-center space-x-2">
                                         <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                         <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ exam.language?.name || 'Universal' }}</span>
                                    </div>
                                </td>
                                <td class="px-10 py-6">
                                    <span :class="exam.is_adaptive ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'"
                                        class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border">
                                        {{ exam.is_adaptive ? 'Adaptive' : 'Standard' }}
                                    </span>
                                </td>
                                <td class="px-10 py-6 text-center">
                                     <div class="font-black text-slate-800 text-lg tracking-tighter">{{ exam.attempts_count || 0 }}</div>
                                     <div class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Attempts</div>
                                </td>
                                <td class="px-10 py-6 text-right flex items-center justify-end space-x-3">
                                    <button @click="openRules(exam)" class="bg-white border border-slate-200 text-indigo-500 font-black text-[9px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm active:scale-95">
                                        RULES
                                    </button>
                                    <router-link :to="`/admin/exams/${exam.id}/edit`" class="bg-white border border-slate-200 text-slate-500 font-black text-[9px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm active:scale-95">
                                        EDIT
                                    </router-link>
                                    <button @click="deleteExam(exam.id)" class="bg-white border border-rose-100 text-rose-500 font-black text-[9px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:bg-rose-50 hover:border-rose-300 transition shadow-sm active:scale-95">
                                        DELETE
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group">
                <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500">📑</div>
                <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">No Exams Found</h3>
                <p class="text-slate-400 font-medium max-w-sm mx-auto mb-12 text-sm leading-relaxed italic">
                    Create your first exam template to start evaluating students.
                </p>
                <router-link to="/admin/exams/create" class="inline-block bg-indigo-600 text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs">
                    Create First Exam ➜
                </router-link>
            </div>
        </div>

        <!-- Quick Rules Edit Modal -->
        <div v-if="showRulesModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
             <!-- Backdrop -->
             <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" @click="showRulesModal = false"></div>
             
             <!-- Modal Content -->
             <div class="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                  <div class="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                       <div>
                            <h2 class="text-2xl font-black text-slate-800 tracking-tight uppercase">Exam Rule Config — {{ selectedExam?.title }}</h2>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Adjust question counts for each skill & level</p>
                       </div>
                       <button @click="showRulesModal = false" class="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 flex items-center justify-center hover:text-indigo-600 transition-all">
                            ✕
                       </button>
                  </div>

                  <div class="flex-1 overflow-y-auto p-10 space-y-12">
                       <div v-for="skill in rulesForm.skills" :key="skill.skill_id" class="space-y-6">
                            <div class="flex items-center space-x-4">
                                 <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm uppercase">
                                      {{ skill.name.charAt(0) }}
                                 </div>
                                 <h3 class="text-lg font-black text-slate-700 uppercase tracking-tight">{{ skill.name }} Skill</h3>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 ml-14">
                                 <div v-for="(rule, rIdx) in skill.rules" :key="rIdx" class="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col space-y-4 hover:border-indigo-400 transition-colors group">
                                      <div class="flex justify-between items-start">
                                           <div>
                                                <span class="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Difficulty Level</span>
                                                <span class="font-black text-slate-800 text-sm">Level {{ rule.difficulty_level || 'Any' }}</span>
                                           </div>
                                           <div v-if="rule.group_tag" class="text-right">
                                                <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">Group tag</span>
                                                <span class="font-mono text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded">{{ rule.group_tag }}</span>
                                           </div>
                                      </div>
                                      
                                      <div class="pt-4 border-t border-slate-50 flex items-center justify-between">
                                           <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Count</label>
                                           <div class="flex items-center space-x-3">
                                                <button @click="rule.quantity > 1 ? rule.quantity-- : null" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 font-black transition-colors">-</button>
                                                <input v-model.number="rule.quantity" type="number" min="1" class="w-16 h-10 bg-slate-50 border-0 rounded-xl text-center font-black text-sm focus:ring-2 focus:ring-indigo-500/20">
                                                <button @click="rule.quantity++" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 font-black transition-colors">+</button>
                                           </div>
                                      </div>
                                 </div>
                            </div>
                       </div>
                  </div>

                  <div class="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-end space-x-4">
                       <button @click="showRulesModal = false" class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 py-4 hover:text-slate-600 transition">Cancel</button>
                       <button @click="saveRules" :disabled="isSavingRules"
                               :class="isSavingRules ? 'opacity-50 grayscale' : 'hover:bg-indigo-700 active:scale-95 shadow-xl shadow-indigo-100'"
                               class="bg-indigo-600 text-white font-black py-4 px-12 rounded-2xl transition-all uppercase tracking-widest text-[10px]">
                           {{ isSavingRules ? 'Saving counts...' : 'Update Counts ➜' }}
                       </button>
                  </div>
             </div>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
