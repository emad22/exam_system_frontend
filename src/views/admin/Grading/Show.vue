<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import api from '@/services/api'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const aiLoading = ref(false)
const aiSuggestion = ref(null)
const aiError = ref(null)
const answer = ref(null)

const form = ref({
    points_awarded: 0,
    teacher_feedback: '',
    grading_details: {
        grammar: 0,
        vocabulary: 0,
        coherence: 0,
        task_achievement: 0
    }
})

const fetchAnswer = async () => {
    loading.value = true
    try {
        const response = await api.get(`/admin/grading/${route.params.id}`)
        answer.value = response.data
        form.value.points_awarded = answer.value.question.points
    } catch (err) {
        console.error('Failed to fetch answer details', err)
    } finally {
        loading.value = false
    }
}

const submitGrade = async () => {
    saving.value = true
    try {
        await api.patch(`/admin/grading/${route.params.id}`, form.value)
        router.push({ name: 'admin.grading' })
    } catch (err) {
        console.error('Failed to save grade', err)
    } finally {
        saving.value = false
    }
}

const wordCount = computed(() => {
    if (!answer.value?.text_answer) return 0
    return answer.value.text_answer.trim().split(/\s+/).length
})

const wordCountStatus = computed(() => {
    const min = answer.value?.question?.min_words || 0
    const max = answer.value?.question?.max_words || 0
    const count = wordCount.value

    if (count < min) return 'too-short'
    if (max > 0 && count > max) return 'too-long'
    return 'ok'
})

const requestAiSuggestion = async () => {
    aiLoading.value = true
    aiError.value = null
    aiSuggestion.value = null
    try {
        const response = await api.post(`/admin/grading/${route.params.id}/ai-suggest`)
        aiSuggestion.value = response.data
        // Auto-populate the form with AI suggestions
        form.value.points_awarded = response.data.suggested_score
        form.value.teacher_feedback = response.data.feedback
        if (response.data.rubric) {
            form.value.grading_details = { ...response.data.rubric }
        }
    } catch (err) {
        aiError.value = err.response?.data?.error || 'AI suggestion failed. Please try again.'
    } finally {
        aiLoading.value = false
    }
}

onMounted(() => {
    fetchAnswer()
})
</script>

<template>
    <AdminLayout>
        <div v-if="loading" class="flex flex-col items-center justify-center h-64 space-y-4">
            <i class="pi pi-spin pi-spinner text-4xl text-brand-primary"></i>
            <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Submission...</p>
        </div>

        <div v-else-if="answer" class="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700 pb-20">
            <!-- Breadcrumbs / Top Nav -->
            <div class="flex items-center justify-between">
                <Button icon="pi pi-arrow-left" label="Back to Hub" text @click="router.push({ name: 'admin.grading' })" 
                    class="text-slate-500 font-black text-xs uppercase" />
                <div class="flex items-center gap-3">
                    <Tag :value="answer.question.type.toUpperCase()" severity="info" class="rounded-lg px-3 font-black text-[10px]" />
                    <span class="text-slate-300">/</span>
                    <span class="text-xs font-black text-slate-400 uppercase tracking-widest">Correction Desk</span>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <!-- Left Column: Student Submission -->
                <div class="lg:col-span-8 space-y-6">
                    <!-- Prompt Card -->
                    <div class="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div class="relative z-10">
                            <div class="flex items-center gap-2 mb-4">
                                <i class="pi pi-info-circle text-brand-accent"></i>
                                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Question Prompt</span>
                            </div>
                            <h2 class="text-xl font-black mb-4 leading-relaxed">{{ answer.question.instructions }}</h2>
                            <div v-if="answer.question.content" class="prose prose-invert max-w-none text-slate-300" v-html="answer.question.content"></div>
                        </div>
                        <i class="pi pi-pencil absolute -right-10 -bottom-10 text-[12rem] text-white/5"></i>
                    </div>

                    <!-- Student Answer Card -->
                    <div class="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 relative group">
                        <div class="flex items-center justify-between mb-8">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                    <i class="pi pi-user text-indigo-500"></i>
                                </div>
                                <div>
                                    <h3 class="text-lg font-black text-slate-800">{{ answer.attempt?.student?.user?.name || 'Unknown Candidate' }}</h3>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate Submission</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="flex items-center gap-2" :class="{'text-rose-500': wordCountStatus !== 'ok', 'text-emerald-500': wordCountStatus === 'ok'}">
                                    <span class="text-2xl font-black">{{ wordCount }}</span>
                                    <span class="text-[10px] font-black uppercase tracking-widest opacity-60">Words</span>
                                </div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase">
                                    Target: {{ answer.question.min_words }}-{{ answer.question.max_words }}
                                </p>
                            </div>
                        </div>

                        <div class="bg-slate-50/50 rounded-3xl p-8 min-h-[300px] relative border border-slate-100/50">
                            <p class="text-slate-700 leading-relaxed text-lg whitespace-pre-wrap selection:bg-indigo-100">{{ answer.text_answer }}</p>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Grading Controls -->
                <div class="lg:col-span-4 space-y-6">

                    <!-- AI Suggest Button Card -->
                    <div v-if="answer.question.type === 'writing'"
                        class="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-2xl shadow-violet-200 relative overflow-hidden">
                        <div class="relative z-10">
                            <div class="flex items-center gap-2 mb-3">
                                <span class="text-xl">✨</span>
                                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">AI-Assisted Grading</p>
                            </div>
                            <p class="text-xs text-violet-200 font-medium mb-4 leading-relaxed">Let Gemini AI analyze this essay and suggest a score, detailed feedback, and rubric breakdown.</p>

                            <!-- AI Error -->
                            <div v-if="aiError" class="bg-red-500/20 border border-red-300/30 rounded-xl p-3 mb-4 text-xs text-red-200 font-medium">
                                {{ aiError }}
                            </div>

                            <!-- AI Suggestion Result -->
                            <div v-if="aiSuggestion && !aiLoading" class="bg-white/10 rounded-2xl p-4 mb-4 space-y-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-black text-violet-200 uppercase tracking-wide">Suggested Score</span>
                                    <span class="text-2xl font-black">{{ aiSuggestion.suggested_score }} / {{ answer.question.points }}</span>
                                </div>
                                <div v-if="aiSuggestion.strengths" class="text-xs text-emerald-300 font-medium">
                                    <span class="font-black">✅ Strong:</span> {{ aiSuggestion.strengths }}
                                </div>
                                <div v-if="aiSuggestion.improvements" class="text-xs text-amber-300 font-medium">
                                    <span class="font-black">💡 Improve:</span> {{ aiSuggestion.improvements }}
                                </div>
                                <p class="text-[9px] text-violet-300 font-bold uppercase tracking-widest pt-1">↓ Form updated with AI suggestions — review before saving</p>
                            </div>

                            <Button
                                :label="aiLoading ? 'Analyzing...' : aiSuggestion ? 'Re-Analyze' : 'Get AI Suggestion'"
                                :icon="aiLoading ? 'pi pi-spin pi-spinner' : 'pi pi-sparkles'"
                                :loading="aiLoading"
                                @click="requestAiSuggestion"
                                class="w-full rounded-xl py-3 font-black bg-white/20 hover:bg-white/30 border border-white/20 text-white transition-all hover:scale-105 active:scale-95 text-xs" />
                        </div>
                        <i class="pi pi-sparkles absolute -right-6 -bottom-6 text-[8rem] text-white/5"></i>
                    </div>

                    <!-- Grading Form Card -->
                    <div class="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 sticky top-32">
                        <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Assessment Score</h3>

                        <div class="space-y-8">
                            <!-- Main Points -->
                            <div class="bg-slate-50 rounded-3xl p-6 border border-slate-100 text-center">
                                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Total Points Awarded</p>
                                <div class="flex items-center justify-center gap-4">
                                    <InputNumber v-model="form.points_awarded" :min="0" :max="answer.question.points" showButtons
                                        buttonLayout="horizontal"
                                        class="h-16"
                                        inputClass="w-24 text-center text-3xl font-black text-indigo-600 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 transition-all"
                                        incrementButtonClass="bg-white text-slate-400 border-none hover:text-indigo-500"
                                        decrementButtonClass="bg-white text-slate-400 border-none hover:text-indigo-500"
                                        incrementButtonIcon="pi pi-plus"
                                        decrementButtonIcon="pi pi-minus" />
                                    <div class="text-slate-300 text-2xl font-black">/</div>
                                    <div class="text-slate-400 text-3xl font-black">{{ answer.question.points }}</div>
                                </div>
                            </div>

                            <Divider />

                            <!-- Feedback -->
                            <div class="space-y-3">
                                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Teacher Feedback</label>
                                <Textarea v-model="form.teacher_feedback" rows="6" autoResize
                                    placeholder="Provide constructive feedback to the candidate..."
                                    class="w-full rounded-2xl border-2 border-slate-100 p-4 font-medium text-sm focus:border-indigo-500 transition-all bg-slate-50/30" />
                            </div>

                            <!-- Rubrics -->
                            <div class="space-y-4">
                                <p class="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                    <i class="pi pi-chart-bar"></i> Evaluation Rubric
                                </p>
                                <div class="grid grid-cols-2 gap-3">
                                    <div v-for="(val, key) in form.grading_details" :key="key"
                                        class="p-3 rounded-xl border text-center cursor-pointer transition-all"
                                        :class="val > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:bg-indigo-50'"
                                        @click="form.grading_details[key] = (form.grading_details[key] % 5) + 1">
                                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">{{ key.replace('_', ' ') }}</p>
                                        <div class="flex justify-center gap-0.5">
                                            <i v-for="i in 5" :key="i" class="pi pi-star-fill text-[8px]"
                                                :class="i <= val ? 'text-amber-400' : 'text-slate-200'"></i>
                                        </div>
                                        <p class="text-[8px] font-black text-indigo-400 mt-1">{{ val }}/5</p>
                                    </div>
                                </div>
                            </div>

                            <Button label="Submit Grade" icon="pi pi-cloud-upload" :loading="saving"
                                @click="submitGrade"
                                class="w-full rounded-2xl py-4 font-black bg-slate-900 border-none shadow-2xl hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
:deep(.p-inputnumber-input) {
    box-shadow: none !important;
}
</style>
