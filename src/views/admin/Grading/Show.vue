<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import api from '@/services/api'
import { authStorage } from '@/services/authStorage'
import { useMediaUrl } from '@/composables/useMediaUrl'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'

const { resolveUrl } = useMediaUrl()
const toast = useToast()

const route  = useRoute()
const router = useRouter()
const loading = ref(true)
const saving  = ref(false)

const goBackToGrading = () => {
    const isTeacher = route.path.startsWith('/teacher') || authStorage.getRole() === 'teacher';
    const routeName = isTeacher ? 'teacher.grading' : 'admin.grading';
    router.push({ name: routeName })
}

const t = {
    loading: "Loading student submission for manual correction...",
    backToHub: "Back to Correction Desk",
    correctionDesk: "Correction Desk & Manual Grading",
    attempt: "Attempt #",
    totalAwarded: "Total Awarded Points",
    pointsAcrossTasks: "Points across all graded tasks",
    questionsCount: "questions",
    skillScore: "Skill Score",
    maxCap: "Max Cap",
    maxPoints: "Max Points",
    questionPrompt: "Question Content",
    studentAnswer: "Student Answer",
    noContent: "No content available",
    noAnswerSubmitted: "No answer submitted.",
    pointsInputLabel: "Points Graded",
    feedbackLabel: "Teacher Feedback",
    feedbackPlaceholder: "Write constructive, helpful feedback for this student...",
    submitButton: "Submit All Grades",
    noQuestionsFound: "No writing or speaking questions found for this attempt.",
    attemptNotFound: "Attempt not found.",
    totalScore: "Total Score",
    writingSection: "Writing Section",
    speakingSection: "Speaking Section",
    sectionScore: "Section Score",
    sectionPossible: "Section Max",
};

const attempt  = ref(null)
const skills   = ref([])
const grades = ref({})

// ── HTML Entity Decoder ──────────────────────────────────────────────────────
// Handles double-encoded HTML from backend (e.g. &lt;p&gt; → <p>)
function decodeHtml(str) {
    if (!str) return ''
    let decoded = str
    let prev = ''
    let count = 0
    while (decoded !== prev && (decoded.includes('&lt;') || decoded.includes('&amp;') || decoded.includes('&#')) && count < 3) {
        prev = decoded
        const el = document.createElement('textarea')
        el.innerHTML = decoded
        decoded = el.value
        count++
    }
    return decoded
}

// ── Rubric Evaluator State ───────────────────────────────────────────────────
const activeRubrics = ref({ criteria: [], categories: [], max_total: 900 })
const rubricScores = ref({}) // map answer_id => { [criterion_id]: number }
const showRubricDialog = ref(false)
const currentRubricAnswer = ref(null)

const fetchActiveRubrics = async () => {
    try {
        const res = await api.get('/admin/rubrics/active?skill_type=writing')
        activeRubrics.value = res.data || { criteria: [], categories: [], max_total: 900 }
    } catch (e) {
        console.warn('Failed to load active rubrics', e)
    }
}

const getFileExtension = (filePath) => {
    if (!filePath) return '';
    return filePath.split('.').pop().toLowerCase();
};

const isImageFile = (filePath) => {
    if (!filePath) return false;
    const ext = getFileExtension(filePath);
    return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext);
};

const isAudioFile = (filePath) => {
    if (!filePath) return false;
    const ext = getFileExtension(filePath);
    return ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'aac', 'flac'].includes(ext);
};

const isPdfFile = (filePath) => {
    if (!filePath) return false;
    return getFileExtension(filePath) === 'pdf';
};

const isDocumentFile = (filePath) => {
    if (!filePath) return false;
    const ext = getFileExtension(filePath);
    return ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext);
};

const getFileIcon = (filePath) => {
    const ext = getFileExtension(filePath);
    if (['mp3', 'wav', 'm4a', 'webm', 'ogg'].includes(ext)) return 'pi-volume-up';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return 'pi-image';
    if (['pdf'].includes(ext)) return 'pi-file-pdf';
    if (['doc', 'docx'].includes(ext)) return 'pi-file-word';
    return 'pi-file';
};

const getMediaFiles = (mediaAnswer) => {
    if (!mediaAnswer) return [];
    if (Array.isArray(mediaAnswer)) return mediaAnswer;
    if (typeof mediaAnswer === 'string') {
        const trimmed = mediaAnswer.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
            }
        }
        return [mediaAnswer];
    }
    return [];
};

const getFileTypeLabel = (filePath) => {
    const ext = getFileExtension(filePath);
    if (['mp3', 'wav', 'm4a', 'webm', 'ogg'].includes(ext)) return 'Audio';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return 'Image';
    if (['pdf'].includes(ext)) return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'Document';
    return 'File';
};

const savingSkillKey = ref(null)

const fetchAttempt = async () => {
    loading.value = true
    try {
        await fetchActiveRubrics()
        const res = await api.get(`/admin/grading/attempt/${route.params.id}`)
        attempt.value = res.data.attempt
        skills.value  = res.data.skills

        res.data.skills.forEach(skill => {
            skill.answers.forEach(ans => {
                const savedRubric = ans.grading_details?.rubric_scores || {}
                rubricScores.value[ans.id] = { ...savedRubric }

                grades.value[ans.id] = {
                    points_awarded:   ans.points_awarded ?? 0,
                    teacher_feedback: ans.teacher_feedback ?? '',
                    grading_details:  ans.grading_details ?? null,
                    is_manual_graded: ans.is_manual_graded ?? false,
                    touched:          false,
                }
            })
        })
    } catch (err) {
        console.error('Failed to fetch attempt', err)
    } finally {
        loading.value = false
    }
}

const totalAwarded = computed(() =>
    Object.values(grades.value).reduce((s, g) => s + (Number(g.points_awarded) || 0), 0)
)

const totalPossible = computed(() =>
    skills.value.flatMap(s => s.answers).reduce((s, a) => s + (a.question?.points ?? 0), 0)
)

const submitSkillGrades = async (skill) => {
    const groupKey = `${skill.skill_id}-${skill.question_type}`
    savingSkillKey.value = groupKey
    try {
        const payload = skill.answers.map(ans => ({
            answer_id:        ans.id,
            points_awarded:   Number(grades.value[ans.id]?.points_awarded) || 0,
            teacher_feedback: grades.value[ans.id]?.teacher_feedback || '',
            grading_details:  grades.value[ans.id]?.grading_details || null,
        }))

        await api.patch(`/admin/grading/attempt/${route.params.id}`, { grades: payload })

        toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ الدرجات بنجاح', life: 2000 })
        setTimeout(() => goBackToGrading(), 500)
    } catch (err) {
        console.error('Failed to save skill grades', err)
        toast.add({ severity: 'error', summary: 'خطأ', detail: 'حدث خطأ أثناء حفظ الدرجات', life: 3000 })
    } finally {
        savingSkillKey.value = null
    }
}

const submitGrades = async () => {
    saving.value = true
    try {
        const payload = []

        for (const skill of skills.value) {
            for (const ans of skill.answers) {
                const g = grades.value[ans.id]
                if (!g) continue

                const isAlreadyGraded = ans.is_manual_graded === true
                const isTouched = g.touched || Number(g.points_awarded) > 0 || (g.teacher_feedback && g.teacher_feedback.trim() !== '')

                if (isAlreadyGraded || isTouched) {
                    payload.push({
                        answer_id:        ans.id,
                        points_awarded:   Number(g.points_awarded) || 0,
                        teacher_feedback: g.teacher_feedback || '',
                        grading_details:  g.grading_details || null,
                    })
                }
            }
        }

        if (payload.length === 0) {
            Object.entries(grades.value).forEach(([answerId, g]) => {
                payload.push({
                    answer_id:        parseInt(answerId),
                    points_awarded:   Number(g.points_awarded) || 0,
                    teacher_feedback: g.teacher_feedback || '',
                    grading_details:  g.grading_details || null,
                })
            })
        }

        await api.patch(`/admin/grading/attempt/${route.params.id}`, { grades: payload })

        toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ جميع الدرجات بنجاح', life: 2000 })
        setTimeout(() => goBackToGrading(), 500)
    } catch (err) {
        console.error('Failed to save grades', err)
        toast.add({ severity: 'error', summary: 'خطأ', detail: 'حدث خطأ أثناء حفظ الدرجات', life: 3000 })
    } finally {
        saving.value = false
    }
}

const skillAwarded = (skill) =>
    skill.answers.reduce((s, a) => s + (Number(grades.value[a.id]?.points_awarded) || 0), 0)

const skillPossible = (skill) =>
    skill.answers.reduce((s, a) => s + (a.question?.points ?? 0), 0)

const isSpeakingGroup = (skill) =>
    skill.question_type === 'speaking'

const skillTypeIcon = (skill) =>
    isSpeakingGroup(skill) ? 'pi-microphone' : 'pi-pencil'

const skillTypeBadgeSeverity = (skill) =>
    isSpeakingGroup(skill) ? 'warning' : 'info'

const skillTypeLabel = (skill) => {
    if (isSpeakingGroup(skill)) return t.speakingSection
    return t.writingSection
}

const studentName = computed(() => {
    const u = attempt.value?.student?.user
    return u ? `${u.first_name} ${u.last_name}` : '—'
})

// ── Rubric Evaluator Methods ──────────────────────────────────────────────────
function openRubricEvaluator(ans) {
    currentRubricAnswer.value = ans
    if (!rubricScores.value[ans.id]) {
        rubricScores.value[ans.id] = {}
    }
    // Initialize unassigned criteria to 0 or saved value
    activeRubrics.value.criteria.forEach(c => {
        if (rubricScores.value[ans.id][c.id] === undefined) {
            rubricScores.value[ans.id][c.id] = 0
        }
    })
    showRubricDialog.value = true
}

function calculateCategoryTotal(cat) {
    if (!currentRubricAnswer.value) return 0
    const ansId = currentRubricAnswer.value.id
    const scores = rubricScores.value[ansId] || {}
    return cat.items.reduce((sum, item) => sum + (Number(scores[item.id]) || 0), 0)
}

const currentRubricTotal = computed(() => {
    if (!currentRubricAnswer.value) return 0
    const ansId = currentRubricAnswer.value.id
    const scores = rubricScores.value[ansId] || {}
    return activeRubrics.value.criteria.reduce((sum, item) => sum + (Number(scores[item.id]) || 0), 0)
})

function quickScore(crit, factor) {
    if (!currentRubricAnswer.value) return
    const ansId = currentRubricAnswer.value.id
    if (!rubricScores.value[ansId]) rubricScores.value[ansId] = {}
    const score = Math.round((crit.max_points * factor) * 10) / 10
    rubricScores.value[ansId][crit.id] = score
}

function setAllRubricScores(factor) {
    if (!currentRubricAnswer.value) return
    const ansId = currentRubricAnswer.value.id
    activeRubrics.value.criteria.forEach(crit => {
        rubricScores.value[ansId][crit.id] = Math.round((crit.max_points * factor) * 10) / 10
    })
}

function applyRubricGrade() {
    if (!currentRubricAnswer.value) return
    const ans = currentRubricAnswer.value
    const totalRubricEarned = currentRubricTotal.value
    const maxRubric = activeRubrics.value.max_total || 900
    const questionMax = ans.question?.points ?? maxRubric

    // Scale if question max differs from rubric max (otherwise exact total)
    let finalScore = totalRubricEarned
    if (questionMax !== maxRubric && maxRubric > 0) {
        finalScore = Math.round((totalRubricEarned / maxRubric) * questionMax * 10) / 10
    }
    finalScore = Math.min(finalScore, questionMax)

    grades.value[ans.id].points_awarded = finalScore
    grades.value[ans.id].touched = true
    grades.value[ans.id].grading_details = {
        rubric_scores: { ...rubricScores.value[ans.id] },
        rubric_total_earned: totalRubricEarned,
        rubric_max: maxRubric,
        graded_at: new Date().toISOString(),
    }

    showRubricDialog.value = false
}

onMounted(fetchAttempt)
</script>

<template>
    <AdminLayout>
        <div class="w-full">
            
            <!-- Loading -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <i class="pi pi-spin pi-spinner text-4xl text-brand-primary"></i>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t.loading }}</p>
            </div>

            <div v-else-if="attempt" class="w-full space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-32 px-4 md:px-10">

                <!-- Premium Header Navigation Card -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 flex items-center gap-6">
                        <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded 
                                @click="goBackToGrading" 
                                class="w-12 h-12 flex items-center justify-center border border-slate-200 hover:border-slate-300 shadow-sm bg-white" />
                        <div>
                             <div class="flex items-center gap-2 text-xs font-extrabold text-brand-primary uppercase tracking-wider">
                                  <i class="pi pi-sparkles text-brand-accent"></i>
                                  <span>{{ t.correctionDesk }}</span>
                             </div>
                             <h1 class="text-2xl font-black text-slate-800 tracking-tight leading-tight mt-1">
                                 {{ studentName }}
                             </h1>
                             <p class="text-xs font-bold text-slate-400 mt-0.5">
                                 {{ attempt.exam?.title }}
                             </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 relative z-10">
                        <Tag :value="`${t.attempt} ${attempt.id}`" severity="info" class="text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border-none shadow-sm" />
                    </div>
                </div>

                <!-- Student Overview Card -->
                <div class="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-80 h-80 bg-brand-primary/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3"></div>
                    <div class="absolute -left-10 -bottom-10 w-64 h-64 bg-rose-500/5 rounded-full blur-2xl"></div>

                    <div class="relative z-10 flex items-center gap-6">
                        <div class="w-16 h-16 rounded-2xl bg-white/10 text-white flex items-center justify-center text-2xl font-black shadow-inner">
                            {{ studentName.charAt(0) }}
                        </div>
                        <div class="space-y-1">
                            <h2 class="text-2xl font-black tracking-tight">{{ studentName }}</h2>
                            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                {{ attempt.exam?.title }} · ID: #{{ attempt.id }}
                            </p>
                        </div>
                    </div>

                    <!-- Score Summary -->
                    <div class="relative z-10 text-center md:text-right">
                        <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest">{{ t.totalAwarded }}</p>
                        <div class="flex items-end gap-1 justify-center md:justify-end mt-1">
                            <span class="text-5xl font-black text-emerald-400 tracking-tighter leading-none">{{ totalAwarded }}</span>
                            <span class="text-xl text-slate-500 font-black mb-0.5">/ {{ totalPossible }}</span>
                        </div>
                        <p class="text-[10px] text-slate-500 font-bold mt-1">{{ t.pointsAcrossTasks }}</p>
                    </div>
                    
                    <i class="pi pi-pen-to-square absolute -right-8 -bottom-8 text-[10rem] text-white/5 opacity-40 group-hover:scale-110 transition-transform duration-700"></i>
                </div>

                <!-- Per-skill blocks -->
                <div v-for="skill in skills" :key="`${skill.skill_id}-${skill.question_type}`" class="space-y-6">

                    <!-- Skill header -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 mt-8 gap-4">
                        <div class="flex items-center gap-3">
                            <div class="w-2.5 h-8 rounded-full"
                                :class="isSpeakingGroup(skill) ? 'bg-amber-500' : 'bg-rose-600'"></div>
                            <div>
                                <h3 class="font-black text-slate-800 text-lg leading-tight">{{ skill.skill_name }}</h3>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span
                                        class="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
                                        :class="isSpeakingGroup(skill)
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-rose-100 text-rose-700'">
                                        <i :class="['pi text-[9px]', skillTypeIcon(skill)]"></i>
                                        {{ skillTypeLabel(skill) }}
                                    </span>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {{ skill.answers.length }} {{ t.questionsCount }}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="bg-white rounded-2xl px-5 py-2.5 text-center shadow-sm border border-slate-50">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">{{ t.sectionScore }}</p>
                                <p class="font-black text-slate-800 text-base mt-0.5">
                                    <span class="text-emerald-600">{{ skillAwarded(skill) }}</span>
                                    <span class="text-slate-400"> / {{ skill.total_possible ?? skillPossible(skill) }}</span>
                                </p>
                            </div>
                            <div v-if="skill.max_points > 0" class="bg-rose-50/50 border border-rose-100/60 rounded-2xl px-5 py-2.5 text-center shadow-sm">
                                <p class="text-[9px] font-black text-rose-400 uppercase tracking-wider">{{ t.maxCap }}</p>
                                <p class="font-black text-rose-600 text-base mt-0.5">{{ skill.max_points }} pts</p>
                            </div>
                            <Button
                                :label="`Save ${skillTypeLabel(skill)}`"
                                icon="pi pi-check"
                                :loading="savingSkillKey === `${skill.skill_id}-${skill.question_type}`"
                                @click="submitSkillGrades(skill)"
                                class="rounded-2xl px-4 py-2.5 font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md transition-all hover:scale-105" />
                        </div>
                    </div>

                    <!-- Answer cards -->
                    <div v-for="(ans, idx) in skill.answers" :key="ans.id"
                        class="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all duration-300">

                        <!-- Card header -->
                        <div class="flex items-center justify-between px-8 py-5 bg-slate-50/50 border-b border-slate-100">
                            <div class="flex items-center gap-3">
                                <span class="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-xs font-black text-slate-500">
                                    {{ idx + 1 }}
                                </span>
                                <Tag :value="ans.question?.type?.toUpperCase()"
                                    :severity="['speaking', 'speaking_live'].includes(ans.question?.type) ? 'warning' : 'info'"
                                    class="text-[9px] font-black tracking-wider rounded-lg px-2.5 py-1" />
                                <Tag v-if="ans.is_manual_graded"
                                    value="Graded"
                                    severity="success"
                                    class="text-[9px] font-black tracking-wider rounded-lg px-2.5 py-1" />
                                <Tag v-else
                                    value="Pending"
                                    severity="secondary"
                                    class="text-[9px] font-black tracking-wider rounded-lg px-2.5 py-1" />
                                
                                <Tag v-if="grades[ans.id]?.grading_details?.rubric_scores"
                                    value="تقييم تفصيلي بالمعايير ✓"
                                    severity="help"
                                    class="text-[9px] font-black tracking-wider rounded-lg px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200" />
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t.maxPoints }}</span>
                                <span class="text-lg font-black text-brand-primary">{{ ans.question?.points ?? 0 }}</span>
                            </div>
                        </div>

                        <div class="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <!-- Left: Question + Student answer -->
                            <div class="space-y-5">
                                <div class="bg-slate-900 rounded-2xl p-5 text-white text-sm relative overflow-hidden shadow-inner">
                                    <div class="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                                    <p class="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-3">{{ t.questionPrompt }}</p>
                                    <div v-if="ans.question?.content"
                                        class="prose prose-invert prose-sm max-w-none text-slate-200 font-medium"
                                        v-html="decodeHtml(ans.question.content)"></div>
                                    <div v-else-if="ans.question?.image_url || ans.question?.image_path"
                                        class="flex justify-center">
                                        <img :src="resolveUrl(ans.question.image_url || ans.question.image_path)"
                                            class="rounded-2xl border border-slate-800 shadow-lg max-w-full h-auto"
                                            alt="Question image" />
                                    </div>
                                    <div v-else-if="(ans.question?.media_url || ans.question?.media_path) && (ans.question.media_url || ans.question.media_path).toLowerCase().includes('.mp4')"
                                        class="flex justify-center">
                                        <video :src="resolveUrl(ans.question.media_url || ans.question.media_path)"
                                            controls class="rounded-2xl shadow-lg max-w-full"></video>
                                    </div>
                                    <div v-else-if="ans.question?.passage"
                                        class="space-y-4">
                                        <p v-if="ans.question.passage.title" class="text-slate-200 font-black text-sm">{{ ans.question.passage.title }}</p>
                                        <div v-if="ans.question.passage.content"
                                            class="prose prose-invert prose-sm max-w-none text-slate-200 font-medium"
                                            v-html="decodeHtml(ans.question.passage.content)"></div>
                                        <p v-else class="text-slate-400 italic text-xs">{{ t.noContent }}</p>
                                    </div>
                                    <p v-else class="text-slate-400 italic text-xs">{{ t.noContent }}</p>
                                </div>

                                <!-- Student answer -->
                                <div class="bg-slate-50/60 rounded-2xl p-6 border border-slate-100 shadow-inner min-h-[120px]">
                                    <p class="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-4">{{ t.studentAnswer }}</p>
                                    
                                    <div v-if="ans.text_answer"
                                        class="prose prose-sm max-w-none text-slate-700 leading-relaxed font-medium" dir="auto"
                                        v-html="decodeHtml(ans.text_answer)"></div>
                                    
                                    <div v-if="['writing', 'short_answer'].includes(ans.question?.type) && ans.word_count !== null && ans.word_count !== undefined"
                                        class="mt-4 pt-4 border-t border-slate-200 flex items-center gap-3">
                                        <i class="pi pi-align-right text-slate-400 text-lg"></i>
                                        <div class="flex flex-col">
                                            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Word Count</span>
                                            <span class="text-2xl font-black text-brand-primary mt-0.5">{{ ans.word_count }}</span>
                                        </div>
                                    </div>
                                    
                                    <div v-if="getMediaFiles(ans.media_answer).length > 0" class="mt-4 space-y-4">
                                        <div v-for="(file, fIdx) in getMediaFiles(ans.media_answer)" :key="fIdx">
                                            <div v-if="isImageFile(file)" class="space-y-2">
                                                <a :href="resolveUrl(file)" target="_blank" class="inline-block">
                                                    <img :src="resolveUrl(file)" 
                                                        alt="Student Image" 
                                                        class="rounded-lg border border-slate-200 max-w-sm max-h-64 object-contain cursor-pointer hover:opacity-80 transition-opacity" />
                                                </a>
                                                <p class="text-xs text-slate-500">Click to view full size</p>
                                            </div>
                                            
                                            <div v-else-if="isAudioFile(file)" class="space-y-2">
                                                <audio :src="resolveUrl(file)" controls class="w-full h-11 rounded-xl shadow-sm border border-slate-200"></audio>
                                                <p class="text-xs text-slate-500">{{ getFileTypeLabel(file) }}</p>
                                            </div>
                                            
                                            <div v-else-if="isDocumentFile(file)" class="space-y-3">
                                                <div class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                                    <div class="flex items-center gap-3 min-w-0">
                                                        <div class="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-600 rounded-lg">
                                                            <i :class="['pi', getFileIcon(file), 'text-lg']"></i>
                                                        </div>
                                                        <div class="min-w-0">
                                                            <p class="text-xs font-bold text-slate-800 truncate">{{ file.split('/').pop() }}</p>
                                                            <p class="text-[10px] text-slate-400 font-semibold">{{ getFileTypeLabel(file) }}</p>
                                                        </div>
                                                    </div>
                                                    <a :href="resolveUrl(file)" 
                                                        target="_blank"
                                                        class="px-3.5 py-1.5 bg-brand-primary hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm">
                                                        <i class="pi pi-external-link"></i>
                                                        Open in new tab
                                                    </a>
                                                </div>

                                                <div v-if="isPdfFile(file)" class="rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-900">
                                                    <iframe
                                                        :src="resolveUrl(file)"
                                                        class="w-full h-[450px] border-none"
                                                        title="PDF Preview"
                                                    ></iframe>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <p v-if="!ans.text_answer && getMediaFiles(ans.media_answer).length === 0"
                                        class="text-slate-400 italic text-xs font-semibold">{{ t.noAnswerSubmitted }}</p>
                                </div>
                            </div>

                            <!-- Right: Scoring inputs -->
                            <div class="space-y-6">

                                <!-- Rubric Scorecard Button for Writing Tasks -->
                                <div v-if="skill.question_type === 'writing' || ans.question?.type === 'writing'"
                                    class="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md border border-purple-800/40 space-y-4"
                                >
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
                                                <i class="pi pi-list-check text-sm"></i>
                                            </div>
                                            <div>
                                                <h4 class="text-sm font-black text-white">Writing Assessment Rubric</h4>
                                                <p class="text-[10px] text-purple-200 font-medium">Structured grading across 4 core domains (Format, Grammar, Content, Rhetoric)</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex items-center justify-between pt-2 border-t border-purple-800/50">
                                        <div class="text-xs">
                                            <span class="text-purple-300 font-bold mr-1">Status:</span>
                                            <span v-if="grades[ans.id]?.grading_details?.rubric_scores" class="text-emerald-400 font-black">
                                                Rubric Evaluated ({{ grades[ans.id]?.grading_details?.rubric_total_earned ?? grades[ans.id]?.points_awarded }} / {{ activeRubrics.max_total }} pts)
                                            </span>
                                            <span v-else class="text-slate-400 font-bold">Standard manual score</span>
                                        </div>

                                        <Button
                                            label="Open Rubric Evaluator"
                                            icon="pi pi-external-link"
                                            size="small"
                                            @click="openRubricEvaluator(ans)"
                                            class="bg-purple-500 hover:bg-purple-600 text-white border-none rounded-xl px-4 py-2 text-xs font-black shadow-md transition-all hover:scale-105"
                                        />
                                    </div>
                                </div>

                                <div class="bg-slate-50/60 rounded-2xl p-6 border border-slate-100 shadow-inner flex flex-col justify-center">
                                    <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3.5">{{ t.pointsInputLabel }}</p>
                                    <div class="flex items-center gap-4">
                                        <InputNumber
                                            v-model="grades[ans.id].points_awarded"
                                            @update:modelValue="grades[ans.id].touched = true"
                                            :min="0" :max="ans.question?.points ?? 0"
                                            showButtons buttonLayout="horizontal"
                                            class="h-14"
                                            inputClass="w-20 text-center text-2xl font-black text-brand-primary bg-white border border-slate-200 rounded-xl focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all shadow-sm"
                                            incrementButtonClass="bg-white text-slate-400 border border-slate-200 hover:text-brand-primary rounded-e-xl"
                                            decrementButtonClass="bg-white text-slate-400 border border-slate-200 hover:text-brand-primary rounded-s-xl"
                                            incrementButtonIcon="pi pi-plus"
                                            decrementButtonIcon="pi pi-minus" />
                                        <div class="text-slate-300 text-xl font-black">/</div>
                                        <div class="text-slate-400 text-2xl font-black">{{ ans.question?.points ?? 0 }}</div>
                                    </div>
                                </div>

                                <div class="space-y-2 flex flex-col">
                                    <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mr-1">
                                        {{ t.feedbackLabel }}
                                    </label>
                                    <Textarea
                                        v-model="grades[ans.id].teacher_feedback"
                                        @input="grades[ans.id].touched = true"
                                        rows="4" autoResize
                                        :placeholder="t.feedbackPlaceholder"
                                        class="w-full rounded-2xl border border-slate-200 p-4 font-medium text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-slate-50/20 shadow-sm" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Divider v-if="skills.indexOf(skill) < skills.length - 1" class="my-8" />
                </div>

                <!-- Empty state -->
                <div v-if="skills.length === 0" class="text-center py-20 text-slate-400 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                    <i class="pi pi-inbox text-5xl mb-4 block text-slate-300"></i>
                    <p class="font-extrabold text-sm uppercase tracking-wider">{{ t.noQuestionsFound }}</p>
                </div>

            </div>

            <!-- Not found -->
            <div v-else-if="!loading" class="text-center py-32 text-slate-400 bg-white rounded-[2rem] border border-slate-100 shadow-sm max-w-md mx-auto mt-20">
                <i class="pi pi-exclamation-triangle text-5xl mb-4 block text-amber-500"></i>
                <p class="font-black text-lg tracking-tight">{{ t.attemptNotFound }}</p>
            </div>
        </div>

       
        <!-- Interactive Rubric Scorecard Dialog -->
        <Dialog
            v-model:visible="showRubricDialog"
            :modal="true"
            :style="{ width: '98vw', maxWidth: '1700px' }"
            class="p-fluid rounded-4xl shadow-2xl"
        >
            <template #header>
                <div class="flex items-center justify-between w-full pl-2">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                            <i class="pi pi-pencil text-lg"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-black text-slate-900 leading-tight">Writing Assessment Rubric</h3>
                            <p class="text-xs text-slate-400 font-bold mt-0.5">Evaluate student submission using standardized criteria</p>
                        </div>
                    </div>

                    <!-- Quick Action Bar -->
                    <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6">
                        <div class="text-xs font-black text-slate-700 flex items-center gap-2">
                            <i class="pi pi-bolt text-amber-500"></i>
                            <span>Quick Score All Criteria:</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <Button label="100% Full" size="small" severity="success" outlined @click="setAllRubricScores(1.0)" class="text-xs font-black rounded-xl" />
                            <Button label="75% Very Good" size="small" severity="info" outlined @click="setAllRubricScores(0.75)" class="text-xs font-black rounded-xl" />
                            <Button label="50% Average" size="small" severity="warning" outlined @click="setAllRubricScores(0.50)" class="text-xs font-black rounded-xl" />
                            <Button label="Reset (0)" size="small" severity="secondary" outlined @click="setAllRubricScores(0)" class="text-xs font-black rounded-xl" />
                        </div>
                    </div>

                    <!-- Live Total Badge -->
                    <div class="flex items-center gap-3 pr-4">
                        <div class="bg-slate-900 text-white rounded-2xl px-5 py-2 text-center shadow-md">
                            <span class="text-[10px] font-black text-slate-400 uppercase block">Calculated Score</span>
                            <div class="flex items-baseline justify-center gap-1">
                                <span class="text-xl font-black text-emerald-400">{{ currentRubricTotal }}</span>
                                <span class="text-xs text-slate-400 font-bold">/ {{ activeRubrics.max_total }}</span>
                            </div>
                        </div>
                    </div>
                     
                </div>
            </template>

            <div v-if="currentRubricAnswer" class="pt-2 pb-0">

               

                <!-- Two-column layout: answer on the side, criteria on the side -->
                
                <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">

                    <!-- LEFT: Student Answer (sticky, scrolls independently) -->
                    <div class="lg:sticky lg:top-0 lg:self-start">
                        <div class="bg-slate-900 rounded-2xl p-5 text-white border border-slate-800 shadow-inner flex flex-col max-h-[75vh]">
                            <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 flex-shrink-0">
                                <span class="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                    <i class="pi pi-file-edit text-rose-400"></i>
                                    Student Submission (Writing Task)
                                </span>
                                <span v-if="currentRubricAnswer.word_count" class="text-xs font-bold text-slate-400">
                                    {{ currentRubricAnswer.word_count }} words
                                </span>
                            </div>
                            <div
                                v-if="currentRubricAnswer.text_answer"
                                class="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed font-medium overflow-y-auto pr-2"
                                dir="auto"
                                v-html="decodeHtml(currentRubricAnswer.text_answer)"
                            ></div>
                            <p v-else class="text-slate-400 italic text-sm">No written text submitted.</p>
                        </div>
                    </div>

                    <!-- RIGHT: Criteria by Category -->
                    <div class="space-y-6 max-h-[75vh] overflow-y-auto pr-1 pl-1">
                        <div
                            v-for="cat in activeRubrics.categories"
                            :key="cat.category"
                            class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                        >
                            <!-- Category Subheader -->
                            <div class="bg-gradient-to-r from-slate-100 to-white px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
                                <div class="flex items-center gap-2.5">
                                    <div class="w-2.5 h-6 bg-rose-600 rounded-full"></div>
                                    <h4 class="font-black text-slate-800 text-sm">{{ cat.category }}</h4>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="text-xs font-bold text-slate-500">
                                        Subtotal:
                                        <strong class="text-rose-600 font-black">{{ calculateCategoryTotal(cat) }}</strong> / {{ cat.total_points }} pts
                                    </span>
                                </div>
                            </div>

                            <!-- Criteria Items -->
                            <div class="divide-y divide-slate-100">
                                <div
                                    v-for="crit in cat.items"
                                    :key="crit.id"
                                    class="p-4 hover:bg-slate-50/50 transition-colors"
                                >
                                    <!-- Top row: Name + % badge + Score input -->
                                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
                                        <!-- Criterion Info -->
                                        <div class="space-y-0.5 min-w-0">
                                            <div class="flex items-center gap-2 flex-wrap">
                                                <span class="font-black text-slate-900 text-sm">{{ crit.name }}</span>
                                                <span class="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                                                    {{ crit.percentage }}%
                                                </span>
                                                <span class="text-[10px] font-semibold text-slate-400">
                                                    ({{ crit.max_points }} pts)
                                                </span>
                                            </div>
                                            <p class="text-xs text-slate-500 leading-normal">
                                                {{ crit.description || '—' }}
                                            </p>
                                        </div>

                                        <!-- Score Input -->
                                        <div class="flex items-center gap-2 flex-shrink-0 max-w-full">
                                            <InputNumber
                                                v-model="rubricScores[currentRubricAnswer.id][crit.id]"
                                                :min="0"
                                                :max="crit.max_points"
                                                :minFractionDigits="0"
                                                :maxFractionDigits="1"
                                                class="w-28 flex-shrink-0"
                                                inputClass="text-center font-black text-lg text-rose-600 bg-white border-2 border-slate-200 rounded-xl p-2 focus:border-rose-500 w-full"
                                            />
                                            <div class="flex flex-col items-start flex-shrink-0">
                                                <span class="text-sm font-black text-slate-500 whitespace-nowrap">/ {{ crit.max_points }}</span>
                                                <span class="text-[10px] font-semibold text-slate-400">pts</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Quick Score Buttons row -->
                                    <div class="mt-2.5 flex items-center gap-2 flex-wrap">
                                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick:</span>
                                        <button
                                            type="button"
                                            @click="quickScore(crit, 1.0)"
                                            class="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                                            :title="'Full score: ' + crit.max_points + ' pts'"
                                        >
                                            Full &nbsp;<span class="font-black">({{ crit.max_points }} pts)</span>
                                        </button>
                                        <button
                                            type="button"
                                            @click="quickScore(crit, 0.75)"
                                            class="text-[11px] font-bold px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                                            :title="'75%: ' + Math.round(crit.max_points * 0.75 * 10) / 10 + ' pts'"
                                        >
                                            75% &nbsp;<span class="font-black">({{ Math.round(crit.max_points * 0.75 * 10) / 10 }} pts)</span>
                                        </button>
                                        <button
                                            type="button"
                                            @click="quickScore(crit, 0.50)"
                                            class="text-[11px] font-bold px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                                            :title="'50%: ' + Math.round(crit.max_points * 0.5 * 10) / 10 + ' pts'"
                                        >
                                            50% &nbsp;<span class="font-black">({{ Math.round(crit.max_points * 0.5 * 10) / 10 }} pts)</span>
                                        </button>
                                        <button
                                            type="button"
                                            @click="quickScore(crit, 0)"
                                            class="text-[11px] font-bold px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                                            title="Zero score"
                                        >
                                            0 pts
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <template #footer>
                <!-- Footer Summary & Actions — fixed outside scroll -->
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                    <div class="flex items-center gap-6">
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Score</span>
                            <div class="flex items-baseline gap-1.5">
                                <span class="text-3xl font-black text-emerald-600">{{ currentRubricTotal }}</span>
                                <span class="text-base font-black text-slate-400">/ {{ activeRubrics.max_total }}</span>
                                <span class="text-xs font-bold text-slate-400">pts</span>
                            </div>
                        </div>
                        <div v-if="activeRubrics.max_total > 0" class="flex flex-col items-center">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Percentage</span>
                            <span class="text-xl font-black" :class="{
                                'text-emerald-600': (currentRubricTotal / activeRubrics.max_total) >= 0.75,
                                'text-blue-600': (currentRubricTotal / activeRubrics.max_total) >= 0.5 && (currentRubricTotal / activeRubrics.max_total) < 0.75,
                                'text-amber-600': (currentRubricTotal / activeRubrics.max_total) >= 0.25 && (currentRubricTotal / activeRubrics.max_total) < 0.5,
                                'text-red-600': (currentRubricTotal / activeRubrics.max_total) < 0.25,
                            }">
                                {{ Math.round((currentRubricTotal / activeRubrics.max_total) * 100) }}%
                            </span>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 w-full sm:w-auto">
                        <Button
                            type="button"
                            label="Cancel"
                            severity="secondary"
                            outlined
                            @click="showRubricDialog = false"
                            class="rounded-xl px-5 py-2.5 text-xs font-black border-slate-200"
                        />
                        <Button
                            type="button"
                            label="Apply Rubric Score"
                            icon="pi pi-check"
                            @click="applyRubricGrade"
                            class="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-6 py-2.5 text-xs font-black shadow-lg shadow-rose-900/30 border-none"
                        />
                    </div>
                </div>
            </template>

        </Dialog>
    </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.font-cairo {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

.arabic-theme {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.p-inputnumber-input) { 
    box-shadow: none !important; 
}
</style>
