<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import api from '@/services/api'
import { authStorage } from '@/services/authStorage'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import CardListSkeleton from '@/components/skeletons/CardListSkeleton.vue'
import CustomPagination from '@/components/CustomPagination.vue'
import FilterBar from '@/components/FilterBar.vue'
import { watch } from 'vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const attempts = ref([])
const partners = ref([])
const totalRecords = ref(0)
const currentPage = ref(1)
const rowsPerPage = ref(15)
const searchQuery = ref('')
const selectedPartner = ref(null)
const selectedStatus = ref('pending') // 'pending' | 'graded' | 'all'
const statusOptions = ref([
    { label: 'Pending Correction', value: 'pending' },
    { label: 'Graded (Editable)', value: 'graded' },
    { label: 'All Submissions', value: 'all' },
])
const dateFrom = ref(null)
const dateTo = ref(null)

const t = {
    loading: "Loading student assessments...",
    title: "Writing & Speaking Hub",
    subtitle: "Review, grade and update writing and speaking assignments.",
    placeholderSearch: "Search by student name, email, code or exam...",
    pendingWriting: "Pending Writing",
    pendingSpeaking: "Pending Speaking",
    studentsAwaiting: "Submissions",
    colCandidate: "Student",
    colExam: "Exam",
    colPendingTasks: "Tasks Status",
    colSubmittedAt: "Submitted At",
    colAction: "Action",
    emptyTelemetry: "All caught up!",
    emptySubtitle: "No submissions found matching your selected criteria.",
    gradeNow: "Grade Now",
    editGrade: "Edit Grades",
    attemptShort: "Attempt #{id}",
    writingTag: "✍️ {count} Writing",
    speakingTag: "🎙️ {count} Speaking"
};

const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const fetchPartners = async () => {
    try {
        const res = await api.get('/admin/partners/active').catch(() => api.get('/admin/partners')).catch(() => ({ data: [] }))
        partners.value = res.data || []
    } catch (err) {
        console.error('Failed to load partners', err)
    }
}

const globalSummary = ref({
    pending_count: 0,
    graded_count: 0,
    all_count: 0,
})

const switchStatus = (status) => {
    selectedStatus.value = status
    fetchPending(1)
}

const fetchPending = async (page = 1) => {
    currentPage.value = page
    loading.value = true
    try {
        const params = {
            page,
            per_page: rowsPerPage.value,
            status: selectedStatus.value,
            ...(searchQuery.value && { search: searchQuery.value.trim() }),
            ...(selectedPartner.value && { partner_id: selectedPartner.value }),
            ...(dateFrom.value && { date_from: formatDate(dateFrom.value) }),
            ...(dateTo.value && { date_to: formatDate(dateTo.value) }),
        }
        const response = await api.get('/admin/grading', { params })
        const raw = response.data.attempts ? response.data.attempts : response.data
        attempts.value = raw.data || []
        totalRecords.value = raw.total || 0
        if (response.data.summary) {
            globalSummary.value = response.data.summary
        }
    } catch (err) {
        console.error('Failed to fetch attempts', err)
    } finally {
        loading.value = false
    }
}

const resetFilters = () => {
    searchQuery.value = ''
    selectedPartner.value = null
    selectedStatus.value = 'pending'
    dateFrom.value = null
    dateTo.value = null
    fetchPending(1)
}

watch([selectedPartner, selectedStatus, dateFrom, dateTo], () => {
    fetchPending(1)
})

const getSubmittedAt = (attempt) => {
    const raw = attempt?.finished_at || attempt?.updated_at || attempt?.created_at || attempt?.started_at
    if (!raw) return '—'

    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return '—'

    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const goToGrading = (attemptId) => {
    const isTeacher = route.path.startsWith('/teacher') || authStorage.getRole() === 'teacher';
    const routeName = isTeacher ? 'teacher.grading.show' : 'admin.grading.show';
    router.push({ name: routeName, params: { id: attemptId } })
}

const pendingWriting = computed(() => attempts.value.reduce((s, a) => s + (a.pending_writing || 0), 0))
const pendingSpeaking = computed(() => attempts.value.reduce((s, a) => s + (a.pending_speaking || 0), 0))

onMounted(() => {
    fetchPartners()
    fetchPending()
})
</script>

<template>
    <AdminLayout>
        <div class="w-full">
            
            <!-- Loading Indicator -->
            <div v-if="loading && attempts.length === 0" class="mt-6 px-4 md:px-8">
                <CardListSkeleton :rows="6" />
            </div>

            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
                
                <!-- Premium Header Section -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 space-y-2">
                        <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                            {{ t.title }}
                        </h1>
                        <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                            {{ t.subtitle }}
                        </p>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-4 relative z-10">
                        <Button icon="pi pi-refresh" outlined rounded severity="secondary" @click="fetchPending(currentPage)" :loading="loading" class="bg-white/50 w-10 h-10 border border-slate-200" />
                    </div>
                </div>

                <!-- Quick Status Tabs -->
                <div class="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/60 shadow-2xs">
                    <button 
                        @click="switchStatus('pending')" 
                        type="button"
                        :class="selectedStatus === 'pending' ? 'bg-white text-rose-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900 font-bold'"
                        class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer">
                        <i class="pi pi-clock text-xs"></i>
                        <span>Pending Correction</span>
                        <span class="px-2 py-0.5 rounded-lg text-[10px] font-black" :class="selectedStatus === 'pending' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-200/80 text-slate-600'">
                            {{ globalSummary.pending_count }}
                        </span>
                    </button>

                    <button 
                        @click="switchStatus('graded')" 
                        type="button"
                        :class="selectedStatus === 'graded' ? 'bg-white text-emerald-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900 font-bold'"
                        class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer">
                        <i class="pi pi-check-circle text-xs"></i>
                        <span>Graded (Editable)</span>
                        <span class="px-2 py-0.5 rounded-lg text-[10px] font-black" :class="selectedStatus === 'graded' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-200/80 text-slate-600'">
                            {{ globalSummary.graded_count }}
                        </span>
                    </button>

                    <button 
                        @click="switchStatus('all')" 
                        type="button"
                        :class="selectedStatus === 'all' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900 font-bold'"
                        class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer">
                        <i class="pi pi-list text-xs"></i>
                        <span>All Submissions</span>
                        <span class="px-2 py-0.5 rounded-lg text-[10px] font-black" :class="selectedStatus === 'all' ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-slate-200/80 text-slate-600'">
                            {{ globalSummary.all_count }}
                        </span>
                    </button>
                </div>

                <!-- Filter Bar -->
                <FilterBar
                    v-model="searchQuery"
                    :search-placeholder="t.placeholderSearch"
                    v-model:dateFrom="dateFrom"
                    v-model:dateTo="dateTo"
                    :active-count="(selectedPartner ? 1 : 0) + (selectedStatus !== 'pending' ? 1 : 0)"
                    @reset="resetFilters"
                    @apply="fetchPending(1)"
                >
                    <div class="w-full sm:w-48">
                        <label class="block text-[11px] font-bold text-slate-600 mb-1.5 tracking-tight flex items-center gap-1.5">
                            <i class="pi pi-filter text-[10px] text-slate-400" />
                            <span>Correction Status</span>
                        </label>
                        <Select v-model="selectedStatus" :options="statusOptions" optionLabel="label" optionValue="value"
                            class="w-full !h-11 !rounded-xl !border-slate-200/80 !bg-slate-50/70 !text-xs !font-semibold" />
                    </div>

                    <div class="w-full sm:w-48">
                        <label class="block text-[11px] font-bold text-slate-600 mb-1.5 tracking-tight flex items-center gap-1.5">
                            <i class="pi pi-users text-[10px] text-slate-400" />
                            <span>Partner</span>
                        </label>
                        <Select v-model="selectedPartner" :options="partners" optionLabel="partner_name" optionValue="id"
                            placeholder="All Partners" showClear 
                            class="w-full !h-11 !rounded-xl !border-slate-200/80 !bg-slate-50/70 !text-xs !font-semibold" />
                    </div>
                </FilterBar>

                <!-- Glow Metric Cards Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <!-- Writing Metric Card -->
                    <div @click="switchStatus('pending')" class="bg-rose-500 rounded-[2rem] p-8 text-white shadow-xl shadow-rose-200 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform">
                        <div class="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                        <div class="relative z-10">
                            <p class="text-rose-100 text-xs font-black uppercase tracking-wider">✍️ {{ t.pendingWriting }}</p>
                            <h3 class="text-4xl font-black mt-2 tracking-tight">{{ pendingWriting }}</h3>
                        </div>
                        <i class="pi pi-pencil absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-500"></i>
                    </div>

                    <!-- Speaking Metric Card -->
                    <div @click="switchStatus('pending')" class="bg-brand-primary rounded-[2rem] p-8 text-white shadow-xl shadow-rose-100 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform">
                        <div class="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                        <div class="relative z-10">
                            <p class="text-rose-100 text-xs font-black uppercase tracking-wider">🎙️ {{ t.pendingSpeaking }}</p>
                            <h3 class="text-4xl font-black mt-2 tracking-tight">{{ pendingSpeaking }}</h3>
                        </div>
                        <i class="pi pi-microphone absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-500"></i>
                    </div>

                    <!-- Total Submissions Card -->
                    <div @click="switchStatus('graded')" class="bg-slate-800 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform">
                        <div class="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                        <div class="relative z-10">
                            <p class="text-slate-400 text-xs font-black uppercase tracking-wider">📋 {{ selectedStatus === 'graded' ? 'Graded Submissions' : selectedStatus === 'pending' ? 'Pending Submissions' : 'All Submissions' }}</p>
                            <h3 class="text-4xl font-black mt-2 tracking-tight">{{ totalRecords }}</h3>
                        </div>
                        <i class="pi pi-users absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-500"></i>
                    </div>
                </div>

                <!-- Premium DataTable Card -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-6">
                    <DataTable :value="attempts" :loading="loading"
                        class="p-datatable-sm text-sm" responsiveLayout="scroll">

                        <!-- Candidate Column -->
                        <Column :header="t.colCandidate" style="min-width: 250px" class="py-4">
                            <template #body="{ data }">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-brand-primary flex items-center justify-center font-black text-sm">
                                        {{ data.student?.user?.first_name ? data.student.user.first_name[0].toUpperCase() : '?' }}
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="font-extrabold text-slate-800 text-sm">
                                            {{ data.student?.user?.first_name }} {{ data.student?.user?.last_name }}
                                        </span>
                                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">
                                            {{ t.attemptShort.replace('{id}', data.id) }}
                                        </span>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <!-- Exam Column -->
                        <Column :header="t.colExam" style="min-width: 200px">
                            <template #body="{ data }">
                                <span class="font-bold text-slate-700 text-xs leading-snug">
                                    {{ data.exam?.title || data.exam?.name || '—' }}
                                </span>
                            </template>
                        </Column>

                        <!-- Tasks Status Column -->
                        <Column :header="t.colPendingTasks" style="min-width: 260px">
                            <template #body="{ data }">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <!-- Writing Status -->
                                    <template v-if="data.has_writing">
                                        <Tag v-if="data.is_writing_graded"
                                            :value="`✓ Writing (${data.graded_writing || data.total_writing})`"
                                            severity="success"
                                            class="text-[9px] font-black px-2.5 py-1 rounded-xl shadow-xs border border-emerald-200" />
                                        <Tag v-else
                                            :value="`⏳ Writing (${data.pending_writing} pending)`"
                                            severity="warn"
                                            class="text-[9px] font-black px-2.5 py-1 rounded-xl shadow-xs border border-amber-200" />
                                    </template>
                                    <Tag v-else-if="data.pending_writing > 0"
                                        :value="`⏳ Writing (${data.pending_writing} pending)`"
                                        severity="warn"
                                        class="text-[9px] font-black px-2.5 py-1 rounded-xl shadow-xs border border-amber-200" />

                                    <!-- Speaking Status -->
                                    <template v-if="data.has_speaking">
                                        <Tag v-if="data.is_speaking_graded"
                                            :value="`✓ Speaking (${data.graded_speaking || data.total_speaking})`"
                                            severity="success"
                                            class="text-[9px] font-black px-2.5 py-1 rounded-xl shadow-xs border border-emerald-200" />
                                        <Tag v-else
                                            :value="`⏳ Speaking (${data.pending_speaking} pending)`"
                                            severity="danger"
                                            class="text-[9px] font-black px-2.5 py-1 rounded-xl shadow-xs border border-rose-200" />
                                    </template>
                                    <Tag v-else-if="data.pending_speaking > 0"
                                        :value="`⏳ Speaking (${data.pending_speaking} pending)`"
                                        severity="danger"
                                        class="text-[9px] font-black px-2.5 py-1 rounded-xl shadow-xs border border-rose-200" />

                                    <!-- Overall Completion Badge -->
                                    <span v-if="data.is_fully_graded" class="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                        ✓ Fully Graded
                                    </span>
                                    <span v-else-if="data.is_partially_graded" class="inline-flex items-center gap-1 text-[9px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                                        ⚡ Partially Graded
                                    </span>
                                </div>
                            </template>
                        </Column>

                        <!-- Submitted At Column -->
                        <Column :header="t.colSubmittedAt" style="width: 180px">
                            <template #body="{ data }">
                                <span class="text-xs font-bold text-slate-500 italic">
                                    {{ getSubmittedAt(data) }}
                                </span>
                            </template>
                        </Column>

                        <!-- Actions Column -->
                        <Column :header="t.colAction" class="text-right" style="width: 170px">
                            <template #body="{ data }">
                                <Button
                                    v-if="data.is_fully_graded"
                                    :label="t.editGrade"
                                    icon="pi pi-file-edit"
                                    @click="goToGrading(data.id)"
                                    class="rounded-xl px-4 py-2 text-xs font-black bg-slate-800 hover:bg-slate-900 text-white border-none shadow-sm hover:scale-105 transition-transform" />
                                <Button
                                    v-else-if="data.is_partially_graded"
                                    label="Continue Grading"
                                    icon="pi pi-play"
                                    @click="goToGrading(data.id)"
                                    class="rounded-xl px-4 py-2 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white border-none shadow-md shadow-purple-200 hover:scale-105 transition-transform" />
                                <Button
                                    v-else
                                    :label="t.gradeNow"
                                    icon="pi pi-pencil"
                                    @click="goToGrading(data.id)"
                                    class="rounded-xl px-5 py-2 text-xs font-black bg-brand-primary hover:bg-rose-900 text-white border-none shadow-md shadow-rose-100 hover:scale-105 transition-transform" />
                            </template>
                        </Column>

                        <!-- Empty state slot -->
                        <template #empty>
                            <div class="py-16 text-center space-y-3">
                                 <div class="text-4xl opacity-20">🎉</div>
                                 <h3 class="text-lg font-black text-slate-800">{{ t.emptyTelemetry }}</h3>
                                 <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">{{ t.emptySubtitle }}</p>
                            </div>
                        </template>
                    </DataTable>

                    <!-- Pagination -->
                    <CustomPagination :totalRecords="totalRecords" v-model:currentPage="currentPage" v-model:rowsPerPage="rowsPerPage" @pageChange="fetchPending(currentPage)" />
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 1.25rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
</style>
