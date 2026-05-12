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
    const lowerName = name.toLowerCase();
    const matchedKey = Object.keys(skillMap).find(key => lowerName.includes(key));
    return matchedKey ? skillMap[matchedKey] : name;
};

const SKILL_SPECIFIC_INSTRUCTIONS = {
    listening: {
        title: 'Listening Test',
        icon: '/Listening02.png',
        rules: [
            {
                title: 'Test Description',
                description: 'The Listening test includes a number of: <br>* Short sentences<br>* Short dialogues<br>* Academic discussions<br><br>You are allowed to take notes while listening to the audios. This test is adaptive. In other words, it will adjust itself to your level and it will end when your ceiling has been reached. By ceiling is meant your uppermost language level. The higher your level, the longer the test.',
                icon: '/Listening02.png'
            },
         //   {
           //     title: 'Single Playback',
             //   description: 'Most audio clips will play only once. Listen carefully and take notes if needed.',
               // icon: '/Listening02.png'
            //},
            //{
              //  title: 'No Pausing',
                //description: 'You cannot pause or rewind audio once it starts playing. Stay focused throughout.',
                //icon: '/Listening02.png'
           // }
        ],
        tips: [
            '<strong>What is the test composed of?</strong><br>The test is composed of three types of questions:<br>- Short sentences<br>- Short dialogues<br>- Lectures',
            '<strong>What are the types of Questions?</strong><br>First, you get to listen to the material, and then you are given multiple-choice questions. You will have four choices. You should select the sentence that is closest in meaning to what you has been said or implied in the listening material..',
            '<strong>How many times will you be able to listen to the material?</strong><br>Just once.',
            '<strong>Can you return to earlier questions?</strong><br>No! Once you answer a question and confirm your answer, you will not be able to return to earlier questions.',
            '<strong>Can you take notes while listening?</strong><br>Yes, you may take notes while listening.'
        ]
    },
    reading: {
        title: 'Reading Comprehension',
        icon: '/Reading-1.png',
        rules: [
            {
                title: 'Test Description',
                description: 'The Reading test comprises a number of texts, followed by questions of different formats.<br><br>This test is adaptive. In other words, it will adjust itself to your level and it will end when your ceiling has been reached. By ceiling is meant your uppermost language level. The higher your level, the longer the test.',
                icon: '/Reading-1.png'
            },
            //{
              //  title: 'Time Management',
               // description: 'Don\'t spend too long on one difficult section. Move on and come back if possible.',
                //icon: '/Reading-1.png'
            //},
            //{
              //  title: 'Context Clues',
               // description: 'Use the surrounding text to understand unfamiliar vocabulary or complex ideas.',
                //icon: '/Reading-1.png'
            //}
        ],
        tips: [
            'The Reading Comprehension Part measures your ability to understand written Modern Standard Arabic.',
            'You are given a number of passages. Each of those passages is followed by a number of questions. You should answer the questions based on what is stated or implied in the passage.'
        ]
    },
    grammar: {
        title: 'Structure',
        icon: '/Strac-01.png',
        rules: [
            {
                title: 'Test Description',
                description: 'The Structure Test aims at measuring your ability to recognize sentences in Modern Standard Arabic.<br><br>This test is adaptive. In other words, it will adjust itself to your level and it will end when your ceiling has been reached. By ceiling is meant your uppermost language level. The higher your level, the longer the test.',
                icon: '/Strac-01.png'
            },
            //{
              //  title: 'Pace Yourself',
               // description: 'Grammar questions are often shorter. Maintain a steady rhythm to save time.',
                //icon: '/Strac-01.png'
            //},
            //{
              //  title: 'Logical Review',
               // description: 'Read the completed sentence to yourself to ensure it sounds grammatically correct.',
                //icon: '/Strac-01.png'
            //}
        ],
        tips: [
            'The Structure Part measures your ability to understand how Arabic sentences are formed. This section has two types of questions..',
            'The first type of question is to fill in the blank. You will have four choices. You should click on the best word or phrase to complete the sentence..',
            'The second type of question asks you to click on the red word or phrase that must be changed to make a sentence correct.',
            'In the Structure Part you will not be able to return to previous questions once you have confirmed your answer.'
        ]
    },
    structure: {
        title: 'Structure',
        icon: '/Strac-01.png',
        rules: [
            {
                title: 'Test Description',
                description: 'The Structure Test aims at measuring your ability to recognize sentences in Modern Standard Arabic.<br><br>This test is adaptive. In other words, it will adjust itself to your level and it will end when your ceiling has been reached. By ceiling is meant your uppermost language level. The higher your level, the longer the test.',
                icon: '/Strac-01.png'
            },
           // {
             //   title: 'Pace Yourself',
              //  description: 'Grammar questions are often shorter. Maintain a steady rhythm to save time.',
               // icon: '/Strac-01.png'
            //},
            //{
              //  title: 'Logical Review',
               // description: 'Read the completed sentence to yourself to ensure it sounds grammatically correct.',
                //icon: '/Strac-01.png'
            //}
        ],
        tips: [
            'The Structure Part measures your ability to understand how Arabic sentences are formed. This section has two types of questions..',
            'The first type of question is to fill in the blank. You will have four choices. You should click on the best word or phrase to complete the sentence..',
            'The second type of question asks you to click on the red word or phrase that must be changed to make a sentence correct.',
            'In the Structure Part you will not be able to return to previous questions once you have confirmed your answer.'
        ]
    },
    writing: {
        title: 'Writing Composition',
        icon: '/Writing-01.png',
        rules: [
            {
                title: 'Test Description',
                description: 'This test measures you ability to write in Modern Standard Arabic.<br><br>You may not take this test until you have completed the previous parts of the Arabic Language Proficiency Test; namely, the Listening, Reading Comprehension and Structure sections.',
                icon: '/Writing-01.png'
            },
            //{
              //  title: 'Task Fulfillment',
               // description: 'Ensure you address all parts of the prompt provided in the task description.',
                //icon: '/Writing-01.png'
            //},
            //{
              //  title: 'Final Proofread',
               // description: 'Save 2-3 minutes at the end to check for spelling and punctuation errors.',
                //icon: '/Writing-01.png'
            //}
        ],
        tips: [
            'The Writing Part measures your ability to write in Modern Standard Arabic.',
            'This test is to be completed by hand. You are given a number of topics. Select one topic and write a composition of 250 words on your answer sheet..',
            'After completing your composition, make sure your full name and other required details are written on your answer sheet before submitting it by email to the examiner..',
            'Click the <strong>Start the Test</strong> button only at the scheduled test time; otherwise, the test will be marked as <strong>Taken.</strong>'
        ]
    },
    speaking: {
        title: 'Speaking',
        icon: '/Speaking-02.png',
        rules: [
            {
               title: 'Test Description',
                description: 'This test measures you ability to write in Modern Standard Arabic.<br><br>You may not take this test until you have completed the previous parts of the Arabic Language Proficiency Test; namely, the Listening, Reading Comprehension and Structure sections.',
                icon: '/Speaking-02.png'
            },
            //{
              //  title: 'Steady Delivery',
               // description: 'Speak clearly and at a moderate pace. Do not rush your response.',
                //icon: '/Speaking-02.png'
            //},
            //{
              //  title: 'Recording Limits',
                //description: 'Watch the timer. Your response must be completed before the recording ends.',
                //icon: '/Speaking-02.png'
            //}
        ],
        tips: [
            'Contact info@arabacademy.com to schedule the test'
        ]
    },
    default: {
        title: 'Assessment Guidelines',
        icon: '/logo.png',
        rules: [
            {
                title: 'Timed Environment',
                description: 'Each skill has a dedicated time limit. The timer starts when you click Begin.',
                icon: '/logo.png'
            },
            {
                title: 'Honesty & Integrity',
                description: 'The system monitors activity. Please stay within the browser window.',
                icon: '/logo.png'
            },
            {
                title: 'Progress Saving',
                description: 'Your answers are saved automatically as you progress through questions.',
                icon: '/logo.png'
            }
        ],
        tips: [
            'Read each question carefully.',
            'Manage your time wisely.',
            'Ensure a stable internet connection.'
        ]
    }
};

const getSkillSpecificInstructions = (name) => {
    if (!name) return SKILL_SPECIFIC_INSTRUCTIONS.default;
    const lowerName = name.toLowerCase();
    const matchedKey = Object.keys(SKILL_SPECIFIC_INSTRUCTIONS).find(key => lowerName.includes(key));
    return matchedKey ? SKILL_SPECIFIC_INSTRUCTIONS[matchedKey] : SKILL_SPECIFIC_INSTRUCTIONS.default;
};
</script>

<template>
    <div class="h-screen bg-[#F8FAFC] flex flex-col font-sans relative overflow-hidden">
        <StudentHeader />
        
        <!-- Decoration -->
        <div class="fixed inset-0 pointer-events-none">
            <div class="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px]"></div>
            <div class="absolute bottom-[10%] -right-[5%] w-[30%] h-[30%] bg-brand-accent/5 rounded-full blur-[120px]"></div>
        </div>

        <main class="flex-grow flex items-center justify-center p-6 relative z-10 overflow-hidden">
            <div class="w-full max-w-7xl h-full max-h-[min(750px,calc(100vh-120px))] bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-700">
                <!-- Header Banner -->
                <div class="bg-slate-900 p-5 md:p-6 text-white relative overflow-hidden shrink-0">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    
                    <button @click="goBack" class="mb-4 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                        <i class="pi pi-arrow-left text-[8px]"></i> Go Back
                    </button>

                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center shadow-xl border border-white/10">
                            <img
                                :src="getSkillSpecificInstructions(skill?.name).icon"
                                :alt="getSkillSpecificInstructions(skill?.name).title"
                                class="w-8 h-8 object-contain"
                            />
                        </div>
                        <div>
                            <h1 class="text-xl md:text-2xl font-black tracking-tight uppercase">{{ getSkillSpecificInstructions(skill?.name).title }}</h1>
                        </div>
                    </div>
                </div>

                <!-- Instructions Content -->
                <div class="flex-grow p-10 md:p-12 overflow-y-auto custom-scrollbar">
                    <div v-if="isLoading" class="flex flex-col items-center py-12">
                        <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                    </div>

                    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <!-- Left: Rules -->
                        <div class="space-y-8">
                            <div v-for="(rule, index) in getSkillSpecificInstructions(skill?.name).rules" :key="index" class="flex gap-6 animate-in slide-in-from-left duration-500" :style="{ animationDelay: `${index * 100}ms` }">
                                <div class="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                                    <img
                                        :src="rule.icon"
                                        :alt="rule.title"
                                        class="w-6 h-6 object-contain"
                                    />
                                </div>
                                <div>
                                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-tight mb-2">{{ rule.title }}</h3>
                                    <div class="instruction-description text-[10px] font-medium text-slate-500 leading-relaxed uppercase" v-html="rule.description"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Tips -->
                        <div class="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100/50 animate-in slide-in-from-right duration-700">
                            <h3 class="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <i class="pi pi-sparkles"></i> {{ getSkillDisplayName(skill?.name) }}: Directions 
                            </h3>
                            <ul class="space-y-4">
                                <li v-for="(tip, index) in getSkillSpecificInstructions(skill?.name).tips" :key="index" class="flex items-start gap-3">
                                    <div class="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-[8px] text-brand-primary border border-slate-100">
                                        {{ index + 1 }}
                                    </div>
                                    <div class="instruction-tip text-[10px] font-bold text-slate-600 uppercase leading-relaxed pt-0.5" v-html="tip"></div>
                                </li>
                            </ul>
                            
                            <div class="mt-10 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div class="flex items-center gap-3 mb-3">
                                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Ready</span>
                                </div>
                                <p class="text-[9px] font-bold text-slate-500 leading-relaxed uppercase">
                                    All technical requirements met. You are ready to start the {{ getSkillDisplayName(skill?.name) }} section.
                                </p>
                            </div>
                        </div>

                       
                    </div>
                </div>

                <!-- Footer Action -->
                <div class="px-6 py-5 md:px-8 md:py-6 border-t border-slate-50 bg-white shrink-0">
                    <div class="flex flex-col items-center">
                        <button @click="startExam"
                            class="group relative w-full max-w-xs py-4 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-[0.25em] shadow-xl shadow-brand-primary/30 hover:bg-brand-primary/90 hover:shadow-brand-primary/50 hover:-translate-y-0.5 transition-all duration-300">
                            <span class="relative z-10 flex items-center justify-center gap-3">
                                Start The Test <i class="pi pi-play text-[10px] group-hover:translate-x-1 transition-transform"></i>
                            </span>
                        </button>
                        <p class="mt-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            Click on the 'Start the Test' when you are ready to begin.
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

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #E2E8F0;
    border-radius: 10px;
}

.instruction-description :deep(p),
.instruction-tip :deep(p) {
    margin-bottom: 0.35rem;
}

.instruction-description :deep(strong),
.instruction-description :deep(b),
.instruction-tip :deep(strong),
.instruction-tip :deep(b) {
    font-weight: 900;
    color: #1e293b;
}

.instruction-description :deep(ul),
.instruction-description :deep(ol),
.instruction-tip :deep(ul),
.instruction-tip :deep(ol) {
    margin: 0.35rem 0 0;
    padding-left: 1rem;
}

.instruction-description :deep(ul),
.instruction-tip :deep(ul) {
    list-style: disc;
}

.instruction-description :deep(ol),
.instruction-tip :deep(ol) {
    list-style: decimal;
}
</style>
