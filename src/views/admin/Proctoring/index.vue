<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import api from '@/services/api'
import AdminLayout from '@/components/AdminLayout.vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import ProgressSpinner from 'primevue/progressspinner'
import Tooltip from 'primevue/tooltip'

const vTooltip = Tooltip

interface GroupedStudent {
  student_id: number
  student: { id: number; user?: { name: string; email: string } }
  sessions_count: number
  violations_count: number
  risk_score: number
  created_at: string
  latest_session_id: number
  exam_title?: string
}

interface Statistics {
  total_sessions: number
  sessions_with_violations: number
  total_violations: number
  average_risk_score: number
}

const router = useRouter()

// ─── Language ───────────────────────────────────────────────────────────────
const currentLang = ref<'ar' | 'en'>((localStorage.getItem('dashboard_lang') as 'ar' | 'en') || 'ar')
const toggleLang = () => {
  currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar'
  localStorage.setItem('dashboard_lang', currentLang.value)
}

const t = {
  ar: {
    loading: 'جاري تحميل قائمة الطلاب...',
    loadingData: 'جاري تحميل البيانات...',
    title: 'جلسات المراقبة',
    subtitle: 'طالب لديه سجل مراقبة',
    searchPlaceholder: 'ابحث عن طالب...',
    statTotal: 'إجمالي الجلسات',
    statViolations: 'جلسات بها انتهاكات',
    statTotalViolations: 'إجمالي الانتهاكات',
    statAvgRisk: 'متوسط الخطر',
    filtersTitle: 'تصفية النتائج',
    filterStatus: 'الحالة',
    filterViolations: 'الانتهاكات',
    filterRisk: 'درجة الخطر',
    resetFilters: 'إعادة تعيين الفلاتر',
    colDate: 'آخر نشاط له',
    colStudent: 'الطالب',
    colExam: 'الامتحان الأخير',
    colStatus: 'الحالة للمحاولة الأخيرة',
    colRisk: 'أقصى نسبة خطر',
    colViolations: 'إجمالي المخالفات',
    colActions: 'الإجراء',
    preExamVerification: 'التحقق قبل الامتحان',
    violationLabel: 'مخالفة',
    safeLabel: 'آمن',
    viewDetails: 'عرض التفاصيل',
    pauseSession: 'إيقاف الجلسة',
    page: 'صفحة',
    of: 'من',
    emptyTitle: 'لا توجد جلسات مراقبة',
    emptySubtitle: 'ستظهر هنا بمجرد بدء الطلاب الاختبارات المراقبة',
    statusPending: 'قيد الانتظار',
    statusActive: 'نشط',
    statusPaused: 'موقوف',
    statusEnded: 'منتهي',
    statusCancelled: 'ملغي',
    allStatuses: 'جميع الحالات',
    allSessions: 'جميع الجلسات',
    withViolations: 'جلسات بها انتهاكات',
    withoutViolations: 'جلسات بدون انتهاكات',
    allRiskLevels: 'جميع مستويات الخطر',
    riskMedium: 'خطر متوسط (50+)',
    riskHigh: 'خطر عالي (70+)',
    riskCritical: 'خطر حرج (80+)',
    colSessionsCount: 'إجمالي الجلسات',
    maxRiskScore: 'أقصى درجة خطر للكل',
    latestActivity: 'آخر نشاط',
    backToStudents: 'العودة لقائمة الطلاب',
    studentProfile: 'سجل مراقبة الطالب',
    skillsEnteredExit: 'المهارات والجدول الزمني للبدء والخروج',
    enteredAt: 'تاريخ الدخول للمهارة',
    exitedAt: 'تاريخ الخروج',
    stillTesting: 'قيد التقديم حالياً',
    questionsAnswered: 'الأسئلة المجابة',
    viewSessionDetails: 'عرض الكاميرا والتسجيل والتفاصيل الكاملة',
    sessionLogs: 'جلسات المراقبة المرتبطة بالطالب',
    noSessionsFound: 'لا توجد جلسات مسجلة لهذا الطالب.',
    attemptsCount: 'محاولات',
    latestActivityOn: 'آخر نشاط في',
    duration: 'المدة الزمنية',
    unknown: 'غير معرف',
    seconds: 'ثانية',
    minutes: 'دقيقة',
    secondsShort: 'ث',
    minutesShort: 'د',
  },
  en: {
    loading: 'Loading student list...',
    loadingData: 'Fetching data...',
    title: 'Proctoring Dashboard',
    subtitle: 'monitored students registry',
    searchPlaceholder: 'Search for a student...',
    statTotal: 'Total Sessions',
    statViolations: 'Sessions with Violations',
    statTotalViolations: 'Total Violations',
    statAvgRisk: 'Average Risk',
    filtersTitle: 'Filter Results',
    filterStatus: 'Status',
    filterViolations: 'Violations',
    filterRisk: 'Risk Score',
    resetFilters: 'Reset Filters',
    colDate: 'Latest Activity',
    colStudent: 'Student',
    colExam: 'Latest Exam',
    colStatus: 'Latest Status',
    colRisk: 'Max Risk Score',
    colViolations: 'Total Violations',
    colActions: 'Actions',
    preExamVerification: 'Pre-exam verification',
    violationLabel: 'violation',
    safeLabel: 'Safe',
    viewDetails: 'View Details',
    pauseSession: 'Pause Session',
    page: 'Page',
    of: 'of',
    emptyTitle: 'No Proctoring Sessions',
    emptySubtitle: 'Proctoring sessions will appear here once students begin monitored exams.',
    statusPending: 'Pending',
    statusActive: 'Active',
    statusPaused: 'Paused',
    statusEnded: 'Ended',
    statusCancelled: 'Cancelled',
    allStatuses: 'All Statuses',
    allSessions: 'All Sessions',
    withViolations: 'Sessions with Violations',
    withoutViolations: 'Sessions without Violations',
    allRiskLevels: 'All Risk Levels',
    riskMedium: 'Medium Risk (50+)',
    riskHigh: 'High Risk (70+)',
    riskCritical: 'Critical Risk (80+)',
    colSessionsCount: 'Total SessionsCount',
    maxRiskScore: 'Max Risk Score',
    latestActivity: 'Latest Activity',
    backToStudents: 'Back to Student List',
    studentProfile: 'Student Proctoring Profile',
    skillsEnteredExit: 'Skills Entry/Exit Timeline',
    enteredAt: 'Entered at',
    exitedAt: 'Exited at',
    stillTesting: 'In Progress',
    questionsAnswered: 'Questions Answered',
    viewSessionDetails: 'View Details & Video Recording',
    sessionLogs: 'Sessions associated with this student',
    noSessionsFound: 'No proctoring sessions found for this student',
    attemptsCount: 'Sessions',
    latestActivityOn: 'Latest activity: ',
    duration: 'Duration',
    unknown: 'Unknown',
    seconds: 'sec',
    minutes: 'min',
    secondsShort: 's',
    minutesShort: 'm',
  },
}

// ─── State ───────────────────────────────────────────────────────────────────
const studentsList = ref<GroupedStudent[]>([])

const statistics = ref<Statistics>({
  total_sessions: 0,
  sessions_with_violations: 0,
  total_violations: 0,
  average_risk_score: 0,
})
const loading = ref(false)
const currentPage = ref(1)
const pagination = ref({ total: 0, last_page: 1, per_page: 15 })
const sortField = ref('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

const filters = ref({
  search: '',
  status: '',
  has_violations: '' as boolean | string,
  min_risk_score: '',
})

// ─── Computed options (reactive to language) ─────────────────────────────────
const statusOptions = computed(() => [
  { label: t[currentLang.value].allStatuses, value: '' },
  { label: t[currentLang.value].statusPending, value: 'pending' },
  { label: t[currentLang.value].statusActive, value: 'active' },
  { label: t[currentLang.value].statusPaused, value: 'paused' },
  { label: t[currentLang.value].statusEnded, value: 'ended' },
  { label: t[currentLang.value].statusCancelled, value: 'cancelled' },
])

const violationOptions = computed(() => [
  { label: t[currentLang.value].allSessions, value: '' },
  { label: t[currentLang.value].withViolations, value: true },
  { label: t[currentLang.value].withoutViolations, value: false },
])

const riskOptions = computed(() => [
  { label: t[currentLang.value].allRiskLevels, value: '' },
  { label: t[currentLang.value].riskMedium, value: '50' },
  { label: t[currentLang.value].riskHigh, value: '70' },
  { label: t[currentLang.value].riskCritical, value: '80' },
])

// ─── Methods ─────────────────────────────────────────────────────────────────
const fetchSessions = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      per_page: pagination.value.per_page,
      sort_by: sortField.value,
      sort_order: sortOrder.value,
      group_by: 'student',
      ...(filters.value.search && { search: filters.value.search }),
      ...(filters.value.status && { status: filters.value.status }),
      ...(filters.value.has_violations !== '' && { has_violations: filters.value.has_violations }),
      ...(filters.value.min_risk_score && { min_risk_score: filters.value.min_risk_score }),
    }
    const response = await api.get('/admin/proctoring', { params })
    studentsList.value = response.data.data || []
    pagination.value = response.data.pagination || { total: 0, last_page: 1, per_page: 15 }
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    studentsList.value = []
    pagination.value = { total: 0, last_page: 1, per_page: 15 }
  } finally {
    loading.value = false
  }
}

const selectStudent = (studentId: number) => {
  router.push(`/admin/proctoring/student/${studentId}`)
}


const sortBy = (field: string) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
  currentPage.value = 1
}

const resetFilters = () => {
  filters.value = { search: '', status: '', has_violations: '', min_risk_score: '' }
  currentPage.value = 1
}

const formatDate = (date: string) => {
  if (!date) return '—'
  const locale = currentLang.value === 'ar' ? 'ar-SA' : 'en-GB'
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getRiskColor = (score: number) => {
  if (score > 80) return '#ef4444'
  if (score > 60) return '#f59e0b'
  if (score > 40) return '#eab308'
  return '#10b981'
}

const getViolationClass = (count: number) => {
  if (count > 5) return 'border-rose-200 bg-rose-50/50 text-rose-700'
  if (count > 2) return 'border-amber-200 bg-amber-50/50 text-amber-700'
  return 'border-sky-200 bg-sky-50/50 text-sky-700'
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
onMounted(() => {
  fetchSessions()
  fetchStatistics()
})

watch([currentPage, sortField, sortOrder], fetchSessions)
watch(filters, () => { currentPage.value = 1; fetchSessions() }, { deep: true })

const fetchStatistics = async () => {
  try {
    const response = await api.get('/admin/proctoring/statistics')
    statistics.value = response.data
  } catch (error) {
    console.error('Failed to fetch statistics:', error)
  }
}
</script>



<template>
  <AdminLayout>
    <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">

      <!-- Loading Indicator -->
      <div v-if="loading && studentsList.length === 0"
        class="flex flex-col items-center justify-center py-32 space-y-4">
        <ProgressSpinner />
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
      </div>

      <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">

        <!-- Premium Header Card -->
        <div
          class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100/80 shadow-md space-y-6 md:space-y-0 relative overflow-hidden group">
          <div
            class="absolute right-0 top-0 w-64 h-64 bg-brand-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-brand-primary/10 transition-all duration-1000">
          </div>
          <div
            class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/50 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000">
          </div>

          <div class="relative z-10 space-y-2">
            <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
              {{ t[currentLang].title }}
            </h1>
            <p class="text-xs font-bold text-slate-400 mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
              <span class="w-2.5 h-2.5 bg-brand-primary rounded-full animate-ping"></span>
              <span>{{ pagination.total }} {{ t[currentLang].subtitle }}</span>
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-4 relative z-10">
            <!-- Language Toggle -->
            <button @click="toggleLang"
              class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 font-extrabold text-xs">
              <i class="pi pi-globe text-brand-primary"></i>
              <span>{{ currentLang === 'ar' ? 'English' : 'العربية' }}</span>
            </button>

            <!-- Search -->
            <span class="relative">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 text-xs" />
              <input v-model="filters.search" type="text" :placeholder="t[currentLang].searchPlaceholder"
                @input="currentPage = 1"
                class="bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold focus:bg-white transition-all w-64 outline-none focus:border-brand-primary" />
            </span>
            <Button icon="pi pi-refresh" outlined severity="secondary" @click="fetchSessions" class="cursor-pointer" />
          </div>
        </div>

        <!-- STATISTICS -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div
            class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  {{ t[currentLang].statTotal }}
                </div>
                <div class="text-4xl font-black text-slate-800">{{ statistics.total_sessions }}</div>
              </div>
              <div class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-xl">
                <i class="pi pi-video"></i>
              </div>
            </div>
          </div>

          <div
            class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  {{ t[currentLang].statViolations }}
                </div>
                <div class="text-4xl font-black"
                  :style="{ color: statistics.sessions_with_violations > 0 ? '#f59e0b' : '#10b981' }">
                  {{ statistics.sessions_with_violations }}
                </div>
              </div>
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
                :style="{ backgroundColor: statistics.sessions_with_violations > 0 ? '#fef3c7' : '#d1fae5', color: statistics.sessions_with_violations > 0 ? '#f59e0b' : '#10b981' }">
                <i class="pi pi-exclamation-triangle"></i>
              </div>
            </div>
          </div>

          <div
            class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  {{ t[currentLang].statTotalViolations }}
                </div>
                <div class="text-4xl font-black text-slate-800">{{ statistics.total_violations }}</div>
              </div>
              <div class="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 text-xl">
                <i class="pi pi-times-circle"></i>
              </div>
            </div>
          </div>

          <div
            class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  {{ t[currentLang].statAvgRisk }}
                </div>
                <div class="text-4xl font-black" :style="{ color: getRiskColor(statistics.average_risk_score) }">
                  {{ statistics.average_risk_score }}
                </div>
              </div>
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
                :style="{ backgroundColor: getRiskColor(statistics.average_risk_score) + '20', color: getRiskColor(statistics.average_risk_score) }">
                <i class="pi pi-chart-line"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── STUDENTS LIST ─── -->
        <!-- Filters Section -->
        <div
          class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md flex flex-col xl:flex-row justify-between items-center gap-6">
          <div class="flex items-center gap-2">
            <i class="pi pi-filter text-slate-400"></i>
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">{{ t[currentLang].filtersTitle }}
            </h3>
          </div>
          <div class="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
            <Select v-model="filters.status" :options="statusOptions" optionLabel="label" optionValue="value"
              :placeholder="t[currentLang].filterStatus" @change="currentPage = 1"
              class="h-11 rounded-2xl border-2 border-slate-100 text-xs font-bold min-w-[160px] focus:border-brand-primary transition-all" />
            <Select v-model="filters.has_violations" :options="violationOptions" optionLabel="label" optionValue="value"
              :placeholder="t[currentLang].filterViolations" @change="currentPage = 1"
              class="h-11 rounded-2xl border-2 border-slate-100 text-xs font-bold min-w-[180px] focus:border-brand-primary transition-all" />
            <Select v-model="filters.min_risk_score" :options="riskOptions" optionLabel="label" optionValue="value"
              :placeholder="t[currentLang].filterRisk" @change="currentPage = 1"
              class="h-11 rounded-2xl border-2 border-slate-100 text-xs font-bold min-w-[180px] focus:border-brand-primary transition-all" />
            <Button v-if="filters.status || filters.has_violations !== '' || filters.min_risk_score"
              icon="pi pi-filter-slash" severity="danger" rounded outlined @click="resetFilters"
              v-tooltip.top="t[currentLang].resetFilters"
              class="h-11 w-11 shrink-0 cursor-pointer hover:bg-rose-50 hover:border-rose-400" />
          </div>
        </div>

        <!-- Loading spinner while refreshing -->
        <div v-if="loading"
          class="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-slate-100 shadow-md gap-4 animate-in fade-in duration-500">
          <ProgressSpinner />
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{{ t[currentLang].loadingData }}
          </p>
        </div>

        <!-- Empty State -->
        <div v-else-if="studentsList.length === 0"
          class="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-slate-100 shadow-md gap-6 animate-in fade-in duration-500">
          <div
            class="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 text-3xl">
            <i class="pi pi-video"></i>
          </div>
          <div class="text-center space-y-2">
            <h3 class="text-xl font-black text-slate-800 tracking-tight">{{ t[currentLang].emptyTitle }}</h3>
            <p class="text-xs font-bold text-slate-400 max-w-sm leading-relaxed">{{ t[currentLang].emptySubtitle }}
            </p>
          </div>
        </div>

        <!-- Students Table -->
        <div v-else
          class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <table class="w-full text-left">
            <thead
              class="bg-slate-50/50 border-b border-slate-100 GFM-table-head uppercase text-[10px] font-black text-slate-400 tracking-wider">
              <tr>
                <th class="p-6 text-right-lang">{{ t[currentLang].colStudent }}</th>
                <th class="p-6 text-center">{{ t[currentLang].colSessionsCount }}</th>
                <th class="p-6 text-center">{{ t[currentLang].colRisk }}</th>
                <th class="p-6 text-center">{{ t[currentLang].colViolations }}</th>
                <th class="p-6 text-right-lang">{{ t[currentLang].colExam }}</th>
                <th class="p-6 text-right-lang">{{ t[currentLang].colDate }}</th>
                <th class="p-6 text-right-lang">{{ t[currentLang].colActions }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 text-sm">
              <tr v-for="item in studentsList" :key="item.student_id"
                class="hover:bg-slate-50/50 transition cursor-pointer group" @click="selectStudent(item.student_id)">

                <td class="p-6">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center font-black uppercase text-xs text-slate-600 shrink-0">
                      {{ item.student?.user?.name?.[0] ?? '?' }}
                    </div>
                    <div>
                      <span class="font-black text-slate-800 text-xs block">{{ item.student?.user?.name ?? '—'
                      }}</span>
                      <span class="text-[10px] text-slate-400 font-bold block">{{ item.student?.user?.email ?? ''
                      }}</span>
                    </div>
                  </div>
                </td>
                <td class="p-6 text-center font-black text-slate-700">
                  {{ item.sessions_count }}
                </td>
                <td class="p-6 text-center">
                  <div class="flex items-center justify-center gap-3">
                    <div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                      <div class="h-full transition-all"
                        :style="{ width: item.risk_score + '%', backgroundColor: getRiskColor(item.risk_score) }">
                      </div>
                    </div>
                    <span class="font-black text-xs w-10 text-right" :style="{ color: getRiskColor(item.risk_score) }">
                      {{ item.risk_score }}%
                    </span>
                  </div>
                </td>
                <td class="p-6 text-center">
                  <span v-if="item.violations_count > 0" :class="getViolationClass(item.violations_count)"
                    class="inline-flex items-center gap-1 text-[10px] font-black uppercase rounded-xl px-3 py-1 border">
                    <i class="pi pi-exclamation-circle text-[9px]"></i>
                    {{ item.violations_count }} {{ t[currentLang].violationLabel }}
                  </span>
                  <span v-else
                    class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                    <i class="pi pi-check-circle text-[10px]"></i>
                    {{ t[currentLang].safeLabel }}
                  </span>
                </td>
                <td class="p-6 font-bold text-slate-700 text-xs">
                  {{ item.exam_title || t[currentLang].preExamVerification }}
                </td>
                <td class="p-6 font-bold text-slate-500 text-xs">
                  {{ formatDate(item.created_at) }}
                </td>
                <td class="p-6 text-right-lang">
                  <Button icon="pi pi-eye" rounded severity="info" outlined size="small"
                    class="h-9 w-9 border-blue-200 bg-blue-50/20 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 cursor-pointer transition-all duration-300"
                    @click.stop="router.push(`/admin/proctoring/student/${item.student_id}`)"
                    v-tooltip.top="t[currentLang].viewDetails" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.total > 0" class="flex items-center justify-center gap-4">
          <Button icon="pi pi-chevron-right" @click="currentPage--" :disabled="currentPage === 1" outlined
            severity="secondary" class="text-xs font-black cursor-pointer" />
          <span class="text-sm font-black text-slate-600 uppercase tracking-wider">
            {{ t[currentLang].page }} {{ currentPage }} {{ t[currentLang].of }} {{ pagination.last_page }}
          </span>
          <Button icon="pi pi-chevron-left" @click="currentPage++" :disabled="currentPage === pagination.last_page"
            outlined severity="secondary" class="text-xs font-black cursor-pointer" />
        </div>

      </div>
    </div>
  </AdminLayout>
</template>



<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.arabic-theme {
  font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

.animate-in {
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

/* RTL Text-align utility */
.rtl .text-right-lang {
  text-align: left !important;
}

.text-right-lang {
  text-align: right !important;
}

/* RTL GFM-table-head padding alignment fallback */
.rtl .GFM-table-head th {
  text-align: right !important;
}

.GFM-table-head th {
  text-align: left !important;
}
</style>
