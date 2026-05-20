<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useAdminStore } from '@/stores/admin';

import Button from 'primevue/button';
import Card from 'primevue/card';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import InputNumber from 'primevue/inputnumber';
import Slider from 'primevue/slider';
import Editor from 'primevue/editor';
import ImageResizeUploader from '@/components/ImageResizeUploader.vue';

const { showAlert } = useModal();

const router = useRouter();
const route = useRoute();
const adminStore = useAdminStore();
const questionId = route.params.id;

const skills = ref([]);
const exams = ref([]);
const passages = ref([]);
const isSubmitting = ref(false);
const loading = ref(true);
const errorMsg = ref('');

const passageShowHtml = ref(false);
const currentLang = ref(localStorage.getItem('dashboard_lang') || 'ar');

// Translation Dictionary
const t = {
    ar: {
        activeSystem: "نظام تعديل بنك الأسئلة النشط",
        headerTitle: "تعديل حزمة الأسئلة",
        headerSubtitle: "مزامنة المحتوى والروابط المعيارية عبر السياق المشترك",
        saveAllBtn: "تحديث وحفظ التعديلات",
        publishBtn: "حفظ وتعديل الأسئلة 💾",
        addAnotherBtn: "إضافة سؤال إضافي ➕",
        examSkillSettings: "إعدادات الاختبار والمهارة",
        linkedExam: "الاختبار المرتبط (مطلوب)",
        targetSkill: "المهارة المستهدفة (مطلوب)",
        difficultyLevel: "مستوى صعوبة السؤال",
        beginnerText: "مبتدئ (مستوى ١)",
        expertText: "خبير (مستوى {max})",
        pointsBudget: "ميزانية النقاط للمهارة",
        budgetOver: "⚠️ متجاوز للميزانية",
        budgetOk: "✅ ضمن الميزانية",
        skillCap: "سقف المهارة المسموح:",
        noCapTitle: "⚠️ لم يتم تحديد سقف",
        noCapDesc: "لا يوجد حد أقصى لنقاط هذه المهارة في هذا الاختبار.",
        readingMaterial: "مادة القراءة / السياق المشترك",
        selectExamPlaceholder: "اختر الاختبار من القائمة...",
        selectSkillPlaceholder: "اختر المهارة من القائمة...",
        selectPassagePlaceholder: "🔍 اختر مادة قراءة من المكتبة...",
        modes: {
            none: "سؤال منفرد مستقل",
            existing: "استخدام مادة سابقة",
            new: "إنشاء مادة قراءة جديدة"
        },
        passageTitleLabel: "عنوان المادة / النص القرائي",
        passageTitlePlaceholder: "مثال: قطعة الفهم والاستيعاب حول الفضاء...",
        passageTypeLabel: "نوع المادة والمحتوى",
        passageTypes: {
            text: "نص قرائي",
            image: "مادة معتمدة على صورة",
            audio: "مادة معتمدة على مقطع صوتي",
            video: "مادة معتمدة على مقطع فيديو"
        },
        passageContentLabel: "المحتوى الرئيسي / نص القطعة",
        passageContentDesc: "اكتب نص القراءة التوجيهي للأسئلة والمهام الفرعية.",
        visualTab: "معاينة مرئية",
        sourceTab: "كود المصدر HTML",
        mediaAssetsLabel: "الملحقات والوسائط والروابط (صور وصوتيات)",
        attachListening: "إرفاق ملف الاستماع",
        mp3Support: "صيغة MP3 أو WAV حتى ١٠ ميجابايت",
        audioLinked: "تم ربط المقطع الصوتي",
        imageAttach: "إرفاق صورة توضيحية للمادة",
        imageSelect: "إرفاق صورة للسؤال",
        otherMediaLabel: "ملحقات إضافية أخرى (فيديو / وسائط متعددة)",
        needVideo: "هل تحتاج لإرفاق فيديو أو وسائط أخرى؟",
        clickHere: "انقر هنا للإرفاق",
        fileAttached: "تم إرفاق الملف المساعد",
        draftQuestions: "الأسئلة والمهام المرتبطة",
        questionTypeLabel: "نوع السؤال الأكاديمي",
        instructionsLabel: "توجيهات وتعليمات السؤال للمرشح",
        questionPrompt: "صيغة أو نص السؤال",
        textTab: "نص السؤال",
        mediaTab: "وسائط (صوت/صورة/فيديو)",
        imageAttachment: "صورة توضيحية للسؤال",
        audioAttachment: "ملف صوتي للسؤال",
        selectAudioFile: "اختر ملفاً صوتياً",
        audioAdded: "تم إضافة ملف الصوت للمهمة",
        optionsMatrix: "خيارات الإجابة والمعايرة",
        addOptionBtn: "إضافة خيار",
        acceptedVariation: "الإجابة الصحيحة المقبولة...",
        optionValuePlaceholder: "قيمة الخيار...",
        scoringParams: "الدرجات والمعايير الفرعية",
        defineWeight: "تحديد درجات السؤال والقيود المعيارية",
        displayOrder: "ترتيب العرض",
        questionPoints: "درجة السؤال",
        minWordLabel: "الحد الأدنى للكلمات",
        maxWordLabel: "الحد الأقصى للكلمات",
        minWordPlaceholder: "مثال: ١٥٠ كلمة",
        maxWordPlaceholder: "مثال: ٢٥٠ كلمة",
        guides: {
            writingTitle: "دليل المهمة الكتابية (Writing Task)",
            writingText: "قم بكتابة نص المهمة أو السؤال بوضوح. سيتم عرض مربع نص للطالب للكتابة فيه. يمكنك تحديد الحد الأدنى والأقصى للكلمات في قسم 'المعايير' بالأسفل.",
            dragDropTitle: "دليل السحب والإفلات",
            dragDropText: "استخدم <b>...............</b> في المكان الذي تريد فيه فراغاً. كل <b>...............</b> سيتم ربطه بإحدى الخيارات أدناه بالترتيب. مثال: \"تعتبر الـ <b>...............</b> من الـ <b>...............</b> الأليفة.\"",
            wordSelectTitle: "دليل اختيار الكلمات",
            wordSelectText: "سيقوم النظام تلقائياً بجعل الكلمات التي تضيفها في 'الخيارات' قابلة للنقر. حدد <b>صح</b> للكلمات التي <b>يجب</b> على الطالب النقر عليها.",
            fillBlankTitle: "دليل ملء الفراغات",
            fillBlankText: "استخدم <b>...............</b> في المكان الذي تريد فيه مربع نص. كل <b>...............</b> سيتم فحصه مقابل الخيارات أدناه بالترتيب. إجابات متعددة مقبولة: إذا كانت الإجابة الصحيحة أكثر من كلمة، ضعها في نفس الخيار مفصولةً بـ <b>|</b>. مثال: <b>لم | لن</b> يعني أن كتابة أي منهما صحيحة.",
            matchingTitle: "دليل التوصيل (Matching)",
            matchingText: "أضف الأزواج باستخدام علامة الأنبوب. مثال: <b>الكلمة | التعريف</b>. سيتم تقسيم كل زوج تلقائياً. لإضافة مشتت (إجابة ليس لها أصل)، ببساطة أدخل النص بدون علامة الأنبوب.",
            orderingTitle: "دليل الترتيب (Ordering)",
            orderingText: "أضف العناصر بالترتيب الصحيح. سيقوم النظام بعرضها مبعثرة للطلاب ويقيم ترتيبهم وفق الهيكل المحدد هنا.",
            highlightTitle: "دليل تمييز النص (Highlight)",
            highlightText: "أضف عبارات أو جملاً كخيارات. حدد <b>صح</b> لتلك التي يجب على الطالب تمييزها."
        },
        validationExam: "يرجى اختيار الاختبار المرتبط للمتابعة.",
        validationSkill: "يرجى تحديد مهارة السؤال للمتابعة.",
        validationLevel: "يرجى تحديد مستوى الصعوبة المناسب للمتابعة.",
        validationPointsLimit: "نقاط السؤال الإجمالية ({current}) تتجاوز الحد الأقصى للمهارة ({max} نقطة).",
        saveSuccessMsg: "تم تحديث وحفظ مجموعة الأسئلة بنجاح!",
        loadingContext: "جاري تحميل تفاصيل السؤال وسياقه الأكاديمي...",
        globalSettings: "الإعدادات العامة للأسئلة"
    },
    en: {
        activeSystem: "Active Question Bank System",
        headerTitle: "Edit Batch Questions",
        headerSubtitle: "Sync content and link properties across shared context",
        saveAllBtn: "Update All Changes",
        publishBtn: "Save & Update Questions 💾",
        addAnotherBtn: "Add Another Question ➕",
        examSkillSettings: "Exam & Skill Settings",
        linkedExam: "Linked Exam (Required)",
        targetSkill: "Target Skill (Required)",
        difficultyLevel: "Question Difficulty Level",
        beginnerText: "Beginner (Level 1)",
        expertText: "Expert (Level {max})",
        pointsBudget: "Points Budget",
        budgetOver: "⚠️ Over Budget",
        budgetOk: "✅ Remaining",
        skillCap: "Skill Cap Limit:",
        noCapTitle: "⚠️ No Cap Set",
        noCapDesc: "No max points limit configured for this skill in this exam.",
        readingMaterial: "Reading Material / Shared Context",
        selectExamPlaceholder: "Select Exam from list...",
        selectSkillPlaceholder: "Select Skill from list...",
        selectPassagePlaceholder: "🔍 Select passage from library...",
        modes: {
            none: "Single Question",
            existing: "Use Existing Material",
            new: "Create New Material"
        },
        passageTitleLabel: "Title of the Material / Text",
        passageTitlePlaceholder: "e.g. Reading Comprehension: Solar System...",
        passageTypeLabel: "Material Type & Content",
        passageTypes: {
            text: "Reading Text",
            image: "Image-based Material",
            audio: "Audio-based Material",
            video: "Video-based Material"
        },
        passageContentLabel: "Main Content / Passage Text",
        passageContentDesc: "Type the reading text that questions will be based on.",
        visualTab: "Visual Mode",
        sourceTab: "HTML Source Code",
        mediaAssetsLabel: "Media Assets & Links (Images & Audio)",
        attachListening: "Attach Listening Clip",
        mp3Support: "MP3 or WAV up to 10MB",
        audioLinked: "Audio clip successfully linked",
        imageAttach: "Attach Material Image",
        imageSelect: "Attach Question Image",
        otherMediaLabel: "Other Supplemental Media (Video / Miscellaneous)",
        needVideo: "Do you need to attach a video or other file?",
        clickHere: "Click here to attach",
        fileAttached: "Supplemental file attached",
        draftQuestions: "Associated Questions List",
        questionTypeLabel: "Academic Question Type",
        instructionsLabel: "Question Instructions & Guidelines",
        questionPrompt: "Question Text or Prompt",
        textTab: "Question Text",
        mediaTab: "Media Assets (Audio/Image/Video)",
        imageAttachment: "Question Image Attachment",
        audioAttachment: "Question Audio Attachment",
        selectAudioFile: "Select Audio File",
        audioAdded: "Audio successfully linked to task",
        optionsMatrix: "Options Matrix & Calibration",
        addOptionBtn: "Add Option",
        acceptedVariation: "Accepted variation...",
        optionValuePlaceholder: "Option value...",
        scoringParams: "Scoring & Parameters",
        defineWeight: "Define question weight & constraints",
        displayOrder: "Display Order",
        questionPoints: "Question Points",
        minWordLabel: "Min Words Limit",
        maxWordLabel: "Max Words Limit",
        minWordPlaceholder: "e.g. 150 words",
        maxWordPlaceholder: "e.g. 250 words",
        guides: {
            writingTitle: "Writing Task Guide",
            writingText: "Write the prompt clearly. A rich text area will be presented to the student. You can configure minimum and maximum word limits in the parameters section below.",
            dragDropTitle: "Drag & Drop Guide",
            dragDropText: "Use <b>...............</b> where you want a blank space. Each <b>...............</b> will be matched to one of the options below in order. Example: \"The <b>...............</b> is a <b>...............</b> animal.\"",
            wordSelectTitle: "Word Selection Guide",
            wordSelectText: "The system will automatically make the words you add in 'Options' clickable. Mark <b>Correct</b> for words that the student should click.",
            fillBlankTitle: "Fill in the Blanks Guide",
            fillBlankText: "Use <b>...............</b> where you want a text box. Each <b>...............</b> will be checked against the options below in order. Multiple accepted answers: If a blank has multiple valid answers, put them in the same option separated by <b>|</b>. Example: <b>would | will</b>.",
            matchingTitle: "Matching Guide",
            matchingText: "Add pairs using the pipe symbol. Example: <b>Term | Definition</b>. Each pair will be split automatically. To add a distractor, enter the text without the pipe symbol.",
            orderingTitle: "Ordering Guide",
            orderingText: "Add items in the correct order. The system will shuffle them for students and grade their sequence according to this structure.",
            highlightTitle: "Highlight Guide",
            highlightText: "Add phrases or sentences as options. Mark <b>Correct</b> for those that the student should highlight."
        },
        validationExam: "Please select a linked exam to proceed.",
        validationSkill: "Please select a target skill to proceed.",
        validationLevel: "Please select a difficulty level to proceed.",
        validationPointsLimit: "Total question points ({current}) exceed the skill cap of {max} pts.",
        saveSuccessMsg: "Batch questions successfully updated!",
        loadingContext: "Loading question context...",
        globalSettings: "Global Settings"
    }
};

const questionTypes = [
    { label: 'Multiple Choice (MCQ)', value: 'mcq', icon: 'pi-check-square' },
    { label: 'True / False', value: 'true_false', icon: 'pi-verified' },
    { label: 'Fill in the Blank', value: 'fill_blank', icon: 'pi-pencil' },
    { label: 'Drag & Drop', value: 'drag_drop', icon: 'pi-arrows-alt' },
    { label: 'Click Word', value: 'click_word', icon: 'pi-cursor-click' },
    { label: 'Matching', value: 'matching', icon: 'pi-link' },
    { label: 'Ordering', value: 'ordering', icon: 'pi-list' },
    { label: 'Highlight', value: 'highlight', icon: 'pi-eye' },
    { label: 'Listening Task', value: 'listening', icon: 'pi-headphones' },
    { label: 'Short Answer', value: 'short_answer', icon: 'pi-pencil' },
    { label: 'Writing Task', value: 'writing', icon: 'pi-file-edit' },
    { label: 'Speaking Task', value: 'speaking', icon: 'pi-microphone' },
    { label: 'File Upload', value: 'upload', icon: 'pi-upload' },
    { label: 'Word Selection (Legacy)', value: 'word_selection', icon: 'pi-cursor-click' }
];

const form = ref({
    skill_id: '',
    exam_id: '',
    level_id: null,
    passage_mode: 'none',
    passage_id: '',
    passage_type: 'text',
    passage_title: '',
    passage_content: '',
    passage_questions_limit: null,
    passage_is_random: false,
    p_media: null,
    p_audio: null,
    p_audio_preview: null,
    p_image: null,
    p_image_preview: null,
    p_image_width: null,
    p_image_height: null,
    questions: []
});

const filteredSkills = computed(() => {
    const exam = exams.value.find(e => e.id === form.value.exam_id);
    if (!exam || !exam.skills) return [];

    return exam.skills.map(examSkill => {
        const masterSkill = skills.value.find(s => s.id === examSkill.id);
        return {
            ...examSkill,
            levels_count: masterSkill ? masterSkill.levels_count : 9
        };
    });
});

const currentSkillMaxLevel = computed(() => {
    if (!form.value.skill_id) return 9;
    const selectedSkill = filteredSkills.value.find(s => s.id === form.value.skill_id);
    return selectedSkill && selectedSkill.levels_count > 0 ? selectedSkill.levels_count : 9;
});

const isProductiveSkill = computed(() => {
    if (!form.value.skill_id) return false;
    const skill = filteredSkills.value.find(s => s.id === form.value.skill_id)
        || skills.value.find(s => s.id === form.value.skill_id);
    if (!skill) return false;
    const code = (skill.short_code || '').toUpperCase();
    const name = (skill.name || '').toLowerCase();
    return ['W', 'S', 'WR', 'SP', 'WRIT', 'SPEAK', 'WRITING', 'SPEAKING'].includes(code)
        || name.includes('writ') || name.includes('speak');
});

const selectedSkillMaxPoints = computed(() => {
    const skill = filteredSkills.value.find(s => s.id === form.value.skill_id);
    return skill?.pivot?.max_points ?? 0;
});

const currentTotalPoints = computed(() =>
    form.value.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)
);

const remainingPointsBudget = computed(() => {
    if (!selectedSkillMaxPoints.value || !isProductiveSkill.value) return null;
    return selectedSkillMaxPoints.value - dbQuestionsPoints.value - currentTotalPoints.value;
});

const dbQuestionsPoints = ref(0);

const fetchDbQuestionsPoints = async () => {
    if (!form.value.exam_id || !form.value.skill_id) {
        dbQuestionsPoints.value = 0;
        return;
    }
    try {
        const response = await api.get('/admin/questions', {
            params: {
                exam_id: form.value.exam_id,
                skill_id: form.value.skill_id,
                no_paginate: 1
            }
        });
        const fetchedQuestions = response.data;
        if (Array.isArray(fetchedQuestions)) {
            // Sum the points of questions in the database, excluding any that are currently loaded/edited in the form
            const formQuestionIds = form.value.questions.map(q => q.id).filter(id => id !== undefined && id !== null);
            dbQuestionsPoints.value = fetchedQuestions
                .filter(q => !formQuestionIds.includes(q.id))
                .reduce((sum, q) => sum + (Number(q.points) || 0), 0);
        } else {
            dbQuestionsPoints.value = 0;
        }
    } catch (err) {
        console.error('Failed to fetch existing questions points:', err);
        dbQuestionsPoints.value = 0;
    }
};

watch(() => [form.value.exam_id, form.value.skill_id], () => {
    fetchDbQuestionsPoints();
}, { deep: true });

watch(() => form.value.exam_id, (newVal, oldVal) => {
    if (oldVal && newVal !== oldVal) {
        const isValid = filteredSkills.value.some(s => s.id === form.value.skill_id);
        if (!isValid) form.value.skill_id = '';
    }
});

const pFileInput = ref(null);
const pMediaPreview = ref(null);

const createEmptyQuestion = () => ({
    type: 'mcq',
    content_mode: 'text',
    content: '',
    instructions: '',
    points: 1,
    sort_order: 0,
    min_words: null,
    max_words: null,
    q_media: null,
    q_media_preview: null,
    q_audio: null,
    q_audio_preview: null,
    q_image: null,
    q_image_preview: null,
    q_image_width: null,
    q_image_height: null,
    showHtml: false,
    options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false }
    ]
});

const addQuestion = () => {
    form.value.questions.push(createEmptyQuestion());
};

const removeQuestion = (index) => {
    if (form.value.questions.length > 1) {
        form.value.questions.splice(index, 1);
    }
};

const loadInitialData = async () => {
    try {
        const [resSkills, resExams, resPassages, resQuestion] = await Promise.all([
            api.get('/admin/skills'),
            api.get('/admin/exams'),
            api.get('/admin/passages').catch(() => ({ data: [] })),
            api.get(`/admin/questions/${questionId}`)
        ]);

        skills.value = resSkills.data;
        exams.value = resExams.data.map(e => ({
            ...e,
            skills: Array.isArray(e.skills) ? e.skills : []
        }));
        passages.value = (Array.isArray(resPassages.data) ? resPassages.data : []).map(p => ({
            ...p,
            title: p.title || `Untitled Passage (ID: ${p.id})`
        }));

        const q = resQuestion.data;
        if (!q) throw new Error("Question not found");

       

        const updatedForm = {
            ...form.value,
            exam_id: q.exam_id,
            skill_id: q.skill_id,
            level_id: q.level?.level_number || 5,
        };

        if (q.passage) {
            updatedForm.passage_mode = 'existing';
            updatedForm.passage_id = q.passage_id;
            updatedForm.passage_type = q.passage.type;
            updatedForm.passage_title = q.passage.title;
            updatedForm.passage_content = q.passage.content;
            updatedForm.passage_questions_limit = q.passage.questions_limit;
            updatedForm.passage_is_random = q.passage.is_random;
            if (q.passage.media_url) {
                pMediaPreview.value = { url: q.passage.media_url, type: q.passage.media_path?.split('.').pop() || 'image' };
            }
            if (q.passage.audio_url) {
                updatedForm.p_audio_preview = { url: q.passage.audio_url, type: 'audio' };
            }
            if (q.passage.image_url) {
                updatedForm.p_image_preview = { url: q.passage.image_url, type: 'image' };
                updatedForm.p_image_width = q.passage.image_width || null;
                updatedForm.p_image_height = q.passage.image_height || null;
            }

            updatedForm.questions = q.passage.questions.map(sq => ({
                id: sq.id,
                type: sq.type,
                content_mode: (sq.media_url || sq.audio_url || sq.image_url) ? 'media' : 'text',
                content: sq.content,
                instructions: sq.instructions || '',
                points: sq.points,
                sort_order: sq.sort_order || 0,
                min_words: sq.min_words,
                max_words: sq.max_words,
                q_media: null,
                q_media_preview: sq.media_url ? { url: sq.media_url, type: sq.media_path?.split('.').pop() || 'image' } : null,
                q_audio: null,
                q_audio_preview: sq.audio_url ? { url: sq.audio_url, type: 'audio' } : null,
                q_image: null,
                q_image_preview: sq.image_url ? { url: sq.image_url, type: 'image' } : null,
                q_image_width: sq.image_width || null,
                q_image_height: sq.image_height || null,
                showHtml: false,
                options: (sq.options || []).map(o => ({
                    option_text: o.option_text,
                    is_correct: !!o.is_correct
                }))
            }));
        } else {
            updatedForm.passage_mode = 'none';
            updatedForm.questions = [{
                id: q.id,
                type: q.type,
                content_mode: (q.media_url || q.audio_url || q.image_url) ? 'media' : 'text',
                content: q.content,
                instructions: q.instructions || '',
                points: q.points,
                sort_order: q.sort_order || 0,
                min_words: q.min_words,
                max_words: q.max_words,
                q_media: null,
                q_media_preview: q.media_url ? { url: q.media_url, type: q.media_path?.split('.').pop() || 'image' } : null,
                q_audio: null,
                q_audio_preview: q.audio_url ? { url: q.audio_url, type: 'audio' } : null,
                q_image: null,
                q_image_preview: q.image_url ? { url: q.image_url, type: 'image' } : null,
                q_image_width: q.image_width || null,
                q_image_height: q.image_height || null,
                showHtml: false,
                options: (q.options || []).map(o => ({
                    option_text: o.option_text,
                    is_correct: !!o.is_correct
                }))
            }];
        }

        Object.assign(form.value, updatedForm);

        loading.value = false;
    } catch (err) {
        console.error('Failed to load initial data', err);
        errorMsg.value = 'Failed to load question details.';
    }
};

const handlePFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.p_media = file;
    pMediaPreview.value = { url: URL.createObjectURL(file), type: file.type };
};

const handlePAudioChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.p_audio = file;
    form.value.p_audio_preview = { url: URL.createObjectURL(file), type: file.type };
};

const handlePImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.p_image = file;
    form.value.p_image_preview = { url: URL.createObjectURL(file), type: file.type };
};

const handleQFileChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.questions[index].q_media = file;
    form.value.questions[index].q_media_preview = { url: URL.createObjectURL(file), type: file.type };
};

const triggerQImage = (idx) => document.getElementById(`qImage_${idx}`)?.click();
const triggerQAudio = (idx) => document.getElementById(`qAudio_${idx}`)?.click();
const triggerQFile = (idx) => document.getElementById(`qFile_${idx}`)?.click();

const handleQAudioChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.questions[index].q_audio = file;
    form.value.questions[index].q_audio_preview = { url: URL.createObjectURL(file), type: file.type };
};

const handleQImageChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.questions[index].q_image = file;
    form.value.questions[index].q_image_preview = { url: URL.createObjectURL(file), type: file.type };
};

const addOption = (qIdx) => {
    form.value.questions[qIdx].options.push({ option_text: '', is_correct: false });
};
const removeOption = (qIdx, optIdx) => {
    if (form.value.questions[qIdx].options.length > 1) {
        form.value.questions[qIdx].options.splice(optIdx, 1);
    }
};
const setCorrect = (qIdx, optIdx) => {
    const q = form.value.questions[qIdx];
    if (['mcq', 'true_false'].includes(q.type)) {
        q.options.forEach((opt, i) => {
            opt.is_correct = (i === optIdx);
        });
    } else {
        q.options[optIdx].is_correct = !q.options[optIdx].is_correct;
    }
};

const moveOptionUp = async (qIdx, optIdx) => {
    if (optIdx > 0) {
        const options = form.value.questions[qIdx].options;
        const temp = options[optIdx];
        options[optIdx] = options[optIdx - 1];
        options[optIdx - 1] = temp;
    }
};

const moveOptionDown = async (qIdx, optIdx) => {
    const options = form.value.questions[qIdx].options;
    if (optIdx < options.length - 1) {
        const temp = options[optIdx];
        options[optIdx] = options[optIdx + 1];
        options[optIdx + 1] = temp;
    }
};

const handleTypeChange = async (qIdx) => {
    const q = form.value.questions[qIdx];
    if (q.type === 'true_false') {
        q.instructions = currentLang.value === 'ar' ? "اختر صح أم خطأ." : "Choose True or False.";
        q.options = [
            { option_text: 'True', is_correct: true },
            { option_text: 'False', is_correct: false }
        ];
    } else if (['writing', 'speaking', 'upload'].includes(q.type)) {
        q.instructions = currentLang.value === 'ar' ? "يرجى تقديم إجابتك." : "Please provide your answer.";
        q.options = [];
    } else if (q.type === 'short_answer') {
        q.instructions = currentLang.value === 'ar' ? "يرجى كتابة الإجابة." : "Please type the correct answer.";
        q.options = [{ option_text: '', is_correct: true }];
    } else if (q.type === 'drag_drop') {
        q.instructions = currentLang.value === 'ar' ? "اسحب الكلمات إلى المربعات الصحيحة لإكمال الجملة." : "Drag the correct words to complete the sentence.";
        q.options = [
            { option_text: '', is_correct: true },
            { option_text: '', is_correct: true }
        ];
    } else if (q.type === 'fill_blank') {
        q.instructions = currentLang.value === 'ar' ? "املأ الفراغات بالكلمات الصحيحة." : "Fill in the blanks with the correct answers.";
        q.options = [
            { option_text: '', is_correct: true }
        ];
    } else if (['word_selection', 'click_word', 'highlight'].includes(q.type)) {
        q.instructions = q.type === 'highlight' 
            ? (currentLang.value === 'ar' ? "قم بتمييز الأجزاء الصحيحة في النص." : "Highlight the correct parts in the text.")
            : (currentLang.value === 'ar' ? "اختر الكلمات المطلوبة في النص." : "Select the required words in the text.");
        q.options = [
            { option_text: '', is_correct: true }
        ];
    } else if (q.type === 'matching') {
        q.instructions = currentLang.value === 'ar' ? "قم بتوصيل العناصر في العمود الأول بما يناسبها في العمود الثاني." : "Match each item in the first column with the correct option in the second column.";
        q.options = [
            { option_text: 'Source 1 | Target 1', is_correct: true },
            { option_text: 'Source 2 | Target 2', is_correct: true }
        ];
    } else if (q.type === 'ordering') {
        q.instructions = currentLang.value === 'ar' ? "قم بترتيب العناصر التالية بالترتيب الصحيح." : "Arrange the items below in the correct order.";
        q.options = [
            { option_text: 'Item 1', is_correct: true },
            { option_text: 'Item 2', is_correct: true }
        ];
    } else if (q.type === 'listening') {
        q.instructions = currentLang.value === 'ar' ? "استمع إلى المقطع الصوتي وأجب على السؤال." : "Listen to the audio clip and answer the question.";
        q.options = [
            { option_text: '', is_correct: true },
            { option_text: '', is_correct: false }
        ];
    } else {
        if (q.options.length < 2) {
            q.instructions = currentLang.value === 'ar' ? "يرجى اختيار الإجابة الصحيحة." : "Please select the correct option.";
            q.options = [
                { option_text: '', is_correct: true },
                { option_text: '', is_correct: false }
            ];
        }
    }
};

const updateBatch = async () => {
    if (!form.value.exam_id) {
        showAlert(t[currentLang.value].validationExam, t[currentLang.value].activeSystem, 'warning');
        return;
    }
    if (!form.value.skill_id) {
        showAlert(t[currentLang.value].validationSkill, t[currentLang.value].activeSystem, 'warning');
        return;
    }
    if (!form.value.level_id && !isProductiveSkill.value) {
        showAlert(t[currentLang.value].validationLevel, t[currentLang.value].activeSystem, 'warning');
        return;
    }

    if (isProductiveSkill.value && selectedSkillMaxPoints.value > 0 && remainingPointsBudget.value < 0) {
        showAlert(
            t[currentLang.value].validationPointsLimit.replace('{current}', currentTotalPoints.value).replace('{max}', selectedSkillMaxPoints.value),
            currentLang.value === 'ar' ? 'تنبيه تجاوز الميزانية' : 'Limit Warning', 'danger'
        );
        return;
    }

    isSubmitting.value = true;
    errorMsg.value = '';

    try {
        const fd = new FormData();
        fd.append('_method', 'PATCH');
        fd.append('skill_id', form.value.skill_id);
        fd.append('exam_id', form.value.exam_id);
        if (form.value.level_id) fd.append('level_id', form.value.level_id);
        fd.append('passage_mode', form.value.passage_mode);

        if (form.value.passage_mode === 'existing') {
            fd.append('passage_id', form.value.passage_id);
            fd.append('passage_type', form.value.passage_type || 'text');
            fd.append('passage_title', form.value.passage_title || '');
            fd.append('passage_content', form.value.passage_content || '');
            if (form.value.passage_questions_limit) fd.append('passage_questions_limit', form.value.passage_questions_limit);
            fd.append('passage_is_random', form.value.passage_is_random ? 1 : 0);
            if (form.value.p_media) fd.append('p_media_file', form.value.p_media);
            if (form.value.p_audio) fd.append('p_audio_file', form.value.p_audio);
            if (form.value.p_image) fd.append('p_image_file', form.value.p_image);
            if (form.value.p_image_width) fd.append('p_image_width', form.value.p_image_width);
            if (form.value.p_image_height) fd.append('p_image_height', form.value.p_image_height);
        } else if (form.value.passage_mode === 'new') {
            fd.append('passage_type', form.value.passage_type);
            fd.append('passage_title', form.value.passage_title || '');
            fd.append('passage_content', form.value.passage_content || '');
            if (form.value.passage_questions_limit) fd.append('passage_questions_limit', form.value.passage_questions_limit);
            fd.append('passage_is_random', form.value.passage_is_random ? 1 : 0);
            if (form.value.p_media) fd.append('p_media_file', form.value.p_media);
            if (form.value.p_audio) fd.append('p_audio_file', form.value.p_audio);
            if (form.value.p_image) fd.append('p_image_file', form.value.p_image);
            if (form.value.p_image_width) fd.append('p_image_width', form.value.p_image_width);
            if (form.value.p_image_height) fd.append('p_image_height', form.value.p_image_height);
        }

        const cleanQuestions = form.value.questions.map(q => ({
            id: q.id || null,
            type: q.type,
            content: q.content || '',
            instructions: q.instructions || '',
            points: q.points,
            sort_order: q.sort_order,
            min_words: q.min_words,
            max_words: q.max_words,
            image_width: q.q_image_width || null,
            image_height: q.q_image_height || null,
            options: q.options.map(opt => ({
                option_text: opt.option_text,
                is_correct: opt.is_correct
            }))
        }));
        fd.append('questions', JSON.stringify(cleanQuestions));

        form.value.questions.forEach((q, qIdx) => {
            if (q.q_media) fd.append(`questions[${qIdx}][q_media_file]`, q.q_media);
            if (q.q_audio) fd.append(`questions[${qIdx}][q_audio_file]`, q.q_audio);
            if (q.q_image) fd.append(`questions[${qIdx}][q_image_file]`, q.q_image);
        });

        await api.post(`/admin/questions/${questionId}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        await showAlert(t[currentLang.value].saveSuccessMsg, currentLang.value === 'ar' ? 'تم التعديل' : 'Saved', 'success');
        const isTeacher = adminStore.user?.role === 'teacher';
        router.push({ name: isTeacher ? 'teacher.questions' : 'admin.questions' });
    } catch (err) {
        const error = err.response?.data?.message || err.response?.data?.errors || 'Failed to update questions.';
        showAlert(error, 'Error Saving Question', 'danger');
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(() => {
    loadInitialData();
});

const editorModules = {
    toolbar: {
        container: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: [] }],
            ['link', 'image', 'video'],
            [{ script: 'sub' }, { script: 'super' }],
            [{ indent: '-1' }, { indent: '+1' }],
            [{ direction: 'rtl' }],
            ['clean']
        ],
    }
};
</script>

<template>
    <AdminLayout>
        <div :class="{ 'arabic-theme': currentLang === 'ar' }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'" class="w-full">
            
            <div v-if="loading" class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <i class="pi pi-spin pi-spinner text-4xl text-brand-primary"></i>
                <span class="text-xs font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].loadingContext }}</span>
            </div>

            <div v-else class="space-y-8 pb-32 mt-6 px-4 md:px-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                
                <!-- Unified Premium Header Card -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-rose-50/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-100/30 transition-all duration-1000"></div>
                    <div class="absolute left-0 bottom-0 w-64 h-64 bg-slate-50/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl transition-all duration-1000"></div>
                    
                    <div class="flex items-center gap-5 relative z-10">
                        <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded
                            @click="router.push({ name: adminStore.user?.role === 'teacher' ? 'teacher.questions' : 'admin.questions' })"
                            class="hover:text-brand-primary hover:border-brand-primary/50 transition-colors"
                            :class="[currentLang === 'ar' ? 'rotate-180' : '']" />
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="bg-rose-50 text-brand-primary text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-rose-100 flex items-center gap-1.5 animate-pulse">
                                    <i class="pi pi-sparkles text-[8px]"></i>
                                    {{ t[currentLang].activeSystem }}
                                </span>
                            </div>
                            <h1 class="text-2xl font-black text-slate-800 tracking-tight mt-2">{{ t[currentLang].headerTitle }}</h1>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{{ t[currentLang].headerSubtitle }}</p>
                        </div>
                    </div>
                    
                    <!-- Top Action Button -->
                    <Button type="button" :loading="isSubmitting" :label="t[currentLang].saveAllBtn" icon="pi pi-check-circle"
                        @click="updateBatch"
                        class="rounded-2xl px-8 py-3.5 font-black text-xs shadow-lg bg-brand-primary border-none hover:bg-brand-primary/95 text-white transition-all hover:scale-[1.02] active:scale-95 z-10" />
                </div>

                <Message v-if="errorMsg" severity="error" :closable="false" class="rounded-2xl border-rose-100/50">{{ errorMsg }}</Message>

                <!-- 1. Global Parameters & Settings -->
                <Card class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
                    <template #content>
                        <div class="p-8 space-y-6">
                            <div class="flex items-center gap-3 pb-4 border-b border-slate-50">
                                <div class="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-md shadow-rose-200">
                                    <i class="pi pi-cog text-sm"></i>
                                </div>
                                <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">{{ t[currentLang].globalSettings }}</h3>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <!-- Linked Exam selector -->
                                <div class="flex flex-col space-y-1.5">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].linkedExam }}</label>
                                    <Select v-model="form.exam_id" :options="exams" optionLabel="title" optionValue="id"
                                        :placeholder="t[currentLang].selectExamPlaceholder"
                                        class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" />
                                </div>

                                <!-- Target Skill selector -->
                                <div class="flex flex-col space-y-1.5">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].targetSkill }}</label>
                                    <Select v-model="form.skill_id" :options="filteredSkills" optionLabel="name"
                                        optionValue="id" :placeholder="t[currentLang].selectSkillPlaceholder"
                                        class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm"
                                        :disabled="!form.exam_id" :key="form.exam_id" />
                                </div>

                                <!-- Difficulty Level - hidden for productive skills -->
                                <div v-if="!isProductiveSkill" class="flex flex-col space-y-1.5">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">
                                        {{ t[currentLang].difficultyLevel }}
                                        <span v-if="form.level_id" class="text-brand-primary font-extrabold">({{ form.level_id }})</span>
                                        <span v-else class="text-rose-500 font-extrabold">*</span>
                                    </label>
                                    <div class="flex flex-wrap gap-2 pt-1 rtl:space-x-reverse">
                                        <button v-for="lvl in currentSkillMaxLevel" :key="lvl" type="button"
                                            @click="form.level_id = lvl"
                                            :class="form.level_id === lvl ? 'bg-slate-900 text-white shadow-md border-slate-900 scale-105' : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-300 hover:bg-slate-100/50'"
                                            class="w-9 h-9 rounded-xl border font-black text-xs flex items-center justify-center transition-all duration-200 active:scale-95">
                                            {{ lvl }}
                                        </button>
                                    </div>
                                    <div class="flex justify-between text-[8px] text-slate-400 font-black mt-2 uppercase tracking-widest ml-1 mr-1">
                                        <span>{{ t[currentLang].beginnerText }}</span>
                                        <span>{{ t[currentLang].expertText.replace('{max}', currentSkillMaxLevel) }}</span>
                                    </div>
                                </div>

                                <!-- Points Budget Panel - Productive skills only -->
                                <div v-if="isProductiveSkill && form.skill_id" class="flex flex-col space-y-1.5 justify-center">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">
                                        {{ t[currentLang].pointsBudget }}
                                    </label>
                                    <div v-if="selectedSkillMaxPoints > 0"
                                        class="rounded-2xl p-4 border flex items-center justify-between transition-colors shadow-inner"
                                        :class="remainingPointsBudget < 0 ? 'bg-rose-50/50 border-rose-200/60' : 'bg-emerald-50/50 border-emerald-200/60'">
                                        <div>
                                            <p class="text-[8px] font-black uppercase tracking-widest"
                                                :class="remainingPointsBudget < 0 ? 'text-rose-500' : 'text-emerald-600'">
                                                {{ remainingPointsBudget < 0 ? t[currentLang].budgetOver : t[currentLang].budgetOk }}
                                            </p>
                                            <p class="text-xl font-black mt-0.5 leading-none"
                                                :class="remainingPointsBudget < 0 ? 'text-rose-600' : 'text-emerald-700'">
                                                {{ remainingPointsBudget }} <span class="text-xs font-bold">pts</span>
                                            </p>
                                        </div>
                                        <div class="text-right rtl:text-left">
                                            <p class="text-[8px] font-black text-slate-400 uppercase">{{ t[currentLang].skillCap }}</p>
                                            <p class="text-sm font-black text-slate-600 mt-0.5">{{ selectedSkillMaxPoints }} pts</p>
                                        </div>
                                    </div>
                                    <div v-else class="rounded-2xl p-4 bg-amber-50/50 border border-amber-200/60">
                                        <p class="text-[8px] font-black text-amber-600 uppercase tracking-widest">{{ t[currentLang].noCapTitle }}</p>
                                        <p class="text-[10px] text-amber-500 font-bold mt-1">{{ t[currentLang].noCapDesc }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>

                <!-- 2. Reading Material / Shared Context -->
                <Card class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
                    <template #content>
                        <div class="p-8 space-y-6">
                            <div class="flex items-center gap-3 pb-4 border-b border-slate-50">
                                <div class="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-md shadow-rose-200">
                                    <i class="pi pi-book text-sm"></i>
                                </div>
                                <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">{{ t[currentLang].readingMaterial }}</h3>
                            </div>

                            <!-- Mode Selector pills -->
                            <div class="flex flex-col sm:flex-row bg-slate-50 p-1.5 rounded-2xl gap-1">
                                <button
                                    v-for="mode in [{ id: 'none', label: t[currentLang].modes.none, icon: 'pi-ban' }, { id: 'existing', label: t[currentLang].modes.existing, icon: 'pi-search' }, { id: 'new', label: t[currentLang].modes.new, icon: 'pi-plus-circle' }]"
                                    :key="mode.id" type="button" @click="form.passage_mode = mode.id"
                                    :class="form.passage_mode === mode.id ? 'bg-white shadow-sm text-slate-800 border-slate-200/80 font-black' : 'text-slate-500 border-transparent hover:text-slate-700 font-bold'"
                                    class="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border transition-all duration-300 text-[10px] uppercase tracking-wider">
                                    <i :class="[mode.icon, form.passage_mode === mode.id ? 'text-brand-primary' : 'text-slate-300']"></i>
                                    {{ mode.label }}
                                </button>
                            </div>

                            <!-- Existing Passage Library select -->
                            <div v-if="form.passage_mode === 'existing'"
                                class="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-2">
                                <Select v-model="form.passage_id" :options="passages" optionLabel="title" optionValue="id"
                                    :placeholder="t[currentLang].selectPassagePlaceholder"
                                    class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" filter />
                            </div>

                            <!-- New Passage Material editor -->
                            <div v-if="form.passage_mode === 'new'"
                                class="p-6 bg-slate-50/50 rounded-[1.8rem] border border-slate-100 space-y-6 animate-in zoom-in-98 duration-400">
                                
                                <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                    <div class="md:col-span-8 flex flex-col space-y-1.5">
                                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].passageTitleLabel }}</label>
                                        <InputText v-model="form.passage_title"
                                            :placeholder="t[currentLang].passageTitlePlaceholder"
                                            class="w-full rounded-xl bg-white border-slate-100 font-bold text-slate-800" />
                                    </div>
                                    <div class="md:col-span-4 flex flex-col space-y-1.5">
                                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].passageTypeLabel }}</label>
                                        <Select v-model="form.passage_type"
                                            :options="[{ label: t[currentLang].passageTypes.text, value: 'text' }, { label: t[currentLang].passageTypes.image, value: 'image' }, { label: t[currentLang].passageTypes.audio, value: 'audio' }, { label: t[currentLang].passageTypes.video, value: 'video' }]"
                                            optionLabel="label" optionValue="value"
                                            class="w-full rounded-xl bg-white border-slate-100 shadow-sm" />
                                    </div>
                                </div>

                                <!-- Text Editor Section -->
                                <div class="flex flex-col space-y-1.5">
                                    <div class="flex items-center justify-between ml-1 mr-1">
                                        <div>
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].passageContentLabel }}</label>
                                            <p class="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{{ t[currentLang].passageContentDesc }}</p>
                                        </div>
                                        
                                        <!-- Visual / HTML Source Switcher -->
                                        <div class="flex bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200/50">
                                            <button type="button" @click="passageShowHtml = false"
                                                :class="!passageShowHtml ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'"
                                                class="px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5">
                                                <i class="pi pi-align-left text-[10px]"></i> {{ t[currentLang].visualTab }}
                                            </button>
                                            <button type="button" @click="passageShowHtml = true"
                                                :class="passageShowHtml ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'"
                                                class="px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5">
                                                <i class="pi pi-code text-[10px]"></i> {{ t[currentLang].sourceTab }}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div v-if="!passageShowHtml">
                                        <Editor v-model="form.passage_content" editorStyle="height: 250px"
                                            :modules="editorModules"
                                            class="rounded-2xl overflow-hidden border border-slate-100 bg-white"
                                            placeholder="Enter formatted passage contents..." />
                                    </div>
                                    <div v-else>
                                        <textarea v-model="form.passage_content" rows="6"
                                            class="w-full rounded-2xl p-4 font-mono text-xs border border-slate-100 bg-white text-slate-900 focus:outline-none focus:border-brand-primary transition-all shadow-inner placeholder-slate-400"
                                            placeholder="Write your raw HTML here (e.g. <b>Hello</b> World)..."></textarea>
                                    </div>
                                </div>

                                <!-- Media Assets Grid -->
                                <div class="space-y-3">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].mediaAssetsLabel }}</label>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <!-- Image Attachment -->
                                        <ImageResizeUploader
                                            v-model="form.p_image"
                                            v-model:width="form.p_image_width"
                                            v-model:height="form.p_image_height"
                                            :initialUrl="form.p_image_preview?.url"
                                            :label="t[currentLang].imageAttach"
                                            icon="pi-image"
                                            @clear="form.p_image = null; form.p_image_preview = null; form.p_image_width = null; form.p_image_height = null;"
                                        />

                                        <!-- Audio Attachment -->
                                        <div class="relative group border-2 border-dashed rounded-2xl p-4 transition-all"
                                            :class="form.p_audio_preview ? 'border-brand-primary/20 bg-rose-50/10' : 'border-slate-100 bg-white hover:border-brand-primary/30'">
                                            <div v-if="!form.p_audio_preview" @click="$refs.pAudInput.click()"
                                                class="flex items-center gap-4 cursor-pointer py-2">
                                                <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-brand-primary group-hover:bg-rose-50/50 transition-colors shadow-sm">
                                                    <i class="pi pi-volume-up text-lg"></i>
                                                </div>
                                                <div class="flex flex-col">
                                                    <span class="text-[11px] font-black text-slate-700 uppercase tracking-wide">{{ t[currentLang].attachListening }}</span>
                                                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{{ t[currentLang].mp3Support }}</span>
                                                </div>
                                            </div>
                                            <div v-else class="flex flex-col gap-2.5">
                                                <div class="flex items-center justify-between pb-1 border-b border-slate-100">
                                                    <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">{{ t[currentLang].audioLinked }}</span>
                                                    <Button icon="pi pi-trash" text severity="danger" size="small"
                                                        @click="form.p_audio = null; form.p_audio_preview = null" class="w-7 h-7 flex items-center justify-center" />
                                                </div>
                                                <audio :src="form.p_audio_preview.url" controls class="h-8 w-full"></audio>
                                            </div>
                                            <input type="file" ref="pAudInput" class="hidden" @change="handlePAudioChange" accept="audio/*" />
                                        </div>
                                    </div>
                                </div>

                                <!-- Supplemental Other Files Fallback -->
                                <div class="pt-2 flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
                                    <i class="pi pi-info-circle text-slate-400 text-xs"></i>
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].needVideo }}</p>
                                    <button type="button" @click="$refs.pFileInput.click()"
                                        class="text-[9px] font-black text-brand-primary uppercase tracking-widest underline decoration-dotted">{{ t[currentLang].clickHere }}</button>
                                    <input type="file" ref="pFileInput" class="hidden" @change="handlePFileChange" accept="video/*" />
                                    <span v-if="pMediaPreview" class="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded shadow-sm border border-emerald-100">{{ t[currentLang].fileAttached }}</span>
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>

                <!-- 3. Question list in draft state -->
                <div class="space-y-6">
                    <div class="flex items-center gap-3 pb-2 px-2">
                        <div class="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                            <i class="pi pi-list text-xs"></i>
                        </div>
                        <h2 class="text-md font-black text-slate-800 uppercase tracking-wider">{{ t[currentLang].draftQuestions }}</h2>
                    </div>

                    <div v-for="(q, qIdx) in form.questions" :key="qIdx"
                        class="group relative bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-500 rounded-[2.5rem] p-8 md:p-12 animate-in slide-in-from-bottom-4 duration-500">
                        
                        <!-- Question Counter index -->
                        <div class="absolute -left-3.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black shadow-lg group-hover:bg-brand-primary transition-colors duration-300 z-10"
                            :class="[currentLang === 'ar' ? '!-right-3.5 !-left-auto' : '']">
                            {{ qIdx + 1 }}
                        </div>

                        <!-- Trash single question -->
                        <button v-if="form.questions.length > 1" @click="removeQuestion(qIdx)"
                            class="absolute -right-3 -top-3 w-8 h-8 bg-white border border-slate-100 text-rose-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center z-10"
                            :class="[currentLang === 'ar' ? '!-left-3 !-right-auto' : '']">
                            <i class="pi pi-times text-[10px]"></i>
                        </button>

                        <div class="space-y-8">
                            <!-- Question Type & Instruction inputs -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="flex flex-col space-y-1.5">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].questionTypeLabel }}</label>
                                    <Select v-model="q.type" @change="handleTypeChange(qIdx)" :options="questionTypes"
                                        optionLabel="label" optionValue="value"
                                        class="w-full rounded-xl bg-slate-50 border-slate-100 shadow-sm" />
                                </div>
                                <div class="flex flex-col space-y-1.5">
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].instructionsLabel }}</label>
                                    <InputText v-model="q.instructions"
                                        placeholder="e.g. Listen carefully to the prompt and select the correct matching pair."
                                        class="w-full rounded-xl bg-slate-50 border-slate-100 font-bold text-slate-800 px-4" />
                                </div>
                            </div>

                            <!-- Question prompt wrapper (Text vs Media Toggle) -->
                            <div class="space-y-4">
                                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-50">
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].questionPrompt }}</span>
                                    <div class="flex bg-slate-50 p-1 rounded-xl gap-0.5">
                                        <button type="button"
                                            @click="q.content_mode = 'text'; q.q_media = null; q.q_media_preview = null"
                                            :class="q.content_mode === 'text' ? 'bg-white shadow-sm text-slate-800 font-black' : 'text-slate-400 hover:text-slate-600 font-bold'"
                                            class="px-3.5 py-1.5 rounded-lg text-[9px] uppercase tracking-wide transition-all flex items-center gap-1.5">
                                            <i class="pi pi-align-left text-[9px]"></i> {{ t[currentLang].textTab }}
                                        </button>
                                        <button type="button" @click="q.content_mode = 'media'; q.content = ''"
                                            :class="q.content_mode === 'media' ? 'bg-white shadow-sm text-slate-800 font-black' : 'text-slate-400 hover:text-slate-600 font-bold'"
                                            class="px-3.5 py-1.5 rounded-lg text-[9px] uppercase tracking-wide transition-all flex items-center gap-1.5">
                                            <i class="pi pi-image text-[9px]"></i> {{ t[currentLang].mediaTab }}
                                        </button>
                                    </div>
                                </div>

                                <!-- Text Prompt Editor -->
                                <div v-if="q.content_mode === 'text'" class="space-y-3">
                                    <div class="flex justify-end">
                                        <div class="flex bg-slate-50 rounded-lg p-0.5 gap-0.5 border border-slate-250/20">
                                            <button type="button" @click="q.showHtml = false"
                                                :class="!q.showHtml ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'"
                                                class="px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wide transition-all flex items-center gap-1">
                                                <i class="pi pi-align-left text-[8px]"></i> {{ t[currentLang].visualTab }}
                                            </button>
                                            <button type="button" @click="q.showHtml = true"
                                                :class="q.showHtml ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'"
                                                class="px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wide transition-all flex items-center gap-1">
                                                <i class="pi pi-code text-[8px]"></i> {{ t[currentLang].sourceTab }}
                                            </button>
                                        </div>
                                    </div>
                                    <div v-if="!q.showHtml" class="animate-in fade-in-20 duration-300">
                                        <Editor v-model="q.content" editorStyle="height: 160px" :modules="editorModules"
                                            class="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50/20"
                                            placeholder="Type or format your prompt content..." />
                                    </div>
                                    <div v-else class="animate-in fade-in-20 duration-300">
                                        <textarea v-model="q.content" rows="4"
                                            class="w-full rounded-2xl p-4 font-mono text-xs border border-slate-100 bg-slate-50/10 text-slate-900 focus:outline-none focus:border-brand-primary transition-all shadow-inner"
                                            placeholder="Write raw HTML code for the question prompt..."></textarea>
                                    </div>

                                    <!-- Guidelines widgets by question type -->
                                    <div v-if="q.type === 'writing'" class="bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50">
                                        <p class="text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-2">
                                            <i class="pi pi-info-circle"></i> {{ t[currentLang].guides.writingTitle }}
                                        </p>
                                        <p class="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed" v-html="t[currentLang].guides.writingText"></p>
                                    </div>

                                    <div v-if="q.type === 'drag_drop'" class="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                        <p class="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                                            <i class="pi pi-info-circle"></i> {{ t[currentLang].guides.dragDropTitle }}
                                        </p>
                                        <p class="text-[11px] font-medium text-indigo-500 mt-1 leading-relaxed" v-html="t[currentLang].guides.dragDropText"></p>
                                    </div>

                                    <div v-if="q.type === 'word_selection' || q.type === 'click_word'" class="bg-amber-50/40 p-4 rounded-2xl border border-amber-100/50">
                                        <p class="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                                            <i class="pi pi-info-circle"></i> {{ t[currentLang].guides.wordSelectTitle }}
                                        </p>
                                        <p class="text-[11px] font-medium text-amber-500 mt-1 leading-relaxed" v-html="t[currentLang].guides.wordSelectText"></p>
                                    </div>

                                    <div v-if="q.type === 'fill_blank'" class="bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50">
                                        <p class="text-[10px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-2">
                                            <i class="pi pi-info-circle"></i> {{ t[currentLang].guides.fillBlankTitle }}
                                        </p>
                                        <p class="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed" v-html="t[currentLang].guides.fillBlankText"></p>
                                    </div>

                                    <div v-if="q.type === 'matching'" class="bg-purple-50/40 p-4 rounded-2xl border border-purple-100/50">
                                        <p class="text-[10px] font-black text-purple-700 uppercase tracking-widest flex items-center gap-2">
                                            <i class="pi pi-info-circle"></i> {{ t[currentLang].guides.matchingTitle }}
                                        </p>
                                        <p class="text-[11px] font-medium text-purple-500 mt-1 leading-relaxed" v-html="t[currentLang].guides.matchingText"></p>
                                    </div>

                                    <div v-if="q.type === 'ordering'" class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p class="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                            <i class="pi pi-info-circle"></i> {{ t[currentLang].guides.orderingTitle }}
                                        </p>
                                        <p class="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed" v-html="t[currentLang].guides.orderingText"></p>
                                    </div>

                                    <div v-if="q.type === 'highlight'" class="bg-yellow-50/40 p-4 rounded-2xl border border-yellow-100/50">
                                        <p class="text-[10px] font-black text-yellow-700 uppercase tracking-widest flex items-center gap-2">
                                            <i class="pi pi-info-circle"></i> {{ t[currentLang].guides.highlightTitle }}
                                        </p>
                                        <p class="text-[11px] font-medium text-yellow-700 mt-1 leading-relaxed" v-html="t[currentLang].guides.highlightText"></p>
                                    </div>
                                </div>

                                <!-- Media Mode files inputs -->
                                <div v-else class="animate-in zoom-in-98 duration-300">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <!-- Image Attachment -->
                                        <div class="flex flex-col space-y-1.5">
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].imageAttachment }}</label>
                                            <ImageResizeUploader
                                                v-model="q.q_image"
                                                v-model:width="q.q_image_width"
                                                v-model:height="q.q_image_height"
                                                :initialUrl="q.q_image_preview?.url"
                                                :label="t[currentLang].imageSelect"
                                                icon="pi-image"
                                                @clear="q.q_image = null; q.q_image_preview = null; q.q_image_width = null; q.q_image_height = null;"
                                            />
                                        </div>

                                        <!-- Audio Attachment -->
                                        <div class="flex flex-col space-y-1.5">
                                            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].audioAttachment }}</label>
                                            <div class="flex flex-col gap-3">
                                                <div @click="triggerQAudio(qIdx)"
                                                    class="w-full h-20 border-2 border-dashed rounded-2xl flex items-center justify-center gap-3 cursor-pointer transition-all group"
                                                    :class="q.q_audio_preview ? 'border-brand-primary/20 bg-rose-50/10' : 'border-slate-100 bg-white hover:border-brand-primary/30'">
                                                    <input type="file" :id="`qAudio_${qIdx}`" class="hidden" @change="(e) => handleQAudioChange(e, qIdx)" accept="audio/*" />
                                                    <i v-if="!q.q_audio_preview" class="pi pi-volume-up text-xl text-slate-300 group-hover:text-brand-primary transition-colors"></i>
                                                    <i v-else class="pi pi-check-circle text-xl text-emerald-500"></i>
                                                    <span class="text-[9px] font-black uppercase tracking-widest" :class="q.q_audio_preview ? 'text-emerald-600' : 'text-slate-400 group-hover:text-brand-primary'">
                                                        {{ q.q_audio_preview ? t[currentLang].audioLinked : t[currentLang].selectAudioFile }}
                                                    </span>
                                                </div>
                                                <div v-if="q.q_audio_preview" class="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                    <audio :src="q.q_audio_preview.url" controls class="h-8 grow"></audio>
                                                    <button @click="q.q_audio = null; q.q_audio_preview = null"
                                                        class="w-7 h-7 text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center shrink-0">
                                                        <i class="pi pi-trash text-xs"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Supplemental generic videos upload -->
                                        <div class="md:col-span-2 pt-3 border-t border-slate-50">
                                            <div class="flex items-center gap-3">
                                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ t[currentLang].otherMediaLabel }}</label>
                                                <div class="grow h-[1px] bg-slate-50"></div>
                                                <Button icon="pi pi-plus" :label="t[currentLang].needVideo" text class="text-[9px] font-black" @click="triggerQFile(qIdx)" />
                                                <input type="file" :id="`qFile_${qIdx}`" class="hidden" @change="(e) => handleQFileChange(e, qIdx)" accept="video/*" />
                                            </div>
                                            <div v-if="q.q_media_preview" class="mt-3 p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                                                <video v-if="q.q_media_preview.type.startsWith('video/')" :src="q.q_media_preview.url" controls class="max-h-20 rounded-lg"></video>
                                                <span v-else class="text-[10px] font-black text-slate-500 uppercase">{{ q.q_media_preview.type }}</span>
                                                <button @click="q.q_media = null; q.q_media_preview = null" class="text-rose-500 font-black text-[9px] uppercase hover:underline">{{ t[currentLang].modes.none }}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                                <!-- Options list for questions (MCQ/etc) -->
                                <div v-if="!['writing', 'speaking', 'upload'].includes(q.type)" class="lg:col-span-8 space-y-4">
                                    <div class="flex items-center justify-between pb-1">
                                        <label class="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1 mr-1">{{ t[currentLang].optionsMatrix }}</label>
                                        <Button v-if="['mcq', 'short_answer', 'drag_drop', 'word_selection', 'click_word', 'fill_blank', 'matching', 'ordering', 'highlight', 'listening'].includes(q.type)"
                                            icon="pi pi-plus" :label="t[currentLang].addOptionBtn" text rounded @click="addOption(qIdx)"
                                            class="text-[9px] font-black text-emerald-600 hover:bg-emerald-50" />
                                    </div>
                                    
                                    <div class="space-y-2.5">
                                        <div v-for="(opt, oIdx) in q.options" :key="oIdx"
                                            class="flex items-center gap-4 p-4 rounded-2xl border transition-all bg-white"
                                            :class="opt.is_correct ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100 shadow-sm'">
                                            <div class="flex items-center gap-2.5 shrink-0">
                                                <span class="text-[8px] font-black text-slate-400">#{{ oIdx + 1 }}</span>
                                                <button v-if="q.type !== 'short_answer'" type="button" @click="setCorrect(qIdx, oIdx)"
                                                    class="w-7 h-7 rounded-lg border flex items-center justify-center transition-all"
                                                    :class="opt.is_correct ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm' : 'bg-white border-slate-200 text-transparent'">
                                                    <i class="pi pi-check text-[9px] font-black"></i>
                                                </button>
                                            </div>
                                            
                                            <InputText v-model="opt.option_text" :disabled="q.type === 'true_false'"
                                                :placeholder="q.type === 'short_answer' ? t[currentLang].acceptedVariation : t[currentLang].optionValuePlaceholder"
                                                class="w-full border-none bg-transparent font-bold text-slate-800 focus:ring-0 py-1.5" />
                                            
                                            <div class="flex items-center gap-0.5 shrink-0 rtl:space-x-reverse">
                                                <button v-if="oIdx > 0" type="button" @click="moveOptionUp(qIdx, oIdx)"
                                                    class="w-7 h-7 rounded-md hover:bg-slate-50 text-slate-400 hover:text-brand-primary transition-all flex items-center justify-center">
                                                    <i class="pi pi-chevron-up text-[9px]"></i>
                                                </button>
                                                <button v-if="oIdx < q.options.length - 1" type="button" @click="moveOptionDown(qIdx, oIdx)"
                                                    class="w-7 h-7 rounded-md hover:bg-slate-50 text-slate-400 hover:text-brand-primary transition-all flex items-center justify-center">
                                                    <i class="pi pi-chevron-down text-[9px]"></i>
                                                </button>
                                                <button v-if="['mcq', 'short_answer', 'drag_drop', 'word_selection', 'click_word', 'fill_blank', 'matching', 'ordering', 'highlight', 'listening'].includes(q.type) && q.options.length > 1"
                                                    @click="removeOption(qIdx, oIdx)"
                                                    class="w-7 h-7 rounded-md hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center">
                                                    <i class="pi pi-trash text-[9px]"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Question Parameters Sidebar (Scoring, sorting, min/max words) -->
                                <div :class="['writing', 'speaking', 'upload'].includes(q.type) ? 'lg:col-span-12' : 'lg:col-span-4'"
                                    class="flex flex-col space-y-6 bg-slate-50/50 p-6 rounded-[1.8rem] border border-slate-100 shadow-sm">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-8.5 h-8.5 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center">
                                                <i class="pi pi-calculator text-sm"></i>
                                            </div>
                                            <div>
                                                <label class="text-xs font-black text-slate-800 uppercase block">{{ t[currentLang].scoringParams }}</label>
                                                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wide">{{ t[currentLang].defineWeight }}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div :class="['writing', 'speaking', 'upload'].includes(q.type) ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6' : 'grid grid-cols-1 gap-5'">
                                        <!-- Sort Order -->
                                        <div class="flex flex-col space-y-1.5">
                                            <div class="flex items-center gap-1.5 ml-1 mr-1">
                                                <i class="pi pi-sort-alt text-[9px] text-slate-400"></i>
                                                <label class="text-[8px] font-black text-slate-500 uppercase tracking-widest">{{ t[currentLang].displayOrder }}</label>
                                            </div>
                                            <InputNumber v-model="q.sort_order" :min="0" class="w-full h-10.5"
                                                inputClass="w-full text-center font-black text-slate-700 bg-white border border-slate-150 rounded-xl px-4 focus:border-brand-primary transition-all" />
                                        </div>

                                        <!-- Question Points -->
                                        <div class="flex flex-col space-y-1.5">
                                            <div class="flex items-center gap-1.5 ml-1 mr-1">
                                                <i class="pi pi-star text-[9px] text-brand-primary animate-pulse"></i>
                                                <label class="text-[8px] font-black text-slate-500 uppercase tracking-widest">{{ t[currentLang].questionPoints }}</label>
                                            </div>
                                            <InputNumber v-model="q.points" :min="1" class="w-full h-10.5"
                                                inputClass="w-full text-center font-black text-brand-primary bg-rose-50/20 border border-slate-150 rounded-xl px-4 focus:border-brand-primary transition-all" />
                                        </div>

                                        <!-- Writing limits -->
                                        <template v-if="q.type === 'writing'">
                                            <div class="flex flex-col space-y-1.5">
                                                <div class="flex items-center gap-1.5 ml-1 mr-1">
                                                    <i class="pi pi-minus-circle text-[9px] text-orange-400"></i>
                                                    <label class="text-[8px] font-black text-slate-500 uppercase tracking-widest">{{ t[currentLang].minWordLabel }}</label>
                                                </div>
                                                <InputNumber v-model="q.min_words" :placeholder="t[currentLang].minWordPlaceholder" class="w-full h-10.5"
                                                    inputClass="w-full font-black text-slate-700 bg-white border border-slate-150 rounded-xl px-4 focus:border-brand-primary transition-all" />
                                            </div>

                                            <div class="flex flex-col space-y-1.5">
                                                <div class="flex items-center gap-1.5 ml-1 mr-1">
                                                    <i class="pi pi-plus-circle text-[9px] text-rose-400"></i>
                                                    <label class="text-[8px] font-black text-slate-500 uppercase tracking-widest">{{ t[currentLang].maxWordLabel }}</label>
                                                </div>
                                                <InputNumber v-model="q.max_words" :placeholder="t[currentLang].maxWordPlaceholder" class="w-full h-10.5"
                                                    inputClass="w-full font-black text-slate-700 bg-white border border-slate-150 rounded-xl px-4 focus:border-brand-primary transition-all" />
                                            </div>
                                        </template>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add another question button -->
                <div class="flex pt-4">
                    <Button :label="t[currentLang].addAnotherBtn" icon="pi pi-plus" severity="success" rounded @click="addQuestion"
                        class="font-black text-xs px-6 py-3.5 shadow-sm rounded-xl" />
                </div>

                <!-- Update questions footer -->
                <div class="flex justify-center pt-10 border-t border-slate-100/80">
                    <Button type="button" :loading="isSubmitting" :label="t[currentLang].publishBtn" icon="pi pi-cloud-upload"
                        @click="updateBatch"
                        class="rounded-[2rem] px-20 py-5.5 font-black text-lg bg-slate-900 border-none hover:bg-emerald-600 text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-95 z-10 uppercase tracking-wider" />
                </div>

            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.arabic-theme {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
}

:deep(.p-select) {
    border: none;
    background: transparent;
}

:deep(.p-card-body) {
    padding: 0;
}

:deep(.p-inputnumber-input) {
    font-weight: 900;
    text-align: center;
    border-radius: 0.75rem;
}
:deep(.p-editor-toolbar) {
    display: none !important;
}
.ql-toolbar {
    border: none !important;
    border-bottom: 1px solid #f1f5f9 !important;
    background: #fff;
    padding: 10px;
}

.ql-container {
    border: none !important;
}

.ql-editor {
    min-height: 140px;
    padding: 16px;
}
.p-editor-toolbar {
    display: none !important;
}
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
