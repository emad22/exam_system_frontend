<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import api from '@/services/api'
import { useMediaUrl } from '@/composables/useMediaUrl'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'

const { resolveUrl } = useMediaUrl()

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
        grammar: '',
        vocabulary: ''
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

const mediaUrl = computed(() => {
    if (!answer.value?.media_answer) return null
    return resolveUrl(answer.value.media_answer)
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
                <div class="lg:col-span-7 space-y-6">
                    <!-- Prompt Card -->
                    <div class="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div class="relative z-10">
                            <div class="flex items-center gap-2 mb-4">
                                <i class="pi pi-info-circle text-brand-accent"></i>
                                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Question Prompt</span>
                            </div>
                            <!-- <h2 class="text-xl font-black mb-4 leading-relaxed" dir="rtl">{{ answer.question.instructions }}</h2> -->
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
                                    <h3 class="text-lg font-black text-slate-800">{{ answer.attempt?.student?.user?.first_name + " " + answer.attempt?.student?.user?.last_name || 'Unknown Candidate' }}</h3>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate Submission</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="flex items-center gap-2" :class="{'text-rose-500': wordCountStatus !== 'ok', 'text-emerald-500': wordCountStatus === 'ok'}">
                                    <span v-if="answer.question.type !== 'speaking'" class="text-2xl font-black">{{ wordCount }}</span>
                                    <span v-if="answer.question.type !== 'speaking'" class="text-[10px] font-black uppercase tracking-widest opacity-60">Words</span>
                                </div>
                                <p v-if="answer.question.type !== 'speaking'" class="text-[10px] font-bold text-slate-400 uppercase">
                                    Target: {{ answer.question.min_words }}-{{ answer.question.max_words }}
                                </p>
                            </div>
                        </div>

                        <div class="bg-slate-50/50 rounded-3xl p-8 min-h-[300px] relative border border-slate-100/50 text-justify flex flex-col justify-center">
                            <p v-if="answer.text_answer" class="text-slate-700 leading-relaxed text-lg whitespace-pre-wrap selection:bg-indigo-100" dir="rtl">{{ answer.text_answer }}</p>
                            
                            <div v-if="mediaUrl" class="w-full space-y-4 mt-6 p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recorded Answer</span>
                                <audio :src="mediaUrl" controls class="w-full max-w-md h-12"></audio>
                            </div>

                            <div v-if="!answer.text_answer && !mediaUrl" class="text-center text-slate-400 italic">
                                No answer provided by the candidate.
                            </div>
                        </div>
                    </div>
                    <!-- AI Suggestion Section -->
                    <!-- <div v-if="answer.question.type === 'writing'" class="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div class="relative z-10">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-2">
                                    <i class="pi pi-sparkles text-amber-400"></i>
                                    <span class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">AI Grading Assistant</span>
                                </div>
                                <Button 
                                    label="Generate Suggestion" 
                                    icon="pi pi-bolt" 
                                    :loading="aiLoading" 
                                    @click="requestAiSuggestion"
                                    class="bg-amber-500 hover:bg-amber-600 border-none text-xs font-black rounded-xl px-4 py-2"
                                />
                            </div>
                            
                            <div v-if="aiSuggestion" class="space-y-4 animate-in fade-in duration-500">
                                <p class="text-sm font-medium text-indigo-100 leading-relaxed">{{ aiSuggestion.feedback }}</p>
                                <div class="flex gap-4">
                                    <Tag :value="'Suggested Score: ' + aiSuggestion.suggested_score" severity="warning" class="rounded-lg px-3 font-black text-[10px]" />
                                </div>
                                <p class="text-[10px] font-bold text-indigo-400">Note: AI suggestions are for guidance. Final grade is at the teacher's discretion.</p>
                            </div>
                            <Message v-if="aiError" severity="error" class="mt-4">{{ aiError }}</Message>
                        </div>
                        <i class="pi pi-sparkles absolute -right-10 -top-10 text-[12rem] text-white/5"></i>
                    </div> -->
                </div>

                <!-- Right Column: Grading Controls -->
                <div class="lg:col-span-5 space-y-6"> 
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
                                <div class="grid grid-cols-1 gap-4">
                                    <div v-for="(val, key) in form.grading_details" :key="key" 
                                        class="flex flex-col p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all space-y-2">
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ key.replace('_', ' ') }}</label>
                                        <InputText v-model="form.grading_details[key]" 
                                            class="w-full font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 py-3 px-4"
                                            :placeholder="'Enter ' + key + ' feedback...'" />
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
