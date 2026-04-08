<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const stats = ref({
    students_count: 0,
    exams_count: 0,
    attempts_count: 0,
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

const getStatusStyles = (status) => {
    switch(status) {
        case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'ongoing': return 'bg-amber-50 text-amber-600 border-amber-100';
        default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
}
</script>

<template>
  <AdminLayout>
    <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
        <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading dashboard data...</p>
    </div>

    <div v-else class="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <!-- Stats Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Students Card -->
            <div class="premium-card p-10 group overflow-hidden relative">
                <div class="absolute -right-8 -top-8 w-32 h-32 bg-indigo-50/50 rounded-full transition-transform duration-700 group-hover:scale-150"></div>
                <div class="relative z-10">
                     <div class="flex items-center justify-between mb-8">
                          <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                               <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          </div>
                     </div>
                     <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Students</h3>
                     <div class="text-5xl font-black text-slate-800 tracking-tighter">{{ stats.students_count }}</div>
                     <p class="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-4">Enrolled Users</p>
                </div>
            </div>

            <!-- Exams Card -->
            <div class="premium-card p-10 group overflow-hidden relative">
                <div class="absolute -right-8 -top-8 w-32 h-32 bg-purple-50/50 rounded-full transition-transform duration-700 group-hover:scale-150"></div>
                <div class="relative z-10">
                     <div class="flex items-center justify-between mb-8">
                          <div class="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-100">
                               <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                     </div>
                     <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Exams</h3>
                     <div class="text-5xl font-black text-slate-800 tracking-tighter">{{ stats.exams_count }}</div>
                     <p class="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-4">Configured Templates</p>
                </div>
            </div>

            <!-- Attempts Card -->
            <div class="premium-card p-10 group overflow-hidden relative">
                <div class="absolute -right-8 -top-8 w-32 h-32 bg-emerald-50/50 rounded-full transition-transform duration-700 group-hover:scale-150"></div>
                <div class="relative z-10">
                     <div class="flex items-center justify-between mb-8">
                          <div class="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-100">
                               <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                          </div>
                     </div>
                     <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Attempts</h3>
                     <div class="text-5xl font-black text-slate-800 tracking-tighter">{{ stats.attempts_count }}</div>
                     <p class="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-4">Completed By Students</p>
                </div>
            </div>
        </div>

        <!-- Recent Activity Section -->
        <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
            <div class="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                     <h3 class="text-xl font-black text-slate-800 tracking-tight">Recent Activity</h3>
                     <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Latest Exam Attempts</p>
                </div>
                <router-link to="/admin/reports" class="bg-white border border-slate-200 text-slate-500 font-black text-[10px] tracking-widest uppercase px-6 py-3 rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition shadow-sm">
                    View All Reports →
                </router-link>
            </div>
            
            <div class="overflow-x-auto">
                 <table class="w-full text-left">
                     <thead class="bg-slate-50/30 text-slate-300 text-[10px] uppercase tracking-[0.2em] font-black">
                         <tr>
                             <th class="px-10 py-6">STUDENT</th>
                             <th class="px-10 py-6">EXAM</th>
                             <th class="px-10 py-6">STATUS</th>
                             <th class="px-10 py-6 text-right">SCORE</th>
                             <th class="px-10 py-6 text-right">DATE</th>
                         </tr>
                     </thead>
                     <tbody class="divide-y divide-slate-50 text-sm">
                         <tr v-for="attempt in stats.recent_attempts" :key="attempt.id" class="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                             <td class="px-10 py-6">
                                 <div class="flex items-center space-x-4">
                                      <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                                          {{ attempt.student?.first_name ? attempt.student.first_name[0] : 'S' }}
                                      </div>
                                      <div>
                                           <div class="font-black text-slate-700 tracking-tight">{{ attempt.student?.first_name }} {{ attempt.student?.last_name }}</div>
                                           <div class="text-[10px] font-bold text-slate-300 uppercase">Enrolled</div>
                                      </div>
                                 </div>
                             </td>
                             <td class="px-10 py-6 font-bold text-slate-500 uppercase text-xs">{{ attempt.exam?.title }}</td>
                             <td class="px-10 py-6">
                                 <span :class="getStatusStyles(attempt.status)" class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border">
                                     {{ attempt.status }}
                                 </span>
                             </td>
                             <td class="px-10 py-6 text-right">
                                  <div class="font-black text-slate-800 text-lg tracking-tighter">{{ attempt.overall_score || '-' }}%</div>
                             </td>
                             <td class="px-10 py-6 text-right font-bold text-slate-300 text-xs tracking-wide">
                                  {{ new Date(attempt.created_at).toLocaleDateString() }}
                             </td>
                         </tr>
                         <tr v-if="!stats.recent_attempts.length">
                             <td colspan="5" class="py-20 text-center">
                                  <div class="text-4xl mb-4 opacity-10">📉</div>
                                  <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No recent activity found.</p>
                             </td>
                         </tr>
                     </tbody>
                 </table>
            </div>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>