<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import { authStorage } from '@/services/authStorage';
import { useMediaUrl } from '@/composables/useMediaUrl';

import StudentHeader from '@/components/StudentHeader.vue';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';

const { showAlert, showConfirm } = useModal();

const router = useRouter();
const exams = ref([]);
const student = ref(null);
const isLoading = ref(false);
const startingSkillId = ref(null);
const selectedLevel = ref(1);
const isDemo = ref(false);
const certificates = ref([]);

const fetchDashboard = async () => {
    isLoading.value = true;
    try {
        const [userRes, examsRes] = await Promise.all([
            api.get('/user'),
            api.get('/exams'),
        ]);
        student.value = userRes.data;
        exams.value = examsRes.data;

        // Fetch certificates if student is from arabacademy
        const partnerName = (student.value?.student?.partner?.partner_name || '').toLowerCase();

        if (partnerName.includes('arabacademy')) {
            const certRes = await api.get('/certificates');
            certificates.value = certRes.data;
        }

        // Check role case-insensitively and include typos
        const userRole = (student.value?.role || '').toLowerCase();
        isDemo.value = ['demo', 'deom', 'staff'].includes(userRole);

        // Auto-redirect proctored students to proctoring requirements
        // if they haven't completed the proctoring check this session
        const proctoringRequired = !!(student.value?.student?.partner?.proctoring_required);
        const alreadyVerified = sessionStorage.getItem('proctoring_verified') === 'true';

        if (!isDemo.value && proctoringRequired && !alreadyVerified) {
            router.push({ name: 'proctoring-requirements' });
            return;
        }
    } catch (err) {
        console.error('Failed to load dashboard', err);
    } finally {
        isLoading.value = false;
    }
};

const skillMap = {
    'listening': 'Listening',
    'reading': 'Reading',
    'grammar': 'Structure',
    'gramar': 'Structure',
    'structure': 'Structure',
    'writing': 'Writing',
    'writting': 'Writing',
    'speaking': 'Speaking'
};

const getSkillDisplayName = async (name) => {
    if (!name) return 'Unknown Skill';
    const lowerName = name.toLowerCase();
    const matchedKey = Object.keys(skillMap).find(key => lowerName.includes(key));
    return matchedKey ? skillMap[matchedKey] : name;
};

onMounted(fetchDashboard);

const skills = () => exams.value?.[0]?.skills || [];

const isSkillCompleted = (exam, skillId) => {
    if (!exam || !exam.completed_skill_ids) return false;
    return exam.completed_skill_ids.some(id => String(id) === String(skillId));
};

const startSkill = async (skillId) => {
    if (!exams.value[0]) return;
    if (!isDemo.value && isSkillCompleted(exams.value[0], skillId)) return;

    const partnerProctoringRequired = !!(student.value?.student?.partner?.proctoring_required);

    if (isDemo.value) {
        // Demo students go straight to exam with level override
        router.push({
            name: 'exam.setup',
            params: {
                examId: exams.value[0].id,
                skillId: skillId,
                levelId: selectedLevel.value
            }
        });
    } else if (partnerProctoringRequired) {
        // Proctored: already verified via /proctoring-requirements,
        // go directly to exam.setup
        router.push({
            name: 'exam.setup',
            params: { examId: exams.value[0].id, skillId: skillId }
        });
    } else {
        // Non-proctored: system requirements check first
        sessionStorage.setItem('exam_pending_examId', exams.value[0].id);
        sessionStorage.setItem('exam_pending_skillId', skillId);
        router.push({ name: 'requirements' });
    }
};

const resetDemoProgress = async () => {
    const examId = exams.value?.[0]?.id;
    if (!examId || !(await showConfirm('Are you sure you want to reset all exam progress? This will delete all your answers and start you fresh. This action cannot be undone.'))) return;
    isLoading.value = true;
    try {
        await api.post(`/exams/${examId}/reset-demo`);
        await fetchDashboard();
    } catch (err) {
        showAlert(err.response?.data?.error || 'Failed to reset progress.');
        isLoading.value = false;
    }
};

const getSkillIcon = async (name) => {
    name = name.toLowerCase();
    if (name.includes('listening')) return '/Listening02.png';
    if (name.includes('reading')) return '/Reading-1.png';
    if (name.includes('writing')) return '/Writing-01.png';
    if (name.includes('speaking')) return '/Speaking-02.png';
    if (name.includes('grammar') || name.includes('structure')) return '/Strac-01.png';
    return '/logo.png';
};

const logout = async () => {
    authStorage.clear();
    router.push('/login');
};

const { resolveUrl } = useMediaUrl();

const qrUrl = computed(() => {
    if (certificates.value.length === 0) return null;
    const cert = certificates.value[0];
    const verificationUrl = window.location.origin + '/verify-certificate/' + (cert.verification_code || cert.certificate_number);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verificationUrl)}`;
});

const isArabAcademy = computed(() => {
    const partnerName = (student.value?.student?.partner?.partner_name || '').toLowerCase();
    return partnerName.includes('arabacademy');
});

const fullStudentName = computed(() => {
    const firstName = student.value?.first_name || '';
    const lastName = student.value?.last_name || '';
    return [firstName, lastName].filter(Boolean).join(' ') || student.value?.name || 'Candidate';
});

const showUserMenu = ref(false);

const vClickOutside = {
    mounted(el, binding) {
        el.clickOutsideEvent = (event) => {
            if (!(el === event.target || el.contains(event.target))) {
                binding.value(event);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', el.clickOutsideEvent);
        }, 0);
    },
    unmounted(el) {
        document.removeEventListener('click', el.clickOutsideEvent);
    },
};
</script>

<template>
    <div class="h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden flex flex-col">
        <!-- Soft background blobs -->
        <div class="fixed inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px]">
            </div>
            <div class="absolute top-[30%] -left-[10%] w-[30%] h-[30%] bg-brand-accent/10 rounded-full blur-[120px]">
            </div>
        </div>

        <StudentHeader />

        <!-- Main Dashboard Split Layout -->
        <main class="flex-grow relative z-10 max-w-[1600px] mx-auto w-full px-6 py-2 overflow-hidden flex gap-6">

            <!-- Loading Overlay -->
            <div v-if="isLoading"
                class="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <div class="w-10 h-10 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                <p class="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Processing Dashboard...
                </p>
            </div>

            <!-- Left Column: Identity & Stats -->
            <div class="w-1/4 flex flex-col gap-4 overflow-hidden animate-in fade-in slide-in-from-left-8 duration-700">

                <!-- Greeting & Basic Info -->
                <section class="bg-white rounded-[0.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
                    <div
                        class="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-md border border-emerald-100">
                        <i class="pi pi-verified text-[8px]"></i>
                        <span class="text-[8px] font-black uppercase tracking-widest">ID Verified</span>
                    </div>

                    <div class="flex items-center space-x-4">
                        <div
                            class="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-black shadow-lg shrink-0 overflow-hidden">
                            <img v-if="student?.avatar" :src="resolveUrl(student.avatar)"
                                class="w-full h-full object-cover" />
                            <span v-else>{{ student?.first_name?.[0] || 'S' }}</span>
                        </div>
                        <div class="min-w-0">
                            <h2
                                class="text-base font-black text-slate-900 tracking-tight leading-tight truncate uppercase">
                                {{ fullStudentName }}
                            </h2>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 pt-2">
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</p>
                            <p class="text-[10px] font-black uppercase text-brand-accent truncate">{{
                                student?.student?.category?.name || 'Academic' }}</p>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                            <div class="flex items-center gap-1.5">
                                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <p class="text-[10px] font-black uppercase text-emerald-600">Active</p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Proctoring Badge — shown if partner requires it -->
                <section v-if="student?.student?.partner?.proctoring_required"
                    class="bg-violet-50 border border-violet-200 p-4 rounded-[0.5rem] flex items-center gap-3">
                    <div class="w-8 h-8 bg-violet-600 text-white rounded-xl flex items-center justify-center shrink-0">
                        <i class="pi pi-shield text-[10px]"></i>
                    </div>
                    <div>
                        <p class="text-[9px] font-black text-violet-700 uppercase tracking-widest">Proctored Exam</p>
                        <p class="text-[8px] text-violet-500 mt-0.5">Identity verification required</p>
                    </div>
                </section>

                <!-- Evaluator Progress Card -->
                <section
                    class="bg-brand-primary rounded-[0.5rem] p-6 text-white shadow-lg relative overflow-hidden flex-shrink-0">
                    <div class="absolute -left-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
                    <p class="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 relative z-10">
                        Arabic Language Skills</p>
                    <div class="flex items-baseline relative z-10">
                        <span class="text-5xl font-black italic tracking-tighter">{{
                            exams?.[0]?.completed_skill_ids?.length || 0 }}</span>
                        <span class="text-sm font-bold ml-2 opacity-60">/ {{ (exams?.[0]?.skills?.length || 0) }}
                            Skills</span>
                    </div>
                    <div class="mt-4 bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-white h-full transition-all duration-1000"
                            :style="{ width: ((exams?.[0]?.completed_skill_ids?.length || 0) / (exams?.[0]?.skills?.length || 1) * 100) + '%' }">
                        </div>
                    </div>
                </section>

                <!-- Demo Tool -->
                <section v-if="isDemo" class="bg-amber-50 border border-amber-200 p-5 rounded-[0.5rem] shadow-sm">
                    <div class="flex items-center gap-3 mb-3">
                        <div
                            class="w-6 h-6 bg-amber-500 text-white rounded-lg flex items-center justify-center shadow-md">
                            <i class="pi pi-bolt text-[10px]"></i>
                        </div>
                        <span class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Demo Tools</span>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label
                                class="text-[8px] font-black text-amber-500 uppercase tracking-widest ml-1 mb-2 block">Starting
                                Level Override</label>
                            <div class="flex flex-wrap gap-1.5">
                                <button v-for="l in 9" :key="l" @click="selectedLevel = l"
                                    :class="selectedLevel === l ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-600 hover:bg-amber-100 border-amber-200'"
                                    class="w-8 h-8 rounded-lg font-black text-[10px] transition-all flex items-center justify-center border">
                                    {{ l }}
                                </button>
                            </div>
                        </div>
                        <button @click="resetDemoProgress"
                            class="w-full py-2.5 bg-rose-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-md flex justify-center items-center gap-2">
                            <i class="pi pi-refresh text-[8px]"></i> Reset Progress
                        </button>
                    </div>
                </section>

                <!-- Certificate QR Code (Arab Academy Exclusive) -->
                <section v-if="isArabAcademy && qrUrl"
                    class="bg-white rounded-[0.5rem] p-6 border-2 border-indigo-50 shadow-xl shadow-indigo-100/20 space-y-4 animate-in fade-in zoom-in duration-1000">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Official
                                Credentials</p>
                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight">Academic Certificate
                            </h3>
                        </div>
                        <div class="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <i class="pi pi-award"></i>
                        </div>
                    </div>

                    <div class="flex flex-col items-center gap-4 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div
                            class="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/60 group relative cursor-pointer overflow-hidden">
                            <img :src="qrUrl" class="w-32 h-32 relative z-10" alt="Certificate QR Code" />
                            <div
                                class="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                <i class="pi pi-search-plus text-indigo-600"></i>
                            </div>
                        </div>
                        <div class="text-center">
                            <p class="text-[10px] font-black text-slate-700 uppercase tracking-widest">Verify
                                Authenticity</p>
                            <p class="text-[8px] font-bold text-slate-400 uppercase mt-1 leading-relaxed max-w-[180px]">
                                Scan this code with your mobile to view your official records</p>
                        </div>
                    </div>

                    <Button label="View Certificate" icon="pi pi-external-link" severity="secondary" text
                        class="w-full font-black text-[9px] uppercase tracking-widest h-10 border border-slate-100"
                        @click="router.push('/verify-certificate/' + (certificates[0].verification_code || certificates[0].certificate_number))" />
                </section>
            </div>

            <!-- Right Column: Dashboard Hub -->
            <div
                class="w-3/4 flex flex-col bg-white rounded-[0.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-8 duration-700">

                <!-- Section Header -->
                <div class="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <p class="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] mb-2">Student Hub
                        </p>
                        <h3 class="text-2xl font-black text-slate-900 tracking-tight uppercase">Welcome back, {{
                            student?.first_name }}</h3>
                    </div>
                </div>

                <!-- Main Hub Content -->
                <div class="flex-grow flex items-center justify-center p-12">
                    <div class="max-w-md w-full text-center space-y-8 animate-in zoom-in duration-1000">
                        <div
                            class="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border border-slate-100 relative">
                            <i class="pi pi-compass text-4xl text-brand-primary animate-pulse"></i>
                            <div
                                class="absolute -right-2 -top-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                                <i class="pi pi-check text-[10px] text-white"></i>
                            </div>
                        </div>

                        <div class="space-y-3">
                            <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Ready to Assess?
                            </h2>
                            <p class="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">
                                You have pending skills to assess. Start your journey with the Arab Academy Proficiency
                                Test today.
                            </p>
                        </div>

                        <!-- Skills Grid -->
                        <div v-if="exams?.[0]?.skills?.length" class="grid grid-cols-2 gap-3 text-left">
                            <button
                                v-for="skill in exams[0].skills"
                                :key="skill.id"
                                @click="startSkill(skill.id)"
                                :disabled="!isDemo && isSkillCompleted(exams[0], skill.id)"
                                class="group flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300"
                                :class="isSkillCompleted(exams[0], skill.id) && !isDemo
                                    ? 'border-emerald-100 bg-emerald-50/50 cursor-not-allowed opacity-70'
                                    : 'border-slate-100 hover:border-brand-primary/30 hover:bg-brand-primary/5 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer'"
                            >
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
                                    :class="isSkillCompleted(exams[0], skill.id) && !isDemo
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-100 group-hover:bg-brand-primary/10'">
                                    <i v-if="isSkillCompleted(exams[0], skill.id) && !isDemo"
                                        class="pi pi-check text-white text-xs"></i>
                                    <i v-else class="pi pi-play text-slate-400 group-hover:text-brand-primary text-xs"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate">
                                        {{ skill.name }}
                                    </p>
                                    <p class="text-[8px] text-slate-400 uppercase tracking-wider mt-0.5">
                                        {{ isSkillCompleted(exams[0], skill.id) && !isDemo ? 'Completed' : 'Start' }}
                                    </p>
                                </div>
                            </button>
                        </div>

                        <!-- Fallback Start Button (no skills breakdown) -->
                        <button v-else @click="router.push('/requirements')"
                            class="group relative w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.3em] shadow-2xl hover:bg-brand-primary hover:shadow-brand-primary/30 hover:-translate-y-1 transition-all duration-300">
                            <span class="flex items-center justify-center gap-3">
                                Start New Assessment <i
                                    class="pi pi-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
                            </span>
                        </button>

                        <div class="pt-8 grid grid-cols-2 gap-4">
                            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Last
                                    Activity</p>
                                <p class="text-[10px] font-black text-slate-700 uppercase">Today</p>
                            </div>
                            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Global
                                    Rank</p>
                                <p class="text-[10px] font-black text-brand-accent uppercase">Candidate</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Integration -->
                <div class="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <span class="text-[8px] font-black text-slate-300 tracking-[0.16em]">
                        © Copyright 2012 – 2026 Arab Academy | All Rights Reserved
                    </span>
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
    background: #e2e8f0;
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
}
</style>
