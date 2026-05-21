<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useAdminStore } from '@/stores/admin';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Button from 'primevue/button';

const adminStore = useAdminStore();
const stats = ref(null);
const loading = ref(true);

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

const toggleLang = () => {
    currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar';
    localStorage.setItem('dashboard_lang', currentLang.value);
};

const t = {
    ar: {
        loading: "جاري تحميل إحصائيات لوحة التحكم...",
        dashboardTitle: "لوحة التحكم الرئيسية",
        dashboardSubtitle: "متابعة إحصائيات النظام، نشاط الاختبارات، وأداء الطلاب في الوقت الفعلي",
        systemStatus: "حالة النظام",
        operational: "نشط ويعمل بالكامل",
        generateReport: "تصدير تقرير",
        totalStudents: "إجمالي الطلاب",
        studentSubtitle: "الطلاب المعتمدون في النظام",
        newToday: "جديد اليوم",
        studentMatrix: "سجل الطلاب",
        totalExams: "إجمالي الاختبارات",
        examSubtitle: "الاختبارات المتاحة للطلاب حالياً",
        examMatrix: "سجل الاختبارات",
        examAttempts: "محاولات الاختبار",
        attemptsSubtitle: "إجمالي محاولات الاختبار المنجزة والجارية",
        weeklyStats: "محاولات هذا الأسبوع",
        liveTelemetry: "المراقبة الحية والنشاط المباشر",
        liveSubtitle: "الطلاب النشطون حالياً",
        liveDesc: "طلاب يؤدون الاختبارات حالياً في الوقت الفعلي",
        recentActivity: "أحدث محاولات وجلسات الاختبار",
        recentSubtitle: "نتائج وتفاصيل أحدث محاولات الطلاب في الوقت الفعلي",
        auditRegistry: "عرض كافة التقارير",
        colStudent: "اسم الطالب",
        colExam: "الاختبار",
        colStatus: "حالة المحاولة",
        colScore: "الدرجة والنسبة",
        colDate: "تاريخ المحاولة",
        identityRecord: "كود الطالب / الهوية",
        activeDeployment: "اختبار تحديد المستوى",
        accuracy: "نسبة الدقة",
        emptyTelemetry: "لا توجد محاولات اختبارات مسجلة حالياً...",
        statusCompleted: "مكتمل",
        statusOngoing: "جاري التقديم",
        welcomeBack: "مرحباً بك مجدداً،"
    },
    en: {
        loading: "Loading Dashboard Statistics...",
        dashboardTitle: "Dashboard Overview",
        dashboardSubtitle: "Monitor system statistics, exam activity, and real-time student performance",
        systemStatus: "System Status",
        operational: "Operational & Active",
        generateReport: "Generate Report",
        totalStudents: "Total Students",
        studentSubtitle: "Total verified student registrations",
        newToday: "New Today",
        studentMatrix: "Student Registry",
        totalExams: "Total Exams",
        examSubtitle: "Active assessment modules deployed in the system",
        examMatrix: "Exam Directory",
        examAttempts: "Exam Attempts",
        attemptsSubtitle: "Total completed and ongoing exam attempts",
        weeklyStats: "Attempts This Week",
        liveTelemetry: "Live Telemetry & Tracking",
        liveSubtitle: "Students Online Now",
        liveDesc: "Students actively taking exams right now",
        recentActivity: "Recent Exam Activity",
        recentSubtitle: "Latest student attempts and performance logs in real-time",
        auditRegistry: "View All Reports",
        colStudent: "Student",
        colExam: "Exam",
        colStatus: "Status",
        colScore: "Score & Accuracy",
        colDate: "Date & Time",
        identityRecord: "Student Code / ID",
        activeDeployment: "Placement Exam",
        accuracy: "Accuracy",
        emptyTelemetry: "No recent exam attempts recorded yet...",
        statusCompleted: "Completed",
        statusOngoing: "Ongoing",
        welcomeBack: "Welcome back,"
    }
};

onMounted(async () => {
    try {
        const res = await api.get('/admin/stats');
        stats.value = res.data.data;
    } catch (err) {
        console.error("Error loading stats", err);
    } finally {
        loading.value = false;
    }
});

const getStatusSeverity = (status) => {
    switch(status) {
        case 'completed': return 'success';
        case 'ongoing': return 'warn';
        default: return 'secondary';
    }
}

const translateStatus = (status) => {
    if (status === 'completed') return t[currentLang.value].statusCompleted;
    if (status === 'ongoing') return t[currentLang.value].statusOngoing;
    return status;
};
</script>

<template>
  <AdminLayout>
    <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
      
      <!-- Loading Indicator -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
          <ProgressSpinner />
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
      </div>

      <!-- Main Dashboard Content -->
      <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
          
          <!-- Premium Header Section -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
              <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
              <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
              
              <div class="relative z-10 space-y-2">
                   <div class="flex items-center gap-2 text-xs font-extrabold text-brand-primary uppercase tracking-wider">
                        <i class="pi pi-sparkles text-brand-accent"></i>
                        <span>{{ t[currentLang].welcomeBack }} {{ adminStore.user?.first_name || 'Admin' }}</span>
                   </div>
                   <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                       {{ t[currentLang].dashboardTitle }}
                   </h1>
                   <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                       {{ t[currentLang].dashboardSubtitle }}
                   </p>
              </div>
              
              <div class="flex flex-wrap items-center gap-4 relative z-10">
                   

                   <!-- System Status badge -->
                   <div class="flex flex-col items-end px-5 py-1.5 border-s border-slate-100">
                       <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].systemStatus }}</span>
                       <div class="flex items-center gap-1.5 mt-0.5">
                           <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                           <span class="text-xs font-extrabold text-emerald-600 uppercase tracking-tight">{{ t[currentLang].operational }}</span>
                       </div>
                   </div>

                   <!-- Action Button -->
                   <Button :label="t[currentLang].generateReport" icon="pi pi-file-pdf" outlined severity="secondary" 
                           class="text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300" 
                           @click="$router.push({ name: adminStore.user?.role === 'teacher' ? 'teacher.reports' : 'admin.reports' })" />
              </div>
          </div>

          <!-- Metric Cards Grid -->
          <div v-if="stats" class="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <!-- Stat Card 1: Students -->
              <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
                  <div class="absolute -right-4 -top-4 w-28 h-28 bg-rose-50/30 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                  <div class="relative z-10">
                       <div class="flex items-center justify-between mb-8">
                            <div class="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-rose-200 group-hover:rotate-6 transition-all duration-300">
                                 <i class="pi pi-users text-xl"></i>
                            </div>
                            <span v-if="stats.stats.students.today > 0" class="bg-emerald-50 text-emerald-600 text-xs font-extrabold px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                +{{ stats.stats.students.today }} {{ t[currentLang].newToday }}
                            </span>
                            <span v-else class="text-xs font-bold text-slate-400 tracking-wider">{{ t[currentLang].studentMatrix }}</span>
                       </div>
                       <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">{{ t[currentLang].totalStudents }}</h3>
                       <div class="text-5xl font-black text-slate-800 tracking-tight">{{ stats.stats.students.total }}</div>
                       <p class="mt-6 text-xs font-bold text-slate-400 border-t border-slate-50 pt-5 flex items-center gap-2">
                           <i class="pi pi-check-circle text-emerald-500"></i> {{ t[currentLang].studentSubtitle }}
                       </p>
                  </div>
              </div>

              <!-- Stat Card 2: Exams -->
              <div class="bg-rose-50/30 p-8 rounded-[2rem] border border-rose-500/10 group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
                  <div class="absolute -right-4 -top-4 w-28 h-28 bg-brand-primary/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                  <div class="relative z-10">
                       <div class="flex items-center justify-between mb-8">
                            <div class="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-md shadow-rose-100 group-hover:rotate-6 transition-all duration-300">
                                 <i class="pi pi-file-edit text-xl"></i>
                            </div>
                            <span v-if="stats.stats.exams.today > 0" class="bg-brand-primary/10 text-brand-primary text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>
                                +{{ stats.stats.exams.today }} {{ t[currentLang].newToday }}
                            </span>
                            <span v-else class="text-xs font-bold text-brand-primary/40 tracking-wider">{{ t[currentLang].examMatrix }}</span>
                       </div>
                       <h3 class="text-xs font-extrabold text-brand-primary/60 uppercase tracking-wider mb-1">{{ t[currentLang].totalExams }}</h3>
                       <div class="text-5xl font-black text-brand-primary tracking-tight">{{ stats.stats.exams.total }}</div>
                       <p class="mt-6 text-xs font-bold text-brand-primary/50 border-t border-brand-primary/10 pt-5 flex items-center gap-2">
                           <i class="pi pi-cloud text-brand-accent"></i> {{ t[currentLang].examSubtitle }}
                       </p>
                  </div>
              </div>

              <!-- Stat Card 3: Attempts -->
              <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
                  <div class="absolute -right-4 -top-4 w-28 h-28 bg-slate-50 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                  <div class="relative z-10">
                       <div class="flex items-center justify-between mb-8">
                            <div class="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-md shadow-slate-200 group-hover:rotate-6 transition-all duration-300">
                                 <i class="pi pi-chart-line text-xl"></i>
                            </div>
                            <span class="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                {{ stats.stats.attempts.last_7_days }} {{ t[currentLang].weeklyStats }}
                            </span>
                       </div>
                       <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">{{ t[currentLang].examAttempts }}</h3>
                       <div class="text-5xl font-black text-slate-800 tracking-tight">{{ stats.stats.attempts.total }}</div>
                       <p class="mt-6 text-xs font-bold text-slate-400 border-t border-slate-50 pt-5 flex items-center gap-2">
                           <i class="pi pi-spin pi-spinner text-slate-400 opacity-70"></i> {{ t[currentLang].attemptsSubtitle }}
                       </p>
                  </div>
              </div>

              <!-- Stat Card 4 (Live Online Students Telemetry) -->
              <div class="bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-500/10 shadow-sm group hover:shadow-xl transition-all duration-500 relative overflow-hidden md:col-span-3">
                  <div class="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                  <div class="relative z-10 flex items-center justify-between">
                       <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <div class="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse border-4 border-emerald-200"></div>
                                <span class="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">{{ t[currentLang].liveTelemetry }}</span>
                            </div>
                            <h3 class="text-sm font-extrabold text-slate-500 uppercase tracking-wider">{{ t[currentLang].liveSubtitle }}</h3>
                            <div class="text-6xl font-black text-emerald-600 tracking-tight">{{ stats.stats.live }}</div>
                            <p class="text-xs font-bold text-slate-500 mt-2">{{ t[currentLang].liveDesc }}</p>
                       </div>
                       <div class="hidden md:block">
                            <i class="pi pi-bolt text-7xl text-emerald-200/50 group-hover:text-emerald-300/60 group-hover:scale-110 transition-all duration-500"></i>
                       </div>
                  </div>
              </div>
          </div>

          <!-- Recent Performance Signals Table -->
          <Card v-if="stats" class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden mt-6 bg-white">
              <template #header>
                  <div class="px-8 py-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0 w-full">
                      <div class="space-y-1">
                           <h3 class="text-xl font-black text-slate-800 tracking-tight">
                               {{ t[currentLang].recentActivity }}
                           </h3>
                           <p class="text-xs font-bold text-brand-primary opacity-80 leading-relaxed">
                               {{ t[currentLang].recentSubtitle }}
                           </p>
                      </div>
                      <Button :label="t[currentLang].auditRegistry" icon="pi pi-arrow-right" iconPos="right" text severity="info" 
                              class="text-xs font-extrabold uppercase tracking-wider px-6 py-2 rounded-xl hover:bg-slate-50 transition-all duration-300" 
                              @click="$router.push({ name: adminStore.user?.role === 'teacher' ? 'teacher.reports' : 'admin.reports' })" />
                  </div>
              </template>
              
              <template #content>
                   <div class="overflow-x-auto w-full no-scrollbar">
                       <DataTable :value="stats.recent_attempts" class="p-datatable-sm text-sm" responsiveLayout="scroll">
                           
                           <!-- Student Column -->
                           <Column :header="t[currentLang].colStudent" style="min-width: 250px">
                              <template #body="{ data }">
                                  <div class="flex items-center gap-4 py-2 group cursor-pointer">
                                       <div class="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100 shadow-sm transition-all duration-300 group-hover:bg-brand-primary group-hover:text-white group-hover:rotate-6">
                                           <i class="pi pi-id-card text-base"></i>
                                       </div>
                                       <div class="space-y-0.5">
                                            <div class="font-extrabold text-slate-800 tracking-tight group-hover:text-brand-primary transition-colors">
                                                {{ data.student_name }}
                                            </div>
                                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {{ t[currentLang].identityRecord }}
                                            </div>
                                       </div>
                                  </div>
                              </template>
                           </Column>

                           <!-- Exam Column -->
                           <Column :header="t[currentLang].colExam" style="min-width: 220px">
                              <template #body="{ data }">
                                  <div class="flex flex-col space-y-0.5">
                                      <span class="text-xs font-extrabold text-slate-700 leading-tight">{{ data.exam_title }}</span>
                                      <div class="flex items-center gap-1.5">
                                           <div class="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></div>
                                           <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{{ t[currentLang].activeDeployment }}</span>
                                      </div>
                                  </div>
                              </template>
                           </Column>

                           <!-- Status Column -->
                           <Column :header="t[currentLang].colStatus" style="width: 140px">
                              <template #body="{ data }">
                                  <Tag :value="translateStatus(data.status)" :severity="getStatusSeverity(data.status)" class="text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border-none shadow-sm" />
                              </template>
                           </Column>

                           <!-- Score Column -->
                           <Column :header="t[currentLang].colScore" style="width: 140px" class="text-right">
                              <template #body="{ data }">
                                   <div class="flex flex-col items-end">
                                       <div class="text-xl font-black text-slate-800 tracking-tight">
                                          {{ data.total_score }}
                                       </div>
                                       <div class="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">{{ data.avg_score }}% {{ t[currentLang].accuracy }}</div>
                                   </div>
                              </template>
                           </Column>

                           <!-- Date Column -->
                           <Column :header="t[currentLang].colDate" style="width: 140px" class="text-right">
                              <template #body="{ data }">
                                   <div class="flex flex-col items-end">
                                       <span class="text-xs font-bold text-slate-500">{{ data.created_at }}</span>
                                   </div>
                              </template>
                           </Column>

                           <!-- Empty state inside table -->
                           <template #empty>
                              <div class="py-16 text-center space-y-3">
                                   <div class="text-4xl opacity-20">📡</div>
                                   <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].emptyTelemetry }}</p>
                              </div>
                           </template>
                       </DataTable>
                   </div>
              </template>
          </Card>
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

/* Fix table header alignment in RTL */
.arabic-theme :deep(.p-datatable-thead > tr > th) {
    text-align: right !important;
}
.arabic-theme :deep(.p-datatable-tbody > tr > td) {
    text-align: right !important;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
:deep(.p-card .p-card-header) {
    background: transparent;
}
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
