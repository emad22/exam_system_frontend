<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';
import StudentHeader from '@/components/StudentHeader.vue';

const route = useRoute();
const router = useRouter();
const examId = route.params.examId;
const skillId = route.params.skillId;
const levelId = route.params.levelId;

const skill = ref(null);
const isLoading = ref(true);

const fetchSkillData = async () => {
    isLoading.value = true;
    try {
        const res = await api.get(`/exams/${examId}`);
        const foundSkill = res.data.skills.find(s => String(s.id) === String(skillId));
        skill.value = foundSkill;
    } catch (err) {
        console.error('Failed to fetch skill instructions', err);
    } finally {
        isLoading.value = false;
    }
};

const startExam = () => {
    router.push({
        name: 'exam.setup',
        params: {
            examId,
            skillId,
            levelId
        }
    });
};

const goBack = () => {
    router.push('/skill-selection');
};

onMounted(fetchSkillData);

const skillMap = {
    'listening': 'Listening',
    'reading': 'Reading',
    'grammar': 'Structure',
    'structure': 'Structure',
    'writing': 'Writing',
    'speaking': 'Speaking'
};

const getSkillDisplayName = (name) => {
    if (!name) return 'Skill Assessment';
    const lowerName = name.toLowerCase();
    const matchedKey = Object.keys(skillMap).find(key => lowerName.includes(key));
    return matchedKey ? skillMap[matchedKey] : name;
};
</script>

<template>
    <div class="h-screen bg-[#F8FAFC] flex flex-col font-sans relative overflow-hidden">
        <StudentHeader />
        
        <!-- Decoration -->
        <div class="fixed inset-0 pointer-events-none">
            <div class="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px]"></div>
            <div class="absolute bottom-[10%] -right-[5%] w-[30%] h-[30%] bg-brand-accent/5 rounded-full blur-[120px]"></div>
        </div>

        <main class="flex-grow flex items-center justify-center p-6 relative z-10 overflow-hidden">
            <div class="w-full max-w-5xl h-full max-h-[min(750px,calc(100vh-120px))] bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-700">
                <!-- Header Banner -->
                <div class="bg-slate-900 p-10 md:p-12 text-white relative overflow-hidden shrink-0">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    
                    <button @click="goBack" class="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                        <i class="pi pi-arrow-left text-[8px]"></i> Back to Selection
                    </button>

                    <div class="flex items-center gap-6">
                        <div class="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-white/10">
                            <i class="pi pi-info-circle"></i>
                        </div>
                        <div>
                            <h1 class="text-3xl font-black tracking-tight uppercase mb-1">{{ getSkillDisplayName(skill?.name) }} Instructions</h1>
                            <p class="text-white/50 font-bold text-[10px] uppercase tracking-widest">Crucial guidelines for your assessment</p>
                        </div>
                    </div>
                </div>

                <!-- Instructions Content -->
                <div class="flex-grow p-10 md:p-12 overflow-y-auto custom-scrollbar">
                    <div v-if="isLoading" class="flex flex-col items-center py-12">
                        <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                    </div>

                    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <!-- Left: Rules -->
                        <div class="space-y-8">
                            <div class="flex gap-6">
                                <div class="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                                    <i class="pi pi-clock"></i>
                                </div>
                                <div>
                                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-tight mb-2">Timed Environment</h3>
                                    <p class="text-[10px] font-medium text-slate-500 leading-relaxed uppercase">Each skill has a dedicated time limit. The timer will start immediately when you click 'Begin Exam'.</p>
                                </div>
                            </div>

                            <div class="flex gap-6">
                                <div class="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                                    <i class="pi pi-eye"></i>
                                </div>
                                <div>
                                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-tight mb-2">Honesty & Integrity</h3>
                                    <p class="text-[10px] font-medium text-slate-500 leading-relaxed uppercase">The system monitors tab-switching and external activity. Please stay within the browser window.</p>
                                </div>
                            </div>

                            <div class="flex gap-6">
                                <div class="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                                    <i class="pi pi-save"></i>
                                </div>
                                <div>
                                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-tight mb-2">Progress Saving</h3>
                                    <p class="text-[10px] font-medium text-slate-500 leading-relaxed uppercase">Your answers are saved automatically as you progress through each question batch.</p>
                                </div>
                            </div>
                        </div>

                       
                    </div>
                </div>

                <!-- Footer Action -->
                <div class="p-10 md:p-12 border-t border-slate-50 bg-white shrink-0">
                    <div class="flex flex-col items-center">
                        <button @click="startExam"
                            class="group relative w-full max-w-md py-6 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-brand-primary/40 hover:bg-brand-primary/90 hover:shadow-brand-primary/60 hover:-translate-y-1 transition-all duration-300">
                            <span class="relative z-10 flex items-center justify-center gap-3">
                                Begin Assessment <i class="pi pi-play text-[10px] group-hover:translate-x-1 transition-transform"></i>
                            </span>
                        </button>
                        <p class="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            By clicking begin, you agree to the examination terms & conditions
                        </p>
                    </div>
                </div>
            </div>
        </main>
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
