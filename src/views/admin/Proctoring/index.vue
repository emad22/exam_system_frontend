<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import api from '@/services/api'
import AdminLayout from '@/components/AdminLayout.vue'
import Button from 'primevue/button'
import Select from 'primevue/select'
import CardListSkeleton from '@/components/skeletons/CardListSkeleton.vue'
import Tooltip from 'primevue/tooltip'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import CustomPagination from '@/components/CustomPagination.vue'
import FilterBar from '@/components/FilterBar.vue'
// @ts-ignore
import { useModal } from '@/composables/useModal'

const vTooltip = Tooltip

const { showConfirm, showAlert } = useModal()

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

const t = {
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
}

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
  date_from: null as Date | null,
  date_to: null as Date | null,
})

const statusOptions = computed(() => [
  { label: t.allStatuses, value: '' },
  { label: t.statusPending, value: 'pending' },
  { label: t.statusActive, value: 'active' },
  { label: t.statusPaused, value: 'paused' },
  { label: t.statusEnded, value: 'ended' },
  { label: t.statusCancelled, value: 'cancelled' },
])

const violationOptions = computed(() => [
  { label: t.allSessions, value: '' },
  { label: t.withViolations, value: true },
  { label: t.withoutViolations, value: false },
])

const riskOptions = computed(() => [
  { label: t.allRiskLevels, value: '' },
  { label: t.riskMedium, value: '50' },
  { label: t.riskHigh, value: '70' },
  { label: t.riskCritical, value: '80' },
])

const fetchSessions = async () => {
  loading.value = true
  try {
    const formatDateParam = (date: Date | null) => {
      if (!date) return undefined
      const d = new Date(date)
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    }
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
      ...(filters.value.date_from && { date_from: formatDateParam(filters.value.date_from) }),
      ...(filters.value.date_to && { date_to: formatDateParam(filters.value.date_to) }),
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
  filters.value = { search: '', status: '', has_violations: '', min_risk_score: '', date_from: null, date_to: null }
  currentPage.value = 1
}

const formatDate = (date: string) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
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

const deleteAllStudentSessions = async (studentId: number, studentName: string, event: Event) => {
  event.stopPropagation()

  const msg = `Are you sure you want to permanently delete all sessions for "${studentName}"? All violations and logs will be deleted.`
  const title = 'Delete All Student Sessions'
  const confirmLabel = 'Yes, Delete All'

  const confirmed = await showConfirm(msg, title, 'danger', confirmLabel)
  if (!confirmed) return

  try {
    await api.delete(`/admin/proctoring/student/${studentId}/all`)
    await fetchSessions()
    await fetchStatistics()
    await showAlert(
      'All student sessions deleted successfully.',
      'Success',
      'success'
    )
  } catch (error) {
    console.error('Failed to delete all student sessions:', error)
    await showAlert(
      'Failed to delete student sessions.',
      'Error',
      'danger'
    )
  }
}
</script>



<template>
  <AdminLayout>
    <div class="w-full">

      <!-- Loading Indicator -->
      <div v-if="loading && studentsList.length === 0" class="mt-6 px-4 md:px-8">
        <CardListSkeleton :rows="7" />
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
              {{ t.title }}
            </h1>
            <p class="text-xs font-bold text-slate-400 mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
              <span class="w-2.5 h-2.5 bg-brand-primary rounded-full animate-ping"></span>
              <span>{{ pagination.total }} {{ t.subtitle }}</span>
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-4 relative z-10">
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
                  {{ t.statTotal }}
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
                  {{ t.statViolations }}
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
                  {{ t.statTotalViolations }}
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
                  {{ t.statAvgRisk }}
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
        <!-- Filter Bar -->
        <FilterBar
          v-model="filters.search"
          :search-placeholder="t.searchPlaceholder"
          v-model:dateFrom="filters.date_from"
          v-model:dateTo="filters.date_to"
          :active-count="(filters.status ? 1 : 0) + (filters.has_violations !== '' ? 1 : 0) + (filters.min_risk_score ? 1 : 0)"
          @reset="resetFilters"
        >
          <div class="hidden sm:block h-8 w-px bg-slate-100 shrink-0" />
          <Select v-model="filters.status" :options="statusOptions" optionLabel="label" optionValue="value"
            :placeholder="t.filterStatus" @change="currentPage = 1"
            class="!h-11 !rounded-2xl !border-slate-100 !bg-slate-50 !text-xs !font-bold min-w-[150px] hover:!border-brand-primary/30 transition-all flex items-center" />
          <Select v-model="filters.has_violations" :options="violationOptions" optionLabel="label" optionValue="value"
            :placeholder="t.filterViolations" @change="currentPage = 1"
            class="!h-11 !rounded-2xl !border-slate-100 !bg-slate-50 !text-xs !font-bold min-w-[170px] hover:!border-brand-primary/30 transition-all flex items-center" />
          <Select v-model="filters.min_risk_score" :options="riskOptions" optionLabel="label" optionValue="value"
            :placeholder="t.filterRisk" @change="currentPage = 1"
            class="!h-11 !rounded-2xl !border-slate-100 !bg-slate-50 !text-xs !font-bold min-w-[160px] hover:!border-brand-primary/30 transition-all flex items-center" />
        </FilterBar>

        <!-- Loading while refreshing -->
        <div v-if="loading"
          class="flex items-center justify-center gap-3 py-10 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse">
          <div class="w-5 h-5 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ t.loadingData }}</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="studentsList.length === 0"
          class="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-slate-100 shadow-md gap-6 animate-in fade-in duration-500">
          <div
            class="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 text-3xl">
            <i class="pi pi-video"></i>
          </div>
          <div class="text-center space-y-2">
            <h3 class="text-xl font-black text-slate-800 tracking-tight">{{ t.emptyTitle }}</h3>
            <p class="text-xs font-bold text-slate-400 max-w-sm leading-relaxed">{{ t.emptySubtitle }}
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
                <th class="p-6">{{ t.colStudent }}</th>
                <th class="p-6 text-center">{{ t.colSessionsCount }}</th>
                <th class="p-6 text-center">{{ t.colRisk }}</th>
                <th class="p-6 text-center">{{ t.colViolations }}</th>
                <th class="p-6">{{ t.colExam }}</th>
                <th class="p-6">{{ t.colDate }}</th>
                <th class="p-6">{{ t.colActions }}</th>
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
                    {{ item.violations_count }} {{ t.violationLabel }}
                  </span>
                  <span v-else
                    class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                    <i class="pi pi-check-circle text-[10px]"></i>
                    {{ t.safeLabel }}
                  </span>
                </td>
                <td class="p-6 font-bold text-slate-700 text-xs">
                  {{ item.exam_title || t.preExamVerification }}
                </td>
                <td class="p-6 font-bold text-slate-500 text-xs">
                  {{ formatDate(item.created_at) }}
                </td>
                <td class="p-6">
                  <div class="flex items-center gap-2 justify-end">
                    <Button icon="pi pi-eye" rounded severity="info" outlined size="small"
                      class="h-9 w-9 border-blue-200 bg-blue-50/20 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 cursor-pointer transition-all duration-300"
                      @click.stop="router.push(`/admin/proctoring/student/${item.student_id}`)"
                      v-tooltip.top="t.viewDetails" />
                    <Button icon="pi pi-trash" rounded severity="danger" outlined size="small"
                      class="h-9 w-9 border-rose-200 bg-rose-50/20 text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500 cursor-pointer transition-all duration-300"
                      @click="deleteAllStudentSessions(item.student_id, item.student?.user?.name ?? '', $event)"
                      v-tooltip.top="'Delete All Sessions'" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <CustomPagination :totalRecords="pagination.total" v-model:currentPage="currentPage" v-model:rowsPerPage="pagination.per_page" @pageChange="fetchSessions()" />
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

.text-right-lang {
  text-align: right !important;
}
</style>
