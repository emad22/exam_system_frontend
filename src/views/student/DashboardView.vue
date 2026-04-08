<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const router = useRouter();
const exams = ref([]);
const student = ref(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    const [userRes, examsRes] = await Promise.all([
        api.get('/user'),
        api.get('/exams')
    ]);
    student.value = userRes.data;
    exams.value = examsRes.data;
  } catch (err) {
    console.error('Failed to load dashboard', err);
  } finally {
    isLoading.value = false;
  }
});

const startExam = async (examId) => {
  try {
    const res = await api.post(`/exams/${examId}/start`);
    router.push(`/exam/${res.data.attempt.id}`);
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to start exam');
  }
};

const getStatusColor = (status) => {
    switch(status) {
        case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'ongoing': return 'bg-amber-50 text-amber-600 border-amber-100';
        case 'voided': return 'bg-slate-50 text-slate-400 border-slate-100';
        default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
    <!-- Premium Background Decor -->
    <div class="absolute top-0 right-0 w-[700px] h-[700px] bg-indigo-100/40 rounded-full blur-[120px] -mr-80 -mt-80 pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-[100px] -ml-80 -mb-80 pointer-events-none"></div>

    <!-- Main Navigation Header -->
    <nav class="relative z-20 max-w-7xl mx-auto px-8 pt-10 flex justify-between items-center mb-16">
        <div class="flex items-center space-x-4 group cursor-pointer">
            <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 transform group-hover:rotate-6 transition-transform duration-500">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h1 class="text-2xl font-black text-slate-800 tracking-tight uppercase">ArabAcademy<span class="text-indigo-600">.</span></h1>
        </div>
        <div class="flex items-center space-x-4 bg-white/60 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/40 shadow-sm">
             <div class="text-right hidden sm:block">
                  <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-tight">ACTIVE STUDENT</p>
                  <p class="text-xs font-bold text-slate-700 uppercase tracking-wide">{{ student?.email }}</p>
             </div>
             <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-md"></div>
        </div>
    </nav>

    <!-- Main Hub Content -->
    <main class="relative z-10 max-w-7xl mx-auto px-8">
        <!-- Welcome Hero Section -->
        <header v-if="student" class="mb-20 animate-in fade-in slide-in-from-left-6 duration-1000">
            <div class="flex items-center space-x-2 text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-4">
                <span class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                <span>Adaptive Learning Session</span>
            </div>
            <h2 class="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none mb-6">
                Ready for Excellence, <br/>
                <span class="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">
                     {{ student.student?.first_name || student.name }}?
                </span>
            </h2>
            <p class="text-slate-400 font-medium text-base md:text-lg max-w-xl leading-relaxed">
                Your ACTFL-aligned evaluations are synchronized. Proceed with caution and precision—the engine adjusts to every response.
            </p>
        </header>

        <!-- Skill Matrix Indicator -->
        <div v-if="student?.student?.assigned_skills?.length > 0" class="mb-16 flex flex-wrap gap-4 animate-in fade-in duration-1000 delay-300">
             <div v-for="skillId in student.student.assigned_skills" :key="skillId" 
                  class="bg-white/40 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/60 shadow-sm flex items-center space-x-3 group hover:bg-white transition-all duration-300">
                 <div class="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-12">🎯</div>
                 <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-indigo-600 transition-colors">Cognitive Module Active</span>
             </div>
        </div>

        <!-- Assessments Grid -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
             <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
             <p class="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Constructing Dashboard...</p>
        </div>

        <div v-else-if="exams.length === 0" class="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 animate-in fade-in zoom-in">
             <div class="text-6xl mb-8 grayscale opacity-50">📑</div>
             <h3 class="text-2xl font-black text-slate-800 mb-2 tracking-tight">Queue is Currently Empty</h3>
             <p class="text-slate-400 font-medium max-w-sm mx-auto text-sm leading-relaxed">
                 Waiting for the Assessment Authority to assign your educational modules. Please synchronize with your instructor.
             </p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div v-for="exam in exams" :key="exam.id" 
                 class="premium-card p-10 group relative transition-all duration-500 flex flex-col justify-between overflow-hidden">
                
                <!-- Inner Glow -->
                <div class="absolute -right-12 -top-12 w-40 h-40 bg-indigo-50/40 rounded-full group-hover:scale-150 transition-all duration-700"></div>

                <div class="relative z-10 flex-1">
                    <div class="flex justify-between items-start mb-12">
                        <div class="bg-slate-50 text-slate-400 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-100">
                             {{ exam.language?.name }} CORE
                        </div>
                        <div v-if="exam.latest_attempt" :class="getStatusColor(exam.latest_attempt.status)" class="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border">
                             {{ exam.latest_attempt.status }}
                        </div>
                    </div>

                    <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tighter leading-tight group-hover:text-indigo-600 transition-colors duration-300">{{ exam.title }}</h3>
                    <p class="text-sm text-slate-400 font-medium mb-12 line-clamp-3 h-14 leading-relaxed italic">{{ exam.description || 'Module synchronized for current academic cycle.' }}</p>

                    <div class="flex items-center space-x-8 mb-12 border-t border-slate-50 pt-8">
                        <div class="flex flex-col">
                            <span class="text-[9px] font-black text-slate-300 tracking-[0.2em] uppercase mb-1">Architecture</span>
                            <span class="text-xs font-bold text-slate-600 uppercase tracking-wide">{{ exam.is_adaptive ? 'Adaptive Engine' : 'Static Stream' }}</span>
                        </div>
                        <div class="w-px h-8 bg-slate-100"></div>
                        <div class="flex flex-col">
                            <span class="text-[9px] font-black text-slate-300 tracking-[0.2em] uppercase mb-1">Target</span>
                            <span class="text-xs font-bold text-slate-600 uppercase tracking-wide">{{ exam.exam_type }} Profile</span>
                        </div>
                    </div>
                </div>

                <div class="relative z-10">
                    <button @click="startExam(exam.id)" 
                            :disabled="exam.latest_attempt?.status === 'completed'"
                            :class="exam.latest_attempt?.status === 'completed' ? 'bg-slate-100 text-slate-300 cursor-not-allowed border-slate-50' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:bg-indigo-700'"
                            class="w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 transform group-active:scale-95 border-2 border-transparent">
                        {{ exam.latest_attempt?.status === 'ongoing' ? 'CONTINUE ASSESSMENT ➜' : (exam.latest_attempt?.status === 'completed' ? 'EVALUATION FINALIZED' : 'INITIATE SESSION ➜') }}
                    </button>
                    
                    <p v-if="exam.latest_attempt?.status === 'completed'" class="mt-6 text-center animate-in fade-in">
                        <router-link :to="`/exam/${exam.latest_attempt.id}/result`" class="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline decoration-2 underline-offset-4 decoration-indigo-200">
                             Access Report Transcript ↗
                        </router-link>
                    </p>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer Aesthetic -->
    <footer class="max-w-7xl mx-auto px-8 py-24 text-center relative z-10">
        <div class="flex justify-center items-center space-x-6 mb-8 opacity-20">
             <div class="w-20 h-px bg-slate-400"></div>
             <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.6em]">Academic Integrity Matrix</p>
             <div class="w-20 h-px bg-slate-400"></div>
        </div>
    </footer>
  </div>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
