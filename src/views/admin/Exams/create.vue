<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const router = useRouter();
const route = useRoute();

const examId = ref(route.params.id || null);
const availableSkills = ref([]);
const form = ref({
    title: '',
    language_id: null,
    exam_type: 'adult',
    passing_score: 60,
    is_adaptive: false,
    selectedSkills: [] 
});

const isSubmitting = ref(false);
const isLoading = ref(false);
const errorMsg = ref('');
const skillTagsMap = ref({}); // { skillId: [tags] }

const isEditMode = computed(() => !!examId.value);

onMounted(async () => {
    isLoading.value = true;
    try {
        const [langRes, skillRes] = await Promise.all([
            api.get('/admin/languages'),
            api.get('/admin/skills-with-levels')
        ]);
        // Auto-select first (only) language
        if (langRes.data.length > 0) form.value.language_id = langRes.data[0].id;
        availableSkills.value = skillRes.data;
        
        if (isEditMode.value) {
            const examRes = await api.get(`/admin/exams/${examId.value}`);
            const exam = examRes.data;
            
            form.value = {
                title: exam.title,
                language_id: exam.language_id,
                exam_type: exam.exam_type || 'adult',
                passing_score: exam.passing_score ?? 60,
                is_adaptive: false,
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

            // Fetch tags for selected skills
            form.value.selectedSkills.forEach(s => fetchSkillTags(s.skill_id));
        }
    } catch (err) {
        console.error('Failed to load pre-requisites', err);
        errorMsg.value = 'Failed to load exam data.';
    } finally {
        isLoading.value = false;
    }
});

const fetchSkillTags = async (skillId) => {
    if (skillTagsMap.value[skillId]) return;
    try {
        const res = await api.get(`/admin/skills/${skillId}/tags`);
        skillTagsMap.value[skillId] = res.data;
    } catch (err) {
        console.error(`Failed to fetch tags for skill ${skillId}`, err);
    }
};

const toggleSkill = async (skillId) => {
    const idx = form.value.selectedSkills.findIndex(s => s.skill_id === skillId);
    if (idx === -1) {
        // Find skill info to get levels
        const skillInfo = availableSkills.value.find(s => s.id === skillId);
        const autoRules = [];
        
        if (skillInfo?.levels?.length > 0) {
            skillInfo.levels.forEach(lvl => {
                autoRules.push({
                    difficulty_level: lvl.level_number,
                    group_tag: '',
                    quantity: 5, // Defaulting to 5 as requested in example
                    randomize: true
                });
            });
        } else {
            autoRules.push({ difficulty_level: null, group_tag: '', quantity: 5, randomize: true });
        }

        form.value.selectedSkills.push({ 
            skill_id: skillId, 
            duration: 30, 
            is_optional: false,
            rules: autoRules
        });
        await fetchSkillTags(skillId);
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

const getLevelRule = (skillId, levelNumber) => {
    const skill = form.value.selectedSkills.find(s => s.skill_id === skillId);
    if (!skill) return null;
    
    // Find skill info to check if level is active
    const skillInfo = availableSkills.value.find(s => s.id === skillId);
    const levelInfo = skillInfo?.levels?.find(l => l.level_number === levelNumber);
    if (levelInfo && !levelInfo.is_active) return null;

    let rule = skill.rules.find(r => r.difficulty_level === levelNumber);
    if (!rule) {
        // Create it on the fly if needed for the UI to be responsive
        rule = { difficulty_level: levelNumber, group_tag: '', quantity: 0, randomize: true };
        skill.rules.push(rule);
    }
    return rule;
};

const getSkillTotalQuestions = (skillId) => {
    const skill = form.value.selectedSkills.find(s => s.skill_id === skillId);
    if (!skill) return 0;
    return skill.rules.reduce((acc, r) => acc + (r.quantity || 0), 0);
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

        <form @submit.prevent="saveExam" class="space-y-12">
            <!-- Sidebar Setup (Now Top) -->
            <div class="w-full">
                <div class="premium-card p-10 relative overflow-hidden">
                    <div class="absolute -right-16 -top-16 w-32 h-32 bg-indigo-50/50 rounded-full blur-2xl"></div>
                    
                    <h3 class="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-10 relative z-10">Basic Information</h3>
                    
                    <!-- Basic Info: Only Title and Category in one row -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
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
                    </div>
                </div>
            </div>

            <!-- Main Logic Designer -->
            <div class="w-full space-y-10">
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
                            <div v-if="isSkillSelected(skill.id)" class="ml-16 bg-slate-50/50 border border-slate-100 rounded-[3rem] p-10 space-y-12 animate-in slide-in-from-top-4 duration-500">
                                <div class="flex flex-col md:flex-row justify-between items-start md:items-center">
                                    <div class="flex items-center space-x-12">
                                         <div>
                                              <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Section Duration (Mins)</label>
                                              <input v-model.number="form.selectedSkills.find(s => s.skill_id === skill.id).duration" type="number" class="premium-input w-32 bg-white text-center font-black">
                                         </div>
                                         <label class="flex items-center cursor-pointer pt-6">
                                              <input v-model="form.selectedSkills.find(s => s.skill_id === skill.id).is_optional" type="checkbox" class="w-5 h-5 text-indigo-600 rounded-lg border-slate-200 focus:ring-0">
                                              <span class="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Optional Module</span>
                                         </label>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-detected Levels</p>
                                        <p class="text-xs font-black text-indigo-600 uppercase">{{ skill.levels?.length || 0 }} Matrix Nodes</p>
                                    </div>
                                </div>

                                <!-- Level Matrix (The User's Request) -->
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between px-6">
                                        <div class="flex items-center space-x-3">
                                            <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adaptive Matrix Rules</h5>
                                            <span class="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[8px] font-black border border-indigo-100">AUTO-SYNC</span>
                                        </div>
                                        <div class="flex-1 mx-8 h-px bg-slate-100"></div>
                                        <div class="text-right">
                                            <span class="text-[8px] font-black text-slate-300 uppercase block tracking-tighter">Skill Weight</span>
                                            <span class="text-xs font-black text-slate-700">{{ getSkillTotalQuestions(skill.id) }} Items</span>
                                        </div>
                                    </div>
                                    
                                    <div class="space-y-6">
                                        <!-- Iterate over all ACTIVE levels defined for the skill -->
                                        <div v-for="level in (skill.levels || []).filter(l => l.is_active)" :key="level.id"
                                             :class="getLevelRule(skill.id, level.level_number)?.quantity > 0 ? 'border-indigo-600 bg-white ring-4 ring-indigo-500/5' : 'border-slate-100 bg-slate-50/30 opacity-80'"
                                             class="group relative rounded-[2.5rem] border-2 p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-100/40">
                                            
                                            <!-- Level Indicator Badge -->
                                            <div class="absolute -left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-indigo-600 text-white flex flex-col items-center justify-center shadow-xl shadow-indigo-200 border-4 border-white z-10 transition-transform group-hover:scale-110">
                                                <span class="text-[8px] font-black opacity-50 uppercase leading-none">LVL</span>
                                                <span class="text-xs font-black leading-none">{{ level.level_number }}</span>
                                            </div>

                                            <div class="flex flex-col md:flex-row items-start md:items-center gap-10 pl-8">
                                                <!-- Identification -->
                                                <div class="w-full md:w-1/4">
                                                    <h5 class="text-sm font-black text-slate-800 uppercase tracking-tight truncate">{{ level.name }}</h5>
                                                    <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Difficulty Tier</p>
                                                </div>

                                                <!-- Content Tag (Topic) -->
                                                <div class="flex-1 w-full space-y-2">
                                                    <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Content Filter (Topic/Tag)</label>
                                                    <div class="relative group/tag">
                                                        <input v-model="getLevelRule(skill.id, level.level_number).group_tag" 
                                                               type="text" :list="`tags-skill-${skill.id}`"
                                                               placeholder="Pull from entire pool (General)..."
                                                               class="w-full bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase py-4 px-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all outline-none placeholder:opacity-30">
                                                        <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none group-hover/tag:opacity-100 transition-opacity">
                                                            <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Quantity Stepper & Shuffle -->
                                                <div class="flex items-center gap-8 w-full md:w-auto">
                                                    <!-- Stepper -->
                                                    <div class="space-y-2">
                                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Questions Count</label>
                                                        <div class="flex items-center bg-slate-900 rounded-2xl p-1 shadow-xl shadow-slate-200 border-2 border-slate-800">
                                                            <button @click="getLevelRule(skill.id, level.level_number).quantity = Math.max(0, getLevelRule(skill.id, level.level_number).quantity - 1)" 
                                                                    type="button" class="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-xl transition-all font-black text-lg">-</button>
                                                            <input v-model.number="getLevelRule(skill.id, level.level_number).quantity" 
                                                                   type="number" min="0" 
                                                                   class="w-14 bg-transparent border-0 text-white text-center font-black text-sm p-0 focus:ring-0">
                                                            <button @click="getLevelRule(skill.id, level.level_number).quantity++" 
                                                                    type="button" class="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-xl transition-all font-black text-lg">+</button>
                                                        </div>
                                                    </div>

                                                    <!-- Shuffle Toggle -->
                                                    <div class="space-y-2">
                                                        <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Order</label>
                                                        <button @click="getLevelRule(skill.id, level.level_number).randomize = !getLevelRule(skill.id, level.level_number).randomize" 
                                                                type="button" 
                                                                :class="getLevelRule(skill.id, level.level_number).randomize ? 'bg-emerald-500 text-white shadow-emerald-100 ring-emerald-500' : 'bg-slate-200 text-slate-400 ring-slate-200'"
                                                                class="px-5 h-[52px] rounded-2xl flex flex-col items-center justify-center transition-all shadow-lg active:scale-95 border-2 border-white ring-2">
                                                            <span class="text-[7px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">Mode</span>
                                                            <span class="text-[9px] font-black uppercase tracking-widest leading-none">{{ getLevelRule(skill.id, level.level_number).randomize ? 'Shuffle' : 'Linear' }}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Tag Suggestions Source (NEW) -->
                                    <datalist :id="`tags-skill-${skill.id}`">
                                        <option v-for="tag in (skillTagsMap[skill.id] || [])" :key="tag" :value="tag"></option>
                                    </datalist>

                                    <div v-if="!skill.levels || skill.levels.length === 0" class="py-10 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                                        <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-loose">
                                            No levels defined for this skill yet.<br/>
                                            <router-link :to="`/admin/skills/${skill.id}/levels`" class="text-indigo-400 hover:underline">Define Matrix Structure ➜</router-link>
                                        </p>
                                    </div>
                                </div>

                                <!-- Supplementary / Tag Overrides -->
                                <div class="space-y-6 pt-6 border-t border-slate-100">
                                    <div class="flex items-center justify-between px-6">
                                        <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tag & Manual Overrides</h5>
                                        <button @click="addRule(skill.id)" type="button" class="text-indigo-600 font-black text-[9px] uppercase tracking-widest hover:underline">+ Add Custom Filter</button>
                                    </div>

                                    <div class="grid grid-cols-1 gap-4">
                                        <div v-for="(rule, rIdx) in form.selectedSkills.find(s => s.skill_id === skill.id).rules.filter(r => r.group_tag)" :key="`tag-${rIdx}`" 
                                             class="bg-white border-2 border-dashed border-slate-100 rounded-[2rem] p-6 relative group/rule hover:border-indigo-100 transition-all flex items-center justify-between">
                                            
                                            <div class="grid grid-cols-3 gap-6 flex-1 pr-10">
                                                <div class="space-y-1">
                                                    <label class="text-[8px] font-black text-slate-400 uppercase ml-2">Tag/Group</label>
                                                    <input v-model="rule.group_tag" type="text" :list="`tags-skill-${skill.id}`" class="w-full bg-slate-50 border-0 rounded-xl text-[10px] font-black uppercase p-3">
                                                </div>
                                                <div class="space-y-1">
                                                    <label class="text-[8px] font-black text-slate-400 uppercase ml-2">Lvl Override</label>
                                                    <select v-model.number="rule.difficulty_level" class="w-full bg-slate-50 border-0 rounded-xl text-[10px] font-black uppercase p-3">
                                                        <option :value="null">Any</option>
                                                        <option v-for="l in 9" :key="l" :value="l">L{{l}}</option>
                                                    </select>
                                                </div>
                                                <div class="space-y-1 text-center">
                                                    <label class="text-[8px] font-black text-slate-400 uppercase">Qty</label>
                                                    <input v-model.number="rule.quantity" type="number" class="w-full bg-slate-800 text-white border-0 rounded-xl text-[10px] font-black text-center p-3">
                                                </div>
                                            </div>

                                            <button @click="removeRule(skill.id, form.value.selectedSkills.find(s => s.skill_id === skill.id).rules.indexOf(rule))" type="button" 
                                                    class="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm">✕</button>
                                        </div>
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
