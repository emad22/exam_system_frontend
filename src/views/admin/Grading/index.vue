<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import api from '@/services/api'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'

const router = useRouter()
const loading = ref(false)
const attempts = ref([])
const totalRecords = ref(0)
const filters = ref({ global: { value: null, matchMode: 'contains' } })

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل المحاولات قيد التقييم...",
        title: "مركز تقييم الكتابة والمحادثة",
        subtitle: "مراجعة وتقييم إجابات الطلاب للأسئلة المقالية والتسجيلات الصوتية يدوياً",
        placeholderSearch: "البحث عن طالب...",
        pendingWriting: "كتابة معلقة",
        pendingSpeaking: "محادثة معلقة",
        studentsAwaiting: "طلاب بانتظار التقييم",
        colCandidate: "الطالب المرشح",
        colExam: "الاختبار",
        colPendingTasks: "المهام المعلقة للتقييم",
        colSubmittedAt: "تاريخ تقديم المحاولة",
        colAction: "إجراءات",
        emptyTelemetry: "عمل رائع! كل الأوراق مقيمة حالياً...",
        emptySubtitle: "لا توجد أي إجابات كتابية أو تسجيلات صوتية بانتظار المراجعة والتقييم.",
        gradeNow: "تقييم الآن",
        attemptShort: "محاولة رقم {id}",
        writingTag: "✍️ {count} مقالات معلقة",
        speakingTag: "🎙️ {count} تسجيلات معلقة"
    },
    en: {
        loading: "Loading pending student assessments...",
        title: "Writing & Speaking Hub",
        subtitle: "Review and grade productive skill submissions (essays and speech records) from students.",
        placeholderSearch: "Search candidates...",
        pendingWriting: "Pending Writing",
        pendingSpeaking: "Pending Speaking",
        studentsAwaiting: "Students Awaiting",
        colCandidate: "Candidate",
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
    }
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

const onPage = (event) => fetchPending(event.page + 1)

const goToGrading = (attemptId) => {
    router.push({ name: 'admin.grading.show', params: { id: attemptId } })
}

const pendingWriting = computed(() => attempts.value.reduce((s, a) => s + (a.pending_writing || 0), 0))
const pendingSpEaking = computed(() => attempts.value.reduce((s, a) => s + (a.pending_speaking || 0), 0))

onMounted(() => fetchPending())
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            
            <!-- Loading Indicator -->
            <div v-if="loading && attempts.length === 0" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
            </div>

            <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
                
                <!-- Premium Header Section -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 space-y-2">
                        <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                            {{ t[currentLang].title }}
                        </h1>
                        <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                            {{ t[currentLang].subtitle }}
                        </p>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-4 relative z-10">
                        <!-- Language Selector Toggle -->
                        <button @click="toggleLang" class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 font-extrabold text-xs">
                            <i class="pi pi-globe text-brand-primary"></i>
                            <span>{{ currentLang === 'ar' ? 'English' : 'العربية' }}</span>
                        </button>

                        <Button icon="pi pi-refresh" outlined rounded severity="secondary" @click="fetchPending" :loading="loading" class="bg-white/50 w-10 h-10 border border-slate-200" />
                    </div>
                </div>

                <!-- Premium Search Bar -->
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <div class="relative w-full max-w-xl">
                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                        <InputText v-model="filters['global'].value" :placeholder="t[currentLang].placeholderSearch" class="w-full pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white text-xs font-bold shadow-sm" />
                    </div>
                </div>

                <!-- Glow Metric Cards Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <!-- Writing Metric Card -->
                    <div class="bg-rose-500 rounded-[2rem] p-8 text-white shadow-xl shadow-rose-200 relative overflow-hidden group">
                        <div class="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                        <div class="relative z-10">
                            <p class="text-rose-100 text-xs font-black uppercase tracking-wider">✍️ {{ t[currentLang].pendingWriting }}</p>
                            <h3 class="text-4xl font-black mt-2 tracking-tight">{{ pendingWriting }}</h3>
                        </div>
                        <i class="pi pi-pencil absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-500"></i>
                    </div>

                    <!-- Speaking Metric Card -->
                    <div class="bg-brand-primary rounded-[2rem] p-8 text-white shadow-xl shadow-rose-100 relative overflow-hidden group">
                        <div class="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                        <div class="relative z-10">
                            <p class="text-rose-100 text-xs font-black uppercase tracking-wider">🎙️ {{ t[currentLang].pendingSpeaking }}</p>
                            <h3 class="text-4xl font-black mt-2 tracking-tight">{{ pendingSpEaking }}</h3>
                        </div>
                        <i class="pi pi-microphone absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-500"></i>
                    </div>

                    <!-- Total Pending Card -->
                    <div class="bg-slate-800 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
                        <div class="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                        <div class="relative z-10">
                            <p class="text-slate-400 text-xs font-black uppercase tracking-wider">📋 {{ t[currentLang].studentsAwaiting }}</p>
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
                        <Column :header="t[currentLang].colCandidate" style="min-width: 250px" class="py-4">
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
                                            {{ t[currentLang].attemptShort.replace('{id}', data.id) }}
                                        </span>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <!-- Exam Column -->
                        <Column :header="t[currentLang].colExam" style="min-width: 200px">
                            <template #body="{ data }">
                                <span class="font-bold text-slate-700 text-xs leading-snug">
                                    {{ data.exam?.title || data.exam?.name || '—' }}
                                </span>
                            </template>
                        </Column>

                        <!-- Pending Tasks Column -->
                        <Column :header="t[currentLang].colPendingTasks" style="min-width: 200px">
                            <template #body="{ data }">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <Tag v-if="data.pending_writing > 0"
                                        :value="t[currentLang].writingTag.replace('{count}', data.pending_writing)"
                                        severity="info" class="text-[9px] font-black px-3.5 py-1 rounded-xl shadow-sm border-none" />
                                    <Tag v-if="data.pending_speaking > 0"
                                        :value="t[currentLang].speakingTag.replace('{count}', data.pending_speaking)"
                                        severity="warn" class="text-[9px] font-black px-3.5 py-1 rounded-xl shadow-sm border-none" />
                                </div>
                            </template>
                        </Column>

                        <!-- Submitted At Column -->
                        <Column :header="t[currentLang].colSubmittedAt" style="width: 180px">
                            <template #body="{ data }">
                                <span class="text-xs font-bold text-slate-500 italic">
                                    {{ data.finished_at ? new Date(data.finished_at).toLocaleString() : '—' }}
                                </span>
                            </template>
                        </Column>

                        <!-- Actions Column -->
                        <Column :header="t[currentLang].colAction" class="text-right" style="width: 150px">
                            <template #body="{ data }">
                                <Button :label="t[currentLang].gradeNow" icon="pi pi-pencil"
                                    @click="goToGrading(data.id)"
                                    class="rounded-xl px-5 py-2 text-xs font-black bg-brand-primary border-none shadow-md shadow-rose-100 hover:scale-105 transition-transform" />
                            </template>
                        </Column>

                        <!-- Empty state slot -->
                        <template #empty>
                            <div class="py-16 text-center space-y-3">
                                 <div class="text-4xl opacity-20">🎉</div>
                                 <h3 class="text-lg font-black text-slate-800">{{ t[currentLang].emptyTelemetry }}</h3>
                                 <p class="text-xs font-bold text-slate-400 uppercase tracking-wide">{{ t[currentLang].emptySubtitle }}</p>
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
