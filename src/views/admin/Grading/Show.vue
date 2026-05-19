<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import api from '@/services/api'
import { useMediaUrl } from '@/composables/useMediaUrl'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'

const { resolveUrl } = useMediaUrl()

const route  = useRoute()
const router = useRouter()
const loading = ref(true)
const saving  = ref(false)

// Attempt data from API
const attempt  = ref(null)
const skills   = ref([])   // [{ skill_id, skill_name, max_points, answers: [...] }]

// Grades keyed by answer_id
const grades = ref({})   // { [answer_id]: { points_awarded, teacher_feedback } }

// ── Fetch ──────────────────────────────────────────────────────────────────
const fetchAttempt = async () => {
    loading.value = true
    try {
        const res = await api.get(`/admin/grading/attempt/${route.params.id}`)
        attempt.value = res.data.attempt
        skills.value  = res.data.skills

        // Initialise grade inputs
        res.data.skills.forEach(skill => {
            skill.answers.forEach(ans => {
                grades.value[ans.id] = {
                    points_awarded:   ans.points_awarded ?? 0,
                    teacher_feedback: ans.teacher_feedback ?? '',
                }
            })
        })
    } catch (err) {
        console.error('Failed to fetch attempt', err)
    } finally {
        loading.value = false
    }
}

// ── Score totals ───────────────────────────────────────────────────────────
const totalAwarded = computed(() =>
    Object.values(grades.value).reduce((s, g) => s + (Number(g.points_awarded) || 0), 0)
)

const totalPossible = computed(() =>
    skills.value.flatMap(s => s.answers).reduce((s, a) => s + (a.question?.points ?? 0), 0)
)

// ── Submit ─────────────────────────────────────────────────────────────────
const submitGrades = async () => {
    saving.value = true
    try {
        const payload = Object.entries(grades.value).map(([answerId, g]) => ({
            answer_id:        parseInt(answerId),
            points_awarded:   Number(g.points_awarded) || 0,
            teacher_feedback: g.teacher_feedback || '',
        }))

        await api.patch(`/admin/grading/attempt/${route.params.id}`, { grades: payload })
        router.push({ name: 'admin.grading' })
    } catch (err) {
        console.error('Failed to save grades', err)
    } finally {
        saving.value = false
    }
}

// ── Skill score helpers ────────────────────────────────────────────────────
const skillAwarded = (skill) =>
    skill.answers.reduce((s, a) => s + (Number(grades.value[a.id]?.points_awarded) || 0), 0)

const skillPossible = (skill) =>
    skill.answers.reduce((s, a) => s + (a.question?.points ?? 0), 0)

// ── Student name ───────────────────────────────────────────────────────────
const studentName = computed(() => {
    const u = attempt.value?.student?.user
    return u ? `${u.first_name} ${u.last_name}` : '—'
})

onMounted(fetchAttempt)
</script>

<template>
    <AdminLayout>
        <!-- Loading -->
        <div v-if="loading" class="flex flex-col items-center justify-center h-64 space-y-4">
            <i class="pi pi-spin pi-spinner text-4xl text-brand-primary"></i>
            <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Submission…</p>
        </div>

        <div v-else-if="attempt" class="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700 pb-24">

            <!-- Top Nav -->
            <div class="flex items-center justify-between">
                <Button icon="pi pi-arrow-left" label="Back to Hub" text
                    @click="router.push({ name: 'admin.grading' })"
                    class="text-slate-500 font-black text-xs uppercase" />
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correction Desk</span>
            </div>

            <!-- Student Card -->
            <div class="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl flex items-center justify-between gap-6 relative overflow-hidden">
                <div class="relative z-10 flex items-center gap-6">
                    <div class="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-black">
                        {{ studentName.charAt(0) }}
                    </div>
                    <div>
                        <h2 class="text-2xl font-black">{{ studentName }}</h2>
                        <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                            {{ attempt.exam?.title }} · Attempt #{{ attempt.id }}
                        </p>
                    </div>
                </div>

                <!-- Score Summary -->
                <div class="relative z-10 text-right">
                    <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Awarded</p>
                    <div class="flex items-end gap-1 justify-end mt-1">
                        <span class="text-4xl font-black text-emerald-400">{{ totalAwarded }}</span>
                        <span class="text-xl text-slate-500 font-black mb-1">/ {{ totalPossible }}</span>
                    </div>
                    <p class="text-[10px] text-slate-500 font-bold">Points across all tasks</p>
                </div>
                <i class="pi pi-pen-to-square absolute -right-8 -bottom-8 text-[10rem] text-white/5"></i>
            </div>

            <!-- Per-skill blocks -->
            <div v-for="skill in skills" :key="skill.skill_id" class="space-y-4">

                <!-- Skill header -->
                <div class="flex items-center justify-between px-2">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-8 rounded-full"
                            :class="skill.skill_name.toLowerCase().includes('speak') ? 'bg-amber-400' : 'bg-indigo-500'"></div>
                        <div>
                            <h3 class="font-black text-slate-800 text-lg">{{ skill.skill_name }}</h3>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {{ skill.answers.length }} question{{ skill.answers.length !== 1 ? 's' : '' }}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <!-- Running total for this skill -->
                        <div class="bg-slate-100 rounded-2xl px-4 py-2 text-center">
                            <p class="text-[10px] font-black text-slate-400 uppercase">Skill Score</p>
                            <p class="font-black text-slate-800">
                                <span class="text-emerald-600">{{ skillAwarded(skill) }}</span>
                                <span class="text-slate-400"> / {{ skillPossible(skill) }}</span>
                            </p>
                        </div>
                        <!-- Admin max cap -->
                        <div v-if="skill.max_points > 0" class="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-2 text-center">
                            <p class="text-[10px] font-black text-rose-400 uppercase">Max Cap</p>
                            <p class="font-black text-rose-600">{{ skill.max_points }} pts</p>
                        </div>
                    </div>
                </div>

                <!-- Answer cards -->
                <div v-for="(ans, idx) in skill.answers" :key="ans.id"
                    class="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">

                    <!-- Card header -->
                    <div class="flex items-center justify-between px-8 py-4 border-b border-slate-50">
                        <div class="flex items-center gap-3">
                            <span class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">
                                {{ idx + 1 }}
                            </span>
                            <Tag :value="ans.question?.type?.toUpperCase()"
                                :severity="ans.question?.type === 'speaking' ? 'warning' : 'info'"
                                class="text-[10px] font-black rounded-lg" />
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Points</span>
                            <span class="text-lg font-black text-indigo-600">{{ ans.question?.points ?? 0 }}</span>
                        </div>
                    </div>

                    <div class="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <!-- Left: Question + Student answer -->
                        <div class="space-y-4">
                            <!-- Question prompt -->
                            <div class="bg-slate-900 rounded-2xl p-5 text-white text-sm">
                                <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Question</p>
                                <div v-if="ans.question?.content"
                                    class="prose prose-invert prose-sm max-w-none"
                                    v-html="ans.question.content"></div>
                                <p v-else class="text-slate-300 italic text-xs">No content</p>
                            </div>

                            <!-- Student answer -->
                            <div class="bg-slate-50 rounded-2xl p-5 min-h-[100px]">
                                <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Student Answer</p>
                                <!-- Text answer -->
                                <p v-if="ans.text_answer"
                                    class="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap" dir="rtl">
                                    {{ ans.text_answer }}
                                </p>
                                <!-- Audio answer -->
                                <div v-if="ans.media_answer" class="mt-3">
                                    <audio :src="resolveUrl(ans.media_answer)" controls class="w-full h-10 rounded-xl"></audio>
                                </div>
                                <!-- No answer -->
                                <p v-if="!ans.text_answer && !ans.media_answer"
                                    class="text-slate-400 italic text-xs">No answer submitted.</p>
                            </div>
                        </div>

                        <!-- Right: Scoring inputs -->
                        <div class="space-y-4">
                            <!-- Points input -->
                            <div class="bg-slate-50 rounded-2xl p-5">
                                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Points Awarded</p>
                                <div class="flex items-center gap-4">
                                    <InputNumber
                                        v-model="grades[ans.id].points_awarded"
                                        :min="0" :max="ans.question?.points ?? 0"
                                        showButtons buttonLayout="horizontal"
                                        class="h-14"
                                        inputClass="w-20 text-center text-2xl font-black text-indigo-600 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 transition-all"
                                        incrementButtonClass="bg-white text-slate-400 border-none hover:text-indigo-500"
                                        decrementButtonClass="bg-white text-slate-400 border-none hover:text-indigo-500"
                                        incrementButtonIcon="pi pi-plus"
                                        decrementButtonIcon="pi pi-minus" />
                                    <div class="text-slate-300 text-xl font-black">/</div>
                                    <div class="text-slate-400 text-2xl font-black">{{ ans.question?.points ?? 0 }}</div>
                                </div>
                            </div>

                            <!-- Feedback -->
                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                    Teacher Feedback
                                </label>
                                <Textarea
                                    v-model="grades[ans.id].teacher_feedback"
                                    rows="4" autoResize
                                    placeholder="Write constructive feedback…"
                                    class="w-full rounded-2xl border-2 border-slate-100 p-4 font-medium text-sm focus:border-indigo-500 transition-all bg-slate-50/30" />
                            </div>
                        </div>
                    </div>
                </div>

                <Divider v-if="skills.indexOf(skill) < skills.length - 1" />
            </div>

            <!-- Empty state -->
            <div v-if="skills.length === 0" class="text-center py-20 text-slate-400">
                <i class="pi pi-inbox text-5xl mb-4 block"></i>
                <p class="font-bold">No writing or speaking questions found for this attempt.</p>
            </div>

            <!-- Sticky Submit Bar -->
            <div class="fixed bottom-0 inset-x-0 z-50 flex justify-center pb-6 pointer-events-none">
                <div class="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2rem] shadow-2xl px-8 py-4 flex items-center gap-6 pointer-events-auto">
                    <div class="text-center">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Score</p>
                        <p class="text-xl font-black">
                            <span class="text-emerald-600">{{ totalAwarded }}</span>
                            <span class="text-slate-300"> / {{ totalPossible }}</span>
                        </p>
                    </div>
                    <Button
                        label="Submit All Grades"
                        icon="pi pi-cloud-upload"
                        :loading="saving"
                        @click="submitGrades"
                        class="rounded-2xl px-8 py-3 font-black bg-slate-900 border-none shadow-xl hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95" />
                </div>
            </div>

        </div>

        <!-- Not found -->
        <div v-else class="text-center py-32 text-slate-400">
            <i class="pi pi-exclamation-triangle text-5xl mb-4 block text-amber-400"></i>
            <p class="font-bold text-lg">Attempt not found.</p>
        </div>
    </AdminLayout>
</template>

<style scoped>
:deep(.p-inputnumber-input) { box-shadow: none !important; }
</style>
