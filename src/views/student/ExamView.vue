<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';

const route = useRoute();
const router = useRouter();
const attemptId = route.params.id;

const attempt = ref(null);
const currentSkill = ref(null);
const questions = ref([]);
const currentIndex = ref(0);
const answers = ref([]);
const systemRequirements = ref([]);
const globalOffset = ref(0);       // questions answered in previous batches (this skill)
const totalSkillQuestions = ref(0); // total expected for this skill

const isLoading = ref(true);
const isStarting = ref(true); 
const isSubmittingBatch = ref(false);
const questionSubmitted = ref(false);
const errorMsg = ref('');
const checkedRequirements = ref([]);
const autoVerifiedIds = ref([]);

const canStart = computed(() => {
    const mandatoryIds = systemRequirements.value
        .filter(r => r.is_mandatory)
        .map(r => r.id);
    return mandatoryIds.every(id => checkedRequirements.value.includes(id));
});

const toggleRequirement = (id) => {
    // Don't toggle auto-verified items
    if (autoVerifiedIds.value.includes(id)) return;
    const index = checkedRequirements.value.indexOf(id);
    if (index === -1) {
        checkedRequirements.value.push(id);
    } else {
        checkedRequirements.value.splice(index, 1);
    }
};

// Auto-detect system capabilities and pre-check matching requirements
const autoVerifyRequirements = (requirements) => {
    const ua = navigator.userAgent.toLowerCase();
    const isOnline = navigator.onLine;
    const isChrome = ua.includes('chrome') && !ua.includes('edg');
    const isEdge = ua.includes('edg');
    const isDesktop = !/android|iphone|ipad|mobile/.test(ua);
    const hasMediaDevices = !!(navigator.mediaDevices);

    requirements.forEach(req => {
        const cat = req.category?.toLowerCase();
        const title = req.title?.toLowerCase();
        let verified = false;

        if (cat === 'internet' || title.includes('internet') || title.includes('connection')) {
            verified = isOnline;
        } else if (cat === 'browser' || title.includes('browser') || title.includes('chrome') || title.includes('edge')) {
            verified = (isChrome || isEdge) && isDesktop;
        } else if (cat === 'hardware' || title.includes('audio') || title.includes('sound') || title.includes('speaker')) {
            verified = hasMediaDevices;
        }

        if (verified) {
            autoVerifiedIds.value.push(req.id);
            if (!checkedRequirements.value.includes(req.id)) {
                checkedRequirements.value.push(req.id);
            }
        }
    });
};

const fetchData = async () => {
    isLoading.value = true;
    try {
        const [attRes, reqRes] = await Promise.all([
            api.get(`/attempts/${attemptId}`),
            api.get('/public/system-requirements')
        ]);
        attempt.value = attRes.data;
        systemRequirements.value = reqRes.data;
        
        // Run auto-detection after requirements are loaded
        autoVerifyRequirements(reqRes.data);
        
        if (attempt.value.status === 'completed') {
            router.push(`/exam/${attemptId}/result`);
            return;
        }
    } catch (err) {
        console.error('Failed to load exam data', err);
        errorMsg.value = "Connection lost. Please check your internet.";
    } finally {
        isLoading.value = false;
    }
};

const beginExam = async () => {
    isStarting.value = false;
    questionSubmitted.value = false;
    await fetchNextBatch();
}

const fetchNextBatch = async () => {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        const res = await api.get(`/attempts/${attemptId}/next-batch`);
        if (res.data.questions && res.data.questions.length > 0) {
            // If we're starting a new skill, reset the global offset
            if (currentSkill.value?.id !== res.data.skill?.id) {
                globalOffset.value = 0;
            }
            currentSkill.value = res.data.skill;
            // Set total questions for this skill (returned by backend)
            if (res.data.total_questions) {
                totalSkillQuestions.value = res.data.total_questions;
            }
            questions.value = res.data.questions;
            currentIndex.value = 0;
            questionSubmitted.value = false;
            
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
        errorMsg.value = err.response?.data?.error || "Assessment segment unavailable.";
    } finally {
        isLoading.value = false;
        window.scrollTo(0, 0);
    }
};

// Step 1: Student confirms their answer for the current question
const submitAnswer = () => {
    // Require an answer to be selected
    const ans = answers.value[currentIndex.value];
    if (!ans.option_id && !ans.text_answer) {
        alert('Please select an answer before submitting.');
        return;
    }
    questionSubmitted.value = true;
};

// Step 2: Advance to next question or submit the full batch
const advanceQuestion = async () => {
    questionSubmitted.value = false;
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++;
        window.scrollTo(0, 0);
    } else {
        await submitCurrentBatch();
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
            // Accumulate the answered questions count
            globalOffset.value += questions.value.length;
            await fetchNextBatch();
        }
    } catch (err) {
        console.error('Failed to submit batch', err);
        alert('Network error while saving progress. Please try again.');
    } finally {
        isSubmittingBatch.value = false;
    }
};

const currentQ = computed(() => questions.value[currentIndex.value] || null);
const displayNumber = computed(() => globalOffset.value + currentIndex.value + 1);
const displayTotal  = computed(() => totalSkillQuestions.value || '...');
const isLastQuestion = computed(() => currentIndex.value === questions.value.length - 1);

onMounted(fetchData);
</script>

<template>
  <div class="min-h-screen bg-[#FDFDFD] font-sans text-slate-900 border-t-[6px] border-[#004a99]">
    
    <!-- Academic Header (TOEFL Style) -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div class="max-w-[1600px] mx-auto px-8 py-5 flex justify-between items-center">
            
            <div class="flex items-center space-x-6">
                <div class="flex items-center space-x-3 border-r pr-6 border-slate-200">
                    <div class="w-10 h-10 bg-[#004a99] rounded-lg flex items-center justify-center text-white font-black italic">A</div>
                    <span class="text-sm font-black tracking-tight text-slate-800 uppercase">Assessment Center</span>
                </div>
                
                <div v-if="!isStarting && currentSkill">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Section</p>
                    <h1 class="text-sm font-black text-[#004a99] uppercase tracking-wide">{{ currentSkill.name }}</h1>
                </div>
            </div>

            <div v-if="!isStarting && questions.length > 0" class="flex items-center space-x-8">
                <!-- Section Name -->
                <div class="text-center hidden sm:block" v-if="currentSkill">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Section</p>
                    <p class="text-sm font-black text-[#004a99] uppercase">{{ currentSkill.name }}</p>
                </div>

                <div class="w-px h-8 bg-slate-200 hidden sm:block"></div>

                <!-- Global Question Counter -->
                <div class="text-center">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Question</p>
                    <p class="text-base font-black text-slate-800">
                        {{ displayNumber }} <span class="text-slate-300 font-medium">/</span> {{ displayTotal }}
                    </p>
                </div>

                <Button label="Exit" text severity="danger" size="small" class="font-black text-[10px] uppercase tracking-widest" @click="router.push('/dashboard')" />
            </div>
        </div>
        
        <!-- Global Progress Line -->
        <div v-if="!isStarting && questions.length > 0 && totalSkillQuestions > 0" class="h-1 w-full bg-slate-50">
            <div class="h-full bg-[#004a99] transition-all duration-700" :style="{ width: `${(displayNumber / totalSkillQuestions) * 100}%` }"></div>
        </div>
    </header>

    <main class="w-full relative z-10 transition-all duration-500">
        
        <!-- Loading -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-40">
             <div class="w-12 h-12 border-4 border-slate-100 border-t-[#004a99] rounded-full animate-spin"></div>
             <p class="mt-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Test Content...</p>
        </div>

        <!-- Error -->
        <div v-else-if="errorMsg" class="max-w-xl mx-auto py-32 text-center space-y-8 animate-in zoom-in duration-500">
             <div class="text-6xl mb-6 grayscale opacity-30">⚠️</div>
             <h2 class="text-2xl font-black text-slate-800 tracking-tight">System Notification</h2>
             <p class="text-slate-500 font-medium leading-relaxed">{{ errorMsg }}</p>
             <div class="pt-6">
                 <Button label="Return to Dashboard" severity="secondary" @click="router.push('/dashboard')" />
             </div>
        </div>

        <!-- 1. Formal Assessment Introduction (Test Booklet Style) -->
        <div v-else-if="isStarting && attempt" class="max-w-4xl mx-auto px-8 py-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
             <div class="bg-white border-2 border-slate-200 rounded-[3.5rem] p-12 md:p-24 shadow-[0_45px_150px_rgba(0,0,0,0.08)] relative overflow-hidden">
                  
                  <!-- Booklet Trim Decoration -->
                  <div class="absolute inset-y-0 left-0 w-4 bg-[#004a99]"></div>
                  <div class="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[4rem]"></div>

                  <div class="relative z-10 text-center mb-20">
                       <div class="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-10 shadow-sm">
                            <i class="pi pi-verified text-2xl text-[#004a99]"></i>
                       </div>
                       
                       <div class="flex flex-col items-center space-y-4 mb-4">
                            <span class="text-[10px] font-black text-[#004a99] uppercase tracking-[0.4em]">Official Evaluation Portal</span>
                            <div class="h-px w-20 bg-slate-200"></div>
                       </div>
                       
                       <h2 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-6">Academic Assessment Session</h2>
                       <p class="text-slate-400 font-medium max-w-lg mx-auto text-base italic leading-relaxed">"Welcome to the institutional assessment framework. Please verify your system readiness below before proceeding."</p>
                  </div>

                  <!-- Instruction Matrix -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-10 mb-20 text-left border-y border-slate-100 py-16">
                       <div class="space-y-6">
                            <h4 class="text-[10px] font-black text-slate-300 uppercase tracking-widest border-l-2 border-[#004a99] pl-4">Assessment Scope</h4>
                            <div class="space-y-4">
                                 <div v-for="skill in attempt.skills" :key="skill.id" class="flex items-center space-x-4">
                                      <div class="w-6 h-6 bg-blue-50 text-[#004a99] rounded-lg flex items-center justify-center text-[8px] font-black border border-blue-100">MT</div>
                                      <span class="text-xs font-bold text-slate-600 uppercase tracking-widest">{{ skill.name }}</span>
                                 </div>
                            </div>
                       </div>
                        <div class="space-y-6">
                            <h4 class="text-[10px] font-black text-slate-300 uppercase tracking-widest border-l-2 border-[#004a99] pl-4">System Readiness Check</h4>
                            <ul class="text-xs font-bold text-slate-400 space-y-4 list-none">
                                 <li v-for="req in systemRequirements" :key="req.id" 
                                     class="flex items-center group rounded-xl transition-colors"
                                     :class="autoVerifiedIds.includes(req.id) ? 'opacity-100' : 'cursor-pointer'"
                                     @click="toggleRequirement(req.id)">
                                      <!-- Checkbox / Auto-check indicator -->
                                      <div class="relative mr-4 shrink-0">
                                          <div :class="checkedRequirements.includes(req.id) 
                                              ? (autoVerifiedIds.includes(req.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-[#004a99] border-[#004a99]') 
                                              : 'border-slate-200 bg-white group-hover:border-slate-300'" 
                                               class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all">
                                               <i v-if="checkedRequirements.includes(req.id)" class="pi pi-check text-[10px] text-white"></i>
                                          </div>
                                      </div>
                                      <!-- Text -->
                                      <div class="flex-1">
                                           <div class="flex items-center gap-2">
                                               <span :class="checkedRequirements.includes(req.id) ? (autoVerifiedIds.includes(req.id) ? 'text-emerald-600' : 'text-[#004a99]') : 'text-slate-600'" 
                                                     class="transition-colors font-bold">{{ req.title }}</span>
                                               <span v-if="autoVerifiedIds.includes(req.id)" class="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                                                   ✓ Auto-Verified
                                               </span>
                                           </div>
                                           <p class="text-[10px] text-slate-400 mt-0.5">
                                               <span v-if="autoVerifiedIds.includes(req.id)" class="text-emerald-500">System check passed</span>
                                               <span v-else-if="req.is_mandatory" class="text-orange-400 uppercase tracking-wider">Confirm manually ↑</span>
                                               <span v-else>Optional — Please verify</span>
                                           </p>
                                      </div>
                                 </li>
                                 <li v-if="systemRequirements.length === 0" class="flex items-start text-slate-400 italic">
                                      <i class="pi pi-verified text-[10px] mt-1 mr-3 text-slate-200"></i>
                                      <div>Standard assessment protocol verified.</div>
                                 </li>
                            </ul>
                       </div>
                  </div>

                  <div class="flex flex-col items-center space-y-10">
                       <button @click="beginExam" 
                            :disabled="!canStart"
                            :class="!canStart ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none grayscale' : 'bg-[#004a99] text-white shadow-2xl shadow-blue-100 hover:shadow-blue-200 hover:-translate-y-1 active:scale-95'"
                            class="px-16 py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] transition-all duration-300">
                            Enter Official Session ➜
                       </button>
                       <div class="flex items-center space-x-6">
                           <div class="flex items-center space-x-2 grayscale opacity-40">
                                <i class="pi pi-lock-open text-[10px]"></i>
                                <span class="text-[8px] font-black uppercase tracking-widest text-slate-800">Identity Secured</span>
                           </div>
                           <div class="w-px h-3 bg-slate-200"></div>
                           <div class="flex items-center space-x-2 grayscale opacity-40">
                                <i class="pi pi-globe text-[10px]"></i>
                                <span class="text-[8px] font-black uppercase tracking-widest text-slate-800">Region Locked</span>
                           </div>
                       </div>
                  </div>
             </div>
        </div>

        <!-- THE EXAM VIEW (TOEFL Split Screen Logic) -->
        <div v-else-if="currentQ" class="h-[calc(100vh-86px)] overflow-hidden">
            
            <div :class="[currentQ.passage_content ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1']" class="grid h-full w-full">
                
                <!-- Left Pane: Passage (Pinned as in TOEFL) -->
                <div v-if="currentQ.passage_content" class="bg-white border-r border-slate-200 overflow-y-auto p-12 md:p-20 custom-scrollbar animate-in slide-in-from-left-6 duration-700">
                    <div class="max-w-3xl mx-auto">
                        <div class="flex items-center space-x-3 mb-12">
                             <div class="w-1 h-6 bg-[#004a99]"></div>
                             <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Reading Passage</span>
                        </div>
                        <div class="prose prose-slate max-w-none">
                             <div class="text-2xl font-medium text-slate-800 leading-[1.8] whitespace-pre-wrap font-serif text-justify dir-rtl pr-6">
                                 {{ currentQ.passage_content }}
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Right Pane: Question & Answers -->
                <div :class="{'bg-[#F8FAFC]': currentQ.passage_content}" class="overflow-y-auto p-12 md:p-20 flex flex-col items-center justify-start animate-in slide-in-from-right-6 duration-700">
                    <div class="w-full max-w-2xl">
                        
                        <!-- Question Header -->
                        <div class="mb-12 flex items-center justify-between">
                             <div class="text-[10px] font-black text-[#004a99] bg-blue-50 px-4 py-1.5 rounded-lg border border-blue-100 uppercase tracking-widest">
                                 {{ currentSkill?.name }} Task
                             </div>
                             <div class="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Difficulty Verified</div>
                        </div>

                        <!-- Question Content -->
                        <h2 class="text-2xl md:text-3xl font-black text-slate-800 leading-tight mb-16 tracking-tight">
                            {{ currentQ.content }}
                        </h2>

                        <!-- A. MCQ (Clean Professional List) -->
                        <div v-if="currentQ.type === 'mcq'" class="space-y-4" :class="questionSubmitted ? 'pointer-events-none' : ''">
                            <label v-for="(option, idx) in currentQ.options" :key="option.id" 
                                :class="[
                                    answers[currentIndex].option_id === option.id ? 'border-[#004a99] bg-white ring-4 ring-blue-50' : 'border-slate-200 bg-white',
                                    questionSubmitted && answers[currentIndex].option_id !== option.id ? 'opacity-40' : '',
                                    !questionSubmitted ? 'hover:border-slate-300 cursor-pointer' : 'cursor-default'
                                ]"
                                class="flex items-center p-6 rounded-2xl border-2 transition-all duration-300 group shadow-sm">
                                <input type="radio" :value="option.id" v-model="answers[currentIndex].option_id" class="hidden" :disabled="questionSubmitted">
                                
                                <div :class="answers[currentIndex].option_id === option.id ? 'bg-[#004a99] border-[#004a99] text-white' : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300'"
                                     class="w-10 h-10 rounded-xl border-2 flex items-center justify-center mr-6 transition-all duration-300 flex-shrink-0 font-black text-xs">
                                    {{ String.fromCharCode(65 + idx) }}
                                </div>
                                <span class="text-lg font-bold text-slate-700">{{ option.option_text }}</span>
                            </label>
                        </div>

                        <!-- B. True/False -->
                        <div v-if="currentQ.type === 'true_false'" class="flex gap-6" :class="questionSubmitted ? 'pointer-events-none' : ''">
                             <label v-for="option in currentQ.options" :key="option.id" 
                                :class="[
                                    answers[currentIndex].option_id === option.id ? 'border-[#004a99] bg-white ring-4 ring-blue-50' : 'border-slate-200 bg-white',
                                    questionSubmitted && answers[currentIndex].option_id !== option.id ? 'opacity-30' : '',
                                    !questionSubmitted ? 'cursor-pointer' : 'cursor-default'
                                ]"
                                class="flex-1 flex flex-col items-center justify-center p-12 rounded-[2.5rem] border-2 transition-all duration-300 group shadow-sm">
                                 <input type="radio" :value="option.id" v-model="answers[currentIndex].option_id" class="hidden" :disabled="questionSubmitted">
                                 <i :class="[
                                       option.option_text === 'True' ? 'pi pi-check-circle text-emerald-500' : 'pi pi-times-circle text-rose-500',
                                       answers[currentIndex].option_id === option.id ? 'opacity-100 scale-125' : 'opacity-20 grayscale'
                                 ]" class="text-4xl mb-4 transition-all"></i>
                                 <span class="font-black text-[10px] uppercase tracking-widest text-[#004a99]">{{ option.option_text }}</span>
                             </label>
                        </div>

                        <!-- C. Short Answer -->
                        <div v-if="currentQ.type === 'short_answer'" class="space-y-4">
                             <InputText v-model="answers[currentIndex].text_answer" placeholder="Type your answer here..." 
                                class="w-full rounded-2xl p-6 bg-white border-2 border-slate-200 text-lg font-bold text-slate-700 focus:border-[#004a99] transition-all" />
                             <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-4">Your response will be verified for master accuracy</p>
                        </div>

                        <!-- Footer: Two-Step Submit then Next -->
                        <div class="mt-20 pt-10 border-t border-slate-100">

                            <!-- STEP 1: Not yet submitted — show Submit button -->
                            <div v-if="!questionSubmitted" class="flex items-center justify-between">
                                <div class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                    سؤال {{ displayNumber }} من {{ displayTotal }}
                                </div>
                                <button @click="submitAnswer"
                                    :disabled="!answers[currentIndex]?.option_id && !answers[currentIndex]?.text_answer"
                                    class="flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 bg-[#004a99] text-white shadow-blue-100">
                                    <i class="pi pi-check-circle"></i>
                                    <span>تأكيد الإجابة</span>
                                </button>
                            </div>

                            <!-- STEP 2: Submitted — show Next or Finish -->
                            <div v-else class="flex items-center justify-between">
                                <div class="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2.5 rounded-xl">
                                    <i class="pi pi-check-circle text-sm"></i>
                                    <span class="text-[10px] font-black uppercase tracking-widest">تم تسجيل الإجابة</span>
                                </div>
                                <button @click="advanceQuestion" :disabled="isSubmittingBatch"
                                    :class="isLastQuestion
                                        ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'
                                        : 'bg-[#004a99] shadow-blue-100'"
                                    class="flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-300 disabled:opacity-50">
                                    <div v-if="isSubmittingBatch" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                                    <span>{{ isLastQuestion ? 'إنهاء القسم ➜' : 'السؤال التالي ➜' }}</span>
                                </button>
                            </div>
                        </div>


                    </div>
                </div>

            </div>

        </div>

    </main>

  </div>
</template>

<style scoped>
.prop-rtl { direction: rtl; }
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>