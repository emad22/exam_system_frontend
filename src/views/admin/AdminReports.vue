<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useAdminStore } from '@/stores/admin';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import ReportListSkeleton from '@/components/skeletons/ReportListSkeleton.vue';
import TableSkeleton from '@/components/skeletons/TableSkeleton.vue';
import FilterBar from '@/components/FilterBar.vue';
const { showAlert, showConfirm } = useModal();

const router = useRouter();
const adminStore = useAdminStore();
const attempts = ref([]);
const partners = ref([]);
const loading = ref(true);

// Restore filters from sessionStorage if coming back from report detail
const _savedFilters = (() => {
    try { return JSON.parse(sessionStorage.getItem('reports_filters') || 'null'); } catch { return null; }
})();
const selectedPartner = ref(_savedFilters?.selectedPartner ?? null);
const search = ref(_savedFilters?.search ?? '');
const startDate = ref(_savedFilters?.startDate ? new Date(_savedFilters.startDate) : null);
const endDate = ref(_savedFilters?.endDate ? new Date(_savedFilters.endDate) : null);

const clearDates = () => {
    startDate.value = null;
    endDate.value = null;
    sessionStorage.setItem('reports_filters', JSON.stringify({
        selectedPartner: selectedPartner.value,
        search: search.value,
        startDate: null,
        endDate: null,
    }));
};

const skillMap = {
    'listening': 'Listening',
    'reading': 'Reading',
    'grammar': 'Grammar',
    'writing': 'Writing',
    'writting': 'Writing',
    'speaking': 'Speaking'
};

const skillIcons = {
    'Listening': 'pi pi-headphones',
    'Reading': 'pi pi-book',
    'Grammar': 'pi pi-pencil',
    'Writing': 'pi pi-file-edit',
    'Speaking': 'pi pi-microphone',
};

const getSkillIcon = (displayName) => skillIcons[displayName] || 'pi pi-star';

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
    router.push({ name: routeName, params: { id: id } });
};

const currentPage = ref(1);
const rowsPerPage = ref(15);
const rowsPerPageOptions = [10, 15, 25, 50, 100];

const filteredAttempts = computed(() => {
    let result = attempts.value;

    if (selectedPartner.value) {
        result = result.filter(a => a.student?.partner_id === selectedPartner.value);
    }

    if (search.value) {
        const q = search.value.toLowerCase();
        result = result.filter(a => {
            const searchableText = [
                `${a.student?.user?.first_name || ''} ${a.student?.user?.last_name || ''}`,
                a.student?.student_code,
                a.student?.institution_code,
                a.exam?.title,
            ].filter(Boolean).join(' ').toLowerCase();
            return searchableText.includes(q);
        });
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
});

const totalRecords = computed(() => filteredAttempts.value.length);
const totalPages = computed(() => Math.ceil(totalRecords.value / rowsPerPage.value) || 1);

const paginatedAttempts = computed(() => {
    const start = (currentPage.value - 1) * rowsPerPage.value;
    return filteredAttempts.value.slice(start, start + rowsPerPage.value);
});

const changePage = (page) => {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page;
};

const filtered = () => filteredAttempts.value;

watch([search, selectedPartner, startDate, endDate], () => {
    currentPage.value = 1;
    const toISO = (val) => {
        if (!val) return null;
        if (val instanceof Date && !isNaN(val)) return val.toISOString();
        const d = new Date(val);
        return !isNaN(d) ? d.toISOString() : null;
    };
    sessionStorage.setItem('reports_filters', JSON.stringify({
        selectedPartner: selectedPartner.value,
        search: search.value,
        startDate: toISO(startDate.value),
        endDate: toISO(endDate.value),
    }));
});

// ── Score helpers ──────────────────────────────────────────────────────────────

const getCalculatedSkillScore = (skillResult, attempt) => {
    if (!skillResult || skillResult.score === null || skillResult.score === undefined) return null;
    if (skillResult.max_points) {
        return Math.round(Number(skillResult.score) * skillResult.max_points / 100);
    }
    let levelsCount = skillResult.skill?.levels_count || 1;
    if (levelsCount === 1 && attempt?.attempt_skills) {
        const referenceSkill = attempt.attempt_skills.find(s => (s.skill?.levels_count || 1) > 1);
        if (referenceSkill?.skill?.levels_count) levelsCount = referenceSkill.skill.levels_count;
    }
    return Math.round(Number(skillResult.score) * levelsCount);
};

const getMaxSkillScore = (skillResult, attempt) => {
    if (skillResult.max_points) return skillResult.max_points;
    let levelsCount = skillResult.skill?.levels_count || 1;
    if (levelsCount === 1 && attempt?.attempt_skills) {
        const referenceSkill = attempt.attempt_skills.find(s => (s.skill?.levels_count || 1) > 1);
        if (referenceSkill?.skill?.levels_count) levelsCount = referenceSkill.skill.levels_count;
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
            skillName.includes('struc') ||
            skillName.includes('grammar')
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
        return sum + (getCalculatedSkillScore(skillResult, attempt) || 0);
    }, 0);
};

const getOverallScore = (attempt) => {
    return Number((Number(getTotalScore(attempt)) / getValidSkillsCount(attempt)).toFixed(0));
};

const getMaxOverallScore = (attempt) => {
    return Number((getValidTotalLevels(attempt) * 100 / getValidSkillsCount(attempt)).toFixed(0));
};

const getOverallPercent = (attempt) => {
    const max = getMaxOverallScore(attempt);
    if (!max) return 0;
    return Math.round((getOverallScore(attempt) / max) * 100);
};

// ── Summary stats ─────────────────────────────────────────────────────────────
const summaryStats = computed(() => {
    const completed = filteredAttempts.value.filter(a => a.status === 'completed');
    const total = filteredAttempts.value.length;

    // Average score (percent)
    const scores = completed.map(a => getOverallPercent(a)).filter(s => !isNaN(s));
    const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

    // Highest score
    let highestScore = 0;
    let highestStudentName = '—';
    let highestRaw = 0;
    let highestMax = 0;
    completed.forEach(a => {
        const s = getOverallScore(a);
        if (s > highestScore) {
            highestScore = s;
            highestMax = getMaxOverallScore(a);
            highestStudentName = `${a.student?.user?.first_name || a.user?.first_name || ''} ${a.student?.user?.last_name || a.user?.last_name || ''}`.trim() || 'N/A';
        }
    });

    // Total time (sum of all durations in seconds)
    let totalSeconds = 0;
    filteredAttempts.value.forEach(a => {
        if (a.started_at && a.finished_at) {
            totalSeconds += Math.max(0, (new Date(a.finished_at) - new Date(a.started_at)) / 1000);
        }
    });
    const totalMins = Math.floor(totalSeconds / 60);
    const totalSecs = Math.round(totalSeconds % 60);
    const totalTimeStr = totalSeconds > 0 ? `${totalMins}m ${totalSecs}s` : '—';

    return {
        total,
        completed: completed.length,
        completedPct: total ? Math.round((completed.length / total) * 100) : 0,
        avgScore,
        avgScoreDisplay: `${avgScore}%`,
        highestScore,
        highestMax,
        highestStudentName,
        totalTimeStr,
    };
});

// ── Score circle stroke calculation ──────────────────────────────────────────
const getCircleStroke = (percent) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    return { circumference, offset };
};

const scoreCircleColor = (percent) => {
    if (percent >= 70) return '#10b981'; // emerald
    if (percent >= 40) return '#f59e0b'; // amber
    return '#ef4444';                     // red
};

// ── Print support ─────────────────────────────────────────────────────────────
const selectedReports = ref([]);

const selectAll = computed({
    get: () => {
        const f = filtered();
        return f.length > 0 && selectedReports.value.length === f.length;
    },
    set: (value) => {
        if (value) selectedReports.value = filtered().map(a => a.id);
        else selectedReports.value = [];
    }
});

const isSelected = (id) => selectedReports.value.includes(id);

const toggleSelection = (id) => {
    const index = selectedReports.value.indexOf(id);
    if (index > -1) selectedReports.value.splice(index, 1);
    else selectedReports.value.push(id);
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

// ── Format helpers ────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const getInitials = (attempt) => {
    const first = attempt.student?.user?.first_name || attempt.user?.first_name || 'S';
    return first[0].toUpperCase();
};

const getAvatarColor = (attempt) => {
    const colors = ['#C0392B', '#8e44ad', '#2980b9', '#27ae60', '#e67e22', '#16a085'];
    const name = attempt.student?.user?.first_name || attempt.user?.first_name || 'S';
    return colors[name.charCodeAt(0) % colors.length];
};

onMounted(() => {
    fetchReports();
    fetchPartners();
});
</script>

<template>
  <AdminLayout>
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-6">

        <!-- ── Page Header ───────────────────────────────────────────────── -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-5">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <!-- Title -->
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                        <i class="pi pi-chart-line text-brand-primary text-base"></i>
                    </div>
                    <div>
                        <div class="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Operational Hub</div>
                        <h1 class="text-2xl font-black text-slate-800 tracking-tight leading-none">Reports</h1>
                    </div>
                </div>

                <!-- Header Actions -->
                <div class="flex items-center gap-2.5">
                    <Button v-if="selectedReports.length > 0"
                        :label="'Download PDF (' + selectedReports.length + ')'"
                        icon="pi pi-file-pdf"
                        severity="danger"
                        :loading="isPrinting"
                        @click="generatePDF"
                        class="!text-xs font-bold rounded-xl h-10 px-4" />

                    <button @click="fetchReports"
                        class="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-white transition-all cursor-pointer">
                        <i class="pi pi-refresh text-sm"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- ── Filter Bar ───────────────────────────────────────────────── -->
        <FilterBar
            v-model="search"
            search-placeholder="Filter identities / codes..."
            v-model:dateFrom="startDate"
            v-model:dateTo="endDate"
            :active-count="selectedPartner ? 1 : 0"
            @reset="search = ''; startDate = null; endDate = null; selectedPartner = null; fetchReports()"
            @apply="fetchReports"
        >
            <div class="w-full sm:w-48">
                <label class="block text-[11px] font-bold text-slate-600 mb-1.5 tracking-tight flex items-center gap-1.5">
                    <i class="pi pi-users text-[10px] text-slate-400" />
                    <span>Partner</span>
                </label>
                <Select v-model="selectedPartner" :options="partners" optionLabel="partner_name" optionValue="id"
                    placeholder="All Partners" showClear
                    class="w-full !h-11 !rounded-xl !border-slate-200/80 !bg-slate-50/70 !text-xs !font-semibold" />
            </div>
        </FilterBar>

        <!-- ── Loading ───────────────────────────────────────────────────── -->
        <div v-if="loading" class="mt-2">
            <ReportListSkeleton :rows="8" />
        </div>

        <template v-else>

            <!-- ── Summary Cards ───────────────────────────────────────────── -->
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-5">
                <!-- Sub-header -->
                <div class="mb-5">
                    <h2 class="text-base font-black text-slate-800">Exam reports</h2>
                    <p class="text-xs text-slate-400 mt-0.5">Reports for completed exams</p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <!-- Total Exams -->
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <i class="pi pi-clipboard text-slate-500 text-base"></i>
                        </div>
                        <div>
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Exams</div>
                            <div class="text-2xl font-black text-slate-800 leading-none">{{ summaryStats.total }}</div>
                            <div class="text-[10px] text-slate-400 mt-0.5">Completed exams</div>
                        </div>
                    </div>

                    <!-- Completed -->
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <i class="pi pi-check-circle text-emerald-500 text-base"></i>
                        </div>
                        <div>
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</div>
                            <div class="text-2xl font-black text-slate-800 leading-none">{{ summaryStats.completed }}</div>
                            <div class="text-[10px] text-slate-400 mt-0.5">{{ summaryStats.completedPct }}% of total</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── Report Rows ──────────────────────────────────────────────── -->
            <div v-if="filteredAttempts.length > 0" id="reports-table-container" class="space-y-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

                <!-- Table Header -->
                <div class="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_2fr_1fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div>Student</div>
                    <div>Exam Details</div>
                    <div class="text-center">Overall Score</div>
                    <div class="text-center">Status</div>
                    <div>Dates</div>
                    <div class="text-right">Actions</div>
                </div>

                <template v-for="attempt in paginatedAttempts" :key="attempt.id">
                    <!-- Main Row -->
                    <div class="border-b border-slate-50 last:border-0">
                        <div class="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_2fr_1fr] gap-4 px-6 py-5 items-center hover:bg-slate-50/60 transition-colors cursor-pointer group"
                             @click="viewDetails(attempt.id)">

                            <!-- Student -->
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm"
                                     :style="{ backgroundColor: getAvatarColor(attempt) }">
                                    {{ getInitials(attempt) }}
                                </div>
                                <div>
                                    <div class="font-black text-slate-800 text-sm">
                                        {{ attempt.student?.user?.first_name || attempt.user?.first_name }}
                                        {{ attempt.student?.user?.last_name || attempt.user?.last_name }}
                                    </div>
                                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                                        {{ attempt.student?.student_code }}
                                    </div>
                                    <div v-if="attempt.student?.institution_code"
                                         class="text-[10px] font-bold text-brand-primary mt-0.5">
                                        🏛 {{ attempt.student.institution_code }}
                                    </div>
                                </div>
                            </div>

                            <!-- Exam Details -->
                            <div>
                                <div class="font-bold text-slate-700 text-sm">{{ attempt.exam?.title || '—' }}</div>
                                <div v-if="attempt.cefr_actfl_level"
                                     class="mt-1.5 inline-block bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                                    {{ attempt.cefr_actfl_level }}
                                </div>
                            </div>

                            <!-- Overall Score — circular gauge -->
                            <div class="flex flex-col items-center gap-1" @click.stop="viewDetails(attempt.id)">
                                <div class="relative w-16 h-16">
                                    <svg class="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
                                        <circle cx="36" cy="36" r="28" fill="none" stroke="#f1f5f9" stroke-width="6" />
                                        <circle cx="36" cy="36" r="28" fill="none"
                                            :stroke="scoreCircleColor(getOverallPercent(attempt))"
                                            stroke-width="6"
                                            stroke-linecap="round"
                                            :stroke-dasharray="getCircleStroke(getOverallPercent(attempt)).circumference"
                                            :stroke-dashoffset="getCircleStroke(getOverallPercent(attempt)).offset" />
                                    </svg>
                                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                                        <span class="text-sm font-black text-slate-800 leading-none">{{ getOverallScore(attempt) }}</span>
                                        <span class="text-[8px] text-slate-400 font-bold">/ {{ getMaxOverallScore(attempt) }}</span>
                                    </div>
                                </div>
                                <div class="text-[9px] font-bold text-slate-400">{{ getOverallPercent(attempt) }}%</div>
                            </div>

                            <!-- Status -->
                            <div class="flex flex-col items-center gap-1">
                                <Tag :value="attempt.status === 'completed' ? 'COMPLETED' : attempt.status.toUpperCase()"
                                     :severity="attempt.status === 'completed' ? 'success' : 'warning'"
                                     class="text-[9px] font-black uppercase tracking-wider px-3 rounded-lg" />
                                <div v-if="attempt.status === 'completed'"
                                     class="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
                                    <i class="pi pi-check-circle text-[9px]"></i> Validated outcome
                                </div>
                            </div>

                            <!-- Dates -->
                            <div class="space-y-1.5">
                                <div>
                                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Start Time</div>
                                    <div class="text-xs font-bold text-slate-700">{{ formatDate(attempt.started_at) }}</div>
                                    <div class="text-[10px] text-slate-500">{{ formatTime(attempt.started_at) }}</div>
                                </div>
                                <div v-if="attempt.finished_at">
                                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-wider">Completion</div>
                                    <div class="text-xs font-bold text-slate-700">{{ formatDate(attempt.finished_at) }}</div>
                                    <div class="text-[10px] text-slate-500">{{ formatTime(attempt.finished_at) }}</div>
                                </div>
                            </div>

                            <!-- Action -->
                            <div class="flex items-center justify-end gap-1.5" @click.stop>
                                <button @click="$router.push(`/admin/grading/attempt/${attempt.id}`)"
                                    title="Edit Speaking / Writing Grades (تصحيح وتعديل الدرجات)"
                                    class="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-800 text-slate-600 hover:text-white flex items-center justify-center transition-all shadow-xs border border-slate-200 hover:border-slate-800 cursor-pointer">
                                    <i class="pi pi-file-edit text-xs"></i>
                                </button>
                                <button @click="viewDetails(attempt.id)"
                                    title="View Report Details"
                                    class="w-9 h-9 rounded-xl bg-rose-50 hover:bg-brand-primary text-brand-primary hover:text-white flex items-center justify-center transition-all shadow-xs border border-rose-100 hover:border-brand-primary group/btn cursor-pointer">
                                    <i class="pi pi-eye text-sm"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Skills Scores Sub-row -->
                        <div v-if="attempt.attempt_skills && attempt.attempt_skills.length > 0"
                             class="px-6 pb-4 border-t border-slate-50 bg-slate-50/30">
                            <div class="flex flex-wrap gap-2 mt-3">
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest self-center mr-2">Skills Scores</div>
                                <div v-for="skillResult in getSortedSkills(attempt.attempt_skills)" :key="skillResult.id"
                                     class="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-1.5 shadow-sm">
                                    <i :class="getSkillIcon(getSkillDisplayName(skillResult.skill?.name))"
                                       class="text-slate-400 text-[11px]"></i>
                                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        {{ getSkillDisplayName(skillResult.skill?.name) }}
                                    </span>
                                    <span class="font-black text-xs"
                                          :class="getCalculatedSkillScore(skillResult, attempt) !== null
                                            ? (getCalculatedSkillScore(skillResult, attempt) / getMaxSkillScore(skillResult, attempt) >= 0.7 ? 'text-emerald-600'
                                              : getCalculatedSkillScore(skillResult, attempt) / getMaxSkillScore(skillResult, attempt) >= 0.4 ? 'text-amber-500'
                                              : 'text-rose-500')
                                            : 'text-slate-400'">
                                        {{ getCalculatedSkillScore(skillResult, attempt) !== null
                                            ? getCalculatedSkillScore(skillResult, attempt) + '/' + getMaxSkillScore(skillResult, attempt)
                                            : '—' }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>

            <!-- ── Pagination ──────────────────────────────────────────────── -->
            <div v-if="filteredAttempts.length > 0"
                 class="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                <div class="flex items-center gap-4">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Showing
                        <span class="text-slate-700 font-black">
                            {{ (currentPage - 1) * rowsPerPage + 1 }}–{{ Math.min(currentPage * rowsPerPage, totalRecords) }}
                        </span>
                        of
                        <span class="text-slate-700 font-black">{{ totalRecords }}</span>
                        records
                    </span>
                    <select v-model="rowsPerPage" @change="currentPage = 1"
                        class="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all">
                        <option v-for="opt in rowsPerPageOptions" :key="opt" :value="opt">{{ opt }} / page</option>
                    </select>
                </div>

                <div class="flex items-center gap-1">
                    <button @click="changePage(1)" :disabled="currentPage === 1"
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <i class="pi pi-angle-double-left text-xs" />
                    </button>
                    <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1"
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <i class="pi pi-angle-left text-xs" />
                    </button>

                    <template v-for="page in totalPages" :key="page">
                        <button v-if="page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)"
                            @click="changePage(page)"
                            :class="[
                                'w-8 h-8 rounded-xl text-[11px] font-black transition-all',
                                page === currentPage
                                    ? 'bg-brand-primary text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-100'
                            ]">
                            {{ page }}
                        </button>
                        <span v-else-if="page === currentPage - 3 || page === currentPage + 3"
                            class="w-8 h-8 flex items-center justify-center text-slate-300 text-xs font-bold">…</span>
                    </template>

                    <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages"
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <i class="pi pi-angle-right text-xs" />
                    </button>
                    <button @click="changePage(totalPages)" :disabled="currentPage === totalPages"
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <i class="pi pi-angle-double-right text-xs" />
                    </button>
                </div>
            </div>

            <!-- ── Empty State ─────────────────────────────────────────────── -->
            <div v-else class="bg-white rounded-2xl border border-slate-100 p-32 text-center shadow-sm">
                <div class="text-6xl mb-6 opacity-20 grayscale">📊</div>
                <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">No Reports Found</h3>
                <p class="text-slate-400 font-bold mt-4 text-[10px] uppercase tracking-widest max-w-sm mx-auto">
                    Reports will appear automatically once students complete their assessments.
                </p>
            </div>

        </template>
    </div>
  </AdminLayout>

  <!-- ── Print View (unchanged) ─────────────────────────────────────────────── -->
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
                        <th class="p-6">Student</th>
                        <th class="p-6">Exam</th>
                        <th class="p-6 text-center">Score</th>
                        <th class="p-6 text-center">Status</th>
                        <th class="p-6 text-center">Started</th>
                        <th class="p-6 pr-8 text-right">Completed</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 text-sm">
                    <template v-for="attempt in filtered().filter(a => isSelected(a.id))" :key="'print-'+attempt.id">
                        <tr>
                            <td class="p-6">
                                <div class="font-black text-slate-800 uppercase">
                                    {{ attempt.student?.user?.first_name || attempt.user?.first_name || 'DEMO' }}
                                    {{ attempt.student?.user?.last_name || attempt.user?.last_name || 'USER' }}
                                </div>
                                <div class="text-[10px] text-slate-400">{{ attempt.student?.student_code || 'STAFF/DEMO' }}</div>
                            </td>
                            <td class="p-6">
                                <div class="font-bold text-slate-600">{{ attempt.exam?.title }}</div>
                                <div class="text-[9px] font-black text-brand-primary uppercase">Placement Protocol</div>
                            </td>
                            <td class="p-6 text-center">
                                <span class="text-2xl font-black">{{ getOverallScore(attempt) }}</span>
                                <span class="text-base text-slate-400"> / {{ getMaxOverallScore(attempt) }}</span>
                                <div v-if="attempt.cefr_actfl_level" class="text-[10px] font-black text-indigo-500 uppercase mt-1">{{ attempt.cefr_actfl_level }}</div>
                            </td>
                            <td class="p-6 text-center">
                                <Tag :value="attempt.status" :severity="attempt.status === 'completed' ? 'success' : 'warning'" class="text-[9px] font-black uppercase px-3" />
                            </td>
                            <td class="p-6 text-center text-[10px] font-black text-slate-400">{{ formatDate(attempt.started_at) }}</td>
                            <td class="p-6 pr-8 text-right text-[10px] font-black text-slate-400">{{ attempt.finished_at ? formatDate(attempt.finished_at) : 'PENDING' }}</td>
                        </tr>
                        <tr v-if="attempt.attempt_skills?.length">
                            <td colspan="6" class="bg-slate-50/50 px-10 pb-6 pt-2">
                                <div class="flex flex-wrap gap-3 mt-2">
                                    <div v-for="skillResult in getSortedSkills(attempt.attempt_skills)" :key="'ps-'+skillResult.id"
                                         class="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2">
                                        <span class="text-xs font-bold text-slate-500 uppercase">{{ getSkillDisplayName(skillResult.skill?.name) }}</span>
                                        <span class="font-black text-sm text-slate-700">
                                            {{ getCalculatedSkillScore(skillResult, attempt) !== null
                                                ? getCalculatedSkillScore(skillResult, attempt) + '/' + getMaxSkillScore(skillResult, attempt)
                                                : '—' }}
                                        </span>
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
    body > :not(#print-view) { display: none !important; }
    #print-view { position: relative !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { margin: 0.5cm; size: landscape; }
}
</style>
