<script setup>
import { ref, onMounted } from 'vue';
import PartnerLayout from '@/components/PartnerLayout.vue';
import api from '@/services/api';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

const router = useRouter();
const stats = ref(null);
const loading = ref(true);

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
    <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
        <ProgressSpinner />
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Partner Dashboard...</p>
    </div>

    <div v-else class="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-8 px-4 md:px-12 pb-24">
        
        <!-- Standardized Header Section -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
            <div class="absolute right-0 top-0 w-64 h-64 bg-emerald-50/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-emerald-100/40 transition-all duration-1000"></div>
            <div class="relative z-10">
                 <h1 class="text-4xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Command Center</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">Partner Hub & Real-time Metrics</p>
            </div>
            <div class="flex items-center space-x-4 relative z-10">
                 <div class="flex flex-col items-end px-6 border-r border-slate-50">
                     <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Status</span>
                     <div class="flex items-center space-x-2">
                         <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                         <span class="text-xs font-black text-emerald-600 uppercase tracking-tighter">Operational</span>
                     </div>
                 </div>
                 <Button label="View Reports" icon="pi pi-file-pdf" outlined severity="secondary" class="text-[10px] font-black uppercase tracking-widest px-8 rounded-2xl" @click="router.push({ name: 'partner.reports' })" />
            </div>
        </div>

        <!-- Metric Hub Cards -->
        <div v-if="stats" class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Stat Card 1: Students -->
            <div class="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                <div class="absolute -right-4 -top-4 w-32 h-32 bg-slate-50 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                <div class="relative z-10">
                     <div class="flex items-center justify-between mb-10">
                          <div class="w-14 h-14 bg-brand-primary rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-rose-200 group-hover:rotate-12 transition-all">
                               <i class="pi pi-users text-2xl"></i>
                          </div>
                          <span v-if="stats.stats.students.today > 0" class="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest border border-emerald-100">
                              +{{ stats.stats.students.today }} Today
                          </span>
                          <span v-else class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Candidate Matrix</span>
                     </div>
                     <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Your Students</h3>
                     <div class="text-6xl font-black text-slate-800 tracking-tighter">{{ stats.stats.students.total }}</div>
                     <p class="mt-8 text-[10px] font-black text-brand-primary uppercase tracking-widest border-t border-slate-50 pt-6 flex items-center">
                         <i class="pi pi-check-circle mr-2"></i> Verified Student Registrations
                     </p>
                </div>
            </div>

            <!-- Stat Card 2: Exams -->
            <div class="bg-emerald-50/50 p-10 rounded-[2.5rem] border border-emerald-100 group hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                <div class="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                <div class="relative z-10">
                     <div class="flex items-center justify-between mb-10">
                          <div class="w-14 h-14 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-emerald-100 group-hover:rotate-12 transition-all">
                               <i class="pi pi-file-edit text-2xl"></i>
                          </div>
                          <span v-if="stats.stats.exams.today > 0" class="bg-emerald-500/10 text-emerald-600 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                              +{{ stats.stats.exams.today }} New
                          </span>
                          <span v-else class="text-[8px] font-black text-emerald-600/30 uppercase tracking-widest">Assessment Matrix</span>
                     </div>
                     <h3 class="text-[10px] font-black text-emerald-600/40 uppercase tracking-widest mb-2 italic">Exams Undertaken</h3>
                     <div class="text-6xl font-black text-emerald-600 tracking-tighter">{{ stats.stats.exams.total }}</div>
                     <p class="mt-8 text-[10px] font-black text-emerald-600 uppercase tracking-widest border-t border-emerald-100/30 pt-6 flex items-center">
                         <i class="pi pi-cloud mr-2 text-emerald-500"></i> Active Assessment Units
                     </p>
                </div>
            </div>

            <!-- Stat Card 3: Attempts -->
            <div class="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                <div class="absolute -right-4 -top-4 w-32 h-32 bg-slate-50 rounded-full group-hover:scale-150 transition-all duration-700 opacity-50"></div>
                <div class="relative z-10">
                     <div class="flex items-center justify-between mb-10">
                          <div class="w-14 h-14 bg-slate-800 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-slate-200 group-hover:rotate-12 transition-all">
                               <i class="pi pi-chart-line text-2xl"></i>
                          </div>
                          <span class="text-[8px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-widest">
                              {{ stats.stats.attempts.last_7_days }} Wkly
                          </span>
                     </div>
                     <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Performance Volume</h3>
                     <div class="text-6xl font-black text-slate-800 tracking-tighter">{{ stats.stats.attempts.total }}</div>
                     <p class="mt-8 text-[10px] font-black text-slate-500 uppercase tracking-widest border-t border-slate-50 pt-6 flex items-center">
                         <i class="pi pi-spin pi-spinner mr-2 opacity-50"></i> {{ stats.stats.attempts.completed }} Completed | {{ stats.stats.attempts.pending }} Pending
                     </p>
                </div>
            </div>
        </div>

        <!-- Recent Intelligence Timeline -->
        <Card v-if="stats" class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden mt-6">
            <template #header>
                <div class="px-10 py-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                    <div>
                         <h3 class="text-2xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Recent Student Activity</h3>
                         <p class="text-[10px] font-black text-brand-primary uppercase tracking-widest mt-1 opacity-80 italic">Real-time telemetry from active sessions</p>
                    </div>
                    <Button label="Audit Full Registry" icon="pi pi-arrow-right" iconPos="right" text severity="info" class="text-[10px] font-black uppercase tracking-widest px-8 rounded-2xl hover:bg-slate-50" @click="router.push({ name: 'partner.reports' })" />
                </div>
            </template>
            <template #content>
                 <DataTable :value="stats.recent_attempts" class="p-datatable-sm text-sm" responsiveLayout="scroll">
                     
                     <Column header="Student" style="min-width: 300px">
                        <template #body="{ data }">
                            <div class="flex items-center space-x-4 py-3 group cursor-pointer" @click="router.push({ name: 'partner.reports.show', params: { id: data.id }})">
                                 <div class="w-11 h-11 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100 shadow-sm transition-all group-hover:bg-brand-primary group-hover:text-white group-hover:rotate-6">
                                     <i class="pi pi-user text-lg"></i>
                                 </div>
                                 <div class="space-y-1">
                                      <div class="font-black text-slate-800 uppercase tracking-tight leading-none group-hover:text-brand-primary transition-colors">
                                          {{ data.student_name }}
                                      </div>
                                      <div class="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
                                          Identity Record
                                      </div>
                                 </div>
                            </div>
                        </template>
                     </Column>

                     <Column header="Assessment" style="min-width: 250px">
                        <template #body="{ data }">
                            <div class="flex flex-col space-y-1">
                                <span class="text-[10px] font-black text-slate-600 uppercase tracking-tight leading-none">{{ data.exam_title }}</span>
                                <div class="flex items-center space-x-2">
                                     <div class="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></div>
                                     <span class="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Active Matrix Deployment</span>
                                </div>
                            </div>
                        </template>
                     </Column>

                     <Column header="Status" style="width: 150px">
                        <template #body="{ data }">
                            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" class="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl border-none shadow-sm" />
                        </template>
                     </Column>

                     <Column header="Score" style="width: 150px" class="text-right pr-6">
                        <template #body="{ data }">
                             <div class="flex flex-col items-end">
                                 <div class="text-2xl font-black text-slate-800 tracking-tighter leading-none">
                                    {{ data.total_score }}
                                 </div>
                                 <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">{{ data.avg_score }}% Accuracy</div>
                             </div>
                        </template>
                     </Column>

                     <Column header="Time" style="width: 150px" class="text-right">
                        <template #body="{ data }">
                             <div class="flex flex-col items-end px-2">
                                 <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ data.created_at }}</span>
                             </div>
                        </template>
                     </Column>

                     <template #empty>
                        <div class="p-20 text-center">
                             <div class="text-4xl mb-6 opacity-10 italic">📡</div>
                             <p class="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">No recent activity found...</p>
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
