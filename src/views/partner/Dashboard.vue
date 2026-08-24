<script setup>
import { ref, onMounted } from 'vue';
import PartnerLayout from '@/components/PartnerLayout.vue';
import api from '@/services/api';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton.vue';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

const router = useRouter();
const stats = ref(null);
const loading = ref(true);

const t = {
    loading: "Loading Dashboard Statistics...",
    dashboardTitle: "Dashboard Overview",
    dashboardSubtitle: "Monitor partner statistics, exam activity, and real-time student performance",
    systemStatus: "System Status",
    operational: "Operational & Active",
    viewReports: "View Reports",
    totalStudents: "Total Students",
    studentSubtitle: "Total verified student registrations",
    newToday: "New Today",
    students: "Students",
    totalExams: "Total Exams",
    examSubtitle: "Active exams in the system",
    exams: "Exams",
    examAttempts: "Exam Attempts",
    attemptsSubtitle: "Total completed and ongoing exam attempts",
    weeklyStats: "Attempts This Week",
    recentActivity: "Recent Exam Activity",
    recentSubtitle: "Latest student attempts and performance logs in real-time",
    viewAllReports: "View All Reports",
    colStudent: "Student",
    colExam: "Exam",
    colStatus: "Status",
    colScore: "Score & Accuracy",
    colDate: "Date & Time",
    studentId: "Student ID",
    currentExam: "Current Exam",
    emptyRecent: "No recent exam attempts."
};

onMounted(async () => {
    try {
        const res = await api.get('/partner/stats');
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
</script>

<template>
  <PartnerLayout>
    <div v-if="loading" class="mt-6 px-4 md:px-8">
        <DashboardSkeleton />
    </div>

    <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-6 px-4 md:px-8 pb-20">
        
        <!-- Standardized Header Section -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
            <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
            <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
            
            <div class="relative z-10 space-y-1">
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">{{ t.dashboardTitle }}</h1>
                 <p class="text-xs font-bold text-slate-400 max-w-xl leading-relaxed">{{ t.dashboardSubtitle }}</p>
            </div>
            <div class="flex items-center space-x-4 relative z-10">
                 <div class="flex flex-col items-end px-5 py-1.5 border-s border-slate-100">
                     <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t.systemStatus }}</span>
                     <div class="flex items-center gap-1.5 mt-0.5">
                         <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                         <span class="text-xs font-extrabold text-emerald-600 uppercase tracking-tight">{{ t.operational }}</span>
                     </div>
                 </div>
                 <Button :label="t.viewReports" icon="pi pi-file-pdf" outlined severity="secondary" 
                         class="text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300" 
                         @click="router.push({ name: 'partner.reports' })" />
            </div>
        </div>

        <!-- Metric Hub Cards Grid -->
        <div v-if="stats" class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <!-- Stat Card 1: Students (Clickable to Student List) -->
            <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden cursor-pointer"
                 @click="router.push({ name: 'partner.students' })">
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
                          <span v-else class="text-xs font-bold text-slate-400 tracking-wider">{{ t.students }}</span>
                     </div>
                     <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">{{ t.totalStudents }}</h3>
                     <div class="text-5xl font-black text-slate-800 tracking-tight">{{ stats.stats.students.total }}</div>
                     <p class="mt-6 text-xs font-bold text-slate-400 border-t border-slate-50 pt-5 flex items-center justify-between">
                         <span class="flex items-center gap-2">
                             <i class="pi pi-check-circle text-emerald-500"></i> {{ t.studentSubtitle }}
                         </span>
                         <i class="pi pi-arrow-right text-xs text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity"></i>
                     </p>
                </div>
            </div>

           

            <!-- Stat Card 3: Attempts (Clickable to Reports) -->
            <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden cursor-pointer"
                 @click="router.push({ name: 'partner.reports' })">
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
                         <i class="pi pi-spin pi-spinner text-slate-400 opacity-70"></i> {{ stats.stats.attempts.completed }} Completed | {{ stats.stats.attempts.pending }} Pending
                     </p>
                </div>
            </div>
        </div>

        <!-- Recent Exam Activity -->
        <Card v-if="stats" class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden mt-6">
            <template #header>
                <div class="px-8 py-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                    <div>
                         <h3 class="text-xl font-black text-slate-800 tracking-tight">{{ t.recentActivity }}</h3>
                         <p class="text-xs font-bold text-slate-400 mt-1">{{ t.recentSubtitle }}</p>
                    </div>
                    <Button :label="t.viewAllReports" icon="pi pi-arrow-right" iconPos="right" text severity="info" 
                            class="text-xs font-black uppercase tracking-wider px-6 rounded-xl hover:bg-slate-50" 
                            @click="router.push({ name: 'partner.reports' })" />
                </div>
            </template>
            <template #content>
                 <DataTable :value="stats.recent_attempts" class="p-datatable-sm text-sm" responsiveLayout="scroll">
                     
                     <Column :header="t.colStudent" style="min-width: 280px">
                        <template #body="{ data }">
                            <div class="flex items-center space-x-4 py-2 group cursor-pointer" @click="router.push({ name: 'partner.reports' })">
                                 <div class="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100 shadow-sm transition-all group-hover:bg-brand-primary group-hover:text-white group-hover:rotate-6">
                                     <i class="pi pi-user text-base"></i>
                                 </div>
                                 <div class="space-y-0.5">
                                      <div class="font-extrabold text-slate-800 tracking-tight group-hover:text-brand-primary transition-colors">
                                          {{ data.student_name }}
                                      </div>
                                      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                          {{ t.studentId }}
                                      </div>
                                 </div>
                            </div>
                        </template>
                     </Column>

                     <Column :header="t.colExam" style="min-width: 240px">
                        <template #body="{ data }">
                            <div class="flex flex-col space-y-0.5">
                                <span class="text-xs font-extrabold text-slate-700 leading-tight">{{ data.exam_title }}</span>
                                <div class="flex items-center gap-1.5">
                                     <div class="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></div>
                                     <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{{ t.currentExam }}</span>
                                </div>
                            </div>
                        </template>
                     </Column>

                     <Column :header="t.colStatus" style="width: 140px">
                        <template #body="{ data }">
                            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" class="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border-none shadow-sm" />
                        </template>
                     </Column>
                     <Column :header="t.colDate" style="width: 150px" class="text-right">
                        <template #body="{ data }">
                             <div class="flex flex-col items-end px-2">
                                 <span class="text-xs font-bold text-slate-500">{{ data.created_at }}</span>
                             </div>
                        </template>
                     </Column>

                     <template #empty>
                        <div class="py-16 text-center space-y-3">
                             <div class="text-4xl opacity-20">📊</div>
                             <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t.emptyRecent }}</p>
                        </div>
                     </template>
                 </DataTable>
            </template>
        </Card>
    </div>
  </PartnerLayout>
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
:deep(.p-card .p-card-header) {
    background: transparent;
}
</style>
