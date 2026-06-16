<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import StudentHeader from '@/components/StudentHeader.vue';

const router = useRouter();
const exams = ref([]);

const skillOrder = [
    { key: 'listen',  priority: 0 },
    { key: 'read',    priority: 1 },
    { key: 'stru',    priority: 2 }, // يمسك "Strcture" و "Structure" كلاهما STRU
    { key: 'gram',    priority: 2 },
    { key: 'writ',    priority: 3 },
    { key: 'speak',   priority: 4 },
];

const sortedSkills = computed(() => {
    const exam = exams.value[0];
    if (!exam?.skills) return [];
    return [...exam.skills].sort((a, b) => {
        const getName = (s) => s.name?.toLowerCase().replace('writting', 'writing') || '';
        const getPriority = (s) => {
            const name = getName(s);
            const match = skillOrder.find(o => name.includes(o.key));
            return match ? match.priority : 99;
        };
        return getPriority(a) - getPriority(b);
    });
});

const isLoading = ref(true);

const fetchExams = async () => {
    isLoading.value = true;
    try {
        const res = await api.get('/exams');
        exams.value = res.data;
        console.log('Skills from API:', exams.value[0]?.skills?.map(s => s.name));
    } catch (err) {
        console.error('Failed to load exams', err);
    } finally {
        isLoading.value = false;
    }
};

const skillMap = {
    'listening': 'Listening',
    'reading': 'Reading',
    'grammar': 'Structure',
    'structure': 'Structure',
    'writing': 'Writing',
    'speaking': 'Speaking'
};

const getSkillDisplayName = (name) => {
    if (!name) return 'Unknown Skill';
    const lowerName = name.toLowerCase().replace('writting', 'writing');
    const matchedKey = Object.keys(skillMap).find(key => lowerName.includes(key));
    return matchedKey ? skillMap[matchedKey] : name;
};

const getSkillIcon = (name) => {
    name = name.toLowerCase().replace('writting', 'writing');
    if (name.includes('listening')) return '/Listening02.png';
    if (name.includes('reading')) return '/Reading-1.png';
    if (name.includes('writing')) return '/Writing-01.png';
    if (name.includes('speaking')) return '/Speaking-02.png';
    if (name.includes('grammar') || name.includes('structure')) return '/Strac-01.png';   //Strcture
    return '/logo.png';
};

const isSkillCompleted = (exam, skillId) => {
    if (!exam || !exam.skill_statuses) return false;
    const status = exam.skill_statuses[skillId];
    return ['completed', 'failed', 'skipped'].includes(status);
};

const isSkillInProgress = (exam, skillId) => {
    if (!exam || !exam.skill_statuses) return false;
    return exam.skill_statuses[skillId] === 'in_progress';
};

const selectSkill = (skillId) => {
    const exam = exams.value[0];
    if (!exam) return;
    
    router.push({
        name: 'exam.instructions',
        params: {
            examId: exam.id,
            skillId: skillId
        }
    });
};


const activeSkillId = computed(() => {
    const exam = exams.value[0];
    if (!exam?.skill_statuses) return null;
    const inProgress = exam.skills?.find(s => 
        exam.skill_statuses[s.id] === 'in_progress'
    );
    if (inProgress) return inProgress.id;
    
    return null;
});

const isSkillLocked = (exam, skillId) => {
    if (!activeSkillId.value) return false;
    if (skillId === activeSkillId.value) return false;
    if (isSkillCompleted(exam, skillId)) return false;
    return true;
};

onMounted(fetchExams);


</script>

<template>
    <div class="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
        <StudentHeader />
        
        <!-- Soft background blobs -->
        <div class="fixed inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px]"></div>
            <div class="absolute top-[30%] -left-[10%] w-[30%] h-[30%] bg-brand-accent/5 rounded-full blur-[120px]"></div>
        </div>

        <div class="max-w-5xl mx-auto w-full flex-grow flex flex-col relative z-10 px-6 py-4 md:px-8 md:py-5">
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row items-end justify-between mb-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-700 shrink-0 border-b border-slate-100 pb-4">
                <div>
                    <h1 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">Arabic Language Proficiency Test (ALPT)</h1>
                    <p class="text-slate-400 font-bold text-[9px] uppercase tracking-[0.3em] mt-2">Select a skill to begin your ALPT</p>
                </div>
                
                <div class="flex items-center gap-3 bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100 shadow-sm">
                    <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-[9px] font-black text-emerald-600 uppercase tracking-widest">System Ready</span>
                </div>
            </div>

            <!-- Skills List Area -->
            <div class="flex-grow relative">
                <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
                    <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                </div>

                <div v-else-if="!exams.length" class="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                    <span class="text-6xl mb-6 opacity-20">🎯</span>
                    <h2 class="text-2xl font-black text-slate-700 uppercase tracking-tight">No Active Assessments</h2>
                    <p class="text-slate-400 font-bold mt-4 text-sm uppercase tracking-widest max-w-md">Your account is currently pending activation.</p>
                </div>

                <div v-else class="pt-2 pr-1.5">
                    <div class="space-y-2.5 pb-1 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div v-for="skill in sortedSkills" :key="skill.id"
                            @click="!isSkillCompleted(exams[0], skill.id) && !isSkillLocked(exams[0], skill.id) && selectSkill(skill.id)"
                            class="group relative bg-white border border-slate-100 rounded-xl px-5 py-3 min-h-[78px] transition-all duration-300 flex items-center gap-5"
                            :class="[
                                isSkillCompleted(exams[0], skill.id) ? 'opacity-50 grayscale pointer-events-none' : '',
                                isSkillLocked(exams[0], skill.id) ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:shadow-slate-200/50 hover:border-brand-primary/20 hover:-translate-x-1'
                            ]">
                            
                            <!-- Icon -->
                            <div class="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm border border-slate-50 shrink-0"
                                :class="isSkillCompleted(exams[0], skill.id) ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-600 group-hover:bg-brand-primary group-hover:text-white'">
                                <i v-if="isSkillCompleted(exams[0], skill.id)" class="pi pi-check text-base"></i>
                                <img v-else :src="getSkillIcon(skill.name)" :alt="skill.name" class="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
                            </div>

                            <!-- Details -->
                            <div class="flex-grow">
                                <div class="flex items-center gap-4 mb-1">
                                    <h3 class="text-sm font-black text-slate-800 tracking-tight uppercase group-hover:text-brand-primary transition-colors leading-none">
                                        {{ getSkillDisplayName(skill.name) }}
                                    </h3>
                                <div v-if="isSkillCompleted(exams[0], skill.id)" class="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-md border border-emerald-100">
                                        <i class="pi pi-check-circle text-[10px]"></i>
                                        <span class="text-[8px] font-black uppercase tracking-widest">Completed</span>
                                    </div>
                                    <div v-else-if="isSkillInProgress(exams[0], skill.id)" class="flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-md border border-brand-primary/20">
                                        <div class="w-1 h-1 rounded-full bg-brand-primary animate-pulse"></div>
                                        <span class="text-[8px] font-black uppercase tracking-widest">In Progress</span>
                                    </div>
                                    <div v-else  class="flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-md border border-brand-primary/20">
                                        <div class="w-1 h-1 rounded-full bg-brand-primary animate-pulse"></div>
                                        <span class="text-[8px] font-black uppercase tracking-widest">Not Taken</span>
                                    </div>
                                </div>
                                <div v-if="isSkillLocked(exams[0], skill.id)" 
                                    class="flex items-center gap-1.5 bg-slate-100 text-slate-400 px-3 py-1 rounded-md border border-slate-200">
                                    <i class="pi pi-lock text-[10px]"></i>
                                    <span class="text-[8px] font-black uppercase tracking-widest">Locked</span>
                                </div>
                               <!--<p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Institutional Proficiency Assessment Track</p>-->
                            </div>

                            <!-- Action "Link" Style -->
                            <div class="shrink-0 flex items-center gap-4">
                                <div v-if="!isSkillCompleted(exams[0], skill.id)" 
                                    class="flex items-center gap-2 text-slate-300 group-hover:text-brand-primary transition-all font-black text-[9px] uppercase tracking-[0.2em]">
                                    <span>{{ isSkillInProgress(exams[0], skill.id) ? 'Resume Test' : 'Start Test' }}</span>
                                    <i class="pi pi-arrow-right text-[8px] group-hover:translate-x-1 transition-transform"></i>
                                </div>
                                <div v-else class="text-emerald-500 font-black text-[10px] uppercase tracking-[0.2em]">
                                    Taken
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Info -->
            <div class="mt-3 text-center animate-in fade-in duration-1000 shrink-0 border-t border-slate-50 pt-3">
                <p class="text-[8px] font-bold text-slate-300 uppercase tracking-[0.35em]">
                    Arab Academy, All Right recived © 2026
                </p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #E2E8F0;
    border-radius: 10px;
}
</style>
