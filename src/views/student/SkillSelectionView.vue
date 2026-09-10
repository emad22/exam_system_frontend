<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import StudentHeader from '@/components/StudentHeader.vue';
import LiveSpeakingBookingModal from '@/components/LiveSpeakingBookingModal.vue';

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

const proctoringMode = computed(() => {
    if (student.value?.student?.is_demo) {
        return student.value?.student?.is_demo_proctored ? 'full' : 'none';
    }
    const partner = student.value?.student?.partner;
    if (!partner) return 'none';
    if (partner.proctoring_mode) return partner.proctoring_mode;
    return partner.proctoring_required ? 'full' : 'none';
});

const requiresIdentityVerification = computed(() => {
    if (student.value?.student?.is_demo) {
        return !!(student.value?.student?.is_demo_proctored);
    }
    const partner = student.value?.student?.partner;
    if (!partner) return false;
    if (partner.requires_identity_verification !== undefined) {
        return !!partner.requires_identity_verification;
    }
    return ['full', 'identity_only'].includes(proctoringMode.value);
});

const proctoringRequired = computed(() => {
    if (student.value?.student?.is_demo) {
        return !!(student.value?.student?.is_demo_proctored);
    }
    const partner = student.value?.student?.partner;
    if (!partner) return false;
    if (partner.requires_live_proctoring !== undefined) {
        return !!partner.requires_live_proctoring;
    }
    return proctoringMode.value === 'full';
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
        const needIdentityCheck = isDemo
            ? !!(student.value?.student?.is_demo_proctored)
            : (
                student.value?.student?.partner?.requires_identity_verification ?? 
                ['full', 'identity_only'].includes(student.value?.student?.partner?.proctoring_mode) ??
                !!(student.value?.student?.partner?.proctoring_required)
            );

        const isLocal = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
        if (!isDemo && !isLocal) {
            if (needIdentityCheck) {
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
    'speaking live': 'Speaking (Live)',
    'speaking_live': 'Speaking (Live)',
    'live speaking': 'Speaking (Live)',
    'live': 'Speaking (Live)',
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
    if (isBeforeExamDate.value) return;
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

const studentExamDate = computed(() => {
    const raw = student.value?.student?.exam_date;
    if (!raw) return null;
    const str = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return str.split('T')[0];
});

const isBeforeExamDate = computed(() => {
    const isDemo = ['demo', 'deom', 'staff'].includes((student.value?.role || '').toLowerCase()) || !!student.value?.student?.is_demo;
    if (isDemo) return false;

    const examDateStr = studentExamDate.value;
    if (!examDateStr) return false;

    // Compare YYYY-MM-DD in local time
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return examDateStr > todayStr;
});

const isSkillLocked = (exam, skillId) => {
    const isDemo = ['demo', 'deom', 'staff'].includes((student.value?.role || '').toLowerCase()) || !!student.value?.student?.is_demo;
    if (isDemo) return false;

    // Before exam date, all regular skills are locked!
    if (isBeforeExamDate.value) return true;

    if (!activeSkillId.value) return false;
    if (skillId === activeSkillId.value) return false;
    if (isSkillCompleted(exam, skillId)) return false;
    return true;
};

// ── Live Speaking Booking ────────────────────────────────────────────────────
const liveSpeakingFeatureEnabled = ref(false);
const liveSpeakingBooking = ref(null);
const showBookingModal = ref(false);
const bookingModalMode = ref('book'); // 'book' | 'reschedule'
const countdownStr = ref('');
let countdownInterval = null;

const isLiveSpeakingSkill = (skillName) => {
    if (!skillName) return false;
    const n = skillName.toLowerCase();
    return n.includes('live') || (n.includes('speak') && n.includes('live'));
};

const fetchLiveSpeakingStatus = async () => {
    try {
        const { data } = await api.get('/live-speaking/status');
        liveSpeakingFeatureEnabled.value = data.feature_enabled;
        liveSpeakingBooking.value = data.booking;
        startCountdown();
    } catch (e) {
        // Feature not critical — fail silently
    }
};

const startCountdown = () => {
    if (countdownInterval) clearInterval(countdownInterval);
    const updateCountdown = () => {
        const booking = liveSpeakingBooking.value;
        if (!booking?.starts_at_iso) { countdownStr.value = ''; return; }
        const diff = new Date(booking.starts_at_iso).getTime() - Date.now();
        if (diff <= 0) { countdownStr.value = 'Time is up!'; return; }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        countdownStr.value = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
    };
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
};

const openBookingModal = (mode = 'book') => {
    bookingModalMode.value = mode;
    showBookingModal.value = true;
};

const onBooked = (booking) => {
    liveSpeakingBooking.value = booking;
    startCountdown();
};
// ─────────────────────────────────────────────────────────────────────────────

onMounted(async () => {
    await fetchExamsAndUser();
    await fetchLiveSpeakingStatus();
    if (proctoringRequired.value) {
        await checkProctoringStatus();
        sessionStatusInterval = setInterval(checkProctoringStatus, 10000);
    }
});

onUnmounted(() => {
    if (sessionStatusInterval) clearInterval(sessionStatusInterval);
    if (countdownInterval) clearInterval(countdownInterval);
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
                        {{ exams[0]?.title || 'Loading...' }}</h1>
                    <p class="text-slate-400 font-bold text-[9px] uppercase tracking-[0.3em] mt-2">Select a skill to
                        begin your exam</p>
                </div>

                <div class="flex items-center gap-3">
                    <!-- ✅ Proctored / Identity Mode Badges -->
                    <div v-if="proctoringMode === 'full'"
                        class="flex items-center gap-3 bg-amber-50 px-5 py-2 rounded-full border border-amber-100 shadow-sm">
                        <i class="pi pi-shield text-amber-500 text-xs"></i>
                        <span class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Proctored
                            Exam</span>
                    </div>

                    <div v-else-if="proctoringMode === 'identity_only'"
                        class="flex items-center gap-3 bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100 shadow-sm">
                        <i class="pi pi-id-card text-emerald-500 text-xs"></i>
                        <span class="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Verified</span>
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
                            ? 'Your proctoring session has been paused. Please wait for the proctor to resume it.'
                            : 'Your proctoring session has ended. Please contact your coordinator to resume the exam.'
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
                    <!-- ═══ EXAM DATE NOTICE BANNER ═══ -->
                    <div v-if="isBeforeExamDate"
                        class="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-blue-200/80 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm animate-in fade-in duration-500">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                                <i class="pi pi-calendar text-lg"></i>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Exam Start Date</span>
                                    <span class="text-xs font-black text-slate-800">{{ studentExamDate }}</span>
                                </div>
                                <p class="text-[11px] text-slate-600 mt-1 font-medium">
                                    {{ liveSpeakingBooking 
                                        ? 'Your Live Speaking session has been booked. All other exam skills will open on your scheduled exam date.' 
                                        : 'All exam skills are locked until your scheduled exam date. Please book your Live Speaking session from the card below.' }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-2 pb-1 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <!-- ═══ LIVE SPEAKING CARD (special handling) ═══ -->
                        <template v-for="skill in sortedSkills" :key="skill.id">

                        <!-- ── Live Speaking Skill Card ── -->
                        <div v-if="isLiveSpeakingSkill(skill.name) && liveSpeakingFeatureEnabled"
                            class="group relative bg-white border-2 rounded-xl px-6 py-4 min-h-[80px] transition-all duration-300 flex items-center gap-5 shadow-sm overflow-hidden"
                            :class="liveSpeakingBooking ? 'border-[#0EA5E9] shadow-[#0EA5E9]/10' : 'border-dashed border-[#0EA5E9]/40 hover:border-[#0EA5E9] hover:shadow-md hover:shadow-[#0EA5E9]/10'">

                            <!-- Gradient shimmer bar -->
                            <div class="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0EA5E9] to-[#6366F1]"></div>

                            <!-- Icon -->
                            <div class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                                :class="liveSpeakingBooking?.status === 'completed' ? 'bg-emerald-50' : 'bg-gradient-to-br from-[#E0F2FE] to-[#EEF2FF]'">
                                <i v-if="liveSpeakingBooking?.status === 'completed'" class="pi pi-check-circle text-emerald-500 text-2xl"></i>
                                <i v-else class="pi pi-video text-[#0EA5E9] text-2xl"></i>
                            </div>

                            <!-- Details -->
                            <div class="flex-grow">
                                <div class="flex items-center gap-2 mb-1">
                                    <h3 class="text-sm font-black text-slate-800 uppercase tracking-wide">{{ skill.name }}</h3>
                                    <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                        :class="liveSpeakingBooking?.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                liveSpeakingBooking ? 'bg-[#E0F2FE] text-[#0369A1]' : 'bg-slate-100 text-slate-500'">
                                        {{ liveSpeakingBooking?.status === 'completed' ? '✓ Completed' :
                                           liveSpeakingBooking ? '📅 Booked' : '⚪ Not Booked Yet' }}
                                    </span>
                                </div>

                                <!-- Booked state info -->
                                <template v-if="liveSpeakingBooking && liveSpeakingBooking.status !== 'completed'">
                                    <p class="text-[11px] text-slate-500 font-medium">
                                        📅 {{ liveSpeakingBooking.slot_date }}
                                        &nbsp;·&nbsp;
                                        ⏰ {{ liveSpeakingBooking.start_time }} – {{ liveSpeakingBooking.end_time }}
                                        <span v-if="liveSpeakingBooking.teacher_name" class="ml-2 text-indigo-600 font-bold">
                                            (Examiner: {{ liveSpeakingBooking.teacher_name }})
                                        </span>
                                    </p>
                                    <p v-if="countdownStr" class="text-[10px] font-black text-[#0EA5E9] mt-0.5">
                                        ⏳ Remaining: {{ countdownStr }}
                                    </p>
                                    <p v-if="isBeforeExamDate" class="text-[10px] font-bold text-amber-600 mt-0.5">
                                        🔒 Session opens on your exam date
                                    </p>
                                </template>
                                <template v-else-if="!liveSpeakingBooking">
                                    <p class="text-[11px] text-slate-400 font-medium">Book a 1-on-1 interview session with your examiner</p>
                                </template>
                            </div>

                            <!-- Actions -->
                            <div class="shrink-0 flex flex-col items-end gap-2">
                                <!-- Join button (active near session time ONLY if on or after exam date) -->
                                <a v-if="!isBeforeExamDate && liveSpeakingBooking?.can_join && liveSpeakingBooking?.meeting_link"
                                    :href="liveSpeakingBooking.meeting_link" target="_blank"
                                    class="flex items-center gap-1.5 bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] text-white font-black text-[10px] uppercase tracking-wide px-4 py-2 rounded-lg shadow-md shadow-[#0EA5E9]/30 hover:shadow-lg hover:shadow-[#0EA5E9]/40 transition-all animate-pulse">
                                    <i class="pi pi-play-circle text-sm"></i>
                                    Join Session
                                </a>

                                <!-- Book button (available if not booked yet) -->
                                <button v-else-if="!liveSpeakingBooking"
                                    @click.stop="openBookingModal('book')"
                                    class="flex items-center gap-1.5 bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] text-white font-black text-[10px] uppercase tracking-wide px-4 py-2 rounded-lg shadow-sm hover:shadow-md hover:shadow-[#0EA5E9]/25 transition-all">
                                    <i class="pi pi-calendar-plus text-xs"></i>
                                    Book Session
                                </button>

                                <!-- Reschedule button (allowed to change date before or after exam date) -->
                                <button v-if="liveSpeakingBooking && liveSpeakingBooking.status !== 'completed' && (liveSpeakingBooking?.can_reschedule || isBeforeExamDate)"
                                    @click.stop="openBookingModal('reschedule')"
                                    class="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-sm">
                                    <i class="pi pi-refresh text-xs text-[#0EA5E9]"></i>
                                    Reschedule Session
                                </button>
                            </div>
                        </div>

                        <!-- ── Regular Skill Card ── -->
                        <div v-else-if="!isLiveSpeakingSkill(skill.name) || !liveSpeakingFeatureEnabled"
                            @click="!isBeforeExamDate && !isSessionRestricted && !isSkillCompleted(exams[0], skill.id) && !isSkillLocked(exams[0], skill.id) && selectSkill(skill.id)"
                            class="group relative bg-white border border-slate-200 border-l-[3px] rounded-lg px-6 py-3 min-h-[72px] transition-all duration-300 flex items-center gap-5 shadow-sm"
                            :class="[
                                getSkillStyle(skill.name).borderColor,
                                getSkillStyle(skill.name).hoverBorder,
                                getSkillStyle(skill.name).hoverShadow,
                                isBeforeExamDate ? 'opacity-60 cursor-not-allowed' : '',
                                isSessionRestricted ? 'opacity-50 grayscale cursor-not-allowed pointer-events-none' : '',
                                isSkillCompleted(exams[0], skill.id) ? 'opacity-50 grayscale pointer-events-none' : '',
                                !isBeforeExamDate && !isSessionRestricted && isSkillLocked(exams[0], skill.id) ? 'opacity-40 grayscale cursor-not-allowed' : '',
                                !isBeforeExamDate && !isSessionRestricted && !isSkillCompleted(exams[0], skill.id) && !isSkillLocked(exams[0], skill.id) ? 'cursor-pointer hover:-translate-y-0.5' : ''
                            ]">

                            <!-- Icon -->
                            <div class="w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-500 shadow-sm shrink-0 border border-slate-100/60"
                                :class="isSkillCompleted(exams[0], skill.id) ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : [getSkillStyle(skill.name).iconBg]">
                                <i v-if="isSkillCompleted(exams[0], skill.id)"
                                    class="pi pi-check text-xl font-bold"></i>
                                <img v-else :src="getSkillIcon(skill.name)" :alt="skill.name"
                                    class="w-20 h-20 object-contain group-hover:scale-105 transition-transform" />
                            </div>

                            <!-- Details -->
                            <div class="flex-grow">
                                <div class="flex items-center gap-3 mb-0.5">
                                    <h3 class="text-sm font-bold text-slate-800 tracking-wide uppercase leading-none">
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
                                        <span
                                            class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                        <span>In Progress</span>
                                    </div>
                                    <div v-else
                                        class="flex items-center gap-1.5 bg-[#FFF2F2] text-[#E11D48] px-2 py-0.5 rounded-[4px] border border-[#FFE4E6] text-[9px] font-bold uppercase tracking-wide">
                                        <span class="inline-block w-1 h-1 rounded-full bg-[#E11D48]"></span>
                                        <span>Not Started</span>
                                    </div>
                                </div>

                                <div v-if="isBeforeExamDate"
                                    class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 text-[9px] font-bold">
                                    <i class="pi pi-calendar text-[9px]"></i>
                                    <span>Opens on {{ studentExamDate }}</span>
                                </div>
                                <div v-else-if="isSkillLocked(exams[0], skill.id) && !student?.student?.is_demo"
                                    class="inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 text-[8px] font-bold uppercase tracking-widest leading-none">
                                    <i class="pi pi-lock text-[8px]"></i>
                                    <span>Locked</span>
                                </div>
                            </div>

                            <!-- Action "Link" Style -->
                            <div class="shrink-0 flex items-center gap-4">
                                <div v-if="isBeforeExamDate" class="text-slate-400 font-bold text-xs tracking-wide">
                                    Locked until exam date
                                </div>
                                <div v-else-if="!isSkillCompleted(exams[0], skill.id)"
                                    class="flex items-center gap-1.5 font-bold text-xs tracking-wide transition-colors text-[#2563EB] group-hover:text-[#1d4ed8]">
                                    <span>{{ isSkillInProgress(exams[0], skill.id) ? 'Resume Test' : 'Start Test'
                                    }}</span>
                                    <i
                                        class="pi pi-arrow-right text-[10px] group-hover:translate-x-1 transition-transform font-bold"></i>
                                </div>
                                <div v-else class="text-emerald-600 font-bold text-xs tracking-wide">
                                    Taken
                                </div>
                            </div>
                        </div>

                        </template><!-- end v-for template -->
                    </div>

                    <!-- About the test banner at the bottom -->
                    <div
                        class="bg-[#F3F8FF] border border-[#BFDBFE]/60 rounded-lg p-4 flex items-start gap-4 animate-in fade-in duration-1000 mt-1">
                        <div
                            class="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center text-white shrink-0 shadow-sm border border-blue-400/20">
                            <i class="pi pi-info text-sm font-bold"></i>
                        </div>
                        <div>
                            <h4 class="text-xs font-bold text-[#1E3A8A] tracking-wide mb-0.5">About the test</h4>
                            <p class="text-[11px] text-slate-500 font-medium leading-relaxed">
                                Complete all skills to receive your ALPT certificate. You can take the skills in any
                                order.
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

    <!-- Live Speaking Booking Modal -->
    <LiveSpeakingBookingModal
        :visible="showBookingModal"
        :mode="bookingModalMode"
        @close="showBookingModal = false"
        @booked="onBooked"
    />

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
