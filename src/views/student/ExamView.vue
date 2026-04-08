<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';

const route = useRoute();
const router = useRouter();
const attemptId = route.params.id;

const attempt = ref(null);
const currentSkill = ref(null);
const currentLevel = ref(null);
const questions = ref([]);
const currentIndex = ref(0);
const answers = ref([]); 

const isLoading = ref(true);
const isStarting = ref(true); // Intro screen state
const isSubmittingBatch = ref(false);
const errorMsg = ref('');

const fetchData = async () => {
    isLoading.value = true;
    try {
        const attRes = await api.get(`/attempts/${attemptId}`);
        attempt.value = attRes.data;
        
        if (attempt.value.status === 'completed') {
            router.push(`/exam/${attemptId}/result`);
            return;
        }
    } catch (err) {
        console.error('Failed to load exam data', err);
        errorMsg.value = "Unable to connect to the examination server.";
    } finally {
        isLoading.value = false;
    }
};

const beginExam = async () => {
    isStarting.value = false;
    await fetchNextBatch();
}

const fetchNextBatch = async () => {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        const res = await api.get(`/attempts/${attemptId}/next-batch`);
        if (res.data.questions && res.data.questions.length > 0) {
            currentSkill.value = res.data.skill;
            currentLevel.value = res.data.level;
            questions.value = res.data.questions;
            currentIndex.value = 0;
            // Initialize empty answers for this batch
            answers.value = questions.value.map(q => ({
                question_id: q.id,
                option_id: null,
                text_answer: ''
            }));
        } else {
            errorMsg.value = "No questions found for this level.";
        }
    } catch (err) {
        console.error('Failed to fetch next batch', err);
        errorMsg.value = err.response?.data?.error || "This section of the exam is currently unavailable.";
    } finally {
        isLoading.value = false;
    }
};

const nextQuestion = () => {
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++;
    } else {
        submitCurrentBatch();
    }
};

const submitCurrentBatch = async () => {
    isSubmittingBatch.value = true;
    try {
        const res = await api.post(`/attempts/${attemptId}/submit-batch`, {
            answers: answers.value
        });
        
        if (res.data.finished_exam) {
            router.push(`/exam/${attemptId}/result`);
        } else {
            if (res.data.skill_ended) {
                alert(`Cognitive Module [${currentSkill.value.name}] Mastery Verified. Moving to next sequence...`);
            }
            await fetchNextBatch();
        }
    } catch (err) {
        console.error('Failed to submit batch', err);
        alert('Neural connection transmission failed. Retrying...');
    } finally {
        isSubmittingBatch.value = false;
    }
};

const currentQ = computed(() => questions.value[currentIndex.value] || null);

onMounted(fetchData);
</script>

<template>
  <div class="min-h-screen bg-slate-950 font-sans text-slate-900 overflow-x-hidden relative">
    <!-- HUD Background -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[160px] -mr-80 -mt-80"></div>
        <div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[160px] -ml-80 -mb-80"></div>
    </div>

    <!-- HUD Header -->
    <header class="bg-white/5 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 overflow-hidden">
        <div class="max-w-6xl mx-auto px-10 py-6 flex justify-between items-center relative">
            <div class="flex items-center space-x-6">
                <!-- Branding Symbol -->
                <div class="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-600/20 transform rotate-3">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div>
                    <div class="flex items-center space-x-3 mb-1">
                         <span class="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Module Stream</span>
                         <div class="w-1 h-1 bg-white/20 rounded-full"></div>
                         <span class="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">ACTFL Compliant</span>
                    </div>
                    <h1 class="text-xl font-black text-white tracking-tight uppercase leading-none">
                         {{ currentSkill?.name || attempt?.exam?.title || 'EVAL_SEQ' }}
                    </h1>
                </div>
            </div>
            
            <div v-if="!isStarting && questions.length > 0" class="flex items-center space-x-12">
                <!-- HUD Telemetry -->
                <div class="hidden lg:flex space-x-8">
                     <div class="text-right">
                          <p class="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Current Mastery</p>
                          <p class="text-sm font-black text-white uppercase tracking-tighter">{{ currentLevel?.name || 'SYNC...' }}</p>
                     </div>
                     <div class="w-px h-10 bg-white/10"></div>
                     <div class="text-right">
                          <p class="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Progress Index</p>
                          <p class="text-sm font-black text-white uppercase tracking-tighter">Level {{ currentLevel?.level_number || '1' }} / 9</p>
                     </div>
                </div>

                <!-- Visual Sequence Progress -->
                <div class="flex flex-col items-end">
                    <div class="flex space-x-2 mb-2">
                        <div v-for="(q, idx) in questions" :key="q.id" 
                             :class="[
                                 idx < currentIndex ? 'bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 
                                 idx === currentIndex ? 'bg-white scale-y-125' : 'bg-white/10'
                             ]"
                             class="h-1 w-8 rounded-full transition-all duration-500">
                        </div>
                    </div>
                    <span class="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Batch Sequence Analysis</span>
                </div>
            </div>
        </div>
        <!-- Progress Line (Batch Overall) -->
        <div v-if="!isStarting && questions.length > 0" class="h-[1px] w-full bg-white/5 relative">
             <div class="absolute inset-y-0 left-0 bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.8)] transition-all duration-1000" 
                  :style="{ width: `${((currentIndex + 1) / questions.length) * 100}%` }"></div>
        </div>
    </header>

    <main class="max-w-4xl mx-auto px-8 py-16 relative z-10">
        <!-- Loading State (HUD Overlay) -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-32 space-y-8 animate-in fade-in duration-700">
            <div class="relative">
                 <div class="w-24 h-24 border-2 border-white/5 border-t-indigo-600 rounded-full animate-spin"></div>
                 <div class="absolute inset-0 flex items-center justify-center text-xs font-black text-indigo-500">SYNC</div>
            </div>
            <p class="text-white/20 font-black uppercase tracking-[0.5em] text-[10px] animate-pulse">Establishing High-Frequency Connection...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="errorMsg" class="flex flex-col items-center justify-center py-24 text-center space-y-10 animate-in zoom-in duration-500">
             <div class="w-24 h-24 bg-red-500/10 text-red-500 rounded-[2rem] border border-red-500/20 flex items-center justify-center text-4xl shadow-2xl shadow-red-500/10">🚧</div>
             <div>
                  <h2 class="text-3xl font-black text-white mb-4 tracking-tight uppercase">Segment Unreachable</h2>
                  <p class="text-white/40 font-bold max-w-sm mx-auto text-xs uppercase tracking-widest leading-relaxed">
                      {{ errorMsg }} <br>
                      The intelligence pool for this difficulty level has not been populated.
                  </p>
             </div>
             <router-link to="/dashboard" class="bg-indigo-600 text-white font-black px-12 py-5 rounded-2xl shadow-2xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 transition-all uppercase tracking-widest text-[10px]">
                 Emergency Extraction ➜
             </router-link>
        </div>

        <!-- 1. Intro / HUD Readiness Screen -->
        <div v-else-if="isStarting && attempt" class="animate-in fade-in slide-in-from-bottom-8 duration-1000">
             <div class="bg-white/5 backdrop-blur-2xl rounded-[4rem] border border-white/10 p-12 md:p-20 shadow-[0_32px_120px_rgba(0,0,0,0.5)] group overflow-hidden relative">
                  <!-- Decorative Element -->
                  <div class="absolute -right-32 -top-32 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>

                  <div class="relative z-10 text-center mb-16">
                       <div class="w-20 h-20 bg-indigo-600/10 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-10 text-3xl shadow-inner border border-indigo-500/20">
                            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-4.04-10.484c.54-.313 1.233-.066 1.554.432l1.642 2.528A4.186 4.186 0 0110 14V3.97L12 3m0 0l2 2m-2-2v8.28c0 .324.084.642.245.922l.745 1.291m0 0L17.5 13m-2.5 2.5l2 2M15 13v8.5m-1.5-12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                       </div>
                       <h2 class="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight uppercase leading-none">{{ attempt.exam.title }}</h2>
                       <p class="text-white/30 font-bold max-w-lg mx-auto text-sm leading-relaxed tracking-wide italic">"{{ attempt.exam.description || 'Module synchronized for current academic cycle. Adaptive engine engaged.' }}"</p>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                       <div class="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                            <h4 class="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-4">Target Matrix</h4>
                            <div class="space-y-4">
                                 <div v-for="skillId in attempt.student.assigned_skills" :key="skillId" class="flex items-center space-x-4 group/skill">
                                      <div class="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-600/20 group-hover/skill:rotate-12 transition-transform">✓</div>
                                      <span class="text-xs font-black text-white/60 uppercase tracking-widest">MODULE ACTIVE: {{ skillId }}</span>
                                 </div>
                            </div>
                       </div>
                       <div class="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-8">
                            <h4 class="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-4">Core Engine</h4>
                            <div class="space-y-6">
                                 <div class="flex flex-col">
                                      <span class="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Architecture</span>
                                      <span class="text-sm font-black text-indigo-500 uppercase tracking-tighter">{{ attempt.exam.is_adaptive ? 'ADAPTIVE_PRECISION' : 'FIXED_STREAM' }}</span>
                                 </div>
                                 <div class="flex flex-col">
                                      <span class="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Evaluation Path</span>
                                      <span class="text-sm font-black uppercase text-white/60 tracking-tighter">MULTI-STAGE MASTERY [1-9]</span>
                                 </div>
                            </div>
                       </div>
                  </div>

                  <div class="space-y-6">
                       <button @click="beginExam" class="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:shadow-[0_30px_70px_rgba(79,70,229,0.4)] hover:-translate-y-1 active:scale-95 transition-all duration-300 uppercase tracking-[0.3em] text-xs">
                            Initiate Core Sequence ➜
                       </button>
                       <p class="text-center text-[9px] font-black text-white/10 uppercase tracking-[0.5em]">Identity Verified • Assessment Protocol Active</p>
                  </div>
             </div>
        </div>

        <!-- 2. Immersive Question HUD -->
        <div v-else-if="currentQ" class="animate-in fade-in slide-in-from-right-8 duration-700">
            <!-- Main Content Container -->
            <div class="bg-white rounded-[3.5rem] shadow-[0_48px_140px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100 flex flex-col min-h-[600px] relative">
                
                <!-- HUD Sidebar Decoration -->
                <div class="absolute left-0 inset-y-0 w-2 bg-indigo-600/5 hover:bg-indigo-600 transition-all duration-1000"></div>

                <div class="p-10 md:p-16 flex-1">
                    <div class="flex justify-between items-start mb-16">
                        <div class="flex flex-col">
                             <span class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Assessment Segment</span>
                             <span class="text-lg font-black text-slate-800 tracking-tighter uppercase whitespace-nowrap">{{ currentSkill?.name }}</span>
                        </div>
                        <div class="text-right">
                             <div class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Metric Potential</div>
                             <div class="text-2xl font-black text-slate-800 tracking-tighter">{{ currentQ.points }} <span class="text-[10px] text-slate-300 ml-1">PT</span></div>
                        </div>
                    </div>

                    <div class="max-w-2xl mx-auto space-y-12">
                         <h2 class="text-2xl md:text-3xl font-black text-slate-800 leading-tight tracking-tight">
                             {{ currentQ.content }}
                         </h2>

                         <!-- MCQ HUD Options -->
                         <div v-if="currentQ.type === 'mcq'" class="grid grid-cols-1 gap-5">
                             <label v-for="option in currentQ.options" :key="option.id" 
                                    :class="answers[currentIndex].option_id === option.id ? 'border-indigo-600 bg-indigo-50/50 shadow-xl shadow-indigo-100/30' : 'border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100'"
                                    class="flex items-center p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 group relative">
                                 <input type="radio" :value="option.id" v-model="answers[currentIndex].option_id" class="hidden">
                                 <div :class="answers[currentIndex].option_id === option.id ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-transparent border-slate-100'"
                                      class="w-8 h-8 rounded-2xl border-2 flex items-center justify-center mr-6 transition-all duration-300 flex-shrink-0 shadow-sm font-black text-xs">
                                     ✓
                                 </div>
                                 <span :class="answers[currentIndex].option_id === option.id ? 'text-indigo-900 font-black' : 'text-slate-500 font-bold'"
                                       class="text-lg transition-colors">{{ option.option_text }}</span>
                                 <div v-if="answers[currentIndex].option_id === option.id" class="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse transition-opacity"></div>
                             </label>
                         </div>

                         <!-- Immersive True/False -->
                         <div v-if="currentQ.type === 'true_false'" class="grid grid-cols-2 gap-8">
                              <label v-for="option in currentQ.options" :key="option.id" 
                                    :class="answers[currentIndex].option_id === option.id ? (option.option_text === 'True' ? 'border-emerald-500 bg-emerald-50/50' : 'border-rose-500 bg-rose-50/50') : 'border-slate-100 bg-slate-50/50'"
                                    class="flex flex-col items-center justify-center p-12 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-500 group">
                                 <input type="radio" :value="option.id" v-model="answers[currentIndex].option_id" class="hidden">
                                 <div :class="[
                                       option.option_text === 'True' ? 'text-emerald-500' : 'text-rose-500',
                                       answers[currentIndex].option_id === option.id ? 'scale-125' : 'opacity-30 grayscale'
                                 ]" class="text-5xl mb-6 group-hover:scale-110 transition-all duration-500">
                                      {{ option.option_text === 'True' ? '✓' : '✕' }}
                                 </div>
                                 <span class="font-black uppercase tracking-[0.3em] text-[10px] text-slate-400" :class="{'text-slate-800': answers[currentIndex].option_id === option.id}">{{ option.option_text }}</span>
                             </label>
                         </div>

                         <!-- Kinetic Short Answer -->
                         <div v-if="currentQ.type === 'short_answer'" class="relative group">
                             <input v-model="answers[currentIndex].text_answer" type="text" placeholder="TYPE RESPONSE SEQUENCE..."
                                    class="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-6 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all text-xl font-black text-slate-800 uppercase tracking-widest placeholder:text-slate-200">
                             <div class="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center opacity-0 group-focus-within:opacity-100 transition-opacity">
                                  <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                             </div>
                         </div>
                    </div>
                </div>

                <!-- HUD Footer -->
                <div class="px-10 py-8 bg-slate-50/50 border-t border-slate-50 flex justify-between items-center relative overflow-hidden">
                    <button @click="currentIndex--" :disabled="currentIndex === 0" class="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all disabled:opacity-0 active:scale-95">
                        ← REVERSE SEQUENCE
                    </button>
                    
                    <button @click="nextQuestion" :disabled="isSubmittingBatch" 
                            class="bg-indigo-600 text-white font-black px-12 py-5 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-300 hover:-translate-y-1 active:scale-95 transition-all duration-300 uppercase tracking-[0.2em] text-[10px]">
                        {{ currentIndex === questions.length - 1 ? 'COMMIT BATCH ➜' : 'ADVANCE SEQUENCE' }}
                    </button>
                </div>
            </div>

            <!-- Ambient HUD Status Info -->
            <div class="mt-10 flex items-center justify-center space-x-12 opacity-30 group">
                <div class="flex items-center space-x-3">
                     <div class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
                     <span class="text-[9px] font-black uppercase tracking-[0.4em] text-white">Neural Uplink Active</span>
                </div>
                <div class="flex items-center space-x-3">
                     <span class="text-[9px] font-black uppercase tracking-[0.4em] text-white">Encryption Locked</span>
                     <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
            </div>
        </div>
    </main>

    <!-- Global Layout Accent -->
    <div class="fixed bottom-10 right-10 opacity-5 pointer-events-none">
         <p class="text-[40px] font-black text-white uppercase origin-bottom-right -rotate-90 tracking-[1em]">ARABACADEMY</p>
    </div>
  </div>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slide-in-bottom {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
</style>