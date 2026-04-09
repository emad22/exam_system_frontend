<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const router = useRouter();
const route = useRoute();

const examId = ref(route.params.id || null);
const languages = ref([]);
const availableSkills = ref([]);
const form = ref({
    title: '',
    description: '',
    language_id: null,
    exam_type: 'adult',
    passing_score: 60,
    is_adaptive: false,
    selectedSkills: [] 
});

const isSubmitting = ref(false);
const isLoading = ref(false);
const errorMsg = ref('');

const isEditMode = computed(() => !!examId.value);

onMounted(async () => {
    isLoading.value = true;
    try {
        const [langRes, skillRes] = await Promise.all([
            api.get('/admin/languages'),
            api.get('/admin/skills')
        ]);
        languages.value = langRes.data;
        availableSkills.value = skillRes.data;
        
        if (isEditMode.value) {
            const examRes = await api.get(`/admin/exams/${examId.value}`);
            const exam = examRes.data;
            
            form.value = {
                title: exam.title,
                description: exam.description,
                language_id: exam.language_id,
                exam_type: exam.exam_type || 'adult',
                passing_score: exam.passing_score,
                is_adaptive: !!exam.is_adaptive,
                selectedSkills: exam.skills.map(skill => {
                    const rules = exam.question_rules.filter(r => r.skill_id === skill.id).map(r => ({
                        difficulty_level: r.difficulty_level || null,
                        group_tag: r.group_tag || '',
                        quantity: r.quantity,
                        randomize: !!r.randomize
                    }));

                    return {
                        skill_id: skill.id,
                        duration: skill.pivot.duration,
                        is_optional: !!skill.pivot.is_optional,
                        rules: rules.length > 0 ? rules : [{ difficulty_level: null, group_tag: '', quantity: 5, randomize: true }]
                    };
                })
            };
        } else {
            if (languages.value.length > 0) form.value.language_id = languages.value[0].id;
        }
    } catch (err) {
        console.error('Failed to load pre-requisites', err);
        errorMsg.value = 'Failed to load exam data.';
    } finally {
        isLoading.value = false;
    }
});

const toggleSkill = (skillId) => {
    const idx = form.value.selectedSkills.findIndex(s => s.skill_id === skillId);
    if (idx === -1) {
        form.value.selectedSkills.push({ 
            skill_id: skillId, 
            duration: 30, 
            is_optional: false,
            rules: [{ difficulty_level: null, group_tag: '', quantity: 5, randomize: true }]
        });
    } else {
        form.value.selectedSkills.splice(idx, 1);
    }
};

const addRule = (skillId) => {
    const skill = form.value.selectedSkills.find(s => s.skill_id === skillId);
    if (skill) {
        skill.rules.push({ difficulty_level: null, group_tag: '', quantity: 5, randomize: true });
    }
};

const removeRule = (skillId, ruleIdx) => {
    const skill = form.value.selectedSkills.find(s => s.skill_id === skillId);
    if (skill && skill.rules.length > 1) {
        skill.rules.splice(ruleIdx, 1);
    }
};

const isSkillSelected = (skillId) => {
    return form.value.selectedSkills.some(s => s.skill_id === skillId);
};

const saveExam = async () => {
    if (form.value.selectedSkills.length === 0) {
        errorMsg.value = 'Please select at least one skill.';
        return;
    }

    isSubmitting.value = true;
    errorMsg.value = '';
    
    const payload = {
        ...form.value,
        skills: form.value.selectedSkills
    };

    try {
        if (isEditMode.value) {
            await api.patch(`/admin/exams/${examId.value}`, payload);
            alert('Exam updated successfully!');
        } else {
            await api.post('/admin/exams', payload);
            alert('Exam created successfully!');
        }
        router.push('/admin/exams');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to save exam.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
  <AdminLayout>
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-32 space-y-4">
        <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading exam details...</p>
    </div>
    
    <div v-else class="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div class="flex items-center space-x-6">
                <router-link to="/admin/exams" class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all border border-slate-100 group">
                    <svg class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"/></svg>
                </router-link>
                <div>
                     <h1 class="text-3xl font-black text-slate-800 tracking-tight">{{ isEditMode ? 'Edit Exam' : 'Create Exam' }}</h1>
                     <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Exam Settings</p>
                </div>
            </div>
            <button @click="saveExam" :disabled="isSubmitting" class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-10 py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
                {{ isSubmitting ? 'SAVING...' : 'SAVE EXAM ➜' }}
            </button>
        </div>

        <form @submit.prevent="saveExam" class="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <!-- Sidebar Setup -->
            <div class="lg:col-span-1 space-y-8">
                <div class="premium-card p-10 relative overflow-hidden">
                    <div class="absolute -right-16 -top-16 w-32 h-32 bg-indigo-50/50 rounded-full blur-2xl"></div>
                    
                    <h3 class="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-10 relative z-10">Basic Information</h3>
                    
                    <div class="space-y-8 relative z-10">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Exam Title</label>
                            <input v-model="form.title" type="text" required class="premium-input text-xs uppercase" placeholder="e.g. Midterm Alpha">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Category</label>
                            <select v-model="form.exam_type" required class="premium-input text-xs uppercase tracking-widest cursor-pointer">
                                <option value="adult">Adult (18+)</option>
                                <option value="children">Children (Young Learners)</option>
                            </select>
                        </div>
                        <div class="grid grid-cols-1 gap-8">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Language</label>
                                <select v-model.number="form.language_id" required class="premium-input text-xs uppercase tracking-widest cursor-pointer">
                                    <option v-for="lang in languages" :key="lang.id" :value="lang.id">{{ lang.name }}</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Passing Score (%)</label>
                                <input v-model.number="form.passing_score" type="number" class="premium-input font-black text-sm tracking-[0.2em]">
                            </div>
                        </div>

                        <div class="pt-6 border-t border-slate-50">
                             <label class="flex items-center cursor-pointer group">
                                 <div class="relative">
                                      <input v-model="form.is_adaptive" type="checkbox" class="w-6 h-6 text-indigo-600 rounded-lg border-slate-200 focus:ring-0 focus:ring-offset-0 bg-white">
                                 </div>
                                 <div class="ml-4">
                                     <span class="block text-[10px] font-black text-slate-700 uppercase tracking-[0.1em] group-hover:text-indigo-600 transition">Adaptive Exam</span>
                                     <span class="block text-[8px] text-slate-300 font-bold uppercase tracking-tighter">Enable dynamic difficulty scaling</span>
                                 </div>
                             </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Logic Designer -->
            <div class="lg:col-span-3 space-y-10">
                <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest p-5 rounded-2xl">
                    ⚠️ Error: {{ errorMsg }}
                </div>

                <div class="premium-card p-12 md:p-16">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 space-y-4 md:space-y-0">
                        <div>
                            <h3 class="text-2xl font-black text-slate-800 tracking-tight">Skill Blocks</h3>
                            <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Choose skills and define how questions are selected</p>
                        </div>
                        <div class="flex items-center space-x-2 opacity-30">
                             <div class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                             <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Config Mode</span>
                        </div>
                    </div>

                    <div class="space-y-10">
                        <div v-for="skill in availableSkills" :key="skill.id" class="space-y-6">
                            <!-- Skill Node Header -->
                            <div @click="toggleSkill(skill.id)" 
                                 :class="isSkillSelected(skill.id) ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-100/30' : 'border-slate-50 bg-slate-50/50 opacity-40 grayscale'"
                                 class="flex items-center justify-between p-8 rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer group active:scale-95">
                                <div class="flex items-center space-x-6">
                                     <div :class="isSkillSelected(skill.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400'" 
                                          class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black transform group-hover:rotate-6 transition-all duration-500">
                                          {{ skill.icon || '🧠' }}
                                     </div>
                                     <div>
                                          <h4 :class="isSkillSelected(skill.id) ? 'text-slate-800' : 'text-slate-400'" class="font-black text-xl uppercase tracking-tighter">{{ skill.name }} Skill</h4>
                                          <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{{ isSkillSelected(skill.id) ? 'Added to Exam' : 'Not Added' }}</p>
                                     </div>
                                </div>
                                <div v-if="isSkillSelected(skill.id)" class="bg-indigo-600 text-white rounded-xl px-4 py-2 text-[10px] font-black shadow-md">ACTIVE</div>
                                <div v-else class="text-slate-200 text-2xl font-black opacity-20">+</div>
                            </div>

                            <!-- Rule Config Sub-HUD -->
                            <div v-if="isSkillSelected(skill.id)" class="ml-16 bg-slate-50/50 border border-slate-100 rounded-[3rem] p-10 space-y-10 animate-in slide-in-from-top-4 duration-500">
                                <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                                    <div class="flex items-center space-x-12">
                                         <div>
                                              <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Duration (Mins)</label>
                                              <input v-model.number="form.selectedSkills.find(s => s.skill_id === skill.id).duration" type="number" class="premium-input w-32 bg-white text-center font-black">
                                         </div>
                                         <label class="flex items-center cursor-pointer pt-6">
                                              <input v-model="form.selectedSkills.find(s => s.skill_id === skill.id).is_optional" type="checkbox" class="w-5 h-5 text-indigo-600 rounded-lg border-slate-200 focus:ring-0">
                                              <span class="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Optional Skill</span>
                                         </label>
                                    </div>
                                    <button @click="addRule(skill.id)" type="button" class="bg-white border border-slate-200 text-indigo-600 font-black text-[9px] tracking-widest uppercase px-6 py-4 rounded-2xl hover:border-indigo-100 transition shadow-sm active:scale-95">
                                        + Add Rule
                                    </button>
                                </div>

                                <div class="grid grid-cols-1 gap-6">
                                    <div v-for="(rule, rIdx) in form.selectedSkills.find(s => s.skill_id === skill.id).rules" :key="rIdx" 
                                         class="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm relative group/rule hover:border-indigo-100 transition-all">
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                                             <div>
                                                  <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Difficulty Level</label>
                                                  <select v-model.number="rule.difficulty_level" class="premium-input text-[11px] uppercase tracking-widest font-black cursor-pointer bg-slate-50">
                                                       <option :value="null">Any (Random)</option>
                                                       <option v-for="l in 9" :key="l" :value="l">Level {{ l }} Only</option>
                                                  </select>
                                             </div>
                                             <div>
                                                  <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Number of Questions</label>
                                                  <input v-model.number="rule.quantity" type="number" min="1" class="premium-input text-center font-black bg-slate-50">
                                             </div>
                                             <div>
                                                  <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Question Group/Tag</label>
                                                  <input v-model="rule.group_tag" type="text" placeholder="e.g. Grammar" class="premium-input text-[11px] font-mono tracking-widest bg-slate-50">
                                             </div>
                                        </div>
                                        <button v-if="form.selectedSkills.find(s => s.skill_id === skill.id).rules.length > 1" @click="removeRule(skill.id, rIdx)" type="button" 
                                                class="absolute -top-3 -right-3 w-10 h-10 bg-white border border-slate-100 rounded-2xl shadow-md flex items-center justify-center text-slate-300 hover:text-rose-500 hover:border-rose-100 transition-all opacity-0 group-rule-hover:opacity-100 hover:rotate-90">✕</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-center py-6">
                     <p class="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] text-center italic">
                         Note: Specific tags and levels will override general random selection within the skill.
                     </p>
                </div>
            </div>
        </form>
    </div>
  </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
