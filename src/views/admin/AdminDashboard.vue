<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useAdminStore } from '@/stores/admin';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton.vue';
import Button from 'primevue/button';

const adminStore = useAdminStore();
const stats = ref(null);
const liveStudents = ref([]);
const loading = ref(true);
const loadingLiveStudents = ref(false);
let refreshInterval = null;

const t = {
    loading: "Loading Dashboard Statistics...",
    dashboardTitle: "Dashboard Overview",
    dashboardSubtitle: "Monitor system statistics, exam activity, and real-time student performance",
    systemStatus: "System Status",
    operational: "Operational & Active",
    generateReport: "Generate Report",
    totalStudents: "Total Students",
    studentSubtitle: "Total verified student registrations",
    newToday: "New Today",
    studentMatrix: "Students",
    totalExams: "Total Exams",
    examSubtitle: "Active exams in the system",
    examMatrix: "Exams",
    examAttempts: "Exam Attempts",
    attemptsSubtitle: "Total completed and ongoing exam attempts",
    weeklyStats: "Attempts This Week",
    liveTelemetry: "Live Students",
    liveSubtitle: "Students Online Now",
    liveDesc: "Students actively taking exams right now",
    liveStudentsTitle: "Students Currently Taking Exams",
    liveStudentsSubtitle: "Real-time list of students actively taking exams",
    recentActivity: "Recent Exam Activity",
    recentSubtitle: "Latest student attempts and performance logs in real-time",
    auditRegistry: "View All Reports",
    colStudent: "Student",
    colEmail: "Email",
    colExam: "Exam",
    colLevel: "Level",
    colDuration: "Duration",
    colLastActivity: "Last Activity",
    colStatus: "Status",
    colScore: "Score & Accuracy",
    colDate: "Date & Time",
    identityRecord: "Student ID",
    activeDeployment: "Current Exam",
    accuracy: "Accuracy",
    emptyTelemetry: "No recent exam attempts.",
    emptyLiveStudents: "No students are currently taking exams",
    statusCompleted: "Completed",
    statusOngoing: "Ongoing",
    welcomeBack: "Welcome back,",
    minutesAgo: "minute(s) ago",
    justNow: "Just now"
};

// Fetch data function
const fetchData = async () => {
    try {
        const statsRes = await api.get('/admin/stats');
        stats.value = statsRes.data?.stats ? statsRes.data : (statsRes.data?.data ?? statsRes.data);
    } catch (err) {
        console.error("Error loading stats", err);
        stats.value = null;
    }
    
    try {
        const liveRes = await api.get('/admin/live-students');
        liveStudents.value = liveRes.data?.data ?? (Array.isArray(liveRes.data) ? liveRes.data : []);
    } catch (err) {
        console.error("Error loading live students", err);
        liveStudents.value = [];
    }
    
    loading.value = false;
};

// Refresh live students only (without full reload)
const refreshLiveStudents = async () => {
    try {
        const liveRes = await api.get('/admin/live-students');
        liveStudents.value = liveRes.data?.data ?? (Array.isArray(liveRes.data) ? liveRes.data : []);
    } catch (err) {
        console.error("Error refreshing live students", err);
    }
};

onMounted(() => {
    fetchData();
    
    // Auto-refresh live students every 5 seconds
    refreshInterval = setInterval(() => {
        refreshLiveStudents();
        // Also refresh stats every 30 seconds
        if (Math.random() > 0.8) {
            api.get('/admin/stats').then(res => {
                stats.value = res.data?.stats ? res.data : (res.data?.data ?? res.data);
            }).catch(err => console.error("Error refreshing stats", err));
        }
    }, 5000);
});

onUnmounted(() => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
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
    if (status === 'completed') return t.statusCompleted;
    if (status === 'ongoing') return t.statusOngoing;
    return status;
};
</script>

<template>
  <AdminLayout>
        <div class="w-full">
      
      <!-- Loading Skeleton UI -->
      <div v-if="loading" class="mt-6 px-4 md:px-8">
          <DashboardSkeleton />
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
                        <span>{{ t.welcomeBack }} {{ adminStore.user?.first_name || 'Admin' }}</span>
                   </div>
                   <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                       {{ t.dashboardTitle }}
                   </h1>
                   <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">
                       {{ t.dashboardSubtitle }}
                   </p>
              </div>
              
              <div class="flex flex-wrap items-center gap-4 relative z-10">
                  <!-- System Status badge -->
                  <div class="flex flex-col items-end px-5 py-1.5 border-s border-slate-100">
                      <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t.systemStatus }}</span>
                      <div class="flex items-center gap-1.5 mt-0.5">
                          <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                          <span class="text-xs font-extrabold text-emerald-600 uppercase tracking-tight">{{ t.operational }}</span>
                      </div>
                  </div>

                  <!-- Action Button -->
                  <Button :label="t.generateReport" icon="pi pi-file-pdf" outlined severity="secondary"
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
                                +{{ stats.stats.students.today }} {{ t.newToday }}
                            </span>
                            <span v-else class="text-xs font-bold text-slate-400 tracking-wider">{{ t.studentMatrix }}</span>
                       </div>
                       <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">{{ t.totalStudents }}</h3>
                       <div class="text-5xl font-black text-slate-800 tracking-tight">{{ stats.stats.students.total }}</div>
                       <p class="mt-6 text-xs font-bold text-slate-400 border-t border-slate-50 pt-5 flex items-center gap-2">
                           <i class="pi pi-check-circle text-emerald-500"></i> {{ t.studentSubtitle }}
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
                                +{{ stats.stats.exams.today }} {{ t.newToday }}
                            </span>
                            <span v-else class="text-xs font-bold text-brand-primary/40 tracking-wider">{{ t.examMatrix }}</span>
                       </div>
                       <h3 class="text-xs font-extrabold text-brand-primary/60 uppercase tracking-wider mb-1">{{ t.totalExams }}</h3>
                       <div class="text-5xl font-black text-brand-primary tracking-tight">{{ stats.stats.exams.total }}</div>
                       <p class="mt-6 text-xs font-bold text-brand-primary/50 border-t border-brand-primary/10 pt-5 flex items-center gap-2">
                           <i class="pi pi-cloud text-brand-accent"></i> {{ t.examSubtitle }}
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
                                {{ stats.stats.attempts.last_7_days }} {{ t.weeklyStats }}
                            </span>
                       </div>
                       <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">{{ t.examAttempts }}</h3>
                       <div class="text-5xl font-black text-slate-800 tracking-tight">{{ stats.stats.attempts.total }}</div>
                       <p class="mt-6 text-xs font-bold text-slate-400 border-t border-slate-50 pt-5 flex items-center gap-2">
                           <i class="pi pi-spin pi-spinner text-slate-400 opacity-70"></i> {{ t.attemptsSubtitle }}
                       </p>
                  </div>
              </div>

              <!-- Stat Card 4 (Live Online Students Telemetry) -->
              <div class="bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-500/10 shadow-sm group hover:shadow-xl transition-all duration-500 relative overflow-hidden md:col-span-3 cursor-pointer" @click="liveStudents = [...liveStudents]">
                  <div class="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                  <div class="relative z-10 flex items-center justify-between">
                       <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <div class="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse border-4 border-emerald-200"></div>
                                <span class="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">{{ t.liveTelemetry }}</span>
                            </div>
                            <h3 class="text-sm font-extrabold text-slate-500 uppercase tracking-wider">{{ t.liveSubtitle }}</h3>
                            <div class="text-6xl font-black text-emerald-600 tracking-tight">{{ stats.stats.live }}</div>
                            <p class="text-xs font-bold text-slate-500 mt-2">{{ t.liveDesc }}</p>
                       </div>
                       <div class="hidden md:block">
                            <i class="pi pi-bolt text-7xl text-emerald-200/50 group-hover:text-emerald-300/60 group-hover:scale-110 transition-all duration-500"></i>
                       </div>
                  </div>
              </div>
          </div>

          <!-- Live Students Table -->
          <Card v-if="liveStudents && liveStudents.length > 0" class="border border-emerald-200/50 shadow-sm rounded-[2rem] overflow-hidden mt-6 bg-white bg-gradient-to-br from-emerald-50/20 to-transparent">
              <template #header>
                  <div class="px-8 py-8 border-b border-emerald-100/50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0 w-full">
                      <div class="space-y-1">
                           <div class="flex items-center gap-2 mb-2">
                               <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                               <h3 class="text-xl font-black text-emerald-700 tracking-tight">
                                   {{ t.liveStudentsTitle }}
                               </h3>
                           </div>
                           <p class="text-xs font-bold text-emerald-600/80 leading-relaxed">
                               {{ t.liveStudentsSubtitle }} ({{ liveStudents.length }} {{ liveStudents.length === 1 ? 'student' : 'students' }})
                           </p>
                      </div>
                  </div>
              </template>
              
              <template #content>
                   <div class="overflow-x-auto w-full no-scrollbar">
                       <DataTable :value="liveStudents" class="p-datatable-sm text-sm" responsiveLayout="scroll">
                           
                           <!-- Student Column -->
                           <Column :header="t.colStudent" style="min-width: 250px">
                              <template #body="{ data }">
                                  <div class="flex items-center gap-4 py-2 group cursor-pointer">
                                       <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:rotate-6">
                                           <i class="pi pi-user text-base"></i>
                                       </div>
                                       <div class="space-y-0.5">
                                            <div class="font-extrabold text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">
                                                {{ data.student_name }}
                                            </div>
                                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {{ data.student_email }}
                                            </div>
                                       </div>
                                  </div>
                              </template>
                           </Column>

                           <!-- Exam Column -->
                           <Column :header="t.colExam" style="min-width: 200px">
                              <template #body="{ data }">
                                  <div class="flex flex-col space-y-0.5">
                                      <span class="text-xs font-extrabold text-slate-700 leading-tight">{{ data.exam_title }}</span>
                                      <div class="flex items-center gap-1.5">
                                           <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                           <span class="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">{{ t.activeDeployment }}</span>
                                      </div>
                                  </div>
                              </template>
                           </Column>

                           <!-- Level Column -->
                           <Column :header="t.colLevel" style="width: 120px">
                              <template #body="{ data }">
                                  <Tag :value="data.exam_level" severity="info" class="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border-none shadow-sm bg-sky-100 text-sky-700" />
                              </template>
                           </Column>

                           <!-- Duration Column -->
                           <Column :header="t.colDuration" style="width: 140px">
                              <template #body="{ data }">
                                   <div class="flex items-center gap-2">
                                       <i class="pi pi-clock text-slate-400 text-xs"></i>
                                       <span class="text-xs font-bold text-slate-600">{{ data.duration_minutes }} min</span>
                                   </div>
                              </template>
                           </Column>

                           <!-- Last Activity Column -->
                           <Column :header="t.colLastActivity" style="width: 140px">
                              <template #body="{ data }">
                                   <div class="flex items-center gap-2">
                                       <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                       <span class="text-xs font-bold text-slate-500">{{ data.last_activity }}</span>
                                   </div>
                              </template>
                           </Column>

                           <!-- Empty state inside table -->
                           <template #empty>
                              <div class="py-16 text-center space-y-3">
                                   <div class="text-4xl opacity-20">👥</div>
                                   <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t.emptyLiveStudents }}</p>
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
