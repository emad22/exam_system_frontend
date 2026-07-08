<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
// @ts-ignore
import api from '@/services/api'
import AdminLayout from '@/components/AdminLayout.vue'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'

const router = useRouter()
const route = useRoute()

// ─── Language ────────────────────────────────────────────────────────────────
const currentLang = ref<'ar' | 'en'>((localStorage.getItem('dashboard_lang') as 'ar' | 'en') || 'ar')
const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar'
    localStorage.setItem('dashboard_lang', currentLang.value)
}

const t = {
    ar: {
        loading: 'جاري تحميل بيانات الطالب...',
        title: 'سجل مراقبة الطالب',
        backToStudents: 'العودة للقائمة',
        statTotalSessions: 'إجمالي الجلسات',
        statViolations: 'انتهاكات',
        statMaxRisk: 'أقصى خطر',
        statDuration: 'المدة الكلية',
        colExam: 'الامتحان',
        colRisk: 'درجة الخطر',
        colViolations: 'المخالفات',
        duration: 'المدة',
        violationLabel: 'مخالفة',
        safeLabel: 'آمن',
        viewSessionDetails: 'عرض التفاصيل',
        resumeSession: 'استئناف',
        pauseSession: 'إيقاف',
        endSkillExam: 'إيقاف مهارة الامتحان',
        sessionLogs: 'جلسات المراقبة',
        noSessionsFound: 'لا توجد جلسات مسجلة لهذا الطالب.',
        attemptsCount: 'جلسة',
        latestActivity: 'آخر نشاط',
        skillsTimeline: 'المهارات',
        enteredAt: 'دخل في',
        exitedAt: 'خرج في',
        stillTesting: 'لا يزال يؤدي',
        questionsAnswered: 'أسئلة',
        preExamVerification: 'التحقق من الهوية',
        statusPending: 'انتظار',
        statusActive: 'نشط',
        statusPaused: 'موقوف',
        statusEnded: 'منتهي',
        statusCancelled: 'ملغي',
        unknown: 'غير معرف',
        secondsShort: 'ث',
        minutesShort: 'د',
        sessionNumber: 'جلسة',
        riskLevel: 'مستوى الخطر',
        lowRisk: 'منخفض',
        mediumRisk: 'متوسط',
        highRisk: 'مرتفع',
        criticalRisk: 'حرج',
    },
    en: {
        loading: 'Loading student data...',
        title: 'Student Proctoring Profile',
        backToStudents: 'Back to List',
        statTotalSessions: 'Sessions',
        statViolations: 'Violations',
        statMaxRisk: 'Max Risk',
        statDuration: 'Total Time',
        colExam: 'Exam',
        colRisk: 'Risk Score',
        colViolations: 'Violations',
        duration: 'Duration',
        violationLabel: 'violation',
        safeLabel: 'Safe',
        viewSessionDetails: 'View Details',
        resumeSession: 'Resume',
        pauseSession: 'Pause',
        endSkillExam: 'Stop Skill Exam',
        sessionLogs: 'Proctoring Sessions',
        noSessionsFound: 'No proctoring sessions found for this student.',
        attemptsCount: 'session',
        latestActivity: 'Latest Activity',
        skillsTimeline: 'Skills',
        enteredAt: 'Entered',
        exitedAt: 'Exited',
        stillTesting: 'Still in progress',
        questionsAnswered: 'Qs',
        preExamVerification: 'Identity Verification',
        statusPending: 'Pending',
        statusActive: 'Active',
        statusPaused: 'Paused',
        statusEnded: 'Ended',
        statusCancelled: 'Cancelled',
        unknown: 'Unknown',
        secondsShort: 's',
        minutesShort: 'm',
        sessionNumber: 'Session',
        riskLevel: 'Risk Level',
        lowRisk: 'Low',
        mediumRisk: 'Medium',
        highRisk: 'High',
        criticalRisk: 'Critical',
    },
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface SkillPivot {
    entered_at: string
    exited_at: string | null
    questions_answered: number
}
interface Skill { id: number; name: string; pivot: SkillPivot }
interface StudentSession {
    id: number
    created_at: string
    status: string
    risk_score: number
    violations_count: number
    duration_seconds: number | null
    skills?: Skill[]
    exam_attempt?: { exam: { title: string } }
}
interface StudentData {
    student: { id: number; user?: { name: string; email: string }; bypass_identity_verification?: boolean }
    sessions: StudentSession[]
}

// ─── State ───────────────────────────────────────────────────────────────────
const studentData = ref<StudentData | null>(null)
const loading = ref(true)

// ─── Computed stats ───────────────────────────────────────────────────────────
const totalViolations = computed(() =>
    studentData.value?.sessions.reduce((s, sess) => s + sess.violations_count, 0) ?? 0
)
const maxRisk = computed(() =>
    studentData.value?.sessions.reduce((m, sess) => Math.max(m, sess.risk_score), 0) ?? 0
)
const totalDurationSeconds = computed(() =>
    studentData.value?.sessions.reduce((s, sess) => s + (sess.duration_seconds ?? 0), 0) ?? 0
)

// ─── Methods ─────────────────────────────────────────────────────────────────
const fetchStudentSessions = async () => {
    loading.value = true
    try {
        const response = await api.get(`/admin/proctoring/student/${route.params.studentId}`)
        studentData.value = response.data
    } catch (error) {
        console.error('Failed to load student sessions:', error)
    } finally {
        loading.value = false
    }
}

// ─── End Session Dialog State ────────────────────────────────────────────────
const showEndConfirm = ref(false)
const sessionToEnd = ref<number | null>(null)
const activeSkillToEnd = ref<Skill | null>(null)
const sessionEndMode = ref<'skill' | 'session'>('skill')
const isEndingSession = ref(false)

const getActiveSkill = (session: StudentSession) => {
    return session.skills?.find(s => !s.pivot.exited_at) || null
}

const confirmEndSkillExam = (sessionId: number, activeSkill: Skill | null) => {
    sessionToEnd.value = sessionId
    activeSkillToEnd.value = activeSkill
    sessionEndMode.value = 'skill'
    showEndConfirm.value = true
}

const confirmEndSession = (sessionId: number) => {
    sessionToEnd.value = sessionId
    activeSkillToEnd.value = null
    sessionEndMode.value = 'session'
    showEndConfirm.value = true
}

const cancelEndSession = () => {
    showEndConfirm.value = false
    sessionToEnd.value = null
    activeSkillToEnd.value = null
}

const doEndSession = async () => {
    if (!sessionToEnd.value) return
    isEndingSession.value = true
    try {
        if (sessionEndMode.value === 'skill') {
            await api.post(`/admin/proctoring/${sessionToEnd.value}/end-skill`)
        } else {
            await api.patch(`/admin/proctoring/${sessionToEnd.value}/status`, { status: 'ended' })
        }
        showEndConfirm.value = false
        sessionToEnd.value = null
        activeSkillToEnd.value = null
        await fetchStudentSessions()
    } catch (error) {
        console.error('Failed to end session:', error)
    } finally {
        isEndingSession.value = false
    }
}

// const updateSessionStatus = async (sessionId: number, status: string) => {
//     try {
//         await api.patch(`/admin/proctoring/${sessionId}/status`, { status })
//         await fetchStudentSessions()
//     } catch (error) {
//         console.error('Failed to update session status:', error)
//     }
// }

const formatDate = (date: string) => {
    if (!date) return '—'
    const locale = currentLang.value === 'ar' ? 'ar-SA' : 'en-GB'
    return new Date(date).toLocaleDateString(locale, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    })
}

const formatDurationSecs = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins >= 60) {
        const hrs = Math.floor(mins / 60)
        const rem = mins % 60
        return `${hrs}h ${rem}${t[currentLang.value].minutesShort}`
    }
    if (mins > 0) return `${mins}${t[currentLang.value].minutesShort} ${secs}${t[currentLang.value].secondsShort}`
    return `${secs}${t[currentLang.value].secondsShort}`
}

const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return t[currentLang.value].unknown
    return formatDurationSecs(seconds)
}

const getStatusLabel = (status: string): string => {
    const map: Record<string, string> = {
        pending: 'statusPending', active: 'statusActive', paused: 'statusPaused',
        ended: 'statusEnded', cancelled: 'statusCancelled',
    }
    const key = map[status]
    return key ? ((t[currentLang.value] as Record<string, string>)[key] || status) : status
}

const getStatusStyle = (status: string) => {
    const map: Record<string, { bg: string; text: string; dot: string; border: string }> = {
        active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500 animate-pulse', border: 'border-emerald-200' },
        pending: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', border: 'border-blue-200' },
        paused: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', border: 'border-amber-200' },
        ended: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-200' },
        cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400', border: 'border-rose-200' },
    }
    return map[status] || { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-300', border: 'border-slate-200' }
}

const getRiskColor = (score: number) => {
    if (score > 80) return { hex: '#ef4444', bg: 'bg-red-50', text: 'text-red-600', label: t[currentLang.value].criticalRisk }
    if (score > 60) return { hex: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-600', label: t[currentLang.value].highRisk }
    if (score > 40) return { hex: '#eab308', bg: 'bg-yellow-50', text: 'text-yellow-600', label: t[currentLang.value].mediumRisk }
    return { hex: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-600', label: t[currentLang.value].lowRisk }
}

const getViolationSeverity = (count: number) => {
    if (count > 5) return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'pi-times-circle' }
    if (count > 2) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'pi-exclamation-triangle' }
    if (count > 0) return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', icon: 'pi-exclamation-circle' }
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'pi-check-circle' }
}

const initials = computed(() => {
    const name = studentData.value?.student?.user?.name ?? ''
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
})

const isTogglingBypass = ref(false)
const toggleBypass = async () => {
    if (!studentData.value?.student?.id) return
    isTogglingBypass.value = true
    try {
        const response = await api.post(`/admin/students/${studentData.value.student.id}/toggle-bypass-identity-verification`)
        if (studentData.value.student) {
            studentData.value.student.bypass_identity_verification = response.data.bypass_identity_verification
        }
    } catch (error) {
        console.error('Failed to toggle bypass identity verification:', error)
    } finally {
        isTogglingBypass.value = false
    }
}

onMounted(fetchStudentSessions)
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'"
            class="w-full min-h-screen bg-slate-50/30">

            <!-- Loading -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-40 gap-5">
                <div class="relative">
                    <ProgressSpinner class="w-12 h-12" />
                </div>
                <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{{ t[currentLang].loading }}
                </p>
            </div>

            <div v-else
                class="animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-8 pb-24 pt-6 space-y-6">

                <!-- ── Top Bar: Back + Lang ── -->
                <div class="flex items-center justify-between gap-4">
                    <button @click="router.push('/admin/proctoring')"
                        class="group flex items-center gap-2.5 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors duration-200">
                        <span
                            class="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center group-hover:bg-slate-100 transition-all duration-200">
                            <i class="pi pi-arrow-right text-[11px] rtl:rotate-180"></i>
                        </span>
                        {{ t[currentLang].backToStudents }}
                    </button>

                    <button @click="toggleLang"
                        class="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 font-bold text-[11px]">
                        <i class="pi pi-globe text-brand-primary text-xs"></i>
                        <span>{{ currentLang === 'ar' ? 'EN' : 'ع' }}</span>
                    </button>
                </div>

                <!-- ── Hero Student Card ── -->
                <div v-if="studentData"
                    class="relative bg-white rounded-[2rem] border border-slate-100 shadow-md overflow-hidden">

                    <!-- decorative blobs -->
                    <div class="absolute inset-0 pointer-events-none overflow-hidden">
                        <div class="absolute -top-16 -right-16 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl">
                        </div>
                        <div class="absolute -bottom-16 -left-16 w-48 h-48 bg-sky-400/5 rounded-full blur-3xl"></div>
                    </div>

                    <div class="relative z-10 p-6 md:p-8">
                        <div class="flex flex-col md:flex-row md:items-center gap-5 md:gap-6">

                            <!-- Avatar -->
                            <div class="relative shrink-0">
                                <div
                                    class="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-brand-primary/15 to-sky-400/15 border-2 border-brand-primary/10 flex items-center justify-center text-brand-primary text-2xl md:text-3xl font-black shadow-inner">
                                    {{ initials }}
                                </div>
                                <span
                                    :class="studentData.sessions.some(s => s.status === 'active') ? 'bg-emerald-500 ring-emerald-200' : 'bg-slate-300 ring-slate-100'"
                                    class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ring-2">
                                </span>
                            </div>

                            <!-- Info -->
                            <div class="flex-1 min-w-0">
                                <h1 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight truncate">
                                    {{ studentData.student?.user?.name }}
                                </h1>
                                <p class="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                                    <i class="pi pi-envelope text-[10px]"></i>
                                    {{ studentData.student?.user?.email }}
                                </p>
                                <button @click="toggleBypass" :disabled="isTogglingBypass"
                                    :class="studentData.student?.bypass_identity_verification ? 'bg-emerald-500 hover:bg-emerald-630 text-white' : 'bg-slate-100/80 hover:bg-slate-200 text-slate-600 border border-slate-200/50'"
                                    class="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all duration-300 cursor-pointer disabled:opacity-60">
                                    <i :class="isTogglingBypass ? 'pi pi-spin pi-spinner' : 'pi pi-shield'"></i>
                                    <span>{{ studentData.student?.bypass_identity_verification ? (currentLang === 'ar' ?'إلغاء تخطي الهوية' : 'Disable Identity Bypass') : (currentLang === 'ar' ? 'تخطيالتحقق من الهوية' : 'Bypass Identity Verification') }}</span>
                                </button>
                            </div>

                            <!-- Quick Stats chips -->
                            <div class="flex flex-wrap gap-3 md:flex-col md:items-end">
                                <div
                                    class="text-center bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 min-w-[90px]">
                                    <div class="text-2xl font-black text-slate-800">{{ studentData.sessions.length }}
                                    </div>
                                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{{
                                        t[currentLang].statTotalSessions }}</div>
                                </div>
                            </div>
                        </div>

                        <!-- stats row -->
                        <div class="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
                            <!-- Total Violations -->
                            <div class="text-center">
                                <div class="text-xl font-black"
                                    :class="totalViolations > 0 ? 'text-rose-600' : 'text-emerald-600'">
                                    {{ totalViolations }}
                                </div>
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{{
                                    t[currentLang].statViolations }}</div>
                            </div>
                            <!-- Max Risk -->
                            <div class="text-center border-x border-slate-100">
                                <div class="text-xl font-black" :style="{ color: getRiskColor(maxRisk).hex }">{{ maxRisk
                                    }}%</div>
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{{
                                    t[currentLang].statMaxRisk }}</div>
                            </div>
                            <!-- Total Duration -->
                            <div class="text-center">
                                <div class="text-xl font-black text-slate-700">{{
                                    formatDurationSecs(totalDurationSeconds) }}</div>
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{{
                                    t[currentLang].statDuration }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ── Empty State ── -->
                <div v-if="studentData && studentData.sessions.length === 0"
                    class="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
                    <div
                        class="w-16 h-16 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 text-3xl mx-auto mb-4">
                        <i class="pi pi-video"></i>
                    </div>
                    <p class="text-sm font-black text-slate-700">{{ t[currentLang].noSessionsFound }}</p>
                </div>

                <!-- ── Sessions List ── -->
                <div v-else-if="studentData" class="space-y-4">
                    <div class="flex items-center gap-2 px-1">
                        <i class="pi pi-video text-brand-primary text-sm"></i>
                        <h2 class="text-sm font-black text-slate-700 uppercase tracking-wider">{{
                            t[currentLang].sessionLogs }}</h2>
                        <span
                            class="ml-auto text-[10px] font-black text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">
                            {{ studentData.sessions.length }}
                        </span>
                    </div>

                    <div v-for="(session, index) in studentData.sessions" :key="session.id"
                        class="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">

                        <!-- Risk accent bar at top -->
                        <div class="h-1 w-full"
                            :style="{ backgroundColor: getRiskColor(session.risk_score).hex + '60' }">
                            <div class="h-full transition-all duration-1000"
                                :style="{ width: session.risk_score + '%', backgroundColor: getRiskColor(session.risk_score).hex }">
                            </div>
                        </div>

                        <div class="p-5 md:p-6 space-y-5">

                            <!-- ── Card Header ── -->
                            <div class="flex flex-col md:flex-row md:items-start justify-between gap-3">
                                <div class="flex items-start gap-3">
                                    <!-- Session number badge -->
                                    <div
                                        class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[11px] font-black text-slate-400 shrink-0 mt-0.5">
                                        #{{ index + 1 }}
                                    </div>
                                    <div>
                                        <div
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                            {{ t[currentLang].colExam }}</div>
                                        <h3 class="text-sm font-black text-slate-800 leading-tight">
                                            {{ session.exam_attempt?.exam?.title || t[currentLang].preExamVerification
                                            }}
                                        </h3>
                                        <p class="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1">
                                            <i class="pi pi-clock text-[9px]"></i>
                                            {{ formatDate(session.created_at) }}
                                        </p>
                                    </div>
                                </div>

                                <!-- Status badge -->
                                <div :class="[getStatusStyle(session.status).bg, getStatusStyle(session.status).border]"
                                    class="self-start inline-flex items-center gap-1.5 text-[10px] font-black uppercase rounded-xl px-3 py-1.5 border shrink-0">
                                    <span class="w-1.5 h-1.5 rounded-full"
                                        :class="getStatusStyle(session.status).dot"></span>
                                    <span :class="getStatusStyle(session.status).text">{{ getStatusLabel(session.status)
                                        }}</span>
                                </div>
                            </div>

                            <!-- ── Metrics Row ── -->
                            <div class="grid grid-cols-3 gap-3">
                                <!-- Duration -->
                                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <div
                                        class="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <i class="pi pi-clock text-[8px]"></i> {{ t[currentLang].duration }}
                                    </div>
                                    <div class="text-sm font-black text-slate-700">{{
                                        formatDuration(session.duration_seconds) }}</div>
                                </div>

                                <!-- Risk Score -->
                                <div :class="getRiskColor(session.risk_score).bg"
                                    class="rounded-xl p-3 border border-slate-100">
                                    <div
                                        class="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <i class="pi pi-chart-bar text-[8px]"></i> {{ t[currentLang].colRisk }}
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-sm font-black"
                                            :style="{ color: getRiskColor(session.risk_score).hex }">
                                            {{ session.risk_score }}%
                                        </span>
                                        <div class="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                            <div class="h-full rounded-full"
                                                :style="{ width: session.risk_score + '%', backgroundColor: getRiskColor(session.risk_score).hex }">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-[9px] font-bold mt-1"
                                        :class="getRiskColor(session.risk_score).text">
                                        {{ getRiskColor(session.risk_score).label }}
                                    </div>
                                </div>

                                <!-- Violations -->
                                <div :class="getViolationSeverity(session.violations_count).bg"
                                    class="rounded-xl p-3 border border-slate-100">
                                    <div
                                        class="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <i class="pi pi-exclamation-triangle text-[8px]"></i> {{
                                            t[currentLang].colViolations }}
                                    </div>
                                    <div :class="getViolationSeverity(session.violations_count).text"
                                        class="text-sm font-black">
                                        {{ session.violations_count > 0 ? session.violations_count + ' ' +
                                            t[currentLang].violationLabel : t[currentLang].safeLabel }}
                                    </div>
                                </div>
                            </div>

                            <!-- ── Skills Timeline ── -->
                            <div v-if="session.skills && session.skills.length > 0" class="space-y-2">
                                <div
                                    class="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <i class="pi pi-list text-[8px]"></i>
                                    {{ t[currentLang].skillsTimeline }}
                                </div>
                                <div class="grid gap-2">
                                    <div v-for="skill in session.skills" :key="skill.id"
                                        class="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                                        <div class="w-2 h-2 rounded-full bg-brand-primary shrink-0"></div>
                                        <div class="flex-1 min-w-0">
                                            <span class="text-xs font-black text-slate-700 truncate block">{{ skill.name
                                                }}</span>
                                        </div>
                                        <div
                                            class="flex items-center gap-3 text-[9px] font-bold text-slate-400 shrink-0 flex-wrap justify-end">
                                            <span class="flex items-center gap-1">
                                                <i class="pi pi-sign-in text-[8px] text-emerald-500"></i>
                                                {{ formatDate(skill.pivot.entered_at) }}
                                            </span>
                                            <span v-if="skill.pivot.exited_at" class="flex items-center gap-1">
                                                <i class="pi pi-sign-out text-[8px] text-rose-400"></i>
                                                {{ formatDate(skill.pivot.exited_at) }}
                                            </span>
                                            <span v-else class="text-amber-500 font-bold">● {{
                                                t[currentLang].stillTesting }}</span>
                                            <span class="bg-slate-200/60 rounded-lg px-1.5 py-0.5">
                                                {{ skill.pivot.questions_answered }} {{ t[currentLang].questionsAnswered
                                                }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- ── Actions ── -->
                            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <!-- End Skill Exam (active sessions only and if there is an active skill) -->
                                <button v-if="session.status === 'active' && getActiveSkill(session)"
                                    @click="confirmEndSkillExam(session.id, getActiveSkill(session))"
                                    class="flex items-center gap-2 text-[11px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer">
                                    <i class="pi pi-stop-circle text-[10px]"></i>
                                    {{ currentLang === 'ar'
                                        ? `إيقاف مهارة ${getActiveSkill(session)?.name}`
                                        : `End ${getActiveSkill(session)?.name} Exam` }}
                                </button>
                                <button @click="router.push(`/admin/proctoring/${session.id}`)"
                                    class="flex items-center gap-2 text-[11px] font-black text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer group-hover:bg-sky-100">
                                    <i class="pi pi-eye text-[10px]"></i>
                                    {{ t[currentLang].viewSessionDetails }}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    </AdminLayout>

    <!-- ── End Session Confirm Dialog ── -->
    <Teleport to="body">
        <div v-if="showEndConfirm"
            class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            @click.self="cancelEndSession">
            <div class="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 max-w-sm w-full">
                <!-- Icon -->
                <div
                    class="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-5">
                    <i class="pi pi-stop-circle text-rose-500 text-2xl"></i>
                </div>
                <!-- Text -->
                <h3 class="text-base font-black text-slate-800 text-center mb-2">
                    <template v-if="sessionEndMode === 'skill'">
                        {{ currentLang === 'ar'
                            ? `إيقاف امتحان مهارة ${activeSkillToEnd?.name}؟`
                            : `Stop ${activeSkillToEnd?.name} Exam?` }}
                    </template>
                    <template v-else>
                        {{ currentLang === 'ar'
                            ? 'إنهاء جلسة المراقبة بالكامل؟'
                            : 'End the entire proctoring session?' }}
                    </template>
                </h3>
                <p class="text-xs font-bold text-slate-500 text-center leading-relaxed mb-6">
                    <template v-if="sessionEndMode === 'skill'">
                        {{ currentLang === 'ar'
                            ? 'سيتم إيقاف الجلسة مؤقتاً وسيُبلَّغ الطالب. يمكن للطالب استئناف المهمة عند اختيار مهارةجديدة.'
                        : 'The session will be paused and the student notified. They can resume by selecting a new skill.'
                        }}
                    </template>
                    <template v-else>
                        {{ currentLang === 'ar'
                            ? 'سيتم إنهاء الجلسة وإخراج الطالب من الامتحان. لا يمكنه مواصلة هذه المحاولة.'
                            : 'The session will be ended and the student will be removed from the exam. They cannot continuethis attempt.'
                        }}
                    </template>
                </p>
                <!-- Buttons -->
                <div class="flex gap-3">
                    <button @click="cancelEndSession"
                        class="flex-1 py-3 rounded-xl text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all duration-200">
                        {{ currentLang === 'ar' ? 'لا، إلغاء' : 'No, Cancel' }}
                    </button>
                    <button @click="doEndSession" :disabled="isEndingSession"
                        class="flex-1 py-3 rounded-xl text-xs font-black text-white bg-rose-500 hover:bg-rose-600 transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2">
                        <i v-if="isEndingSession" class="pi pi-spin pi-spinner text-[11px]"></i>
                        {{ currentLang === 'ar' ? 'نعم، إيقاف' : 'Yes, Stop' }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.arabic-theme {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
