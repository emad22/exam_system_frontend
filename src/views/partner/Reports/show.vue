<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PartnerLayout from '@/components/PartnerLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';

const route = useRoute();
const router = useRouter();
const attemptId = route.params.id;

const selectedAttempt = ref(null);
const loading = ref(true);

let totalLevels = 0;

const getTotalScore = (attempt) => {
    if (!attempt || !attempt.attempt_skills) return 0;
    totalLevels = 0;
    return attempt.attempt_skills
        .filter(skillResult => {
            const skillName = skillResult.skill?.name?.toLowerCase() || '';
            return (
                skillName.includes('read') ||
                skillName.includes('listen') ||
                skillName.includes('struct')
            );
        })
        .reduce((sum, skillResult) => {
            totalLevels += skillResult.skill?.levels_count || 1;
            return sum + (getCalculatedSkillScore(skillResult) || 0);
        }, 0);
};

const fetchDetails = async () => {
    loading.value = true;
    try {
        const reportRes = await api.get(`/partner/reports/${attemptId}`);
        selectedAttempt.value = reportRes.data;
    } catch (err) {
        console.error('Failed to load attempt details', err);
        if(err.response?.status === 403) {
            alert("Unauthorized to view this report.");
            router.push('/partner/reports');
        }
    } finally {
        loading.value = false;
    }
};

const formatTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatFullDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
};

const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const diff = new Date(end) - new Date(start);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
};

const getCalculatedSkillScore = (skillResult) => {
    if (!skillResult || skillResult.score === null || skillResult.score === undefined) return null;
    const levelsCount = skillResult.skill?.levels_count || 1;
    return Math.round(Number(skillResult.score) * levelsCount);
};

const skillMap = {
    'listening': 'Listening',
    'reading': 'Reading',
    'structure': 'Structure',
    'writing': 'Writing',
    'speaking': 'Speaking'
};

const getSkillDisplayName = (name) => {
    if (!name) return 'Unknown Skill';
    const lowerName = name.toLowerCase();
    const matchedKey = Object.keys(skillMap).find(key => lowerName.includes(key));
    return matchedKey ? skillMap[matchedKey] : name;
};

const sortedAttemptSkills = computed(() => {
    if (!selectedAttempt.value || !selectedAttempt.value.attempt_skills) return [];
    const orderMap = {
            'listening': 1,
            'reading': 2,
            'structure': 3,
            'writing': 4,
            'speaking': 5
        };

    const getOrder = (name) => {
        name = name?.toLowerCase() || '';
        const matchedKey = Object.keys(orderMap).find(key => name.includes(key));
        return orderMap[matchedKey] || 99;
    };

    return [...selectedAttempt.value.attempt_skills].sort((a, b) => {
        return getOrder(a.skill?.name) - getOrder(b.skill?.name);
    });
});

const parseJson = (str) => {
    try {
        const val = JSON.parse(str);
        return Array.isArray(val) ? val : (val && typeof val === 'object' ? Object.values(val) : [str]);
    } catch (e) {
        return [str];
    }
};

const getCorrectOptions = (question) => {
    if (!question || !question.options) return [];
    if (question.type === 'matching') {
        return question.options.filter(o => o.option_text.includes('|')).map(o => {
            const parts = o.option_text.split('|');
            return `${parts[0].trim()} → ${parts[1]?.trim()}`;
        });
    }
    return question.options
        .filter(o => o.is_correct)
        .sort((a, b) => a.id - b.id)
        .map(o => o.option_text);
};

const getStudentParts = (answer) => {
    if (!answer) return [];
    if (answer.question?.type === 'matching') {
        try {
            const obj = JSON.parse(answer.text_answer);
            if (typeof obj === 'object' && !Array.isArray(obj)) {
                return Object.entries(obj).map(([id, target]) => {
                    const opt = answer.question.options.find(o => o.id == id);
                    const source = opt ? opt.option_text.split('|')[0].trim() : id;
                    return `${source} → ${target}`;
                });
            }
        } catch (e) { }
    }
    return parseJson(answer.text_answer);
};

const normalizeString = (str) => {
    if (!str) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = str;
    let clean = tmp.textContent || tmp.innerText || '';
    clean = clean.replace(/\u00a0/g, ' ');
    clean = clean.replace(/[\u064B-\u0652]/g, '');
    return clean.trim().toLowerCase();
};

const isPartCorrect = (answer, correctVal, pIdx) => {
    const studentParts = getStudentParts(answer);
    if (!studentParts || studentParts.length === 0) return false;

    const normalizedStudentPart = normalizeString(studentParts[pIdx] || '');
    const acceptedValues = correctVal.split('|').map(v => normalizeString(v));

    if (['word_selection', 'click_word', 'highlight'].includes(answer.question?.type)) {
        const normalizedCorrect = normalizeString(correctVal);
        const normalizedStudentParts = studentParts.map(s => normalizeString(s));
        return normalizedStudentParts.includes(normalizedCorrect);
    }

    return acceptedValues.includes(normalizedStudentPart);
};

const resolveUrl = (path) => {
    if (!path) return null;

    if (/^https?:\/\//.test(path)) {
        return path;
    }

    let baseUrl = import.meta.env.VITE_API_BASE_URL;

    if (!baseUrl) {
        const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

        baseUrl = isLocal
            ? 'http://localhost:8000/api'
            : `${window.location.origin}/api`;
    }

    const origin = new URL(baseUrl).origin;

    return `${origin}/storage/${path.replace(/^storage\//, '').replace(/^\/+/, '')}`;
};

onMounted(fetchDetails);
</script>

<template>
    <PartnerLayout>
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">

            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
                <div class="flex items-center gap-4">
                    <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.back()" class="rounded-xl bg-slate-50" />
                    <div>
                        <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Student Assessment Details</h1>
                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Detailed performance breakdown</p>
                    </div>
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-40">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8">Fetching Data...</p>
            </div>

            <div v-else-if="selectedAttempt" class="space-y-12">
                <!-- Summary Card -->
                <div class="bg-slate-900 rounded-[2.5rem] p-10 text-white grid grid-cols-1 md:grid-cols-3 gap-12 border border-slate-800 shadow-2xl relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                        <i class="pi pi-chart-bar text-9xl"></i>
                    </div>

                    <div class="space-y-2">
                        <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Student Profile</p>
                        <p class="text-2xl font-black uppercase tracking-tight">
                            {{ selectedAttempt.student?.user?.first_name || 'Unknown' }}
                            {{ selectedAttempt.student?.user?.last_name || 'Student' }}
                        </p>
                        <p class="text-[10px] font-bold text-slate-400 tracking-widest">{{ selectedAttempt.student?.student_code || 'STU-XXXXXX' }}</p>
                    </div>

                    <div class="space-y-2">
                        <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Efficiency Index</p>
                        <div class="flex items-baseline gap-2">
                            <span class="text-5xl font-black italic tracking-tighter text-emerald-400">
                                {{ Math.round(Number(getTotalScore(selectedAttempt)) / (selectedAttempt.skills_count || 1), 2) }}
                            </span>
                            <span class="text-xl font-black text-slate-500"> / {{ Number((selectedAttempt.total_levels || 1) * 100 / (selectedAttempt.skills_count || 1), 2) }} </span>
                        </div>
                        <div class="flex items-baseline gap-2 mt-2">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Total Score:</span>
                            <span class="text-lg font-black text-emerald-400">{{ selectedAttempt.overall_score }}</span>
                            <span class="text-xl font-black text-slate-500">%</span>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Execution Metrics</p>
                        <p class="text-xs font-black uppercase tracking-wider">{{ selectedAttempt.finished_at ? new Date(selectedAttempt.finished_at).toLocaleString() : 'N/A' }}</p>
                        <div class="mt-2 flex items-center gap-2">
                            <Tag :value="selectedAttempt.status" :severity="selectedAttempt.status === 'completed' ? 'success' : 'warning'" class="text-[9px] font-black uppercase px-3" />
                        </div>
                    </div>
                </div>

                <!-- Skills Tabs -->
                <Tabs v-if="sortedAttemptSkills.length" :value="sortedAttemptSkills[0].skill_id.toString()">
                    <TabList class="bg-transparent border-none mb-8 overflow-x-auto hide-scrollbar">
                        <Tab v-for="skillResult in sortedAttemptSkills" :key="skillResult.id" :value="skillResult.skill_id.toString()" class="mr-4 group shrink-0">
                            <div class="flex items-center space-x-3 px-6 py-3 rounded-2xl transition-all group-aria-selected:bg-brand-primary group-aria-selected:text-white group-aria-selected:shadow-lg group-aria-selected:shadow-indigo-200/50 bg-white border border-slate-100 hover:border-slate-200">
                                <span class="w-6 h-6 rounded-lg bg-indigo-50/50 text-indigo-500 group-aria-selected:bg-white/20 group-aria-selected:text-white flex items-center justify-center font-black text-[10px]">
                                    {{ skillResult.skill?.short_code || 'S' }}
                                </span>
                                <span class="text-[11px] font-black uppercase tracking-widest">{{ getSkillDisplayName(skillResult.skill?.name) }}</span>
                            </div>
                        </Tab>
                    </TabList>

                    <TabPanels class="bg-transparent p-0">
                        <TabPanel v-for="skillResult in sortedAttemptSkills" :key="skillResult.id" :value="skillResult.skill_id.toString()">
                            <div class="space-y-10">
                                <!-- Skill Summary Card -->
                                <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-8 relative overflow-hidden group">
                                    <div class="absolute top-0 right-0 p-8 opacity-5 text-8xl pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                        <i class="pi pi-verified"></i>
                                    </div>
                                    <div class="flex items-center justify-between relative z-10">
                                        <div class="flex items-center space-x-4">
                                            <div class="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-black text-lg border border-indigo-100">
                                                {{ skillResult.skill?.short_code || 'S' }}
                                            </div>
                                            <div>
                                                <h4 class="text-base font-black text-slate-800 uppercase tracking-wider">{{ getSkillDisplayName(skillResult.skill?.name) }}</h4>
                                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Skill Domain Assessment</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center space-x-6">
                                            <div class="flex items-center gap-8 mr-6 border-r border-slate-100 pr-8 py-2">
                                                <div class="text-right">
                                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Started At</p>
                                                    <p class="text-[11px] font-black text-slate-700">{{ formatTime(skillResult.started_at) }}</p>
                                                </div>
                                                <div class="text-right">
                                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Finished At</p>
                                                    <p class="text-[11px] font-black text-slate-700">{{ formatTime(skillResult.finished_at) }}</p>
                                                </div>
                                                <div class="text-right">
                                                    <p class="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Duration</p>
                                                    <p class="text-[11px] font-black text-indigo-600">{{ calculateDuration(skillResult.started_at, skillResult.finished_at) }}</p>
                                                </div>
                                            </div>

                                            <div class="text-right border-l border-slate-100 pl-6 ml-2">
                                                <div class="text-3xl font-black text-emerald-600 italic">
                                                    {{ getCalculatedSkillScore(skillResult) !== null ? getCalculatedSkillScore(skillResult) : 0 }}
                                                    <span class="text-lg text-emerald-400">{{ '/' + ((skillResult.skill?.levels_count || 1) * 100) }}</span>
                                                </div>
                                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Skill Score</p>
                                            </div>

                                            <div class="text-right border-l border-slate-100 pl-6 ml-2">
                                                <div class="text-3xl font-black text-slate-800 italic">{{ skillResult.max_level_reached }}</div>
                                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peak Tier</p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Movement Timeline -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-slate-50 relative z-10">
                                        <div v-for="log in (selectedAttempt.attempt_levels || []).filter(l => l.skill_id === skillResult.skill_id)" :key="log.id" class="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex justify-between items-center transition-all hover:bg-white hover:shadow-md">
                                            <div>
                                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Level {{ log.level_number }}</p>
                                                <div class="flex items-baseline gap-1">
                                                    <span class="text-xl font-black italic" :class="log.status === 'passed' ? 'text-emerald-600' : 'text-rose-600'">{{ log.score }}</span>
                                                    <span class="text-[10px] font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <div :class="log.status === 'passed' ? 'text-emerald-500 bg-emerald-100/50 border-emerald-100' : 'text-rose-500 bg-rose-100/50 border-rose-100'" class="w-10 h-10 rounded-xl flex items-center justify-center text-sm border shadow-sm">
                                                <i :class="log.status === 'passed' ? 'pi pi-check' : 'pi pi-times'"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Detailed Response Timeline for this Skill -->
                                <div class="space-y-6 pt-6">
                                    <div class="flex items-center gap-6">
                                        <h4 class="text-sm font-black text-slate-800 uppercase tracking-[0.2em] flex items-center">
                                            <i class="pi pi-list mr-3 text-indigo-500"></i> Detailed Response Timeline
                                        </h4>
                                        <div class="flex-1 h-px bg-slate-100"></div>
                                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                                            {{ (selectedAttempt.answers || []).filter(a => a.question?.skill_id === skillResult.skill_id).length }} Questions
                                        </span>
                                    </div>

                                    <div class="grid grid-cols-1 gap-6">
                                        <div v-for="(answer, idx) in (selectedAttempt.answers || []).filter(a => a.question?.skill_id === skillResult.skill_id)" :key="answer.id" class="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all duration-500 group">
                                            <div class="flex flex-col md:flex-row items-start gap-8">
                                                <div class="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-lg transition-transform group-hover:scale-110" :class="answer.is_correct ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-lg shadow-emerald-50' : 'bg-rose-50 text-rose-600 border border-rose-100 shadow-lg shadow-rose-50'">
                                                    {{ idx + 1 }}
                                                </div>
                                                <div class="grow space-y-6 w-full">
                                                    <div class="flex flex-col md:flex-row justify-between items-start gap-4">
                                                        <div class="space-y-3">
                                                            <div class="flex items-center gap-3 flex-wrap">
                                                                <Tag :value="answer.question?.type" severity="secondary" class="text-[9px] font-black uppercase px-3 py-1 rounded-lg" />
                                                                <div v-if="answer.question?.passage" class="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                                                    <i class="pi pi-file text-[10px] text-indigo-500"></i>
                                                                    <span class="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Context: {{ answer.question.passage.title }}</span>
                                                                </div>
                                                            </div>
                                                            <div class="text-base font-bold text-slate-700 leading-relaxed max-w-3xl" v-html="answer.question?.content"></div>
                                                        </div>
                                                        <div class="text-right flex-shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[140px]">
                                                            <div class="text-3xl font-black italic tracking-tighter" :class="answer.is_correct ? 'text-emerald-600' : 'text-rose-600'">
                                                                +{{ answer.points_awarded }}
                                                            </div>
                                                            <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Efficiency Points</div>
                                                        </div>
                                                    </div>

                                                    <!-- Comparison -->
                                                    <div class="grid grid-cols-1 gap-6 pt-6 border-t border-slate-50">
                                                        <div v-if="['drag_drop', 'fill_blank', 'ordering', 'matching', 'word_selection', 'click_word', 'highlight'].includes(answer.question?.type)" class="space-y-4">
                                                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Detailed Evaluation</p>
                                                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                <div v-for="(correctVal, pIdx) in getCorrectOptions(answer.question)" :key="pIdx" class="p-4 rounded-2xl border flex flex-col gap-2 transition-all" :class="isPartCorrect(answer, correctVal, pIdx) ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'">
                                                                    <div class="flex justify-between items-start">
                                                                        <span class="text-[8px] font-black uppercase tracking-wider" :class="isPartCorrect(answer, correctVal, pIdx) ? 'text-emerald-400' : 'text-rose-400'">
                                                                            Part {{ pIdx + 1 }}
                                                                        </span>
                                                                        <i :class="isPartCorrect(answer, correctVal, pIdx) ? 'pi pi-check-circle text-emerald-500' : 'pi pi-times-circle text-rose-500'"></i>
                                                                    </div>
                                                                    <div class="space-y-1">
                                                                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Student:</p>
                                                                        <p class="text-xs font-black" :class="isPartCorrect(answer, correctVal, pIdx) ? 'text-emerald-700' : 'text-rose-700'">
                                                                            {{ ['word_selection', 'click_word', 'highlight'].includes(answer.question?.type) ? (isPartCorrect(answer, correctVal, pIdx) ? correctVal : (getStudentParts(answer)[0] || '—')) : (getStudentParts(answer)[pIdx] || '—') }}
                                                                        </p>
                                                                    </div>
                                                                    <div v-if="!isPartCorrect(answer, correctVal, pIdx)" class="pt-1 border-t border-rose-100 mt-1">
                                                                        <p class="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Correct:</p>
                                                                        <p class="text-xs font-black text-emerald-700">{{ correctVal }}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div class="p-6 rounded-3xl bg-slate-50 border border-slate-100 relative overflow-hidden">
                                                                <div class="absolute top-0 right-0 p-4 opacity-5 text-4xl">
                                                                    <i class="pi pi-user"></i>
                                                                </div>
                                                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Student Input</p>
                                                                <div class="text-sm font-black" :class="answer.is_correct ? 'text-emerald-700' : 'text-rose-700'">
                                                                    <template v-if="answer.question?.type === 'speaking'">
                                                                        <audio v-if="answer.media_answer" :src="resolveUrl(answer.media_answer)" controls class="h-8"></audio>
                                                                        <span v-else>No recording</span>
                                                                    </template>
                                                                    <template v-else>
                                                                        {{ answer.option?.option_text || answer.text_answer || '—' }}
                                                                    </template>
                                                                    <i v-if="answer.is_correct" class="pi pi-check-circle ml-2"></i>
                                                                    <i v-else class="pi pi-times-circle ml-2"></i>
                                                                </div>
                                                            </div>
                                                            <div v-if="!answer.is_correct && answer.question?.type !== 'speaking'" class="p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100 relative overflow-hidden">
                                                                <div class="absolute top-0 right-0 p-4 opacity-10 text-4xl text-emerald-500">
                                                                    <i class="pi pi-key"></i>
                                                                </div>
                                                                <p class="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">System Key</p>
                                                                <div class="text-sm font-black text-emerald-800">
                                                                    {{ answer.question?.options?.find(o => o.is_correct)?.option_text || '—' }}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div v-if="!((selectedAttempt.answers || []).filter(a => a.question?.skill_id === skillResult.skill_id).length)" class="bg-slate-50 rounded-[2rem] p-12 text-center border border-dashed border-slate-200">
                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No questions answered for this skill</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </div>
        </div>
    </PartnerLayout>
</template>

<style scoped>
.animate-in {
    animation-duration: 0.8s;
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.p-tab) {
    padding: 0;
    border: none;
    background: transparent;
}

:deep(.p-tab-list) {
    border: none;
}

:deep(.p-tabpanels) {
    padding: 0;
}

.hide-scrollbar::-webkit-scrollbar {
    display: none;
}

.hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
