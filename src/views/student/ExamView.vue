<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import AudioRecorder from '@/components/AudioRecorder.vue';

const route = useRoute();
const router = useRouter();
const attemptId = route.params.id;

const attempt = ref(null);
const currentSkill = ref(null);
const questions = ref([]);
const currentIndex = ref(0);
const answers = ref([]);
const systemRequirements = ref([]);
const globalOffset = ref(0);       
const totalSkillQuestions = ref(0); 
const currentLevel = ref(null);

const isLoading = ref(true);
const isStarting = ref(true); 
const isSubmittingBatch = ref(false);
const questionSubmitted = ref(false);
const errorMsg = ref('');
const checkedRequirements = ref([]);
const autoVerifiedIds = ref([]);
const audioRef = ref(null);
const isAudioPlaying = ref(false);
const hasListened = ref(false);

const syncAudioState = () => {
    if (audioRef.value) isAudioPlaying.value = !audioRef.value.paused;
};

const toggleAudioManual = async () => {
    if (!audioRef.value) return;
    try {
        if (audioRef.value.paused) await audioRef.value.play();
        else audioRef.value.pause();
    } catch (err) {
        console.error('Audio playback failed:', err);
    }
    syncAudioState();
};

const onAudioError = (e) => {
    console.error('Audio element error:', e);
    isAudioPlaying.value = false;
};

const canStart = computed(() => {
    const mandatoryIds = systemRequirements.value.filter(r => r.is_mandatory).map(r => r.id);
    return mandatoryIds.every(id => checkedRequirements.value.includes(id));
});

const toggleRequirement = (id) => {
    if (autoVerifiedIds.value.includes(id)) return;
    const index = checkedRequirements.value.indexOf(id);
    if (index === -1) checkedRequirements.value.push(id);
    else checkedRequirements.value.splice(index, 1);
};

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
        if (cat === 'internet' || title.includes('internet')) verified = isOnline;
        else if (cat === 'browser' || title.includes('chrome')) verified = (isChrome || isEdge) && isDesktop;
        else if (cat === 'hardware' || title.includes('audio')) verified = hasMediaDevices;

        if (verified) {
            autoVerifiedIds.value.push(req.id);
            if (!checkedRequirements.value.includes(req.id)) checkedRequirements.value.push(req.id);
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
        autoVerifyRequirements(reqRes.data);
        
        if (attempt.value.status === 'completed' || attempt.value.status === 'voided') {
            router.push(`/exam/${attemptId}/result`);
        }
    } catch (err) {
        errorMsg.value = "Session initialization failed.";
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
    questions.value = []; // Safety clear
    try {
        const res = await api.get(`/attempts/${attemptId}/next-batch`);
        if (res.data.questions?.length > 0) {
            currentSkill.value = res.data.skill;
            currentLevel.value = res.data.level;
            totalSkillQuestions.value = res.data.total_questions;
            questions.value = res.data.questions;
            currentIndex.value = 0;
            questionSubmitted.value = false;
            hasListened.value = false;
            
            answers.value = questions.value.map(q => ({
                question_id: q.id,
                option_id: null,
                text_answer: '',
                recorded_file: null
            }));
        } else {
            errorMsg.value = "Module content empty.";
        }
    } catch (err) {
        errorMsg.value = err.response?.data?.error || "Assessment segment unavailable.";
    } finally {
        isLoading.value = false;
        window.scrollTo(0, 0);
    }
};

const submitAnswer = () => {
    const ans = answers.value[currentIndex.value];
    const q = currentQ.value;
    let isValid = false;
    if (q.type === 'mcq' || q.type === 'true_false') isValid = !!ans.option_id;
    else if (q.type === 'speaking') isValid = !!ans.recorded_file;
    else isValid = !!ans.text_answer;

    if (!isValid) {
        alert('Please complete the task before proceeding.');
        return;
    }
    questionSubmitted.value = true;
};

const advanceQuestion = async () => {
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++;
        questionSubmitted.value = false;
        hasListened.value = false;
        window.scrollTo(0, 0);
    } else {
        await submitCurrentBatch();
    }
};

const submitCurrentBatch = async () => {
    isSubmittingBatch.value = true;
    try {
        const formData = new FormData();
        answers.value.forEach((ans, index) => {
            formData.append(`answers[${index}][question_id]`, ans.question_id);
            if (ans.option_id) formData.append(`answers[${index}][option_id]`, ans.option_id);
            if (ans.text_answer) formData.append(`answers[${index}][text_answer]`, ans.text_answer);
            if (ans.recorded_file) formData.append(`answers[${index}][audio_file]`, ans.recorded_file, `voice.webm`);
        });

        const res = await api.post(`/attempts/${attemptId}/submit-batch`, formData);
        if (res.data.finished_exam) router.push(`/exam/${attemptId}/result`);
        else if (res.data.next_step === 'dashboard') router.push('/dashboard');
        else {
            globalOffset.value += questions.value.length;
            await fetchNextBatch();
        }
    } catch (err) {
        alert('Data transmission error. Try again.');
    } finally {
        isSubmittingBatch.value = false;
    }
};

const currentQ = computed(() => questions.value[currentIndex.value] || null);
const displayNumber = computed(() => globalOffset.value + currentIndex.value + 1);
const wordCount = computed(() => (answers.value[currentIndex.value]?.text_answer || '').trim().split(/\s+/).filter(w => w).length);

const getSkillIcon = (name) => {
    name = name?.toLowerCase() || '';
    if (name.includes('listening')) return '🎧';
    if (name.includes('reading')) return '📖';
    if (name.includes('writing')) return '✍️';
    if (name.includes('speaking')) return '🗣️';
    return '🎯';
};

onMounted(fetchData);
</script>

<template>
    <div class="min-h-screen bg-[#FDFDFD] font-sans text-slate-900 selection:bg-brand-primary/10">
        
        <!-- TOEFL Header -->
        <header v-if="!isStarting && currentSkill" class="bg-white border-b border-slate-200 sticky top-0 z-[1000] shadow-sm">
            <div class="max-w-[1440px] mx-auto px-10 h-24 flex justify-between items-center">
                <div class="flex items-center space-x-10">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black text-brand-primary uppercase tracking-[0.4em] mb-2 leading-none">Standard Assessment</span>
                        <h2 class="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">
                            {{ currentSkill?.name || 'Assessment Domain' }}
                        </h2>
                    </div>
                    <div class="h-10 w-px bg-slate-200"></div>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Proficiency Band</span>
                        <span class="text-xs font-bold text-slate-600 uppercase">{{ currentLevel?.name || 'Loading...' }}</span>
                    </div>
                </div>

                <div class="flex items-center space-x-10">
                    <div class="flex items-center space-x-4 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                        <i class="pi pi-clock text-brand-primary"></i>
                        <div class="flex flex-col">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Section Time</span>
                            <span class="text-xl font-black text-slate-800 tabular-nums mt-1 leading-none">45:00</span>
                        </div>
                    </div>
                    <button @click="router.push('/dashboard')" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center border border-slate-100">
                        <i class="pi pi-times-circle text-xl"></i>
                    </button>
                </div>
            </div>
        </header>

        <main class="max-w-[1440px] mx-auto px-10 py-12">
            
            <!-- Loading -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-48">
                <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                <p class="mt-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Propagating Content Matrix...</p>
            </div>

            <!-- Start Screen -->
            <div v-else-if="isStarting" class="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div class="bg-white rounded-[3.5rem] p-16 md:p-24 border border-slate-100 shadow-[0_40px_100px_rgba(0,0,0,0.03)] text-center">
                    <div class="w-20 h-20 bg-brand-primary/5 text-brand-primary rounded-3xl flex items-center justify-center mx-auto mb-10 text-3xl">
                        <i class="pi pi-shield"></i>
                    </div>
                    <h2 class="text-5xl font-black text-slate-900 tracking-tighter mb-6 uppercase">Ready for Evaluation?</h2>
                    <p class="text-slate-400 text-lg font-medium italic mb-16 leading-relaxed">"System requirements verified. You are entering a strictly timed environment."</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-16">
                        <div class="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Components</h4>
                            <div class="space-y-4">
                                <div v-for="skill in attempt?.skills" :key="skill.id" class="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span class="text-xl">{{ getSkillIcon(skill.name) }}</span>
                                    <span class="text-[11px] font-black text-slate-700 uppercase tracking-widest">{{ skill.name }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Prerequisites</h4>
                            <div class="space-y-4">
                                <div v-for="req in systemRequirements" :key="req.id" @click="toggleRequirement(req.id)"
                                    class="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 cursor-pointer group">
                                    <span class="text-[10px] font-black text-slate-600 uppercase tracking-tight">{{ req.title }}</span>
                                    <div :class="checkedRequirements.includes(req.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-50 border-slate-200'" class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all">
                                        <i v-if="checkedRequirements.includes(req.id)" class="pi pi-check text-[8px] text-white"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button @click="beginExam" :disabled="!canStart"
                        class="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.4em] shadow-2xl hover:bg-brand-primary hover:shadow-brand-primary/20 transition-all active:scale-95 disabled:opacity-30">
                        Launch Assessment Cycle
                    </button>
                </div>
            </div>

            <!-- Exam Split Screen -->
            <div v-else-if="currentQ" class="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700 h-[700px]">
                
                <!-- Left: Stimulus -->
                <div class="lg:col-span-7 bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm overflow-y-auto custom-scrollbar flex flex-col">
                    <div class="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                        <div class="flex items-center space-x-3">
                            <div class="w-2 h-2 bg-brand-primary rounded-full"></div>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Matrix</span>
                        </div>
                        <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Index: {{ displayNumber }} / {{ totalSkillQuestions }}</span>
                    </div>

                    <div class="flex-grow prose prose-slate max-w-none">
                        <div v-if="currentQ.passage" class="space-y-6">
                            <h3 class="text-3xl font-black text-slate-800 tracking-tight leading-tight">{{ currentQ.passage.title }}</h3>
                            <p class="text-xs text-slate-300 leading-relaxed font-bold">
                                {{ currentQ.instructions || 'Review the stimulus carefully and provide your academic response.' }}
                            </p>
                            <div class="text-xl text-slate-600 leading-[1.8] font-serif text-justify whitespace-pre-wrap">{{ currentQ.passage.content }}</div>
                        </div>

                        <div v-else-if="currentQ.media_url" class="flex flex-col items-center justify-center py-20 space-y-12 h-full">
                            <div class="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center text-slate-200 border-2 border-dashed border-slate-200">
                                <i :class="currentQ.media_url.includes('.mp4') ? 'pi pi-video' : 'pi pi-volume-up'" class="text-5xl"></i>
                            </div>
                            <div class="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
                                <audio ref="audioRef" :src="currentQ.media_url" controls @play="isAudioPlaying = true" @pause="isAudioPlaying = false" @ended="hasListened = true" class="w-full h-12"></audio>
                                <p class="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Audio Channel Control</p>
                            </div>
                        </div>

                        <div v-else class="flex flex-col items-center justify-center h-full opacity-20">
                            <i class="pi pi-bolt text-6xl mb-6"></i>
                            <p class="text-xs font-black uppercase tracking-[0.4em]">Direct Engagement Protocol</p>
                        </div>
                    </div>
                </div>

                <!-- Right: Response -->
                <div class="lg:col-span-5 bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden flex flex-col">
                    <div class="absolute -right-20 -top-20 w-60 h-60 bg-brand-primary/10 rounded-full blur-[100px]"></div>
                    
                    <div class="relative z-10 flex flex-col h-full">
                        <div class="flex items-center space-x-3 mb-12">
                            <div class="w-1.5 h-1.5 bg-brand-accent rounded-full"></div>
                            <span class="text-[10px] font-black text-white/40 uppercase tracking-widest">Response Interface</span>
                        </div>

                        <div class="flex-grow space-y-10">
                            <h3 class="text-2xl font-black text-white leading-tight tracking-tight">
                                {{ currentQ.content || 'Academic Prompt Task' }}
                            </h3>
                            <p class="text-[11px] font-bold text-slate-400 italic border-l-2 border-brand-accent/30 pl-6 leading-relaxed">
                                {{ currentQ.instructions || 'Carefully review the provided material and deliver your institutional response accordingly.' }}
                            </p>

                            <div class="pt-6 space-y-4">
                                <!-- MCQ -->
                                <div v-if="currentQ.type === 'mcq' || currentQ.type === 'true_false'" class="space-y-3">
                                    <button v-for="opt in currentQ.options" :key="opt.id"
                                        @click="answers[currentIndex].option_id = opt.id"
                                        :disabled="questionSubmitted"
                                        class="w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center gap-6 group"
                                        :class="answers[currentIndex].option_id === opt.id 
                                            ? 'border-brand-accent bg-brand-accent/5' 
                                            : 'border-white/5 bg-white/5 hover:bg-white/10'">
                                        <div class="w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all"
                                            :class="answers[currentIndex].option_id === opt.id ? 'bg-brand-accent border-brand-accent' : 'border-white/20'">
                                            <i class="pi pi-check text-[10px] text-slate-900 font-black"></i>
                                        </div>
                                        <span class="font-bold text-lg">{{ opt.option_text }}</span>
                                    </button>
                                </div>

                                <!-- Writing -->
                                <div v-if="currentQ.type === 'writing'" class="space-y-4">
                                    <textarea v-model="answers[currentIndex].text_answer" :disabled="questionSubmitted"
                                        class="w-full bg-white/5 border-2 border-white/10 rounded-3xl p-8 text-lg font-medium focus:border-brand-accent transition-all min-h-[300px] outline-none"
                                        placeholder="Compose response..."></textarea>
                                    <div class="flex justify-between text-[10px] font-black text-white/20 uppercase tracking-widest px-4">
                                        <span>Words: {{ wordCount }}</span>
                                        <span>Limit: {{ currentQ.min_words || 0 }} - {{ currentQ.max_words || '∞' }}</span>
                                    </div>
                                </div>

                                <!-- Speaking -->
                                <div v-if="currentQ.type === 'speaking'" class="space-y-6">
                                    <div v-if="currentQ.media_url && !hasListened" class="p-10 bg-white/5 border border-white/10 rounded-[2.5rem] text-center space-y-6">
                                        <i class="pi pi-lock text-3xl text-brand-accent animate-pulse"></i>
                                        <p class="text-[10px] font-black text-brand-accent uppercase tracking-widest">Listen to prompt to unlock recorder</p>
                                    </div>
                                    <AudioRecorder v-else @recorded="(blob) => answers[currentIndex].recorded_file = blob"
                                        class="!bg-white/5 !border-white/10" :disabled="questionSubmitted" />
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="mt-12 pt-10 border-t border-white/5">
                            <button v-if="!questionSubmitted" @click="submitAnswer"
                                class="w-full py-6 bg-brand-accent text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                                Confirm Signal
                            </button>
                            <button v-else @click="advanceQuestion"
                                class="w-full py-6 bg-white text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                                <span>Proceed ➜</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
.animate-in { animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
</style>
