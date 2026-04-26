<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Button from 'primevue/button';

const stats = ref({
    students_count: 0,
    exams_count: 0,
    attempts_count: 0,
    live_students_count: 0,
    recent_attempts: []
});
const loading = ref(true);

onMounted(async () => {
    try {
        const res = await api.get('/admin/stats');
        stats.value = res.data;
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
  <AdminLayout>
    <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
        <ProgressSpinner />
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Institutional Dashboard...</p>
    </div>

    <div v-else class="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-8 px-4 md:px-12 pb-24">
        
        <!-- Standardized Header Section -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
            <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/40 transition-all duration-1000"></div>
            <div class="relative z-10">
                 <h1 class="text-4xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Command Center</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">Institutional Oversight & Real-time Metrics</p>
            </div>
            <div class="flex items-center space-x-4 relative z-10">
                 <div class="flex flex-col items-end px-6 border-r border-slate-50">
                     <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Status</span>
                     <div class="flex items-center space-x-2">
                         <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                         <span class="text-xs font-black text-emerald-600 uppercase tracking-tighter">Operational</span>
                     </div>
                 </div>
                 <Button label="Generate Report" icon="pi pi-file-pdf" outlined severity="secondary" class="text-[10px] font-black uppercase tracking-widest px-8 rounded-2xl" @click="$router.push('/admin/reports')" />
            </div>
        </div>

        <!-- Metric Hub Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Stat Card 1 -->
            <div class="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                <div class="absolute -right-4 -top-4 w-32 h-32 bg-slate-50 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                <div class="relative z-10">
                     <div class="flex items-center justify-between mb-10">
                          <div class="w-14 h-14 bg-brand-primary rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-rose-200 group-hover:rotate-12 transition-all">
                               <i class="pi pi-users text-2xl"></i>
                          </div>
                          <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Candidate Matrix</span>
                     </div>
                     <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Institutional Reach</h3>
                     <div class="text-6xl font-black text-slate-800 tracking-tighter">{{ stats.students_count }}</div>
                     <p class="mt-8 text-[10px] font-black text-brand-primary uppercase tracking-widest border-t border-slate-50 pt-6 flex items-center">
                         <i class="pi pi-check-circle mr-2"></i> Verified Student Registrations
                     </p>
                </div>
            </div>

            <!-- Stat Card 2 -->
            <div class="bg-rose-50/50 p-10 rounded-[2.5rem] border border-brand-primary/10 group hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                <div class="absolute -right-4 -top-4 w-32 h-32 bg-brand-primary/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                <div class="relative z-10">
                     <div class="flex items-center justify-between mb-10">
                          <div class="w-14 h-14 bg-brand-accent rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-rose-100 group-hover:rotate-12 transition-all">
                               <i class="pi pi-file-edit text-2xl"></i>
                          </div>
                          <span class="text-[8px] font-black text-brand-primary/30 uppercase tracking-widest">Assessment Matrix</span>
                     </div>
                     <h3 class="text-[10px] font-black text-brand-primary/40 uppercase tracking-widest mb-2 italic">Evaluative Depth</h3>
                     <div class="text-6xl font-black text-brand-primary tracking-tighter">{{ stats.exams_count }}</div>
                     <p class="mt-8 text-[10px] font-black text-brand-primary uppercase tracking-widest border-t border-brand-primary/10 pt-6 flex items-center">
                         <i class="pi pi-cloud mr-2 text-brand-accent"></i> Deployed Assessment Units
                     </p>
                </div>
            </div>

            <!-- Stat Card 3 -->
            <div class="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                <div class="absolute -right-4 -top-4 w-32 h-32 bg-slate-50 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                <div class="relative z-10">
                     <div class="flex items-center justify-between mb-10">
                          <div class="w-14 h-14 bg-slate-800 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-slate-200 group-hover:rotate-12 transition-all">
                               <i class="pi pi-chart-line text-2xl"></i>
                          </div>
                          <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Protocol Sync</span>
                     </div>
                     <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Performance Volume</h3>
                     <div class="text-6xl font-black text-slate-800 tracking-tighter">{{ stats.attempts_count }}</div>
                     <p class="mt-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-t border-slate-50 pt-6 flex items-center">
                         <i class="pi pi-spin pi-spinner mr-2 opacity-50"></i> Total Evaluated Sessions
                     </p>
                </div>
            </div>

            <!-- Stat Card 4 (Live) -->
            <div class="bg-emerald-50/50 p-10 rounded-[2.5rem] border border-emerald-100 shadow-sm group hover:shadow-xl transition-all duration-500 relative overflow-hidden md:col-span-3">
                <div class="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                <div class="relative z-10 flex items-center justify-between">
                     <div>
                         <div class="flex items-center gap-3 mb-4">
                             <div class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                             <span class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live telemetry active</span>
                         </div>
                         <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">Real-time engagement</h3>
                         <div class="text-7xl font-black text-emerald-600 tracking-tighter">{{ stats.live_students_count }}</div>
                         <p class="mt-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Students currently performing assessments</p>
                     </div>
                     <div class="hidden md:block">
                         <i class="pi pi-bolt text-7xl text-emerald-100 group-hover:text-emerald-200 transition-colors"></i>
                     </div>
                </div>
            </div>
        </div>

        <!-- Recent Intelligence Timeline -->
        <Card class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden mt-6">
            <template #header>
                <div class="px-10 py-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                    <div>
                         <h3 class="text-2xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Recent performance signals</h3>
                         <p class="text-[10px] font-black text-brand-primary uppercase tracking-widest mt-1 opacity-80 italic">Real-time telemetry from active sessions</p>
                    </div>
                    <Button label="Audit Full Registry" icon="pi pi-arrow-right" iconPos="right" text severity="info" class="text-[10px] font-black uppercase tracking-widest px-8 rounded-2xl hover:bg-slate-50" @click="$router.push('/admin/reports')" />
                </div>
            </template>
            <template #content>
                 <DataTable :value="stats.recent_attempts" class="p-datatable-sm text-sm" responsiveLayout="scroll">
                     
                     <Column header="Institutional Entity" style="min-width: 300px">
                        <template #body="{ data }">
                            <div class="flex items-center space-x-4 py-3 group cursor-pointer" @click="$router.push(`/admin/students/${data.student_id}/show`)">
                                 <div class="w-11 h-11 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100 shadow-sm transition-all group-hover:bg-brand-primary group-hover:text-white group-hover:rotate-6">
                                     <i class="pi pi-id-card text-lg"></i>
                                 </div>
                                 <div class="space-y-1">
                                      <div class="font-black text-slate-800 uppercase tracking-tight leading-none group-hover:text-brand-primary transition-colors">{{ data.student?.first_name }} {{ data.student?.last_name }}</div>
                                      <div class="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Identity #{{ data.student_id }}</div>
                                 </div>
                            </div>
                        </template>
                     </Column>

                     <Column header="Logic Domain" style="min-width: 250px">
                        <template #body="{ data }">
                            <div class="flex flex-col space-y-1">
                                <span class="text-[10px] font-black text-slate-600 uppercase tracking-tight leading-none">{{ data.exam?.title }}</span>
                                <div class="flex items-center space-x-2">
                                     <div class="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></div>
                                     <span class="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Active Matrix Deployment</span>
                                </div>
                            </div>
                        </template>
                     </Column>

                     <Column header="Protocol Status" style="width: 150px">
                        <template #body="{ data }">
                            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" class="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl border-none shadow-sm" />
                        </template>
                     </Column>

                     <Column header="Mastery Grade" style="width: 120px" class="text-right pr-6">
                        <template #body="{ data }">
                             <div class="flex flex-col items-end">
                                 <div class="text-2xl font-black text-slate-800 tracking-tighter leading-none">{{ data.overall_score || '-' }}%</div>
                                 <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Accuracy</div>
                             </div>
                        </template>
                     </Column>

                     <Column header="Chronology" style="width: 150px" class="text-right">
                        <template #body="{ data }">
                             <div class="flex flex-col items-end px-2">
                                 <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ new Date(data.created_at).toLocaleDateString() }}</span>
                                 <span class="text-[8px] font-bold text-slate-300 uppercase italic">{{ new Date(data.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
                             </div>
                        </template>
                     </Column>

                     <template #empty>
                        <div class="p-20 text-center">
                             <div class="text-4xl mb-6 opacity-10 italic">ðŸ“¡</div>
                             <p class="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Institutional telemetry matrix empty...</p>
                        </div>
                     </template>
                 </DataTable>
            </template>
        </Card>
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
    padding: 1.5rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
}
:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
:deep(.p-card .p-card-header) {
    background: transparent;
}
</style>
