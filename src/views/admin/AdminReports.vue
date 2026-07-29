<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useAdminStore } from '@/stores/admin';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
const { showAlert, showConfirm } = useModal();

const router = useRouter();
const adminStore = useAdminStore();
const attempts = ref([]);
const partners = ref([]);
const selectedPartner = ref(null);
const loading = ref(true);
const search = ref('');
const startDate = ref(null);
const endDate = ref(null);

const clearDates = () => {
    startDate.value = null;
    endDate.value = null;
};

const skillMap = {
    'listening': 'Listening',
    'reading': 'Reading',
    'grammar': 'Grammar',
    'writing': 'Writing',
    'writting': 'Writing',
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
        const res = await api.get('/admin/reports');
        attempts.value = res.data.data || res.data;
      //   console.log("****************************"+JSON.stringify(attempts.value));
    } catch (err) {
        console.error('Failed to load reports', err);
    } finally {
        loading.value = false;
    }
};

const fetchPartners = async () => {
    try {
        const res = await api.get('/admin/partners/active');
        partners.value = res.data;
    } catch (err) {
        console.error('Failed to load partners', err);
    }
};

const viewDetails = async (id) => {
    const isTeacher = adminStore.user?.role === 'teacher';
    const routeName = isTeacher ? 'teacher.reports.show' : 'admin.reports.show';
    
    router.push({ 
        name: routeName, 
        params: { id: id } 
    });
};

const filtered = () => {
    let result = attempts.value;

    if (selectedPartner.value) {
        result = result.filter(a => a.student?.partner_id === selectedPartner.value);
    }

    if (search.value) {
        const q = search.value.toLowerCase();
        result = result.filter(a =>
            `${a.student?.user?.first_name} ${a.student?.user?.last_name}`.toLowerCase().includes(q) ||
            a.exam?.title?.toLowerCase().includes(q)
        );
    }
    
    if (startDate.value) {
        const start = new Date(startDate.value);
        start.setHours(0, 0, 0, 0);
        result = result.filter(a => {
            if (!a.started_at) return false;
            return new Date(a.started_at) >= start;
        });
    }

    if (endDate.value) {
        const end = new Date(endDate.value);
        end.setHours(23, 59, 59, 999);
        result = result.filter(a => {
            if (!a.started_at) return false;
            return new Date(a.started_at) <= end;
        });
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

const getMaxSkillScore = (skillResult, attempt) => {
    let levelsCount = skillResult.skill?.levels_count || 1;
    if (levelsCount === 1 && attempt?.attempt_skills) {
        const listeningSkill = attempt.attempt_skills.find(
            s => s.skill?.name?.toLowerCase() === 'listening'
        );
        if (listeningSkill && listeningSkill.skill?.levels_count) {
            levelsCount = listeningSkill.skill.levels_count;
        }
    }
    return levelsCount * 100;
};

const getValidSkills = (attempt) => {
    if (!attempt || !attempt.attempt_skills) return [];
    return attempt.attempt_skills.filter(skillResult => {
        const skillName = skillResult.skill?.name?.toLowerCase() || '';
        return (
            skillName.includes('read') ||
            skillName.includes('listen') ||
            skillName.includes('struct') ||
            skillName.includes('struc')
        );
    });
};

const getValidSkillsCount = (attempt) => {
    const validSkills = getValidSkills(attempt);
    return validSkills.length > 0 ? validSkills.length : (attempt.skills_count || 1);
};

const getValidTotalLevels = (attempt) => {
    const validSkills = getValidSkills(attempt);
    if (validSkills.length === 0) return attempt.total_levels || 1;
    return validSkills.reduce((sum, skillResult) => sum + (skillResult.skill?.levels_count || 1), 0);
};


const getTotalScore = (attempt) => {
    const validSkills = getValidSkills(attempt);
    return validSkills.reduce((sum, skillResult) => {
        return sum + (getCalculatedSkillScore(skillResult) || 0);
    }, 0);
};

const selectedReports = ref([]);

const selectAll = computed({
    get: () => {
        const f = filtered();
        return f.length > 0 && selectedReports.value.length === f.length;
    },
    set: (value) => {
        if (value) {
            selectedReports.value = filtered().map(a => a.id);
        } else {
            selectedReports.value = [];
        }
    }
});

const isSelected = (id) => selectedReports.value.includes(id);

const toggleSelection = (id) => {
    const index = selectedReports.value.indexOf(id);
    if (index > -1) {
        selectedReports.value.splice(index, 1);
    } else {
        selectedReports.value.push(id);
    }
};

const isPrinting = ref(false);

const generatePDF = () => {
    if (selectedReports.value.length === 0) return;
    isPrinting.value = true;
    
    setTimeout(() => {
        window.print();
        isPrinting.value = false;
    }, 300);
};

onMounted(() => {
    fetchReports();
    fetchPartners();
    
});
</script>

<template>
  <AdminLayout>
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
            <div>
                <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Academic Registry</h1>
                <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Movement reports for completed evaluations</p>
            </div>
            <div class="flex flex-wrap items-center gap-3 mt-4 md:mt-0 justify-end">
                <Button v-if="selectedReports.length > 0"
                        :label="'Download PDF (' + selectedReports.length + ')'"
                        icon="pi pi-file-pdf"
                        severity="danger"
                        :loading="isPrinting"
                        @click="generatePDF"
                        class="!text-xs font-bold rounded-xl h-10 px-4" />
                <DatePicker v-model="startDate" placeholder="Start Date" dateFormat="dd/mm/yy" class="w-36 bg-slate-50 border-slate-100 rounded-xl text-xs font-bold" />
                <DatePicker v-model="endDate" placeholder="End Date" dateFormat="dd/mm/yy" class="w-36 bg-slate-50 border-slate-100 rounded-xl text-xs font-bold" />
                <Button v-if="startDate || endDate" icon="pi pi-times" severity="danger" text rounded aria-label="Clear Dates" @click="clearDates" class="!w-10 !h-10 !p-0" />
                
                <Select v-model="selectedPartner" :options="partners" optionLabel="partner_name" optionValue="id" placeholder="Filter by Partner" showClear class="w-48 bg-slate-50 border-slate-100 rounded-xl text-xs font-bold" />
                <span class="relative">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 text-xs" />
                    <input v-model="search" type="text" placeholder="Filter identities..."
                        class="bg-slate-50 border border-slate-100 rounded-xl px-10 py-2.5 text-xs font-bold focus:bg-white transition-all w-64 outline-none">
                </span>
                <Button icon="pi pi-refresh" outlined severity="secondary" @click="fetchReports" />
            </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-40">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8">Parsing Database History...</p>
        </div>

        <div v-else>
            <div v-if="filtered().length > 0" id="reports-table-container" class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <table class="w-full text-left">
                    <thead class="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                        <tr>
                            <th class="p-6 w-16 text-center pdf-ignore">
                                <input type="checkbox" v-model="selectAll" class="w-5 h-5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer">
                            </th>
                            <th class="p-6">Institutional Identity</th>
                            <th class="p-6">Assessment Module</th>
                            <th class="p-6 text-center">Efficiency</th>
                            <th class="p-6 text-center">Status</th>
                            <th class="p-6 text-center">Start Time</th>
                            <th class="p-6 pr-8 text-right">Completion</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50 text-sm">
                        <template v-for="attempt in filtered()" :key="attempt.id">
                            <tr @click="viewDetails(attempt.id)"
                                :class="{'pdf-ignore': !isSelected(attempt.id)}"
                                class="hover:bg-slate-50/50 transition cursor-pointer group">
                                <td class="p-6 text-center pdf-ignore" @click.stop>
                                    <input type="checkbox" :checked="isSelected(attempt.id)" @change="toggleSelection(attempt.id)" class="w-5 h-5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer">
                                </td>
                                <td class="p-6 flex items-center gap-4">
                                    <div class="w-11 h-11 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-rose-100 flex-shrink-0 group-hover:scale-110 transition-transform">
                                        {{ attempt.student?.user?.first_name?.[0] || 'S' }}
                                    </div>
                                    <div>
                                        <div class="font-black text-slate-800 uppercase tracking-tight">
                                            {{ attempt.student?.user?.first_name || attempt.user?.first_name || 'DEMO' }} 
                                            {{ attempt.student?.user?.last_name || attempt.user?.last_name || 'USER' }}
                                        </div>
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {{ attempt.student?.student_code || 'STAFF/DEMO' }}
                                        </div>
                                    </div>
                                </td>
                                <td class="p-6">
                                    <div class="font-bold text-slate-600">{{ attempt.exam?.title }}</div>
                                    <div class="text-[9px] font-black text-brand-accent uppercase tracking-widest">Placement Protocol</div>
                                </td>
                                <td class="p-6 text-center">
                                    <!-- <span :class="scoreColor(attempt.overall_score)" class="text-2xl font-black italic tracking-tighter">
                                        {{ attempt.overall_score*800 }}
                                    </span> -->
                                    <span :class="scoreColor(attempt.overall_score)" class="text-2xl font-black italic tracking-tighter">
                                       {{ Number((Number(getTotalScore(attempt)) / getValidSkillsCount(attempt)).toFixed(2)) }}</span>
                                    
                                    <!-- <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2"></span> -->
                                    <!-- <span class="text-xl font-black text-slate-500"> / {{ Number((getTotalLevels(attempt) * 100 / attempt.skills_count).toFixed(2)) }}</span> -->
                                    <span class="text-xl font-black text-slate-500"> / {{Number(getValidTotalLevels(attempt)* 100 / getValidSkillsCount(attempt) , 2)}} </span>
                                    <div v-if="attempt.cefr_actfl_level" class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">{{ attempt.cefr_actfl_level }}</div>
                                </td>
                                <td class="p-6 text-center">
                                    <Tag :value="attempt.status" 
                                         :severity="attempt.status === 'completed' ? 'success' : 'warning'" 
                                         class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                                </td>
                                <td class="p-6 text-center">
                                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {{ attempt.started_at ? new Date(attempt.started_at).toLocaleDateString('en-GB') : '---' }}
                                    </div>
                                    <div class="text-[8px] font-bold text-slate-400 uppercase tracking-tight" v-if="attempt.started_at">
                                        {{ new Date(attempt.started_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}
                                    </div>
                                </td>
                                <td class="p-6 pr-8 text-right">
                                    <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {{ attempt.finished_at ? new Date(attempt.finished_at).toLocaleDateString('en-GB') : 'PENDING' }}
                                    </div>
                                    <div class="text-[8px] font-bold text-emerald-500 uppercase tracking-tight" v-if="attempt.status === 'completed'">Validated Outcome</div>
                                </td>
                            </tr>
                            <tr v-if="attempt.attempt_skills && attempt.attempt_skills.length > 0"
                                :class="{'pdf-ignore': !isSelected(attempt.id)}">
                                <td colspan="7" class="bg-slate-50/50 px-10 pb-6 pt-2 border-t-0">
                                    <div class="flex flex-wrap gap-3 mt-2">
                                        <div 
                                            v-for="skillResult in getSortedSkills(attempt.attempt_skills)" :key="skillResult.id"
                                            class="mr-4 group shrink-0">

                                            <div class="flex items-center space-x-3 px-6 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:border-slate-200">
                                                <span class="w-6 h-6 rounded-lg bg-indigo-50/50 text-indigo-500 flex items-center justify-center font-black text-[10px]">{{
                                                    skillResult.skill?.short_code || 'S' }}</span>
                                                
                                                <span class="font-bold text-slate-500 text-xs uppercase ml-1">
                                                    {{ getSkillDisplayName(skillResult.skill?.name) }}
                                                </span>

                                                <span class="font-black text-sm ml-3" :class="scoreColor(skillResult.score)">
                                                    {{ getCalculatedSkillScore(skillResult) !== null ? getCalculatedSkillScore(skillResult) + '/' + getMaxSkillScore(skillResult, attempt) : '—' }}
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
                <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">No Evaluated Entities Found</h3>
                <p class="text-slate-400 font-bold mt-4 text-[10px] uppercase tracking-widest max-w-sm mx-auto">Reports will populate automatically upon successful completion of student placement assessments.</p>
            </div>
        </div>
    </div>
  </AdminLayout>

  <Teleport to="body">
    <div v-if="isPrinting" id="print-view" class="bg-white w-full p-8 text-black">
        <div class="mb-6 flex justify-between items-end">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Academic Registry</h2>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Movement reports for completed evaluations</p>
            </div>
            <div class="text-xs font-bold text-slate-400">
                Generated on: {{ new Date().toLocaleDateString('en-GB') }}
            </div>
        </div>
        
        <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                    <tr>
                        <th class="p-6">Institutional Identity</th>
                        <th class="p-6">Assessment Module</th>
                        <th class="p-6 text-center">Efficiency</th>
                        <th class="p-6 text-center">Status</th>
                        <th class="p-6 text-center">Start Time</th>
                        <th class="p-6 pr-8 text-right">Completion</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 text-sm">
                    <template v-for="attempt in filtered().filter(a => isSelected(a.id))" :key="'print-'+attempt.id">
                        <tr class="group">
                            <td class="p-6 flex items-center gap-4">
                                <div class="w-11 h-11 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-rose-100 flex-shrink-0">
                                    {{ attempt.student?.user?.first_name?.[0] || 'S' }}
                                </div>
                                <div>
                                    <div class="font-black text-slate-800 uppercase tracking-tight">
                                        {{ attempt.student?.user?.first_name || attempt.user?.first_name || 'DEMO' }} 
                                        {{ attempt.student?.user?.last_name || attempt.user?.last_name || 'USER' }}
                                    </div>
                                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {{ attempt.student?.student_code || 'STAFF/DEMO' }}
                                    </div>
                                </div>
                            </td>
                            <td class="p-6">
                                <div class="font-bold text-slate-600">{{ attempt.exam?.title }}</div>
                                <div class="text-[9px] font-black text-brand-accent uppercase tracking-widest">Placement Protocol</div>
                            </td>
                            <td class="p-6 text-center">
                                <span :class="scoreColor(attempt.overall_score)" class="text-2xl font-black italic tracking-tighter">
                                    {{ Number((Number(getTotalScore(attempt)) / getValidSkillsCount(attempt)).toFixed(2)) }}</span>
                                <span class="text-xl font-black text-slate-500"> / {{Number(getValidTotalLevels(attempt)* 100 / getValidSkillsCount(attempt) , 2)}} </span>
                                <div v-if="attempt.cefr_actfl_level" class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">{{ attempt.cefr_actfl_level }}</div>
                            </td>
                            <td class="p-6 text-center">
                                <Tag :value="attempt.status" 
                                     :severity="attempt.status === 'completed' ? 'success' : 'warning'" 
                                     class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                            </td>
                            <td class="p-6 text-center">
                                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {{ attempt.started_at ? new Date(attempt.started_at).toLocaleDateString('en-GB') : '---' }}
                                </div>
                                <div class="text-[8px] font-bold text-slate-400 uppercase tracking-tight" v-if="attempt.started_at">
                                    {{ new Date(attempt.started_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}
                                </div>
                            </td>
                            <td class="p-6 pr-8 text-right">
                                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {{ attempt.finished_at ? new Date(attempt.finished_at).toLocaleDateString('en-GB') : 'PENDING' }}
                                </div>
                                <div class="text-[8px] font-bold text-emerald-500 uppercase tracking-tight" v-if="attempt.status === 'completed'">Validated Outcome</div>
                            </td>
                        </tr>
                        <tr v-if="attempt.attempt_skills && attempt.attempt_skills.length > 0">
                            <td colspan="6" class="bg-slate-50/50 px-10 pb-6 pt-2 border-t-0">
                                <div class="flex flex-wrap gap-3 mt-2">
                                    <div 
                                        v-for="skillResult in getSortedSkills(attempt.attempt_skills)" :key="'print-skill-'+skillResult.id"
                                        class="mr-4 group shrink-0">
                                        <div class="flex items-center space-x-3 px-6 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all">
                                            <span class="w-6 h-6 rounded-lg bg-indigo-50/50 text-indigo-500 flex items-center justify-center font-black text-[10px]">{{
                                                skillResult.skill?.short_code || 'S' }}</span>
                                            <span class="font-bold text-slate-500 text-xs uppercase ml-1">
                                                {{ getSkillDisplayName(skillResult.skill?.name) }}
                                            </span>
                                            <span class="font-black text-sm ml-3" :class="scoreColor(skillResult.score)">
                                                {{ getCalculatedSkillScore(skillResult) !== null ? getCalculatedSkillScore(skillResult) + '/' + getMaxSkillScore(skillResult, attempt) : '—' }}
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
    </div>
  </Teleport>
</template>

<style>
@media print {
    body > :not(#print-view) {
        display: none !important;
    }
    #print-view {
        position: relative !important;
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
    }
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    @page {
        margin: 0.5cm;
        size: landscape;
    }
}
</style>
