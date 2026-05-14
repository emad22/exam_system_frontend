<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PartnerLayout from '@/components/PartnerLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();
const attempts = ref([]);
const loading = ref(true);
const search = ref('');

const skillMap = {
    'listening': 'Listening',
    'reading': 'Reading',
    'grammar': 'Grammar',
    'writing': 'Writing',
    'speaking': 'Speaking'
};

const getSkillDisplayName = (name) => {
    if (!name) return 'Unknown Skill';
    const lowerName = name.toLowerCase();
    const matchedKey = Object.keys(skillMap).find(key => lowerName.includes(key));
    return matchedKey ? skillMap[matchedKey] : name;
};

const getSortedSkills = (skills) => {
    if (!skills) return [];
    const orderMap = {
        'Listening': 1,
        'Reading': 2,
        'Grammar': 3,
        'Writing': 4,
        'Speaking': 5
    };

    return [...skills].sort((a, b) => {
        const nameA = getSkillDisplayName(a.skill?.name);
        const nameB = getSkillDisplayName(b.skill?.name);
        return (orderMap[nameA] || 99) - (orderMap[nameB] || 99);
    });
};

const fetchReports = async () => {
    loading.value = true;
    try {
        const res = await api.get('/partner/reports');
        attempts.value = res.data.data || res.data;
    } catch (err) {
        console.error('Failed to load reports', err);
    } finally {
        loading.value = false;
    }
};

const viewDetails = (id) => {
    router.push({ 
        name: 'partner.reports.show', 
        params: { id: id } 
    });
};

const filtered = () => {
    let result = attempts.value;

    if (search.value) {
        const q = search.value.toLowerCase();
        result = result.filter(a =>
            `${a.student?.user?.first_name} ${a.student?.user?.last_name}`.toLowerCase().includes(q) ||
            a.exam?.title?.toLowerCase().includes(q)
        );
    }
    
    return result;
};

const scoreColor = (score) => {
    if (!score && score !== 0) return 'text-slate-400';
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-rose-600';
};

const getCalculatedSkillScore = (skillResult) => {
    if (!skillResult || skillResult.score === null || skillResult.score === undefined) return null;
    const levelsCount = skillResult.skill?.levels_count || 1;
    return Math.round(Number(skillResult.score) * levelsCount);
};

const getTotalScore = (attempt) => {
    if (!attempt || !attempt.attempt_skills) return 0;
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
            return sum + (getCalculatedSkillScore(skillResult) || 0);
        }, 0);
};

onMounted(() => {
    fetchReports();
});
</script>

<template>
  <PartnerLayout>
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
            <div class="absolute right-0 top-0 w-64 h-64 bg-emerald-50/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl transition-all duration-1000 group-hover:bg-emerald-100/40"></div>
            <div class="relative z-10">
                <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Student Registry</h1>
                <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Performance outcomes for your students</p>
            </div>
            <div class="flex items-center space-x-3 relative z-10">
                <span class="relative">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 text-xs" />
                    <input v-model="search" type="text" placeholder="Search by student or exam..."
                        class="bg-slate-50 border border-slate-100 rounded-xl px-10 py-2.5 text-xs font-bold focus:bg-white transition-all w-64 outline-none">
                </span>
                <Button icon="pi pi-refresh" outlined severity="secondary" @click="fetchReports" />
            </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-40">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8">Retrieving Performance Data...</p>
        </div>

        <div v-else>
            <div v-if="filtered().length > 0" class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <table class="w-full text-left">
                    <thead class="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                        <tr>
                            <th class="p-6">Student Identity</th>
                            <th class="p-6">Assessment Module</th>
                            <th class="p-6 text-center">Score Matrix</th>
                            <th class="p-6 text-center">Status</th>
                            <th class="p-6 pr-8 text-right">Completion Date</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50 text-sm">
                        <template v-for="attempt in filtered()" :key="attempt.id">
                            <tr @click="viewDetails(attempt.id)" class="hover:bg-slate-50/50 transition cursor-pointer group">
                                <td class="p-6 flex items-center gap-4">
                                    <div class="w-11 h-11 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-rose-100 flex-shrink-0 group-hover:scale-110 transition-transform">
                                        {{ attempt.student?.user?.first_name?.[0] || 'S' }}
                                    </div>
                                    <div>
                                        <div class="font-black text-slate-800 uppercase tracking-tight">
                                            {{ attempt.student?.user?.first_name || attempt.user?.first_name || 'Unknown' }} 
                                            {{ attempt.student?.user?.last_name || attempt.user?.last_name || 'Student' }}
                                        </div>
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {{ attempt.student?.student_code || 'STU-XXXXXX' }}
                                        </div>
                                    </div>
                                </td>
                                <td class="p-6">
                                    <div class="font-bold text-slate-600">{{ attempt.exam?.title }}</div>
                                    <div class="text-[9px] font-black text-brand-accent uppercase tracking-widest">Protocol Matrix</div>
                                </td>
                                <td class="p-6 text-center">
                                    <span :class="scoreColor(attempt.overall_score)" class="text-2xl font-black italic tracking-tighter">
                                       {{ Number((Number(getTotalScore(attempt)) / (attempt.skills_count || 1)).toFixed(2)) }}
                                    </span>
                                    <span class="text-xl font-black text-slate-500"> / {{Number((attempt.total_levels || 1)* 100 / (attempt.skills_count || 1) , 2)}} </span>
                                </td>
                                <td class="p-6 text-center">
                                    <Tag :value="attempt.status" 
                                         :severity="attempt.status === 'completed' ? 'success' : 'warning'" 
                                         class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                                </td>
                                <td class="p-6 pr-8 text-right">
                                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {{ attempt.finished_at ? new Date(attempt.finished_at).toLocaleDateString('en-GB') : 'PENDING' }}
                                    </div>
                                    <div class="text-[8px] font-bold text-emerald-500 uppercase tracking-tight" v-if="attempt.status === 'completed'">Validated Outcome</div>
                                </td>
                            </tr>
                            <tr v-if="attempt.attempt_skills && attempt.attempt_skills.length > 0">
                                <td colspan="5" class="bg-slate-50/50 px-10 pb-6 pt-2 border-t-0">
                                    <div class="flex flex-wrap gap-3 mt-2">
                                        <div v-for="skillResult in getSortedSkills(attempt.attempt_skills)" :key="skillResult.id" class="mr-4 group shrink-0">
                                            <div class="flex items-center space-x-3 px-6 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:border-slate-200">
                                                <span class="w-6 h-6 rounded-lg bg-indigo-50/50 text-indigo-500 flex items-center justify-center font-black text-[10px]">
                                                    {{ skillResult.skill?.short_code || 'S' }}
                                                </span>
                                                <span class="font-bold text-slate-500 text-xs uppercase ml-1">
                                                    {{ getSkillDisplayName(skillResult.skill?.name) }}
                                                </span>
                                                <span class="font-black text-sm ml-3" :class="scoreColor(skillResult.score)">
                                                    {{ getCalculatedSkillScore(skillResult) !== null ? getCalculatedSkillScore(skillResult) + '/' + ((skillResult.skill?.levels_count || 1) * 100) : '—' }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <div v-else class="bg-white rounded-[2.5rem] border border-slate-100 p-32 text-center shadow-sm">
                <div class="text-6xl mb-6 opacity-20 grayscale">📊</div>
                <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">No Evaluated Students Found</h3>
                <p class="text-slate-400 font-bold mt-4 text-[10px] uppercase tracking-widest max-w-sm mx-auto">Reports will populate automatically upon successful completion of your students' assessments.</p>
            </div>
        </div>
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
