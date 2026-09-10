<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PartnerLayout from '@/components/PartnerLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import DatePicker from 'primevue/datepicker';
import ReportListSkeleton from '@/components/skeletons/ReportListSkeleton.vue';
import FilterBar from '@/components/FilterBar.vue';
import { useModal } from '@/composables/useModal';
import { exportGradesToExcel, exportAnswersToExcel } from '@/utils/reportsExport';

const route = useRoute();
const router = useRouter();
const { showAlert } = useModal();
const attempts = ref([]);
const loading = ref(true);
const search = ref(route.query.search || '');
const dateFrom = ref(null);
const dateTo = ref(null);

const skillMap = {
    'listening': 'Listening',
    'list': 'Listening',
    'reading': 'Reading',
    'read': 'Reading',
    'structure': 'Structure',
    'struct': 'Structure',
    'grammar': 'Structure',
    'gram': 'Structure',
    'writing': 'Writing',
    'writting': 'Writing',
    'writ': 'Writing',
    'speaking': 'Speaking',
    'speak': 'Speaking'
};

const getSkillDisplayName = (name) => {
    if (!name) return 'Unknown Skill';
    const lowerName = name.toLowerCase();
    const matchedKey = Object.keys(skillMap).find(key => lowerName.includes(key));
    return matchedKey ? skillMap[matchedKey] : name;
};

const getSortedSkills = (skills) => {
    if (!skills) return [];
    const orderMap = { 'Listening': 1, 'Reading': 2, 'Structure': 3, 'Writing': 4, 'Speaking': 5 };
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

const currentPage = ref(1);
const rowsPerPage = ref(15);
const rowsPerPageOptions = [10, 15, 25, 50, 100];

const filteredAttempts = computed(() => {
    let result = attempts.value;

    if (search.value) {
        const q = search.value.toLowerCase();
        result = result.filter(a => {
            const searchableText = [
                `${a.student?.user?.first_name || ''} ${a.student?.user?.last_name || ''}`,
                a.student?.user?.username,
                a.student?.user?.email,
                a.student?.student_code,
                a.exam?.title,
            ].filter(Boolean).join(' ').toLowerCase();
            return searchableText.includes(q);
        });
    }

    if (dateFrom.value) {
        const fromTime = new Date(dateFrom.value).setHours(0, 0, 0, 0);
        result = result.filter(a => {
            if (!a.started_at) return false;
            return new Date(a.started_at).getTime() >= fromTime;
        });
    }

    if (dateTo.value) {
        const toTime = new Date(dateTo.value).setHours(23, 59, 59, 999);
        result = result.filter(a => {
            if (!a.started_at) return false;
            return new Date(a.started_at).getTime() <= toTime;
        });
    }

    return result;
});

const resetFilters = () => {
    search.value = '';
    dateFrom.value = null;
    dateTo.value = null;
    currentPage.value = 1;
};

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

watch([search, dateFrom, dateTo], () => { currentPage.value = 1; });

// ── Score helpers ──────────────────────────────────────────────────────────────
const scoreColor = (score) => {
    if (!score && score !== 0) return 'text-slate-400';
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-rose-600';
};

const getCalculatedSkillScore = (skillResult, attempt) => {
    if (!skillResult || skillResult.score === null || skillResult.score === undefined) return null;
    if (skillResult.max_points) {
        return Math.round(Number(skillResult.score) * skillResult.max_points / 100);
    }
    let levelsCount = skillResult.skill?.levels_count || 1;
    if (levelsCount === 1 && attempt?.attempt_skills) {
        const listeningSkill = attempt.attempt_skills.find(s => s.skill?.name?.toLowerCase() === 'listening');
        if (listeningSkill?.skill?.levels_count) levelsCount = listeningSkill.skill.levels_count;
    }
    return Math.round(Number(skillResult.score) * levelsCount);
};

const getMaxSkillScore = (skillResult, attempt) => {
    if (skillResult.max_points) return skillResult.max_points;
    let levelsCount = skillResult.skill?.levels_count || 1;
    if (levelsCount === 1 && attempt?.attempt_skills) {
        const listeningSkill = attempt.attempt_skills.find(s => s.skill?.name?.toLowerCase() === 'listening');
        if (listeningSkill?.skill?.levels_count) levelsCount = listeningSkill.skill.levels_count;
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
    return validSkills.reduce((sum, skillResult) => sum + (getCalculatedSkillScore(skillResult, attempt) || 0), 0);
};

const getOverallScore = (attempt) => Number((getTotalScore(attempt) / getValidSkillsCount(attempt)).toFixed(0));
const getMaxOverallScore = (attempt) => Number((getValidTotalLevels(attempt) * 100 / getValidSkillsCount(attempt)).toFixed(0));
const getOverallPercent = (attempt) => {
    const max = getMaxOverallScore(attempt);
    return max ? Math.round((getOverallScore(attempt) / max) * 100) : 0;
};

// ── Status helpers ─────────────────────────────────────────────────────────────
const isFullyCompleted = (attempt) => {
    return attempt.status === 'completed';
};

const getStatusLabel = (attempt) => {
    return (attempt.status || '').toUpperCase();
};

const getStatusSeverity = (attempt) => {
    if (attempt.status === 'completed') return 'success';
    if (attempt.status === 'paused') return 'secondary';
    return 'warning';
};

// ── Selection + summary print ─────────────────────────────────────────────────
const selectedReports = ref([]);

const selectAll = computed({
    get: () => {
        const f = filtered();
        return f.length > 0 && selectedReports.value.length === f.length;
    },
    set: (value) => {
        selectedReports.value = value ? filtered().map(a => a.id) : [];
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

// ── Export Grades as Excel ───────────────────────────────────────────────────
const isExportingExcel = ref(false);

const downloadGradesExcel = async () => {
    try {
        isExportingExcel.value = true;
        let targets = [];
        if (selectedReports.value.length > 0) {
            targets = filteredAttempts.value.filter(a => selectedReports.value.includes(a.id));
        } else {
            targets = filteredAttempts.value;
        }

        if (!targets.length) {
            showAlert('No reports available to export.', 'Notice', 'warning');
            return;
        }

        await exportGradesToExcel(targets, {
            fileNamePrefix: 'Partner_Exam_Grades'
        });
    } catch (err) {
        console.error('Failed to export Excel', err);
        showAlert('Failed to generate Excel file.', 'Error', 'danger');
    } finally {
        isExportingExcel.value = false;
    }
};

// ── Download Answers as PDF ───────────────────────────────────────────────────
const showDownloadDialog = ref(false);
const isDownloadingAnswers = ref(false);
const isPrintingAnswers = ref(false);
const answersForPrint = ref([]);

const openDownloadDialog = () => {
    showDownloadDialog.value = true;
};

const downloadAnswers = async () => {
    const ids = selectedReports.value;
    if (ids.length === 0) {
        showAlert('Please select at least one student first.', 'No Selection', 'warning');
        return;
    }
    isDownloadingAnswers.value = true;
    try {
        const results = await Promise.all(
            ids.map(id => api.get(`/partner/reports/${id}`).then(r => r.data))
        );
        answersForPrint.value = results;
        showDownloadDialog.value = false;
        await new Promise(r => setTimeout(r, 400));
        isPrintingAnswers.value = true;
        await new Promise(r => setTimeout(r, 300));
        window.print();
    } catch (err) {
        console.error('Download failed', err);
        showAlert('Failed to load answers for printing.', 'Error', 'danger');
    } finally {
        isDownloadingAnswers.value = false;
        setTimeout(() => { isPrintingAnswers.value = false; }, 1000);
    }
};

const isDownloadingAnswersExcel = ref(false);

const downloadAnswersExcel = async () => {
    const ids = selectedReports.value;
    if (ids.length === 0) {
        showAlert('Please select at least one student first.', 'No Selection', 'warning');
        return;
    }
    isDownloadingAnswersExcel.value = true;
    try {
        const results = await Promise.all(
            ids.map(id => api.get(`/partner/reports/${id}`).then(r => r.data))
        );
        exportAnswersToExcel(results, {
            fileNamePrefix: 'Partner_Student_Answers'
        });
        showDownloadDialog.value = false;
    } catch (err) {
        console.error('Download answers excel failed', err);
        showAlert('Failed to export answers to Excel.', 'Error', 'danger');
    } finally {
        isDownloadingAnswersExcel.value = false;
    }
};

const renderAnswer = (answer) => {
    if (!answer) return '—';
    if (answer.option?.option_text) return answer.option.option_text;
    if (answer.text_answer) return String(answer.text_answer).replace(/<[^>]*>/g, '').trim();
    if (answer.option_id) return `Option #${answer.option_id}`;
    return '—';
};

const renderCorrectAnswer = (question) => {
    if (!question?.options) return '—';
    const correct = question.options.filter(o => o.is_correct).map(o => o.option_text);
    return correct.length ? correct.join(' / ') : '—';
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
            <div class="flex items-center gap-3 relative z-10">
                <Button
                        :label="selectedReports.length > 0 ? ('Download Excel (' + selectedReports.length + ')') : 'Download Excel'"
                        icon="pi pi-file-excel"
                        severity="success"
                        :loading="isExportingExcel"
                        @click="downloadGradesExcel"
                        class="!text-xs font-bold rounded-xl h-10 px-4 shadow-xs hover:shadow-md transition-all cursor-pointer" />

                <Button v-if="selectedReports.length > 0"
                        :label="'Print PDF (' + selectedReports.length + ')'"
                        icon="pi pi-file-pdf"
                        severity="danger"
                        variant="outlined"
                        :loading="isPrinting"
                        @click="generatePDF"
                        class="!text-xs font-bold rounded-xl h-10 px-4 cursor-pointer" />

               

                <Button icon="pi pi-refresh" outlined severity="secondary" @click="fetchReports" />
            </div>
        </div>

        <!-- Filter Bar -->
        <FilterBar
            v-model="search"
            search-placeholder="Search by name, username, email, code..."
            v-model:dateFrom="dateFrom"
            v-model:dateTo="dateTo"
            @reset="resetFilters"
        />

        <div v-if="loading" class="mt-4 px-4 md:px-6">
            <ReportListSkeleton :rows="6" />
        </div>

        <div v-else>
            <div v-if="filteredAttempts.length > 0" class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <table class="w-full text-left">
                    <thead class="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                        <tr>
                            <th class="p-6 w-16 text-center pdf-ignore">
                                <input type="checkbox" v-model="selectAll" class="w-5 h-5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer">
                            </th>
                            <th class="p-6">Student Identity</th>
                            <th class="p-6">Assessment Module</th>
                            <th class="p-6 text-center">Score Matrix</th>
                            <th class="p-6 text-center">Status</th>
                            <th class="p-6 text-center">Start Time</th>
                            <th class="p-6 pr-8 text-right">Completion Date</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50 text-sm">
                        <template v-for="attempt in paginatedAttempts" :key="attempt.id">
                            <tr :class="{'pdf-ignore': !isSelected(attempt.id)}"
                                class="hover:bg-slate-50/50 transition">
                                <td class="p-6 text-center pdf-ignore" @click.stop>
                                    <input type="checkbox" :checked="isSelected(attempt.id)" @change="toggleSelection(attempt.id)" class="w-5 h-5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer">
                                </td>
                                <td class="p-6">
                                    <div class="flex items-center gap-4">
                                        <div class="w-11 h-11 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-rose-100 flex-shrink-0">
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
                                            <div v-if="attempt.student?.user?.email" class="text-[10px] text-slate-400 mt-0.5">
                                                {{ attempt.student.user.email }}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td class="p-6">
                                    <div class="font-bold text-slate-600">{{ attempt.exam?.title }}</div>
                                    <div class="text-[9px] font-black text-brand-accent uppercase tracking-widest">Protocol Matrix</div>
                                </td>
                                <td class="p-6 text-center">
                                    <span :class="scoreColor(attempt.overall_score)" class="text-2xl font-black italic tracking-tighter">
                                        {{ getOverallScore(attempt) }}
                                    </span>
                                    <span class="text-xl font-black text-slate-500"> / {{ getMaxOverallScore(attempt) }}</span>
                                    <div class="text-[10px] text-slate-400 mt-0.5">{{ getOverallPercent(attempt) }}%</div>
                                    <div v-if="attempt.cefr_actfl_level" class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{{ attempt.cefr_actfl_level }}</div>
                                </td>
                                <td class="p-6 text-center">
                                    <Tag :value="getStatusLabel(attempt)"
                                         :severity="getStatusSeverity(attempt)"
                                         class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                                    <div v-if="attempt.status === 'completed'"
                                         class="text-[9px] font-bold text-emerald-500 mt-1 flex items-center justify-center gap-1">
                                        <i class="pi pi-check-circle text-[9px]"></i> Validated
                                    </div>
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
                                    <div v-if="isFullyCompleted(attempt)"
                                         class="text-[8px] font-bold text-emerald-500 uppercase tracking-tight">Validated Outcome</div>
                                </td>
                            </tr>
                            <tr v-if="attempt.attempt_skills && attempt.attempt_skills.length > 0"
                                :class="{'pdf-ignore': !isSelected(attempt.id)}">
                                <td colspan="7" class="bg-slate-50/50 px-10 pb-6 pt-2 border-t-0">
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
                                                    {{ getCalculatedSkillScore(skillResult, attempt) !== null ? getCalculatedSkillScore(skillResult, attempt) + '/' + getMaxSkillScore(skillResult, attempt) : '—' }}
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

            <!-- Pagination Bar -->
            <div v-if="filteredAttempts.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2">
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
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="First page">
                        <i class="pi pi-angle-double-left text-xs" />
                    </button>
                    <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1"
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Previous">
                        <i class="pi pi-angle-left text-xs" />
                    </button>
                    <template v-for="page in totalPages" :key="page">
                        <button v-if="page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)"
                            @click="changePage(page)"
                            :class="[
                                'w-8 h-8 rounded-xl text-[11px] font-black transition-all',
                                page === currentPage ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                            ]">
                            {{ page }}
                        </button>
                        <span v-else-if="page === currentPage - 3 || page === currentPage + 3"
                            class="w-8 h-8 flex items-center justify-center text-slate-300 text-xs font-bold">…</span>
                    </template>
                    <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages"
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Next">
                        <i class="pi pi-angle-right text-xs" />
                    </button>
                    <button @click="changePage(totalPages)" :disabled="currentPage === totalPages"
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Last page">
                        <i class="pi pi-angle-double-right text-xs" />
                    </button>
                </div>
            </div>

            <div v-else class="bg-white rounded-[2.5rem] border border-slate-100 p-32 text-center shadow-sm">
                <div class="text-6xl mb-6 opacity-20 grayscale">📊</div>
                <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">No Evaluated Students Found</h3>
                <p class="text-slate-400 font-bold mt-4 text-[10px] uppercase tracking-widest max-w-sm mx-auto">Reports will populate automatically upon successful completion of your students' assessments.</p>
            </div>
        </div>
    </div>
  </PartnerLayout>

  <!-- ── Download Answers Dialog ───────────────────────────────────────────── -->
  <Dialog v-model:visible="showDownloadDialog" modal header="Download Answers" :style="{ width: '420px' }"
      class="!rounded-2xl">
      <div class="space-y-4 pt-2">
          <div v-if="selectedReports.length === 0"
               class="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs font-bold text-amber-700">
              <i class="pi pi-exclamation-triangle mr-1.5"></i>
              No students selected. Use the checkboxes in the table to select students first.
          </div>
          <div v-else class="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs font-bold text-emerald-700">
              <i class="pi pi-check-circle mr-1.5"></i>
              {{ selectedReports.length }} student(s) selected — their answers will be printed.
          </div>
          <div class="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-bold text-slate-400 flex items-start gap-2">
              <i class="pi pi-file-pdf text-rose-500 text-sm mt-0.5"></i>
              <span>Opens a print-ready PDF view with every answer — student info, question, correct answer, and student response — grouped by student.</span>
          </div>
      </div>
      <template #footer>
          <div class="flex justify-end gap-2 pt-2">
              <Button label="Cancel" severity="secondary" text @click="showDownloadDialog = false"
                  class="!text-xs font-bold rounded-xl h-9 px-4" />
              <Button
                  label="Print / Save PDF"
                  icon="pi pi-file-pdf"
                  severity="danger"
                  variant="outlined"
                  :loading="isDownloadingAnswers"
                  :disabled="selectedReports.length === 0"
                  @click="downloadAnswers"
                  class="!text-xs font-bold rounded-xl h-9 px-4 cursor-pointer" />
              <Button
                  label="Download Excel"
                  icon="pi pi-file-excel"
                  severity="success"
                  :loading="isDownloadingAnswersExcel"
                  :disabled="selectedReports.length === 0"
                  @click="downloadAnswersExcel"
                  class="!text-xs font-bold rounded-xl h-9 px-4 cursor-pointer" />
          </div>
      </template>
  </Dialog>

  <!-- ── Summary Print View ─────────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="isPrinting" id="print-view" class="bg-white w-full p-8 text-black">
        <div class="mb-6 flex justify-between items-end">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Student Registry</h2>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Performance outcomes for your students</p>
            </div>
            <div class="text-xs font-bold text-slate-400">Generated on: {{ new Date().toLocaleDateString('en-GB') }}</div>
        </div>
        <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                    <tr>
                        <th class="p-6">Student Identity</th>
                        <th class="p-6">Assessment Module</th>
                        <th class="p-6 text-center">Score Matrix</th>
                        <th class="p-6 text-center">Status</th>
                        <th class="p-6 text-center">Start Time</th>
                        <th class="p-6 pr-8 text-right">Completion Date</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 text-sm">
                    <template v-for="attempt in filtered().filter(a => isSelected(a.id))" :key="'print-'+attempt.id">
                        <tr>
                            <td class="p-6 flex items-center gap-4">
                                <div class="w-11 h-11 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-rose-100 flex-shrink-0">
                                    {{ attempt.student?.user?.first_name?.[0] || 'S' }}
                                </div>
                                <div>
                                    <div class="font-black text-slate-800 uppercase tracking-tight">
                                        {{ attempt.student?.user?.first_name || attempt.user?.first_name || 'Unknown' }}
                                        {{ attempt.student?.user?.last_name || attempt.user?.last_name || 'Student' }}
                                    </div>
                                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ attempt.student?.student_code || 'STU-XXXXXX' }}</div>
                                </div>
                            </td>
                            <td class="p-6">
                                <div class="font-bold text-slate-600">{{ attempt.exam?.title }}</div>
                            </td>
                            <td class="p-6 text-center">
                                <span :class="scoreColor(attempt.overall_score)" class="text-2xl font-black">{{ getOverallScore(attempt) }}</span>
                                <span class="text-xl font-black text-slate-500"> / {{ getMaxOverallScore(attempt) }}</span>
                                <div v-if="attempt.cefr_actfl_level" class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">{{ attempt.cefr_actfl_level }}</div>
                            </td>
                            <td class="p-6 text-center">
                                <Tag :value="getStatusLabel(attempt)" :severity="getStatusSeverity(attempt)"
                                     class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                            </td>
                            <td class="p-6 text-center text-[10px] font-black text-slate-400 uppercase">
                                {{ attempt.started_at ? new Date(attempt.started_at).toLocaleDateString('en-GB') : '---' }}
                            </td>
                            <td class="p-6 pr-8 text-right text-[10px] font-black text-slate-400 uppercase">
                                {{ attempt.finished_at ? new Date(attempt.finished_at).toLocaleDateString('en-GB') : 'PENDING' }}
                            </td>
                        </tr>
                        <tr v-if="attempt.attempt_skills && attempt.attempt_skills.length > 0">
                            <td colspan="6" class="bg-slate-50/50 px-10 pb-6 pt-2 border-t-0">
                                <div class="flex flex-wrap gap-3 mt-2">
                                    <div v-for="skillResult in getSortedSkills(attempt.attempt_skills)" :key="'print-skill-'+skillResult.id" class="mr-4 shrink-0">
                                        <div class="flex items-center space-x-3 px-6 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                            <span class="w-6 h-6 rounded-lg bg-indigo-50/50 text-indigo-500 flex items-center justify-center font-black text-[10px]">{{ skillResult.skill?.short_code || 'S' }}</span>
                                            <span class="font-bold text-slate-500 text-xs uppercase ml-1">{{ getSkillDisplayName(skillResult.skill?.name) }}</span>
                                            <span class="font-black text-sm ml-3" :class="scoreColor(skillResult.score)">
                                                {{ getCalculatedSkillScore(skillResult, attempt) !== null ? getCalculatedSkillScore(skillResult, attempt) + '/' + getMaxSkillScore(skillResult, attempt) : '—' }}
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

  <!-- ── Answers Print View ─────────────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="isPrintingAnswers" id="answers-print-view" class="bg-white w-full p-8 text-black">
        <div class="mb-8 flex justify-between items-end border-b border-slate-200 pb-6">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">Student Answers Report</h2>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Full answer breakdown per student</p>
            </div>
            <div class="text-xs font-bold text-slate-400">Generated: {{ new Date().toLocaleDateString('en-GB') }}</div>
        </div>

        <template v-for="attempt in answersForPrint" :key="'ap-'+attempt.id">
            <div class="mb-4 mt-8 first:mt-0 flex items-center justify-between bg-slate-50 rounded-2xl px-6 py-4 border border-slate-100">
                <div>
                    <div class="text-base font-black text-slate-800 uppercase tracking-tight">
                        {{ attempt.student?.user?.first_name || attempt.user?.first_name }}
                        {{ attempt.student?.user?.last_name || attempt.user?.last_name }}
                    </div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {{ attempt.student?.student_code || '—' }}
                        <span v-if="attempt.student?.user?.email" class="ml-3">{{ attempt.student.user.email }}</span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-sm text-slate-700">{{ attempt.exam?.title || '—' }}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">
                        {{ attempt.started_at ? new Date(attempt.started_at).toLocaleDateString('en-GB') : '—' }}
                        <span class="mx-2">→</span>
                        {{ attempt.finished_at ? new Date(attempt.finished_at).toLocaleDateString('en-GB') : 'Pending' }}
                    </div>
                    <div class="text-[10px] font-black mt-1" :class="isFullyCompleted(attempt) ? 'text-emerald-600' : 'text-amber-500'">
                        {{ getStatusLabel(attempt) }}
                        <span class="ml-2 text-slate-500">| Score: {{ getOverallScore(attempt) }} / {{ getMaxOverallScore(attempt) }} ({{ getOverallPercent(attempt) }}%)</span>
                    </div>
                </div>
            </div>

            <table v-if="attempt.answers && attempt.answers.length" class="w-full text-left mb-2 border border-slate-100 rounded-xl overflow-hidden text-xs">
                <thead class="bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                        <th class="px-4 py-2 w-8">#</th>
                        <th class="px-4 py-2 w-24">Skill</th>
                        <th class="px-4 py-2 w-20">Type</th>
                        <th class="px-4 py-2">Question</th>
                        <th class="px-4 py-2">Correct Answer</th>
                        <th class="px-4 py-2">Student Answer</th>
                        <th class="px-4 py-2 text-center w-16">Result</th>
                        <th class="px-4 py-2 text-center w-16">Points</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                    <tr v-for="(answer, idx) in attempt.answers" :key="'aa-'+answer.id"
                        :class="answer.is_correct ? 'bg-emerald-50/40' : 'bg-white'">
                        <td class="px-4 py-2 text-slate-400 font-bold">{{ idx + 1 }}</td>
                        <td class="px-4 py-2 font-bold text-indigo-600 uppercase text-[9px]">
                            {{ getSkillDisplayName(answer.question?.skill?.name) }}
                        </td>
                        <td class="px-4 py-2 text-slate-400 text-[9px] uppercase">{{ answer.question?.type || '—' }}</td>
                        <td class="px-4 py-2 text-slate-700 max-w-xs">
                            <div style="overflow:visible;display:block">{{ answer.question?.content ? answer.question.content.replace(/<[^>]*>/g,'').trim() : '—' }}</div>
                        </td>
                        <td class="px-4 py-2 text-emerald-700 font-bold">{{ renderCorrectAnswer(answer.question) }}</td>
                        <td class="px-4 py-2 font-bold" :class="answer.is_correct ? 'text-emerald-700' : 'text-rose-600'">
                            {{ renderAnswer(answer) }}
                        </td>
                        <td class="px-4 py-2 text-center">
                            <span v-if="answer.is_correct" class="text-emerald-600 font-black text-base leading-none">✓</span>
                            <span v-else class="text-rose-500 font-black text-base leading-none">✗</span>
                        </td>
                        <td class="px-4 py-2 text-center font-black text-slate-700">{{ answer.points_awarded ?? '—' }}</td>
                    </tr>
                </tbody>
            </table>
            <div v-else class="text-xs text-slate-400 italic mb-6 px-2">No answers recorded for this attempt.</div>

            <div class="answers-page-break"></div>
        </template>
    </div>
  </Teleport>
</template>

<style>
@media print {
    body > :not(#print-view):not(#answers-print-view) { display: none !important; }
    #print-view, #answers-print-view { position: relative !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { margin: 0.8cm; size: landscape; }
    .answers-page-break { page-break-after: always; }
}
</style>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
