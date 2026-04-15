<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const router = useRouter();
const exams = ref([]);
const student = ref(null);
const isLoading = ref(false);
const startingSkillId = ref(null);

const fetchDashboard = async () => {
    isLoading.value = true;
    try {
        const [userRes, examsRes] = await Promise.all([
            api.get('/user'),
            api.get('/exams'),
        ]);
        student.value = userRes.data;
        exams.value = examsRes.data;
    } catch (err) {
        console.error('Failed to load dashboard', err);
    } finally {
        isLoading.value = false;
    }
};

onMounted(fetchDashboard);

const skills = () => exams.value?.[0]?.skills || [];

const startSkill = async (skillId) => {
    if (!exams.value[0]) return;
    startingSkillId.value = skillId;
    try {
        const res = await api.post(`/exams/${exams.value[0].id}/start`, { skill_id: skillId });
        router.push(`/exam/${res.data.attempt.id}`);
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to start session');
    } finally {
        startingSkillId.value = null;
    }
};

const getSkillIcon = (name) => {
    name = name.toLowerCase();
    if (name.includes('listening')) return '🎧';
    if (name.includes('reading')) return '📖';
    if (name.includes('writing')) return '✍️';
    if (name.includes('speaking')) return '🗣️';
    if (name.includes('grammar') || name.includes('structure')) return '📋';
    return '🎯';
};

const skillCardClass = (name) => {
    name = name.toLowerCase();
    if (name.includes('listening'))
        return 'bg-gradient-to-br from-violet-600 to-purple-800 border-violet-500/30 group-hover:shadow-violet-200';
    if (name.includes('reading') || name.includes('comprehension'))
        return 'bg-gradient-to-br from-blue-600 to-blue-900 border-blue-500/30 group-hover:shadow-blue-200';
    if (name.includes('writing'))
        return 'bg-gradient-to-br from-emerald-600 to-teal-800 border-emerald-500/30 group-hover:shadow-emerald-200';
    if (name.includes('speaking'))
        return 'bg-gradient-to-br from-orange-500 to-red-700 border-orange-500/30 group-hover:shadow-orange-200';
    if (name.includes('grammar') || name.includes('structure'))
        return 'bg-gradient-to-br from-sky-500 to-cyan-800 border-sky-400/30 group-hover:shadow-sky-200';
    // Cycle through colors for unknown skills by index fallback
    return 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-500/30 group-hover:shadow-slate-200';
};

const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
};
</script>

<template>
    <div class="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">

        <!-- Soft background blobs -->
        <div class="fixed inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[120px]"></div>
            <div class="absolute top-[30%] -left-[10%] w-[30%] h-[30%] bg-indigo-50/50 rounded-full blur-[100px]"></div>
        </div>

        <!-- Header -->
        <header class="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-8 h-20 flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 bg-[#004a99] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                        <span class="font-black italic text-lg">A</span>
                    </div>
                    <div>
                        <h1 class="text-base font-black text-slate-800 tracking-tight leading-none">ArabAcademy</h1>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assessment Center</span>
                    </div>
                </div>

                <div class="flex items-center space-x-6">
                    <div class="text-right hidden sm:block">
                        <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Candidate</p>
                        <p class="text-xs font-bold text-slate-700 uppercase">{{ student?.name || student?.email }}</p>
                    </div>
                    <button @click="logout" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-100 flex items-center justify-center">
                        <i class="pi pi-sign-out"></i>
                    </button>
                </div>
            </div>
        </header>

        <main class="relative z-10 max-w-7xl mx-auto px-8 py-16">

            <!-- Loading -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-40">
                <div class="w-10 h-10 border-2 border-slate-100 border-t-[#004a99] rounded-full animate-spin"></div>
                <p class="mt-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Initializing Session...</p>
            </div>

            <div v-else class="space-y-16">

                <!-- Greeting -->
                <section class="space-y-3">
                    <div class="inline-flex items-center space-x-2 bg-blue-50 text-[#004a99] px-4 py-1.5 rounded-lg border border-blue-100">
                        <i class="pi pi-check-circle text-[10px]"></i>
                        <span class="text-[9px] font-black uppercase tracking-[0.2em]">Credential Verified</span>
                    </div>
                    <h2 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                        مرحباً، <span class="text-[#004a99]">{{ student?.name?.split(' ')[0] || 'Candidate' }}</span>
                    </h2>
                    <p class="text-slate-400 font-medium text-sm">اختر المهارة التي تريد الاختبار فيها للبدء.</p>
                </section>

                <!-- No exams -->
                <div v-if="!exams.length" class="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-32 text-center">
                    <span class="text-6xl mb-6 block grayscale opacity-20">📑</span>
                    <h3 class="text-xl font-black text-slate-700 tracking-tight">لا توجد مهارات مخصصة لك حتى الآن.</h3>
                    <p class="text-slate-400 font-medium mt-3 text-sm">التواصل مع الإدارة لتفعيل حسابك.</p>
                </div>

                <!-- Skills Grid - THE MAIN CONTENT -->
                <section v-else>
                    <div class="flex items-center justify-between mb-12">
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">برنامج التقييم الأكاديمي</p>
                            <div class="flex items-center space-x-3">
                                <div class="w-1.5 h-8 bg-[#004a99] rounded-full"></div>
                                <h3 class="text-2xl font-black text-slate-800 tracking-tight">اختر مهارتك</h3>
                            </div>
                        </div>
                        <div class="bg-white border border-slate-100 rounded-2xl px-5 py-3 shadow-sm flex items-center space-x-3">
                            <div class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ skills().length }} وحدات نشطة</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <button v-for="(skill, index) in skills()" :key="skill.id"
                            @click="startSkill(skill.id)"
                            :disabled="startingSkillId !== null"
                            class="group relative text-left focus:outline-none disabled:pointer-events-none transition-all duration-500">

                            <!-- Card -->
                            <div :class="skillCardClass(skill.name)" 
                                 class="relative rounded-[2rem] p-8 overflow-hidden border transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl h-full">
                                
                                <!-- Large background icon (decorative) -->
                                <div class="absolute -right-4 -bottom-4 text-[120px] opacity-[0.07] select-none pointer-events-none leading-none group-hover:opacity-[0.12] transition-opacity duration-500">
                                    {{ getSkillIcon(skill.name) }}
                                </div>

                                <!-- Index badge -->
                                <div class="absolute top-6 right-6 w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                                    <span class="text-[10px] font-black text-white/60">{{ String(index + 1).padStart(2, '0') }}</span>
                                </div>

                                <div class="relative z-10 space-y-6">
                                    <!-- Icon box -->
                                    <div class="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 group-hover:bg-white/25 transition-all duration-500">
                                        <span v-if="startingSkillId !== skill.id">{{ getSkillIcon(skill.name) }}</span>
                                        <div v-else class="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                                    </div>

                                    <!-- Text -->
                                    <div class="space-y-2">
                                        <h4 class="text-xl font-black text-white tracking-tight">{{ skill.name }}</h4>
                                        <p class="text-[10px] font-bold text-white/50 uppercase tracking-widest">وحدة تقييم رسمية</p>
                                    </div>

                                    <!-- Bottom CTA -->
                                    <div class="pt-4 border-t border-white/10 flex items-center justify-between">
                                        <span class="text-[10px] font-black text-white/60 uppercase tracking-widest group-hover:text-white transition-colors">
                                            {{ startingSkillId === skill.id ? 'جاري التحميل...' : 'ابدأ الاختبار' }}
                                        </span>
                                        <div class="w-7 h-7 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all duration-300 group-hover:translate-x-1">
                                            <i class="pi pi-arrow-left text-white text-[10px] rotate-180"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                </section>

            </div>
        </main>

        <footer class="max-w-7xl mx-auto px-8 py-16 text-center">
            <div class="flex flex-col items-center space-y-4 opacity-20">
                <div class="w-8 h-px bg-slate-400"></div>
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.6em]">Academic Integrity Foundation</p>
            </div>
        </footer>
    </div>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
