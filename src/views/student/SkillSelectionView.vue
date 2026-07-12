<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import StudentHeader from '@/components/StudentHeader.vue';

const router = useRouter();
const exams = ref([]);

const skillOrder = [
    { key: 'listen', priority: 0 },
    { key: 'read', priority: 1 },
    { key: 'stru', priority: 2 }, // يمسك "Strcture" و "Structure" كلاهما STRU
    { key: 'gram', priority: 2 },
    { key: 'writ', priority: 3 },
    { key: 'speak', priority: 4 },
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

const proctoringRequired = computed(() => {
    if (student.value?.student?.is_demo) {
        return !!(student.value?.student?.is_demo_proctored);
    }
    return !!(student.value?.student?.partner?.proctoring_required);
});

// Track the proctoring session status for skill locking
const proctoringSessionStatus = ref(null); // null = unknown, 'active', 'paused', 'ended', 'cancelled'
let sessionStatusInterval = null;

const isSessionRestricted = computed(() => {
    return proctoringRequired.value &&
        ['paused', 'ended', 'cancelled'].includes(proctoringSessionStatus.value);
});

const checkProctoringStatus = async () => {
    const sessionId = sessionStorage.getItem('proctoring_session_id');
    if (!sessionId || !proctoringRequired.value) return;
    try {
        const res = await api.get(`/proctoring/session/${sessionId}/status`);
        const s = res.data?.status ?? null;
        proctoringSessionStatus.value = s;
    } catch {
        // Silently fail; do not block user if API errors
    }
};

const isLoading = ref(true);
const student = ref(null);

const fetchExamsAndUser = async () => {
    isLoading.value = true;
    try {
        const [examsRes, userRes] = await Promise.all([
            api.get('/exams'),
            api.get('/user')
        ]);
        exams.value = examsRes.data;
        student.value = userRes.data;

        // Check if requirements or proctoring check needs to be done
        const userRole = (student.value?.role || '').toLowerCase();
        const isDemo = ['demo', 'deom', 'staff'].includes(userRole) || !!student.value?.student?.is_demo;
        const proctoringRequired = isDemo
            ? !!(student.value?.student?.is_demo_proctored)
            : !!(student.value?.student?.partner?.proctoring_required);

        const isLocal = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
        if (!isDemo && !isLocal) {
            if (proctoringRequired) {
                const alreadyVerified = sessionStorage.getItem('proctoring_verified') === 'true';
                if (!alreadyVerified) {
                    router.push('/proctoring-requirements');
                    return;
                }
            } else {
                const alreadyVerified = sessionStorage.getItem('requirements_verified') === 'true';
                if (!alreadyVerified) {
                    router.push('/requirements');
                    return;
                }
            }
        }
        // console.log('Skills from API:', exams.value[0]?.skills?.map(s => s.name));
    } catch (err) {
        console.error('Failed to load exams and user details, using fallback mocks for local testing', err);
        exams.value = [
            {
                id: 1,
                title: "ALPT Test",
                skills: [
                    { id: 1, name: "listening" },
                    { id: 2, name: "reading" },
                    { id: 3, name: "structure" },
                    { id: 4, name: "writing" },
                    { id: 5, name: "speaking" }
                ],
                skill_statuses: {
                    1: "not_taken",
                    2: "not_taken",
                    3: "not_taken",
                    4: "not_taken",
                    5: "not_taken"
                }
            }
        ];
        student.value = {
            role: "student",
            student: {
                is_demo: false,
                partner: {
                    proctoring_required: true
                }
            }
        };
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

const skillStylesMap = {
    'listening': {
        borderColor: 'border-l-[#2563EB]',
        bgTint: 'bg-[#F3F8FF]', 
        iconBg: 'bg-[#EFF6FF]',
        iconColor: 'text-[#2563EB]',
        textColor: 'text-[#1E3A8A]',
        btnColor: 'text-[#2563EB]',
        hoverBorder: 'hover:border-[#2563EB]',
        hoverShadow: 'hover:shadow-lg hover:shadow-[#2563EB]/10',
    },
    'reading': {
        borderColor: 'border-l-[#8B5CF6]',
        bgTint: 'bg-[#FAF5FF]',
        iconBg: 'bg-[#F5F3FF]',
        iconColor: 'text-[#8B5CF6]',
        textColor: 'text-[#5B21B6]',
        btnColor: 'text-[#8B5CF6]',
        hoverBorder: 'hover:border-[#8B5CF6]',
        hoverShadow: 'hover:shadow-lg hover:shadow-[#8B5CF6]/10',
    },
    'grammar': {
        borderColor: 'border-l-[#F97316]',
        bgTint: 'bg-[#FFF7ED]',
        iconBg: 'bg-[#FFF7ED]',
        iconColor: 'text-[#F97316]',
        textColor: 'text-[#C2410C]',
        btnColor: 'text-[#F97316]',
        hoverBorder: 'hover:border-[#F97316]',
        hoverShadow: 'hover:shadow-lg hover:shadow-[#F97316]/10',
    },
    'structure': {
        borderColor: 'border-l-[#F97316]',
        bgTint: 'bg-[#FFF7ED]',
        iconBg: 'bg-[#FFF7ED]',
        iconColor: 'text-[#F97316]',
        textColor: 'text-[#C2410C]',
        btnColor: 'text-[#F97316]',
        hoverBorder: 'hover:border-[#F97316]',
        hoverShadow: 'hover:shadow-lg hover:shadow-[#F97316]/10',
    },
    'writing': {
        borderColor: 'border-l-[#10B981]',
        bgTint: 'bg-[#ECFDF5]',
        iconBg: 'bg-[#ECFDF5]',
        iconColor: 'text-[#10B981]',
        textColor: 'text-[#065F46]',
        btnColor: 'text-[#10B981]',
        hoverBorder: 'hover:border-[#10B981]',
        hoverShadow: 'hover:shadow-lg hover:shadow-[#10B981]/10',
    },
    'speaking': {
        borderColor: 'border-l-[#06B6D4]',
        bgTint: 'bg-[#F0FDFA]',
        iconBg: 'bg-[#F0FDFA]',
        iconColor: 'text-[#06B6D4]',
        textColor: 'text-[#075985]',
        btnColor: 'text-[#06B6D4]',
        hoverBorder: 'hover:border-[#06B6D4]',
        hoverShadow: 'hover:shadow-lg hover:shadow-[#06B6D4]/10',
    }
};

const getSkillStyle = (name) => {
    if (!name) return skillStylesMap.listening;
    const lowerName = name.toLowerCase().replace('writting', 'writing');
    const matchedKey = Object.keys(skillStylesMap).find(key => lowerName.includes(key));
    return matchedKey ? skillStylesMap[matchedKey] : skillStylesMap.listening;
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
    const isDemo = ['demo', 'deom', 'staff'].includes((student.value?.role || '').toLowerCase()) || !!student.value?.student?.is_demo;
    if (isDemo) return false;
    if (!exam || !exam.skill_statuses) return false;
    const status = exam.skill_statuses[skillId];
    return ['completed', 'failed', 'skipped'].includes(status);
};

const isSkillInProgress = (exam, skillId) => {
    if (!exam || !exam.skill_statuses) return false;
    return exam.skill_statuses[skillId] === 'in_progress';
};

const selectSkill = (skillId, levelId = null) => {
    if (isSessionRestricted.value) return;
    const exam = exams.value[0];
    if (!exam) return;

    router.push({
        name: 'exam.instructions',
        params: {
            examId: exam.id,
            skillId: skillId,
            levelId: levelId || ''
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
    const isDemo = ['demo', 'deom', 'staff'].includes((student.value?.role || '').toLowerCase()) || !!student.value?.student?.is_demo;
    if (isDemo) return false;
    if (!activeSkillId.value) return false;
    if (skillId === activeSkillId.value) return false;
    if (isSkillCompleted(exam, skillId)) return false;
    return true;
};

onMounted(async () => {
    await fetchExamsAndUser();
    if (proctoringRequired.value) {
        await checkProctoringStatus();
        sessionStatusInterval = setInterval(checkProctoringStatus, 10000);
    }
});

onUnmounted(() => {
    if (sessionStatusInterval) clearInterval(sessionStatusInterval);
});


</script>

<template>
    <div class="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
        <StudentHeader />

        <!-- Soft background blobs -->
        <div class="fixed inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px]">
            </div>
            <div class="absolute top-[30%] -left-[10%] w-[30%] h-[30%] bg-brand-accent/5 rounded-full blur-[120px]">
            </div>
        </div>

        <div class="max-w-5xl mx-auto w-full flex-grow flex flex-col relative z-10 px-6 py-4 md:px-8 md:py-5">
            <!-- Header Section -->
            <div
                class="flex flex-col md:flex-row items-end justify-between mb-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-700 shrink-0 border-b border-slate-100 pb-4">
                <div>
                    <h1 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">
                        Arabic Language Proficiency Test (ALPT)</h1>
                    <p class="text-slate-400 font-bold text-[9px] uppercase tracking-[0.3em] mt-2">Select a skill to
                        begin your ALPT</p>
                </div>

                <div class="flex items-center gap-3">
                    <!-- ✅ Proctored Badge — يظهر بس لو proctoringRequired -->
                    <div v-if="proctoringRequired"
                        class="flex items-center gap-3 bg-amber-50 px-5 py-2 rounded-full border border-amber-100 shadow-sm">
                        <i class="pi pi-shield text-amber-500 text-xs"></i>
                        <span class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Proctored
                            Exam</span>
                    </div>

                    <!-- System Ready -->
                    <div
                        class="flex items-center gap-3 bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100 shadow-sm">
                        <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span class="text-[9px] font-black text-emerald-600 uppercase tracking-widest">System
                            Ready</span>
                    </div>
                </div>
            </div>

            <!-- Session Restricted Banner -->
            <div v-if="isSessionRestricted"
                class="mb-4 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 animate-in fade-in duration-500">
                <i class="pi pi-exclamation-triangle text-rose-500 text-base mt-0.5 shrink-0"></i>
                <div>
                    <p class="text-sm font-black text-rose-700 uppercase tracking-tight">
                        {{ proctoringSessionStatus === 'paused' ? 'Session Paused' : 'Session Ended' }}
                    </p>
                    <p class="text-xs font-medium text-rose-400 mt-0.5">
                        {{ proctoringSessionStatus === 'paused'
                            ? 'تم إيقاف جلسة المراقبة الخاصة بك مؤقتاً. يُرجى الانتظار حتى يُعيدها المُراقب.'
                            : 'انتهت جلسة المراقبة. يُرجى التواصل مع المنسق لاستئناف الاختبار.'
                        }}
                    </p>
                </div>
            </div>

            <!-- Skills List Area -->
            <div class="flex-grow relative">
                <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
                    <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin">
                    </div>
                </div>

                <div v-else-if="!exams.length"
                    class="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                    <span class="text-6xl mb-6 opacity-20">🎯</span>
                    <h2 class="text-2xl font-black text-slate-700 uppercase tracking-tight">No Active Assessments</h2>
                    <p class="text-slate-400 font-bold mt-4 text-sm uppercase tracking-widest max-w-md">Your account is
                        currently pending activation.</p>
                </div>

                <div v-else class="pt-2 pr-1.5 flex flex-col gap-5">
                    <div class="space-y-2 pb-1 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div v-for="skill in sortedSkills" :key="skill.id"
                            @click="!isSessionRestricted && !isSkillCompleted(exams[0], skill.id) && !isSkillLocked(exams[0], skill.id) && (student?.student?.is_demo ? selectSkill(skill.id, 1) : selectSkill(skill.id))"
                            class="group relative bg-white border border-slate-200 border-l-[3px] rounded-lg px-6 py-3 min-h-[72px] transition-all duration-300 flex items-center gap-5 shadow-sm"
                            :class="[
                                getSkillStyle(skill.name).borderColor,
                                getSkillStyle(skill.name).hoverBorder,
                                getSkillStyle(skill.name).hoverShadow,
                                isSessionRestricted ? 'opacity-50 grayscale cursor-not-allowed pointer-events-none' : '',
                                isSkillCompleted(exams[0], skill.id) ? 'opacity-50 grayscale pointer-events-none' : '',
                                !isSessionRestricted && isSkillLocked(exams[0], skill.id) ? 'opacity-40 grayscale cursor-not-allowed' : '',
                                !isSessionRestricted && !isSkillCompleted(exams[0], skill.id) && !isSkillLocked(exams[0], skill.id) ? 'cursor-pointer hover:-translate-y-0.5' : ''
                            ]">

                            <!-- Icon -->
                            <div class="w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-500 shadow-sm shrink-0 border border-slate-100/60"
                                :class="isSkillCompleted(exams[0], skill.id) ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : [getSkillStyle(skill.name).iconBg]">
                                <i v-if="isSkillCompleted(exams[0], skill.id)" class="pi pi-check text-xl font-bold"></i>
                                <img v-else :src="getSkillIcon(skill.name)" :alt="skill.name"
                                    class="w-20 h-20 object-contain group-hover:scale-105 transition-transform" />
                            </div>

                            <!-- Details -->
                            <div class="flex-grow">
                                <div class="flex items-center gap-3 mb-0.5">
                                    <h3
                                        class="text-sm font-bold text-slate-800 tracking-wide uppercase leading-none">
                                        {{ getSkillDisplayName(skill.name) }}
                                    </h3>
                                    
                                    <!-- Status Badges styled like image 2 -->
                                    <div v-if="isSkillCompleted(exams[0], skill.id)"
                                        class="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-[4px] border border-emerald-100 text-[9px] font-bold uppercase tracking-wide">
                                        <span class="inline-block w-1 h-1 rounded-full bg-emerald-500"></span>
                                        <span>Completed</span>
                                    </div>
                                    <div v-else-if="isSkillInProgress(exams[0], skill.id)"
                                        class="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-[4px] border border-amber-100 text-[9px] font-bold uppercase tracking-wide">
                                        <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                        <span>In Progress</span>
                                    </div>
                                    <div v-else
                                        class="flex items-center gap-1.5 bg-[#FFF2F2] text-[#E11D48] px-2 py-0.5 rounded-[4px] border border-[#FFE4E6] text-[9px] font-bold uppercase tracking-wide">
                                        <span class="inline-block w-1 h-1 rounded-full bg-[#E11D48]"></span>
                                        <span>Not Started</span>
                                    </div>
                                </div>
                                
                                <div v-if="isSkillLocked(exams[0], skill.id) && !student?.student?.is_demo"
                                    class="inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 text-[8px] font-bold uppercase tracking-widest leading-none">
                                    <i class="pi pi-lock text-[8px]"></i>
                                    <span>Locked</span>
                                </div>

                                <div v-if="student?.student?.is_demo" class="flex flex-wrap items-center gap-1 mt-1"
                                    @click.stop>
                                    <span
                                        class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mr-1">Select
                                        starting level:</span>
                                    <button v-for="lvl in 6" :key="lvl" @click="selectSkill(skill.id, lvl)"
                                        class="w-5 h-5 rounded bg-slate-100 hover:bg-brand-primary hover:text-white transition-colors text-[8px] font-bold flex items-center justify-center border border-slate-200">
                                        {{ lvl }}
                                    </button>
                                </div>
                            </div>

                            <!-- Action "Link" Style -->
                            <div class="shrink-0 flex items-center gap-4">
                                <div v-if="student?.student?.is_demo"
                                    class="flex items-center gap-1.5 text-brand-primary transition-all font-bold text-xs tracking-wide">
                                    <span>Select Level to Start</span>
                                    <i class="pi pi-arrow-right text-[10px]"></i>
                                </div>
                                <div v-else-if="!isSkillCompleted(exams[0], skill.id)"
                                    class="flex items-center gap-1.5 font-bold text-xs tracking-wide transition-colors text-[#2563EB] group-hover:text-[#1d4ed8]">
                                    <span>{{ isSkillInProgress(exams[0], skill.id) ? 'Resume Test' : 'Start Test' }}</span>
                                    <i class="pi pi-arrow-right text-[10px] group-hover:translate-x-1 transition-transform font-bold"></i>
                                </div>
                                <div v-else class="text-emerald-600 font-bold text-xs tracking-wide">
                                    Taken
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- About the test banner at the bottom -->
                    <div class="bg-[#F3F8FF] border border-[#BFDBFE]/60 rounded-lg p-4 flex items-start gap-4 animate-in fade-in duration-1000 mt-1">
                        <div class="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center text-white shrink-0 shadow-sm border border-blue-400/20">
                            <i class="pi pi-info text-sm font-bold"></i>
                        </div>
                        <div>
                            <h4 class="text-xs font-bold text-[#1E3A8A] tracking-wide mb-0.5">About the test</h4>
                            <p class="text-[11px] text-slate-500 font-medium leading-relaxed">
                                Complete all skills to receive your ALPT certificate. You can take the skills in any order.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Info -->
            <div class="mt-6 text-center animate-in fade-in duration-1000 shrink-0 border-t border-slate-100 pt-4">
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.25em]">
                    Arab Academy, All rights reserved © 2026
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
