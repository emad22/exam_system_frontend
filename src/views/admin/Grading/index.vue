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
import InputText from 'primevue/inputtext'
import CardListSkeleton from '@/components/skeletons/CardListSkeleton.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const attempts = ref([])
const totalRecords = ref(0)
const filters = ref({ global: { value: null, matchMode: 'contains' } })

const t = {
    loading: "Loading pending student assessments...",
    title: "Writing & Speaking Hub",
    subtitle: "Review and grade writing and speaking assignments.",
    placeholderSearch: "Search students...",
    pendingWriting: "Pending Writing",
    pendingSpeaking: "Pending Speaking",
    studentsAwaiting: "Students Awaiting",
    colCandidate: "Student",
    colExam: "Exam",
    colPendingTasks: "Pending Tasks",
    colSubmittedAt: "Submitted At",
    colAction: "Action",
    emptyTelemetry: "All caught up!",
    emptySubtitle: "No pending writing or speaking submissions require review.",
    gradeNow: "Grade Now",
    attemptShort: "Attempt #{id}",
    writingTag: "✍️ {count} Writing",
    speakingTag: "🎙️ {count} Speaking"
};

const fetchPending = async (page = 1) => {
    loading.value = true
    try {
        const response = await api.get('/admin/grading', { params: { page } })
        attempts.value = response.data.data
        totalRecords.value = response.data.total
    } catch (err) {
        console.error('Failed to fetch pending attempts', err)
    } finally {
        loading.value = false
    }
}

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

const onPage = (event) => fetchPending(event.page + 1)

const goToGrading = (attemptId) => {
    const isTeacher = route.path.startsWith('/teacher') || authStorage.getRole() === 'teacher';
    const routeName = isTeacher ? 'teacher.grading.show' : 'admin.grading.show';
    router.push({ name: routeName, params: { id: attemptId } })
}

const pendingWriting = computed(() => attempts.value.reduce((s, a) => s + (a.pending_writing || 0), 0))
const pendingSpeaking = computed(() => attempts.value.reduce((s, a) => s + (a.pending_speaking || 0), 0))

onMounted(() => fetchPending())
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
                        <Button icon="pi pi-refresh" outlined rounded severity="secondary" @click="fetchPending" :loading="loading" class="bg-white/50 w-10 h-10 border border-slate-200" />
                    </div>
                </div>

                <!-- Premium Search Bar -->
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <div class="relative w-full max-w-xl">
                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                        <InputText v-model="filters['global'].value" :placeholder="t.placeholderSearch" class="w-full pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-bold shadow-sm" />
                    </div>
                </div>

                <!-- Glow Metric Cards Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <!-- Writing Metric Card -->
                    <div class="bg-rose-500 rounded-[2rem] p-8 text-white shadow-xl shadow-rose-200 relative overflow-hidden group">
                        <div class="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                        <div class="relative z-10">
                            <p class="text-rose-100 text-xs font-black uppercase tracking-wider">✍️ {{ t.pendingWriting }}</p>
                            <h3 class="text-4xl font-black mt-2 tracking-tight">{{ pendingWriting }}</h3>
                        </div>
                        <i class="pi pi-pencil absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-500"></i>
                    </div>

                    <!-- Speaking Metric Card -->
                    <div class="bg-brand-primary rounded-[2rem] p-8 text-white shadow-xl shadow-rose-100 relative overflow-hidden group">
                        <div class="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                        <div class="relative z-10">
                            <p class="text-rose-100 text-xs font-black uppercase tracking-wider">🎙️ {{ t.pendingSpeaking }}</p>
                            <h3 class="text-4xl font-black mt-2 tracking-tight">{{ pendingSpeaking }}</h3>
                        </div>
                        <i class="pi pi-microphone absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-500"></i>
                    </div>

                    <!-- Total Pending Card -->
                    <div class="bg-slate-800 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
                        <div class="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                        <div class="relative z-10">
                            <p class="text-slate-400 text-xs font-black uppercase tracking-wider">📋 {{ t.studentsAwaiting }}</p>
                            <h3 class="text-4xl font-black mt-2 tracking-tight">{{ totalRecords }}</h3>
                        </div>
                        <i class="pi pi-users absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-500"></i>
                    </div>
                </div>

                <!-- Premium DataTable Card -->
                <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-6">
                    <DataTable :value="attempts" :loading="loading"
                        :paginator="true" :rows="20" :totalRecords="totalRecords" lazy @page="onPage"
                        :globalFilterFields="['student.user.first_name','student.user.last_name','exam.title']"
                        :filters="filters"
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

                        <!-- Pending Tasks Column -->
                        <Column :header="t.colPendingTasks" style="min-width: 200px">
                            <template #body="{ data }">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <Tag v-if="data.pending_writing > 0"
                                        :value="t.writingTag.replace('{count}', data.pending_writing)"
                                        severity="info" class="text-[9px] font-black px-3.5 py-1 rounded-xl shadow-sm border-none" />
                                    <Tag v-if="data.pending_speaking > 0"
                                        :value="t.speakingTag.replace('{count}', data.pending_speaking)"
                                        severity="warn" class="text-[9px] font-black px-3.5 py-1 rounded-xl shadow-sm border-none" />
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
                        <Column :header="t.colAction" class="text-right" style="width: 150px">
                            <template #body="{ data }">
                                <Button :label="t.gradeNow" icon="pi pi-pencil"
                                    @click="goToGrading(data.id)"
                                    class="rounded-xl px-5 py-2 text-xs font-black bg-brand-primary border-none shadow-md shadow-rose-100 hover:scale-105 transition-transform" />
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

.arabic-theme :deep(.p-datatable-thead > tr > th) {
    text-align: right !important;
}
.arabic-theme :deep(.p-datatable-tbody > tr > td) {
    text-align: right !important;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
</style>
