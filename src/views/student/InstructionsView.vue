<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';
import StudentHeader from '@/components/StudentHeader.vue';

const route = useRoute();
const router = useRouter();
const examId = route.params.examId;
const skillId = route.params.skillId;
const levelId = route.params.levelId;

const skill = ref(null);
const isLoading = ref(true);

const fetchSkillData = async () => {
    isLoading.value = true;
    try {
        const res = await api.get(`/exams/${examId}`);
        const foundSkill = res.data.skills.find(s => String(s.id) === String(skillId));
        skill.value = foundSkill;
    } catch (err) {
        console.error('Failed to fetch skill instructions', err);
    } finally {
        isLoading.value = false;
    }
};

const startExam = () => {
    router.push({
        name: 'exam.setup',
        params: {
            examId,
            skillId,
            levelId
        }
    });
};

const goBack = () => {
    router.push('/skill-selection');
};

onMounted(fetchSkillData);

const skillMap = {
    'listening': 'Listening',
    'reading': 'Reading',
    'grammar': 'Structure',
    'structure': 'Structure',
    'writing': 'Writing',
    'speaking': 'Speaking'
};

const getSkillDisplayName = (name) => {
    if (!name) return 'Skill Assessment';
    const lowerName = name.toLowerCase().replace('writting', 'writing');
    const matchedKey = Object.keys(skillMap).find(key => lowerName.includes(key));
    return matchedKey ? skillMap[matchedKey] : name;
};

const SKILL_SPECIFIC_INSTRUCTIONS = {
    listening: {
        title: 'Listening Test',
        subtitle: 'Get ready to assess your listening skills.',
        isAdaptive: true,
        icon: 'pi pi-headphones',
        overviewSubtitle: 'The Listening Test includes a variety of audio materials:',
        overviewCards: [
            { title: 'Short sentences', icon: 'pi pi-comment' },
            { title: 'Dialogues', icon: 'pi pi-comments' },
            { title: 'Academic discussions', icon: 'pi pi-graduation-cap' },
            { title: 'Notes allowed while listening', icon: 'pi pi-pencil font-bold' }
        ],
        tips: [
            '<strong>What is the test composed of?</strong><br>The test is composed of three types of questions:<br><span class="bullet-point">- Short sentences</span><br><span class="bullet-point">- Short dialogues</span><br><span class="bullet-point">- Lectures</span>',
            '<strong>What are the types of Questions?</strong><br>First, you get to listen to the material, and then you are given multiple-choice questions. You will have four choices. You should select the sentence that is closest in meaning to what you has been said or implied in the listening material.',
            '<strong>How many times will you be able to listen to the material?</strong><br>Just once.',
            '<strong>Can you return to earlier questions?</strong><br>No! Once you answer a question and confirm your answer, you will not be able to return to earlier questions.',
            '<strong>Can you take notes while listening?</strong><br>Yes, you may take notes while listening.'
        ]
    },
    reading: {
        title: 'Reading Comprehension',
        subtitle: 'Get ready to assess your reading and comprehension skills.',
        isAdaptive: true,
        icon: 'pi pi-book',
        overviewSubtitle: 'The Reading test comprises a variety of text assessments:',
        overviewCards: [
            { title: 'Multiple texts', icon: 'pi pi-file' },
            { title: 'Comprehension', icon: 'pi pi-check-square' },
            { title: 'Context clues', icon: 'pi pi-search' },
            { title: 'Vocabulary check', icon: 'pi pi-bookmark' }
        ],
        tips: [
            '<strong>What measures this section?</strong><br>The Reading Comprehension Part measures your ability to understand written Modern Standard Arabic.',
            '<strong>How are questions structured?</strong><br>You are given a number of passages. Each of those passages is followed by a number of questions. You should answer the questions based on what is stated or implied in the passage.'
        ]
    },
    grammar: {
        title: 'Structure',
        subtitle: 'Get ready to assess your grammar and structure skills.',
        isAdaptive: true,
        icon: 'pi pi-sliders-h',
        overviewSubtitle: 'The Structure test comprises Arabic sentence-building assessments:',
        overviewCards: [
            { title: 'Sentence completion', icon: 'pi pi-check-circle' },
            { title: 'Error identification', icon: 'pi pi-exclamation-triangle' },
            { title: 'Grammar rules', icon: 'pi pi-book' },
            { title: 'Syntax analysis', icon: 'pi pi-cog' }
        ],
        tips: [
            '<strong>What measures this section?</strong><br>The Structure Part measures your ability to understand how Arabic sentences are formed. This section has two types of questions.',
            '<strong>First type of question:</strong><br>Fill in the blank. You will have four choices. You should click on the best word or phrase to complete the sentence.',
            '<strong>Second type of question:</strong><br>Click on the red word or phrase that must be changed to make a sentence correct.',
            '<strong>Navigating answers:</strong><br>In the Structure Part you will not be able to return to previous questions once you have confirmed your answer.'
        ]
    },
    structure: {
        title: 'Structure',
        subtitle: 'Get ready to assess your grammar and structure skills.',
        isAdaptive: true,
        icon: 'pi pi-sliders-h',
        overviewSubtitle: 'The Structure test comprises Arabic sentence-building assessments:',
        overviewCards: [
            { title: 'Sentence completion', icon: 'pi pi-check-circle' },
            { title: 'Error identification', icon: 'pi pi-exclamation-triangle' },
            { title: 'Grammar rules', icon: 'pi pi-book' },
            { title: 'Syntax analysis', icon: 'pi pi-cog' }
        ],
        tips: [
            '<strong>What measures this section?</strong><br>The Structure Part measures your ability to understand how Arabic sentences are formed. This section has two types of questions.',
            '<strong>First type of question:</strong><br>Fill in the blank. You will have four choices. You should click on the best word or phrase to complete the sentence.',
            '<strong>Second type of question:</strong><br>Click on the red word or phrase that must be changed to make a sentence correct.',
            '<strong>Navigating answers:</strong><br>In the Structure Part you will not be able to return to previous questions once you have confirmed your answer.'
        ]
    },
    writing: {
        title: 'Writing Composition',
        subtitle: 'Get ready to assess your writing skills.',
        isAdaptive: false,
        icon: 'pi pi-file-edit',
        overviewSubtitle: 'The Writing Test comprises writing and composition tasks:',
        overviewCards: [
            { title: 'Topic selection', icon: 'pi pi-list' },
            { title: 'Handwritten essay', icon: 'pi pi-pencil' },
            { title: '250-word composition', icon: 'pi pi-align-left' },
            { title: 'Email submission', icon: 'pi pi-envelope' }
        ],
        tips: [
            '<strong>What measures this section?</strong><br>The Writing Part measures your ability to write in Modern Standard Arabic.',
            '<strong>Delivery:</strong><br>This test is to be completed by hand. You are given a number of topics. Select one topic and write a composition of 250 words on your answer sheet.',
            '<strong>Finalizing:</strong><br>After completing your composition, make sure your full name and other required details are written on your answer sheet before submitting it by email to the examiner.',
            '<strong>Test Activation:</strong><br>Click the <strong>Start the Test</strong> button only at the scheduled test time; otherwise, the test will be marked as <strong>Taken.</strong>'
        ]
    },
    speaking: {
        title: 'Speaking',
        subtitle: 'Get ready to assess your speaking skills.',
        isAdaptive: false,
        icon: 'pi pi-volume-up',
        overviewSubtitle: 'The Speaking Test comprises oral response and speaking tasks:',
        overviewCards: [
            { title: 'Speaking prompt', icon: 'pi pi-comment' },
            { title: 'Microphone setup', icon: 'pi pi-microphone' },
            { title: 'Voice recording', icon: 'pi pi-play' },
            { title: 'Audio review', icon: 'pi pi-undo' }
        ],
        tips: [
            '<strong>What measures this section?</strong><br>The Speaking Part measures your ability to communicate orally in Modern Standard Arabic.',
            '<strong>Preparation:</strong><br>Read or listen to the speaking topic/prompt carefully before starting your recording.',
            '<strong>Recording rules:</strong><br>Ensure you are in a quiet room so your voice is recorded clearly without background noise.',
            '<strong>Pacing:</strong><br>Speak at a natural, steady pace and express your thoughts as completely as possible.',
            '<strong>Review options:</strong><br>You can listen to your recorded answer before submitting to make sure the audio is clear.'
        ]
    },
    default: {
        title: 'Assessment Guidelines',
        subtitle: 'Get ready to assess your skills.',
        isAdaptive: false,
        icon: 'pi pi-info-circle',
        overviewSubtitle: 'The Skill Test includes a variety of questions and assessments:',
        overviewCards: [
            { title: 'Time limit questions', icon: 'pi pi-clock' },
            { title: 'Academic standards', icon: 'pi pi-check' },
            { title: 'Adaptive difficulty', icon: 'pi pi-sliders-h' },
            { title: 'Progress status', icon: 'pi pi-save' }
        ],
        tips: [
            '<strong>Reading layout:</strong><br>Read each question carefully.',
            '<strong>Time control:</strong><br>Manage your time wisely.',
            '<strong>Connection status:</strong><br>Ensure a stable internet connection.'
        ]
    }
};

const getSkillSpecificInstructions = (name) => {
    if (!name) return SKILL_SPECIFIC_INSTRUCTIONS.default;
    const lowerName = name.toLowerCase().replace('writting', 'writing');
    const matchedKey = Object.keys(SKILL_SPECIFIC_INSTRUCTIONS).find(key => lowerName.includes(key));
    return matchedKey ? SKILL_SPECIFIC_INSTRUCTIONS[matchedKey] : SKILL_SPECIFIC_INSTRUCTIONS.default;
};
</script>

<template>
    <div class="min-h-screen bg-[#F8FAFC] flex flex-col font-sans relative">
        <StudentHeader />
        
        <!-- Decoration background -->
        <div class="fixed inset-0 pointer-events-none">
            <div class="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px]"></div>
            <div class="absolute bottom-[10%] -right-[5%] w-[30%] h-[30%] bg-brand-accent/5 rounded-full blur-[120px]"></div>
        </div>

        <main class="flex items-center justify-center p-3 md:p-4 relative z-10 py-2 md:py-3">
            <div class="w-full max-w-7xl bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-700">
                
                <!-- Redesigned Header Banner -->
                <div class="bg-[#0B1E36] px-6 py-4 md:px-12 md:py-5 text-white relative overflow-hidden shrink-0">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    
                    <!-- Back Button: Styled precisely as a rounded pill/rectangle-border button -->
                    <button @click="goBack" class="mb-3 inline-flex items-center gap-2 border border-white/20 bg-white/5 rounded-lg px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
                        <i class="pi pi-arrow-left text-[10px]"></i> Back to Skills
                    </button>

                    <div class="flex items-center gap-5">
                        <!-- Icon Card -->
                        <div class="w-16 h-16 bg-[#162E4C] rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                            <i :class="[getSkillSpecificInstructions(skill?.name).icon, 'text-2xl text-white']"></i>
                        </div>
                        <div>
                            <!-- Header Title and Subtitle - match typography scale & Mixed Case description -->
                            <h1 class="text-xl md:text-3xl font-bold tracking-normal uppercase leading-tight">
                                {{ getSkillSpecificInstructions(skill?.name).title }}
                            </h1>
                            <p class="mt-1.5 text-sm font-medium text-slate-300">
                                {{ getSkillSpecificInstructions(skill?.name).subtitle }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Instructions Content -->
                <div class="flex-grow p-4 md:p-6 lg:p-8 overflow-y-auto">
                    <div v-if="isLoading" class="flex flex-col items-center py-12">
                        <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                    </div>

                    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                        
                        <!-- Left Layout: TEST OVERVIEW and 4 Cards, plus Adaptive alert box -->
                        <div class="flex flex-col space-y-4 justify-start">
                            <div>
                                <!-- Section Title: TEST OVERVIEW with Dynamic Skill Icon -->
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-10 h-10 rounded-xl bg-[#F0F6FC] flex items-center justify-center shrink-0 border border-slate-100">
                                        <i :class="[getSkillSpecificInstructions(skill?.name).icon, 'text-blue-600 text-sm']"></i>
                                    </div>
                                    <h2 class="text-lg font-bold text-slate-800 tracking-tight">TEST OVERVIEW</h2>
                                </div>
                                
                                <!-- Overview Subtitle -->
                                <p class="text-slate-500 text-sm font-medium mb-4">
                                    {{ getSkillSpecificInstructions(skill?.name).overviewSubtitle }}
                                </p>

                                <!-- Grid of 4 Cards: clean layouts with centered icons and labels -->
                                <div class="grid grid-cols-4 gap-3 md:gap-4">
                                    <div v-for="(card, index) in getSkillSpecificInstructions(skill?.name).overviewCards" 
                                         :key="index" 
                                         class="bg-[#F8FBFC] border border-slate-100 rounded-xl p-3 md:p-4 lg:p-5 flex flex-col items-center text-center justify-center min-h-[120px] lg:min-h-[135px] transition-transform duration-200 hover:-translate-y-0.5 shadow-sm">
                                        <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-500 mb-3 border border-slate-50">
                                            <i :class="[card.icon, 'text-base font-semibold']"></i>
                                        </div>
                                        <span class="text-xs font-semibold text-slate-700 leading-tight">
                                            {{ card.title }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Horizontal Divider Line -->
                            <hr class="border-t border-slate-100 my-1" />

                            <!-- Diagnostic indicator blue-box (Only for adaptive tests) -->
                            <div v-if="getSkillSpecificInstructions(skill?.name).isAdaptive" 
                                 class="bg-[#F4FAFF] border border-blue-100 rounded-xl p-5 flex items-start gap-4">
                                <div class="w-10 h-10 rounded-full bg-[#E5F3FF] flex items-center justify-center shrink-0 text-blue-600">
                                    <i class="pi pi-info-circle text-lg"></i>
                                </div>
                                <div>
                                    <h4 class="text-sm font-bold text-[#0066CC] mb-1">This is an adaptive test.</h4>
                                    <p class="text-xs font-medium text-slate-600 leading-relaxed">
                                        The difficulty will adjust based on your performance to accurately assess your {{ getSkillDisplayName(skill?.name).toLowerCase() }} ability.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Right Layout: IMPORTANT DIRECTIONS -->
                        <div class="bg-[#FBFCFD] rounded-3xl p-4 md:p-6 border border-slate-100 shadow-sm flex flex-col">
                            <!-- Header for column -->
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                    <i class="pi pi-sparkles text-emerald-500 text-sm"></i>
                                </div>
                                <h2 class="text-base font-bold text-slate-800 tracking-tight uppercase">IMPORTANT DIRECTIONS</h2>
                            </div>

                            <!-- Scrollable list: displays the first 2 items and allows internal scrollbar for remaining items (Font size: 12px) -->
                            <div class="flex-grow max-h-[175px] overflow-y-auto pr-2 space-y-4 custom-vertical-scrollbar">
                                <div v-for="(tip, index) in getSkillSpecificInstructions(skill?.name).tips" 
                                     :key="index" 
                                     class="flex items-start gap-4">
                                    
                                    <!-- Green Circular Number Badge -->
                                    <div class="w-6 h-6 rounded-full bg-[#E6F4EA] flex items-center justify-center shrink-0 text-[12px] font-bold text-emerald-600 border border-[#CEEAD6]">
                                        {{ index + 1 }}
                                    </div>

                                    <!-- Tip Details with Mixed Casing and Proper Spacing -->
                                    <div class="instruction-tip text-slate-700 text-[12px] font-medium leading-relaxed pt-0.5" 
                                         v-html="tip">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- System Ready Box -->
                            <div class="mt-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm shrink-0">
                                <div class="flex items-center gap-2.5 mb-2">
                                    <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">System Ready</span>
                                </div>
                                <p class="text-[11px] font-medium text-slate-500 leading-normal">
                                    All technical requirements met. You are ready to start the {{ getSkillDisplayName(skill?.name) }} section.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Footer Action (Original button colors with updated fonts & sizing) -->
                <div class="px-6 py-4 md:px-8 border-t border-slate-50 bg-white shrink-0">
                    <div class="flex flex-col items-center">
                        <button @click="startExam"
                            class="group relative w-56 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm tracking-widest shadow-xl shadow-brand-primary/20 hover:bg-brand-primary/95 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                            <span class="relative z-10 flex items-center justify-center gap-3">
                                START THE TEST <i class="pi pi-play text-xs group-hover:translate-x-1 transition-transform"></i>
                            </span>
                        </button>
                        <p class="mt-1.5 text-[10px] font-medium text-slate-400 tracking-wider">
                            Click on the "Start the test" when you are ready to begin.
                        </p>
                    </div>
                </div>

            </div>
        </main>
    </div>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.custom-vertical-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #E2E8F0 transparent;
}

.custom-vertical-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-vertical-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-vertical-scrollbar::-webkit-scrollbar-thumb {
    background: #E2E8F0;
    border-radius: 9999px;
}

.custom-vertical-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #CBD5E1;
}

.instruction-tip :deep(strong),
.instruction-tip :deep(b) {
    font-weight: 700;
    color: #1e293b;
    display: inline-block;
    margin-bottom: 0.25rem;
    font-size: 12px;
}

.instruction-tip :deep(strong) + br,
.instruction-tip :deep(b) + br {
    display: block;
    content: "";
    margin-top: 2px;
}

/* Specific styling for list items in directions */
.instruction-tip :deep(.bullet-point) {
    display: inline-block;
    padding-left: 0.5rem;
    color: #475569;
    font-weight: 500;
    font-size: 12px;
}
</style>
