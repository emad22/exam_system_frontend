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

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

// Translation Dictionary
const t = {
    ar: {
        loading: "جاري تحميل إجابات الطالب للتقييم اليدوي...",
        backToHub: "العودة لقسم التقييم اليدوي",
        correctionDesk: "منصة التصحيح والتقييم اليدوي",
        attempt: "محاولة رقم",
        totalAwarded: "إجمالي الدرجة الممنوحة",
        pointsAcrossTasks: "الدرجات الموزعة عبر المهارات المستهدفة",
        questionsCount: "أسئلة",
        skillScore: "درجة القسم",
        maxCap: "الحد الأقصى",
        maxPoints: "الدرجة القصوى",
        questionPrompt: "السؤال المطروح",
        studentAnswer: "إجابة الطالب المقدمة",
        noContent: "لا يوجد محتوى متوفر",
        noAnswerSubmitted: "لم يقم الطالب بتقديم إجابة لهذا السؤال.",
        pointsInputLabel: "الدرجة المستحقة للمحاولة",
        feedbackLabel: "ملاحظات وتوجيه المعلم",
        feedbackPlaceholder: "اكتب تعليقاً توجيهياً وبنّاءً لمساعدة الطالب على التحسن...",
        submitButton: "اعتماد وحفظ كافة الدرجات",
        noQuestionsFound: "لا توجد أسئلة مقالية أو شفهية بحاجة لتصحيح يدوي في هذه المحاولة.",
        attemptNotFound: "لم يتم العثور على محاولة التقييم المطلوبة في قاعدة البيانات.",
        totalScore: "النتيجة الإجمالية"
    },
    en: {
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
        totalScore: "Total Score"
    }
};

// Attempt data from API
const attempt  = ref(null)
const skills   = ref([])   // [{ skill_id, skill_name, max_points, answers: [...] }]

// Grades keyed by answer_id
const grades = ref({})   // { [answer_id]: { points_awarded, teacher_feedback } }

// ── Helper Functions for File Type Detection ───────────────────────────────
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

const getFileTypeLabel = (filePath) => {
    const ext = getFileExtension(filePath);
    if (['mp3', 'wav', 'm4a', 'webm', 'ogg'].includes(ext)) return 'صوتي';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return 'صورة';
    if (['pdf'].includes(ext)) return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'وثيقة';
    return 'ملف';
};

const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

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
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            
            <!-- Loading -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <i class="pi pi-spin pi-spinner text-4xl text-brand-primary"></i>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].loading }}</p>
            </div>

            <div v-else-if="attempt" class="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-32 px-4">

                <!-- Premium Header Navigation Card -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="relative z-10 flex items-center gap-6">
                        <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded 
                                @click="router.push({ name: 'admin.grading' })" 
                                class="w-12 h-12 flex items-center justify-center border border-slate-200 hover:border-slate-300 shadow-sm bg-white" />
                        <div>
                             <div class="flex items-center gap-2 text-xs font-extrabold text-brand-primary uppercase tracking-wider">
                                  <i class="pi pi-sparkles text-brand-accent"></i>
                                  <span>{{ t[currentLang].correctionDesk }}</span>
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
                        <Tag :value="`${t[currentLang].attempt} ${attempt.id}`" severity="info" class="text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border-none shadow-sm" />
                    </div>
                </div>

                <!-- Student Overview Card -->
                <div class="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                    <!-- Ambient glows inside the dark card -->
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
                        <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest">{{ t[currentLang].totalAwarded }}</p>
                        <div class="flex items-end gap-1 justify-center md:justify-end mt-1">
                            <span class="text-5xl font-black text-emerald-400 tracking-tighter leading-none">{{ totalAwarded }}</span>
                            <span class="text-xl text-slate-500 font-black mb-0.5">/ {{ totalPossible }}</span>
                        </div>
                        <p class="text-[10px] text-slate-500 font-bold mt-1">{{ t[currentLang].pointsAcrossTasks }}</p>
                    </div>
                    
                    <i class="pi pi-pen-to-square absolute -right-8 -bottom-8 text-[10rem] text-white/5 opacity-40 group-hover:scale-110 transition-transform duration-700"></i>
                </div>

                <!-- Per-skill blocks -->
                <div v-for="skill in skills" :key="skill.skill_id" class="space-y-6">

                    <!-- Skill header -->
                    <div class="flex items-center justify-between px-3 mt-8">
                        <div class="flex items-center gap-3">
                            <div class="w-2.5 h-8 rounded-full"
                                :class="skill.skill_name.toLowerCase().includes('speak') ? 'bg-amber-500' : 'bg-rose-600'"></div>
                            <div>
                                <h3 class="font-black text-slate-800 text-lg leading-tight">{{ skill.skill_name }}</h3>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                    {{ skill.answers.length }} {{ t[currentLang].questionsCount }}
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <!-- Running total for this skill -->
                            <div class="bg-white rounded-2xl px-5 py-2.5 text-center shadow-sm border border-slate-50">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-wider">{{ t[currentLang].skillScore }}</p>
                                <p class="font-black text-slate-800 text-base mt-0.5">
                                    <span class="text-emerald-600">{{ skillAwarded(skill) }}</span>
                                    <span class="text-slate-400"> / {{ skillPossible(skill) }}</span>
                                </p>
                            </div>
                            <!-- Admin max cap -->
                            <div v-if="skill.answers.length > 0" class="bg-rose-50/50 border border-rose-100/60 rounded-2xl px-5 py-2.5 text-center shadow-sm">
                                <p class="text-[9px] font-black text-rose-400 uppercase tracking-wider">{{ t[currentLang].maxCap }}</p>
                                <p class="font-black text-rose-600 text-base mt-0.5">{{ skill.max_points ?? skillPossible(skill) }} pts</p>
                            </div>
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
                                    :severity="ans.question?.type === 'speaking' ? 'warning' : 'info'"
                                    class="text-[9px] font-black tracking-wider rounded-lg px-2.5 py-1" />
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].maxPoints }}</span>
                                <span class="text-lg font-black text-brand-primary">{{ ans.question?.points ?? 0 }}</span>
                            </div>
                        </div>

                        <div class="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <!-- Left: Question + Student answer -->
                            <div class="space-y-5">
                                <!-- Question prompt -->
                                <div class="bg-slate-900 rounded-2xl p-5 text-white text-sm relative overflow-hidden shadow-inner">
                                    <div class="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                                    <p class="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-3">{{ t[currentLang].questionPrompt }}</p>
                                    <div v-if="ans.question?.content"
                                        class="prose prose-invert prose-sm max-w-none text-slate-200 font-medium"
                                        v-html="ans.question.content"></div>
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
                                            v-html="ans.question.passage.content"></div>
                                        <p v-else class="text-slate-400 italic text-xs">{{ t[currentLang].noContent }}</p>
                                    </div>
                                    <p v-else class="text-slate-400 italic text-xs">{{ t[currentLang].noContent }}</p>
                                </div>

                                <!-- Student answer -->
                                <div class="bg-slate-50/60 rounded-2xl p-6 border border-slate-100 shadow-inner min-h-[120px]">
                                    <p class="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-4">{{ t[currentLang].studentAnswer }}</p>
                                    
                                    <!-- Text/HTML answer -->
                                    <div v-if="ans.text_answer"
                                        class="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap font-medium" dir="auto"
                                        v-html="ans.text_answer"></div>
                                    
                                    <!-- Image answer -->
                                    <div v-if="ans.media_answer && isImageFile(ans.media_answer)" class="mt-2">
                                        <div class="space-y-2">
                                            <img :src="resolveUrl(ans.media_answer)" 
                                                alt="Student Image" 
                                                class="rounded-lg border border-slate-200 max-w-sm max-h-64 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                                @click="$event.target.click()" />
                                            <p class="text-xs text-slate-500">نقر للعرض بالحجم الكامل</p>
                                        </div>
                                    </div>
                                    
                                    <!-- Audio answer -->
                                    <div v-if="ans.media_answer && isAudioFile(ans.media_answer)" class="mt-4">
                                        <div class="space-y-2">
                                            <audio :src="resolveUrl(ans.media_answer)" controls class="w-full h-11 rounded-xl shadow-sm border border-slate-200"></audio>
                                            <p class="text-xs text-slate-500">الملف الصوتي: {{ getFileTypeLabel(ans.media_answer) }}</p>
                                        </div>
                                    </div>
                                    
                                    <!-- Document/File answer -->
                                    <div v-if="ans.media_answer && isDocumentFile(ans.media_answer)" class="mt-4">
                                        <div class="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                                            <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg">
                                                <i :class="['pi', getFileIcon(ans.media_answer), 'text-slate-600']"></i>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-bold text-slate-700 truncate">{{ ans.media_answer.split('/').pop() }}</p>
                                                <p class="text-xs text-slate-500">{{ getFileTypeLabel(ans.media_answer) }}</p>
                                            </div>
                                            <a :href="resolveUrl(ans.media_answer)" 
                                                target="_blank"
                                                class="flex-shrink-0 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors">
                                                <i class="pi pi-download mr-1"></i>
                                                تحميل
                                            </a>
                                        </div>
                                    </div>
                                    
                                    <!-- No answer -->
                                    <p v-if="!ans.text_answer && !ans.media_answer"
                                        class="text-slate-400 italic text-xs font-semibold">{{ t[currentLang].noAnswerSubmitted }}</p>
                                </div>
                            </div>

                            <!-- Right: Scoring inputs -->
                            <div class="space-y-6">
                                <!-- Points input -->
                                <div class="bg-slate-50/60 rounded-2xl p-6 border border-slate-100 shadow-inner flex flex-col justify-center">
                                    <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3.5">{{ t[currentLang].pointsInputLabel }}</p>
                                    <div class="flex items-center gap-4">
                                        <InputNumber
                                            v-model="grades[ans.id].points_awarded"
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

                                <!-- Feedback -->
                                <div class="space-y-2 flex flex-col">
                                    <label class="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mr-1">
                                        {{ t[currentLang].feedbackLabel }}
                                    </label>
                                    <Textarea
                                        v-model="grades[ans.id].teacher_feedback"
                                        rows="4" autoResize
                                        :placeholder="t[currentLang].feedbackPlaceholder"
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
                    <p class="font-extrabold text-sm uppercase tracking-wider">{{ t[currentLang].noQuestionsFound }}</p>
                </div>

                <!-- Sticky Submit Bar -->
                <div class="fixed bottom-0 inset-x-0 z-50 flex justify-center pb-6 pointer-events-none px-4">
                    <div class="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2.2rem] shadow-2xl px-8 py-4.5 flex items-center justify-between gap-8 pointer-events-auto max-w-lg w-full">
                        <div class="text-start">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].totalScore }}</p>
                            <p class="text-2xl font-black mt-0.5 leading-none">
                                <span class="text-emerald-500">{{ totalAwarded }}</span>
                                <span class="text-slate-300 text-lg"> / {{ totalPossible }}</span>
                            </p>
                        </div>
                        <Button
                            :label="t[currentLang].submitButton"
                            icon="pi pi-cloud-upload"
                            :loading="saving"
                            @click="submitGrades"
                            class="rounded-2xl px-6 py-3.5 font-black bg-brand-primary hover:bg-rose-800 text-white border-none shadow-lg shadow-rose-200 transition-all hover:scale-105 active:scale-95" />
                    </div>
                </div>

            </div>

            <!-- Not found -->
            <div v-else class="text-center py-32 text-slate-400 bg-white rounded-[2rem] border border-slate-100 shadow-sm max-w-md mx-auto mt-20">
                <i class="pi pi-exclamation-triangle text-5xl mb-4 block text-amber-500"></i>
                <p class="font-black text-lg tracking-tight">{{ t[currentLang].attemptNotFound }}</p>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

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
