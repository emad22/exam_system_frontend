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

const { showAlert, showConfirm } = useModal();

const router = useRouter();
const route = useRoute();
const adminStore = useAdminStore();

const skills = ref([]);
const exams = ref([]);
const passages = ref([]);
const isSubmitting = ref(false);
const errorMsg = ref('');

const questionTypes = [
    { label: 'Multiple Choice (MCQ)', value: 'mcq', icon: 'pi-check-square' },
    { label: 'True / False', value: 'true_false', icon: 'pi-verified' },
    { label: 'Fill in the Blank', value: 'fill_blank', icon: 'pi-pencil' },
    { label: 'Drag & Drop', value: 'drag_drop', icon: 'pi-arrows-alt' },
    { label: 'Click Word', value: 'click_word', icon: 'pi-cursor-click' },
    { label: 'Matching', value: 'matching', icon: 'pi-link' },
    { label: 'Ordering', value: 'ordering', icon: 'pi-list' },
    { label: 'Listening Task', value: 'listening', icon: 'pi-headphones' },
    { label: 'Short Answer', value: 'short_answer', icon: 'pi-pencil' },
    { label: 'Writing Task', value: 'writing', icon: 'pi-file-edit' },
    { label: 'Speaking Task', value: 'speaking', icon: 'pi-microphone' },
    { label: 'File Upload', value: 'upload', icon: 'pi-upload' },
    { label: 'Highlight', value: 'highlight', icon: 'pi-eye' },
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
    questions: []
});

const filteredSkills = computed(() => {
    const exam = exams.value.find(e => e.id === form.value.exam_id);
    if (!exam || !exam.skills) return [];

    // Map the exam skills to include levels_count from the master skills list
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
    // Fallback to 9 if for some reason it's 0 or undefined
    return selectedSkill && selectedSkill.levels_count > 0 ? selectedSkill.levels_count : 9;
});

watch(() => form.value.exam_id, (newVal) => {
    if (newVal) {
        const isValid = filteredSkills.value.some(s => s.id === form.value.skill_id);
        if (!isValid) form.value.skill_id = '';
    } else {
        form.value.skill_id = '';
    }
});

const pFileInput = ref(null);
const pMediaPreview = ref(null);

const createEmptyQuestion = () => ({
    type: 'mcq',
    content_mode: 'text',  // 'text' | 'media'
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
    options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false }
    ]
});

const addQuestion = async () => {
    form.value.questions.push(createEmptyQuestion());
};

const removeQuestion = async (index) => {
    if (form.value.questions.length > 1) {
        form.value.questions.splice(index, 1);
    }
};

const loadInitialData = async () => {
    try {
        const [resSkills, resExams, resPassages] = await Promise.all([
            api.get('/admin/skills'),
            api.get('/admin/exams'),
            api.get('/admin/passages').catch(() => ({ data: [] }))
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

        if (route.query.skill_id) form.value.skill_id = Number(route.query.skill_id);
        if (route.query.exam_id) form.value.exam_id = Number(route.query.exam_id);

        addQuestion();
    } catch (err) {
        console.error('Failed to load initial data', err);
    }
};

const handlePFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.p_media = file;
    pMediaPreview.value = { url: URL.createObjectURL(file), type: file.type };
};

const handlePAudioChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.p_audio = file;
    form.value.p_audio_preview = { url: URL.createObjectURL(file), type: file.type };
};

const handlePImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.p_image = file;
    form.value.p_image_preview = { url: URL.createObjectURL(file), type: file.type };
};

const handleQFileChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.questions[index].q_media = file;
    form.value.questions[index].q_media_preview = { url: URL.createObjectURL(file), type: file.type };
};

const triggerQImage = (idx) => document.getElementById(`qImage_${idx}`)?.click();
const triggerQAudio = (idx) => document.getElementById(`qAudio_${idx}`)?.click();
const triggerQFile = (idx) => document.getElementById(`qFile_${idx}`)?.click();

const handleQAudioChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.questions[index].q_audio = file;
    form.value.questions[index].q_audio_preview = { url: URL.createObjectURL(file), type: file.type };
};

const handleQImageChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.questions[index].q_image = file;
    form.value.questions[index].q_image_preview = { url: URL.createObjectURL(file), type: file.type };
};

const addOption = async (qIdx) => {
    form.value.questions[qIdx].options.push({ option_text: '', is_correct: false });
};
const removeOption = async (qIdx, optIdx) => {
    if (form.value.questions[qIdx].options.length > 1) {
        form.value.questions[qIdx].options.splice(optIdx, 1);
    }
};
const setCorrect = async (qIdx, optIdx) => {
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
        q.instructions = "اختر صح أم خطأ.";
        q.options = [
            { option_text: 'True', is_correct: true },
            { option_text: 'False', is_correct: false }
        ];
    } else if (['writing', 'speaking', 'upload'].includes(q.type)) {
        q.instructions = "يرجى كتابة إجابتك.";
        q.options = [];
    } else if (q.type === 'short_answer') {
        q.instructions = "يرجى كتابة الإجابة.";
        q.options = [{ option_text: '', is_correct: true }];
    } else if (q.type === 'drag_drop') {
        q.instructions = "اسحب الكلمات إلى المربعات الصحيحة لإكمال الجملة.";
        q.options = [
            { option_text: '', is_correct: true },
            { option_text: '', is_correct: true }
        ];
    } else if (q.type === 'fill_blank') {
        q.instructions = "املأ الفراغات بالكلمات الصحيحة.";
        q.options = [
            { option_text: '', is_correct: true }
        ];
    } else if (['word_selection', 'click_word', 'highlight'].includes(q.type)) {
        q.instructions = q.type === 'highlight' ? "قم بتمييز الأجزاء الصحيحة في النص." : "اختر الكلمات المطلوبة في النص.";
        q.options = [
            { option_text: '', is_correct: true }
        ];
    } else if (q.type === 'matching') {
        q.instructions = "قم بتوصيل العناصر في العمود الأول بما يناسبها في العمود الثاني.";
        q.options = [
            { option_text: 'Source 1 | Target 1', is_correct: true },
            { option_text: 'Source 2 | Target 2', is_correct: true }
        ];
    } else if (q.type === 'ordering') {
        q.instructions = "قم بترتيب العناصر التالية بالترتيب الصحيح.";
        q.options = [
            { option_text: 'Item 1', is_correct: true },
            { option_text: 'Item 2', is_correct: true }
        ];
    } else if (q.type === 'listening') {
        q.instructions = "استمع إلى المقطع الصوتي وأجب على السؤال.";
        q.options = [
            { option_text: '', is_correct: true },
            { option_text: '', is_correct: false }
        ];
    } else {
        if (q.options.length < 2) {
            q.instructions = "يرجى اختيار الإجابة الصحيحة.";
            q.options = [
                { option_text: '', is_correct: true },
                { option_text: '', is_correct: false }
            ];
        }
    }
};

const saveBatch = async () => {
    if (!form.value.exam_id) {
        showAlert('Please select an Exam first.', 'Validation Warning', 'warning');
        return;
    }
    if (!form.value.skill_id) {
        showAlert('Please select a Skill.', 'Validation Warning', 'warning');
        return;
    }
    if (!form.value.level_id) {
        showAlert('Please select a Difficulty Level first.', 'Validation Warning', 'warning');
        return;
    }

    isSubmitting.value = true;
    errorMsg.value = '';

    try {
        const fd = new FormData();
        fd.append('skill_id', form.value.skill_id);
        fd.append('exam_id', form.value.exam_id);
        fd.append('level_id', form.value.level_id);
        fd.append('passage_mode', form.value.passage_mode);

        if (form.value.passage_mode === 'existing') {
            fd.append('passage_id', form.value.passage_id);
        } else if (form.value.passage_mode === 'new') {
            fd.append('passage_type', form.value.passage_type);
            fd.append('passage_title', form.value.passage_title || '');
            fd.append('passage_content', form.value.passage_content || '');
            if (form.value.passage_questions_limit) fd.append('passage_questions_limit', form.value.passage_questions_limit);
            fd.append('passage_is_random', form.value.passage_is_random ? 1 : 0);
            if (form.value.p_media) fd.append('p_media_file', form.value.p_media);
            if (form.value.p_audio) fd.append('p_audio_file', form.value.p_audio);
            if (form.value.p_image) fd.append('p_image_file', form.value.p_image);
        }

        // Clean questions data for JSON stringify (exclude File objects and proxies)
        const cleanQuestions = form.value.questions.map(q => ({
            type: q.type,
            content: q.content || '',
            instructions: q.instructions || '',
            points: q.points,
            sort_order: q.sort_order,
            min_words: q.min_words,
            max_words: q.max_words,
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

        await api.post('/admin/questions', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        await showAlert('Question saved successfully!', 'Saved Successfully', 'success');
        const isTeacher = adminStore.user?.role === 'teacher';
        router.push({ name: isTeacher ? 'teacher.questions' : 'admin.questions' });
    } catch (err) {
        const error = err.response?.data?.message || err.response?.data?.errors || 'Failed to save questions.';
        showAlert(error, 'Error Saving Question', 'danger');
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(() => {
    loadInitialData();
});
</script>

<template>
    <AdminLayout>
        <div class="space-y-8 pb-32 mt-6 px-4 md:px-12 animate-in fade-in duration-500">
            <!-- Header -->
            <div
                class="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div class="flex items-center gap-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded
                        @click="router.push({ name: adminStore.user?.role === 'teacher' ? 'teacher.questions' : 'admin.questions' })" />
                    <div>
                        <h1 class="text-2xl font-black text-slate-800 tracking-tight">Create New Questions</h1>
                        <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Add content and link properties</p>
                    </div>
                </div>
                <!-- Primary Action -->
                <Button label="Save All Changes" icon="pi pi-check-circle" :loading="isSubmitting" @click="saveBatch"
                    class="rounded-2xl px-10 py-3 font-black shadow-lg" severity="success" />
            </div>

            <Message v-if="errorMsg" severity="error" :closable="false" class="rounded-2xl">{{ errorMsg }}</Message>

            <!-- 1. Metadata -->
            <Card class="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-50/50">
                <template #title>
                    <div class="flex items-center px-4 py-2 gap-4">
                        <div class="w-10 h-10 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                            <i class="pi pi-cog text-xl"></i>
                        </div>
                        <span class="text-lg font-black text-slate-800">Exam & Skill Settings</span>
                    </div>
                </template>
                <template #content>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                        <div class="flex flex-col">
                            <label class="text-xs font-black text-slate-500 mb-3 ml-2 uppercase tracking-wider">Linked Exam (Required)</label>
                            <Select v-model="form.exam_id" :options="exams" optionLabel="title" optionValue="id"
                                placeholder="Select Exam"
                                class="w-full rounded-2xl border-none shadow-sm h-14 flex items-center px-4 bg-white" />
                        </div>
                        <div class="flex flex-col">
                            <label class="text-xs font-black text-slate-500 mb-3 ml-2 uppercase tracking-wider">Target Skill (Required)</label>
                            <Select v-model="form.skill_id" :options="filteredSkills" optionLabel="name"
                                optionValue="id" placeholder="Select Skill"
                                class="w-full rounded-2xl border-none shadow-sm h-14 flex items-center px-4 bg-white"
                                :disabled="!form.exam_id" :key="form.exam_id" />
                        </div>
                        <div class="flex flex-col">
                            <label class="text-xs font-black text-slate-500 mb-2 ml-2 uppercase tracking-wider">
                                Difficulty Level <span v-if="form.level_id" class="text-indigo-500 font-extrabold">({{ form.level_id }})</span><span v-else class="text-rose-500 font-extrabold">(Required)</span>
                            </label>
                            <div class="flex flex-wrap gap-2 mt-2 ml-2">
                                <button 
                                    v-for="lvl in currentSkillMaxLevel" 
                                    :key="lvl"
                                    type="button"
                                    @click="form.level_id = lvl"
                                    :class="form.level_id === lvl ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200 border-indigo-500 scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20'"
                                    class="w-10 h-10 rounded-xl border font-black text-sm flex items-center justify-center transition-all duration-200 active:scale-95"
                                >
                                    {{ lvl }}
                                </button>
                            </div>
                            <div class="flex justify-between text-[9px] text-slate-400 font-black mt-3 ml-2 uppercase tracking-widest">
                                <span>Beginner (Level 1)</span>
                                <span>Expert (Level {{ currentSkillMaxLevel }})</span>
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- 2. Reading Material / Shared Context -->
            <Card class="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-50/50">
                <template #title>
                    <div class="flex items-center px-4 py-2 gap-4">
                        <div
                            class="w-10 h-10 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                            <i class="pi pi-book text-xl"></i>
                        </div>
                        <span class="text-lg font-black text-slate-800">Reading Material / Shared Context</span>
                    </div>
                </template>
                <template #content>
                    <div class="px-4 space-y-6">
                        <!-- Mode Selector: Simplified -->
                        <div class="flex bg-slate-100/50 p-1.5 rounded-3xl gap-1">
                            <button
                                v-for="mode in [{ id: 'none', label: 'Single Question', icon: 'pi-ban' }, { id: 'existing', label: 'Use Existing Material', icon: 'pi-search' }, { id: 'new', label: 'Create New Material', icon: 'pi-plus-circle' }]"
                                :key="mode.id" type="button" @click="form.passage_mode = mode.id"
                                :class="form.passage_mode === mode.id ? 'bg-white shadow-sm text-slate-800 border-slate-200' : 'text-slate-500 hover:text-slate-700'"
                                class="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all duration-300 font-black text-xs uppercase tracking-wider">
                                <i
                                    :class="[mode.icon, form.passage_mode === mode.id ? 'text-indigo-500' : 'text-slate-300']"></i>
                                {{ mode.id === 'none' ? 'Single Question' : mode.id === 'existing' ? 'Use Existing Material' : 'Create New Material' }}
                            </button>
                        </div>

                        <!-- Existing Passage -->
                        <div v-if="form.passage_mode === 'existing'"
                            class="animate-in fade-in slide-in-from-top-2 duration-400 pt-2">
                            <Select v-model="form.passage_id" :options="passages" optionLabel="title" optionValue="id"
                                placeholder="🔍 Select from library..."
                                class="w-full rounded-[1.5rem] border-none shadow-sm h-14" filter />
                        </div>

                        <!-- New Material: Simplified Layout -->
                        <div v-if="form.passage_mode === 'new'"
                            class="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-50 space-y-8 animate-in zoom-in-95 duration-400">

                            <!-- Header Info -->
                            <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                <div class="md:col-span-8 flex flex-col">
                                    <label
                                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Title
                                        of the Material / Text</label>
                                    <InputText v-model="form.passage_title"
                                        placeholder="e.g. Reading Comprehension: The Solar System..."
                                        class="w-full rounded-2xl h-14 bg-slate-50/50 border-none px-6 font-bold text-slate-800" />
                                </div>
                                <div class="md:col-span-4 flex flex-col">
                                    <label
                                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Material
                                        Type</label>
                                    <Select v-model="form.passage_type"
                                        :options="[{ label: 'Reading Text', value: 'text' }, { label: 'Image-based', value: 'image' }, { label: 'Audio-based', value: 'audio' }, { label: 'Video-based', value: 'video' }]"
                                        optionLabel="label" optionValue="value"
                                        class="w-full rounded-2xl h-14 bg-slate-50/50 border-none px-4" />
                                </div>
                            </div>

                            <!-- Text Content: Rich Editor -->
                            <div class="flex flex-col">
                                <label
                                    class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Main
                                    Content / Passage Text</label>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Type
                                    the reading text that questions will be based on</p>
                                <Editor v-model="form.passage_content" editorStyle="height: 200px"
                                    class="rounded-3xl overflow-hidden border border-slate-100 bg-slate-50/50"
                                    placeholder="Enter formatted reading text here..." />
                            </div>

                            <!-- Media Attachments: Integrated Grid -->
                            <div class="space-y-4">
                                <label
                                    class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Media
                                    Assets (Images & Audio)</label>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    <!-- Image Part -->
                                    <div class="relative group border-2 border-dashed rounded-3xl p-4 transition-all"
                                        :class="form.p_image_preview ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 bg-slate-50/30 hover:border-brand-primary'">
                                        <div v-if="!form.p_image_preview" @click="$refs.pImgInput.click()"
                                            class="flex items-center gap-4 cursor-pointer py-2">
                                            <div
                                                class="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-brand-primary transition-colors">
                                                <i class="pi pi-image text-xl"></i>
                                            </div>
                                            <div class="flex flex-col">
                                                <span
                                                    class="text-xs font-black text-slate-600 uppercase tracking-wide">Attach
                                                    Illustration</span>
                                                <span
                                                    class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">JPG,
                                                    PNG, GIF up to 5MB</span>
                                            </div>
                                        </div>
                                        <div v-else class="flex items-center justify-between">
                                            <div class="flex items-center gap-4">
                                                <img :src="form.p_image_preview.url"
                                                    class="w-16 h-16 rounded-xl object-cover shadow-sm" />
                                                <span
                                                    class="text-xs font-black text-emerald-600 uppercase tracking-widest">Image
                                                    Linked</span>
                                            </div>
                                            <Button icon="pi pi-trash" text severity="danger" size="small"
                                                @click="form.p_image = null; form.p_image_preview = null" />
                                        </div>
                                        <input type="file" ref="pImgInput" class="hidden" @change="handlePImageChange"
                                            accept="image/*" />
                                    </div>

                                    <!-- Audio Part -->
                                    <div class="relative group border-2 border-dashed rounded-3xl p-4 transition-all"
                                        :class="form.p_audio_preview ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-100 bg-slate-50/30 hover:border-brand-primary'">
                                        <div v-if="!form.p_audio_preview" @click="$refs.pAudInput.click()"
                                            class="flex items-center gap-4 cursor-pointer py-2">
                                            <div
                                                class="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-brand-primary transition-colors">
                                                <i class="pi pi-volume-up text-xl"></i>
                                            </div>
                                            <div class="flex flex-col">
                                                <span
                                                    class="text-xs font-black text-slate-600 uppercase tracking-wide">Attach
                                                    Listening</span>
                                                <span
                                                    class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">MP3,
                                                    WAV up to 10MB</span>
                                            </div>
                                        </div>
                                        <div v-else class="flex flex-col gap-3">
                                            <div class="flex items-center justify-between">
                                                <span
                                                    class="text-xs font-black text-indigo-600 uppercase tracking-widest">Audio
                                                    Linked</span>
                                                <Button icon="pi pi-trash" text severity="danger" size="small"
                                                    @click="form.p_audio = null; form.p_audio_preview = null" />
                                            </div>
                                            <audio :src="form.p_audio_preview.url" controls class="h-8 w-full"></audio>
                                        </div>
                                        <input type="file" ref="pAudInput" class="hidden" @change="handlePAudioChange"
                                            accept="audio/*" />
                                    </div>
                                </div>
                            </div>

                            <!-- Misc Media Support (Minimal) -->
                            <div class="pt-4 flex items-center gap-4 opacity-60 hover:opacity-100 transition-opacity">
                                <i class="pi pi-info-circle text-slate-400"></i>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Need to attach
                                    a Video or other file?</p>
                                <button type="button" @click="$refs.pFileInput.click()"
                                    class="text-[9px] font-black text-indigo-500 uppercase tracking-widest underline decoration-dotted">Click
                                    here</button>
                                <input type="file" ref="pFileInput" class="hidden" @change="handlePFileChange"
                                    accept="video/*" />
                                <span v-if="pMediaPreview"
                                    class="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded ml-auto">FILE
                                    ATTACHED</span>
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- 3. Question List -->
            <div class="space-y-6">
                <div
                    class="flex items-center justify-between bg-white px-8 py-5 rounded-[2rem] shadow-sm border border-slate-50">
                    <div class="flex items-center gap-4">
                        <div
                            class="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                            <i class="pi pi-list text-xl"></i>
                        </div>
                        <span class="text-lg font-black text-slate-800">Draft Questions</span>
                    </div>

                </div>

                <div v-for="(q, qIdx) in form.questions" :key="qIdx"
                    class="group relative bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2.5rem] p-8 md:p-12 animate-in slide-in-from-bottom-4">

                    <div
                        class="absolute -left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white border-2 border-slate-50 text-slate-800 rounded-2xl flex items-center justify-center font-black shadow-xl group-hover:bg-emerald-500 group-hover:text-white transition-all z-10">
                        {{ qIdx + 1 }}
                    </div>

                    <button v-if="form.questions.length > 1" @click="removeQuestion(qIdx)"
                        class="absolute -right-3 -top-3 w-10 h-10 bg-white border border-slate-100 text-rose-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center z-10">
                        <i class="pi pi-times text-xs"></i>
                    </button>

                    <div class="space-y-10">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="flex flex-col">
                                <label
                                    class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Question
                                    Type</label>
                                <Select v-model="q.type" @change="handleTypeChange(qIdx)" :options="questionTypes"
                                    optionLabel="label" optionValue="value"
                                    class="w-full rounded-2xl bg-slate-50/50 border-none px-4 h-14 flex items-center" />
                            </div>
                            <div class="flex flex-col">
                                <label
                                    class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Instructions</label>
                                <InputText v-model="q.instructions"
                                    placeholder="e.g. Choose the correct answer based on the text, audio or image attached"
                                    class="w-full rounded-2xl bg-slate-50/50 border-none px-6 h-14 font-bold" />
                            </div>
                        </div>

                        <!-- Question Content: Text OR Media Toggle -->
                        <div class="space-y-4">
                            <!-- Mode Selector -->
                            <div class="flex items-center gap-3">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {{ q.type === 'writing' ? 'Writing Task Prompt' : 'Question Content' }}
                                </span>
                                <div class="flex bg-slate-100 rounded-2xl p-1 gap-1">
                                    <button type="button"
                                        @click="q.content_mode = 'text'; q.q_media = null; q.q_media_preview = null"
                                        :class="q.content_mode === 'text' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'"
                                        class="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-2">
                                        <i class="pi pi-align-left text-xs"></i> Text
                                    </button>
                                    <button type="button" @click="q.content_mode = 'media'; q.content = ''"
                                        :class="q.content_mode === 'media' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'"
                                        class="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-2">
                                        <i class="pi pi-image text-xs"></i> Audio / Image / Video
                                    </button>
                                </div>
                            </div>

                            <!-- Text Mode: Rich Editor -->
                            <div v-if="q.content_mode === 'text'" class="space-y-2">
                                <Editor v-model="q.content" editorStyle="height: 120px"
                                    class="rounded-[1.5rem] overflow-hidden border border-slate-100 bg-slate-50/50"
                                    placeholder="Type your formatted question here..." />

                                <div v-if="q.type === 'writing'"
                                    class="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-right" dir="rtl">
                                    <p
                                        class="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                        <i class="pi pi-info-circle"></i> دليل المهمة الكتابية (Writing Task)
                                    </p>
                                    <p class="text-[11px] text-indigo-500 mt-1">
                                        قم بكتابة نص المهمة أو السؤال بوضوح. سيتم عرض مربع نص للطالب للكتابة فيه.
                                        يمكنك تحديد الحد الأدنى والأقصى للكلمات في قسم "المعايير" بالأسفل.
                                    </p>
                                </div>

                                <div v-if="q.type === 'drag_drop'"
                                    class="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-right" dir="rtl">
                                    <p
                                        class="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                        <i class="pi pi-info-circle"></i> دليل السحب والإفلات
                                    </p>
                                    <p class="text-[11px] text-indigo-500 mt-1">
                                        استخدم <b>...............</b> في المكان الذي تريد فيه فراغاً. كل
                                        <b>...............</b> سيتم
                                        ربطه بإحدى الخيارات أدناه بالترتيب.
                                        مثال: "تعتبر الـ <b>...............</b> من الـ <b>...............</b> الأليفة."
                                    </p>
                                </div>

                                <div v-if="q.type === 'word_selection' || q.type === 'click_word'"
                                    class="bg-amber-50 p-4 rounded-xl border border-amber-100 text-right" dir="rtl">
                                    <p
                                        class="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                        <i class="pi pi-info-circle"></i> دليل اختيار الكلمات
                                    </p>
                                    <p class="text-[11px] text-amber-500 mt-1">
                                        سيقوم النظام تلقائياً بجعل الكلمات التي تضيفها في "الخيارات" قابلة للنقر.
                                        حدد <b>صح</b> للكلمات التي <b>يجب</b> على الطالب النقر عليها.
                                    </p>
                                </div>

                                <div v-if="q.type === 'fill_blank'"
                                    class="bg-blue-50 p-4 rounded-xl border border-blue-100 text-right" dir="rtl">
                                    <p
                                        class="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                        <i class="pi pi-info-circle"></i> دليل ملء الفراغات
                                    </p>
                                    <p class="text-[11px] text-blue-500 mt-1">
                                        استخدم <b>...............</b> في المكان الذي تريد فيه مربع نص. كل <b>...............</b> سيتم فحصه مقابل الخيارات أدناه بالترتيب.<br><br>
                                        <b>إجابات متعددة مقبولة:</b> إذا كانت الإجابة الصحيحة أكثر من كلمة، ضعها في نفس الخيار مفصولةً بـ <b>|</b><br>
                                        مثال: <b>لم | لن</b> يعني أن كتابة أي منهما صحيحة.
                                    </p>
                                </div>

                                <div v-if="q.type === 'matching'"
                                    class="bg-purple-50 p-4 rounded-xl border border-purple-100 text-right" dir="rtl">
                                    <p
                                        class="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                                        <i class="pi pi-info-circle"></i> دليل التوصيل (Matching)
                                    </p>
                                    <p class="text-[11px] text-purple-500 mt-1">
                                        أضف الأزواج باستخدام علامة الأنبوب. مثال: <b>الكلمة | التعريف</b>.<br>
                                        سيتم تقسيم كل زوج تلقائياً. لإضافة مشتت (إجابة ليس لها أصل)، ببساطة أدخل النص بدون علامة الأنبوب.
                                    </p>
                                </div>

                                <div v-if="q.type === 'ordering'"
                                    class="bg-slate-50 p-4 rounded-xl border border-slate-100 text-right" dir="rtl">
                                    <p
                                        class="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                        <i class="pi pi-info-circle"></i> دليل الترتيب (Ordering)
                                    </p>
                                    <p class="text-[11px] text-slate-500 mt-1">
                                        أضف العناصر بالترتيب الصحيح. استخدم حقل <b>Sort Order</b> لتحديد التسلسل إذا
                                        لزم الأمر، ولكن عادة ما يتم استخدام الترتيب في القائمة.
                                    </p>
                                </div>

                                <div v-if="q.type === 'highlight'"
                                    class="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-right" dir="rtl">
                                    <p
                                        class="text-[10px] font-black text-yellow-600 uppercase tracking-widest flex items-center gap-2">
                                        <i class="pi pi-info-circle"></i> دليل تمييز النص (Highlight)
                                    </p>
                                    <p class="text-[11px] text-yellow-700 mt-1">
                                        أضف عبارات أو جملاً كخيارات. حدد <b>صح</b> لتلك التي يجب على الطالب تمييزها.
                                    </p>
                                </div>
                            </div>

                            <!-- Media Mode: Multiple Files Support -->
                            <div v-else class="animate-in zoom-in-95 duration-300">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <!-- Image Upload -->
                                    <div class="flex flex-col gap-3">
                                        <label
                                            class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Image
                                            Attachment</label>
                                        <div class="flex gap-4 items-center">
                                            <div @click="triggerQImage(qIdx)"
                                                class="w-32 h-32 border-2 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer transition-all group"
                                                :class="q.q_image_preview ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50'">
                                                <input type="file" :id="`qImage_${qIdx}`" class="hidden"
                                                    @change="(e) => handleQImageChange(e, qIdx)" accept="image/*" />
                                                <i v-if="!q.q_image_preview"
                                                    class="pi pi-image text-2xl text-slate-300 group-hover:text-indigo-400 mb-1"></i>
                                                <i v-else class="pi pi-check-circle text-2xl text-emerald-500 mb-1"></i>
                                                <span
                                                    class="text-[8px] font-black uppercase tracking-widest text-center px-2"
                                                    :class="q.q_image_preview ? 'text-emerald-600' : 'text-slate-400 group-hover:text-indigo-500'">
                                                    {{ q.q_image_preview ? 'Image Added' : 'Select Image' }}
                                                </span>
                                            </div>
                                            <div v-if="q.q_image_preview" class="relative group/preview">
                                                <img :src="q.q_image_preview.url"
                                                    class="w-32 h-32 rounded-[1.5rem] object-cover shadow-sm border border-slate-100" />
                                                <button @click="q.q_image = null; q.q_image_preview = null"
                                                    class="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/preview:opacity-100 transition-all">
                                                    <i class="pi pi-times text-[10px]"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Audio Upload -->
                                    <div class="flex flex-col gap-3">
                                        <label
                                            class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Audio
                                            Attachment</label>
                                        <div class="flex flex-col gap-4">
                                            <div @click="triggerQAudio(qIdx)"
                                                class="w-full h-20 border-2 border-dashed rounded-[1.5rem] flex items-center justify-center gap-4 cursor-pointer transition-all group"
                                                :class="q.q_audio_preview ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50'">
                                                <input type="file" :id="`qAudio_${qIdx}`" class="hidden"
                                                    @change="(e) => handleQAudioChange(e, qIdx)" accept="audio/*" />
                                                <i v-if="!q.q_audio_preview"
                                                    class="pi pi-volume-up text-2xl text-slate-300 group-hover:text-indigo-400"></i>
                                                <i v-else class="pi pi-check-circle text-2xl text-emerald-500"></i>
                                                <span class="text-[9px] font-black uppercase tracking-widest"
                                                    :class="q.q_audio_preview ? 'text-emerald-600' : 'text-slate-400 group-hover:text-indigo-500'">
                                                    {{ q.q_audio_preview ? 'Audio Clip Added' : 'Select Audio File' }}
                                                </span>
                                            </div>
                                            <div v-if="q.q_audio_preview"
                                                class="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                <audio :src="q.q_audio_preview.url" controls class="h-8 grow"></audio>
                                                <button @click="q.q_audio = null; q.q_audio_preview = null"
                                                    class="w-8 h-8 text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center">
                                                    <i class="pi pi-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Other Media (Fallback) -->
                                    <div class="md:col-span-2 pt-4 border-t border-slate-50">
                                        <div class="flex items-center gap-4">
                                            <label
                                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Other
                                                Media (Video/Misc)</label>
                                            <div class="grow h-[1px] bg-slate-50"></div>
                                            <Button icon="pi pi-plus" label="Add Video/Other" text
                                                class="text-[9px] font-black" @click="triggerQFile(qIdx)" />
                                            <input type="file" :id="`qFile_${qIdx}`" class="hidden"
                                                @change="(e) => handleQFileChange(e, qIdx)" accept="video/*" />
                                        </div>
                                        <div v-if="q.q_media_preview"
                                            class="mt-4 p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                                            <video v-if="q.q_media_preview.type.startsWith('video/')"
                                                :src="q.q_media_preview.url" controls
                                                class="max-h-24 rounded-xl"></video>
                                            <span v-else class="text-xs font-bold text-slate-600">File: {{
                                                q.q_media_preview.type
                                                }}</span>
                                            <button @click="q.q_media = null; q.q_media_preview = null"
                                                class="text-rose-500 font-black text-[10px] uppercase">Remove</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            <!-- Options Section: Larger Space -->
                            <div v-if="!['writing', 'speaking', 'upload'].includes(q.type)"
                                class="lg:col-span-8 space-y-6">
                                <div class="flex items-center justify-between">
                                    <label
                                        class="text-xs font-black text-indigo-500 ml-2 uppercase tracking-wide">Options
                                        Matrix</label>
                                    <Button
                                        v-if="['mcq', 'short_answer', 'drag_drop', 'word_selection', 'click_word', 'fill_blank', 'matching', 'ordering', 'highlight', 'listening'].includes(q.type)"
                                        icon="pi pi-plus" label="Add Option" text rounded @click="addOption(qIdx)"
                                        class="text-[10px] font-black text-emerald-600" />
                                </div>
                                <div class="space-y-4">
                                    <div v-for="(opt, oIdx) in q.options" :key="oIdx"
                                        class="flex items-center gap-6 p-5 rounded-[2rem] border-2 transition-all bg-white"
                                        :class="opt.is_correct ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-50 shadow-sm'">
                                        <div class="flex flex-col items-center gap-1 shrink-0">
                                            <span class="text-[9px] font-black text-slate-400 uppercase">#{{ oIdx + 1
                                            }}</span>
                                            <button v-if="q.type !== 'short_answer'" type="button"
                                                @click="setCorrect(qIdx, oIdx)"
                                                class="w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all"
                                                :class="opt.is_correct ? 'bg-emerald-500 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-transparent'">
                                                <i class="pi pi-check text-sm font-black"></i>
                                            </button>
                                        </div>
                                        <InputText v-model="opt.option_text" :disabled="q.type === 'true_false'"
                                            :placeholder="q.type === 'short_answer' ? 'Accepted variation...' : 'Option value...'"
                                            class="w-full border-none bg-transparent font-bold text-slate-800 focus:ring-0 text-lg py-2" />
                                        <div class="flex items-center gap-1 shrink-0">
                                            <button v-if="oIdx > 0" type="button" @click="moveOptionUp(qIdx, oIdx)"
                                                class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-primary transition-all flex items-center justify-center">
                                                <i class="pi pi-chevron-up text-[10px]"></i>
                                            </button>
                                            <button v-if="oIdx < q.options.length - 1" type="button"
                                                @click="moveOptionDown(qIdx, oIdx)"
                                                class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-primary transition-all flex items-center justify-center">
                                                <i class="pi pi-chevron-down text-[10px]"></i>
                                            </button>
                                            <button
                                                v-if="['mcq', 'short_answer', 'drag_drop', 'word_selection', 'click_word', 'fill_blank', 'matching', 'ordering', 'highlight', 'listening'].includes(q.type) && q.options.length > 1"
                                                @click="removeOption(qIdx, oIdx)"
                                                class="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center">
                                                <i class="pi pi-trash text-[10px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Points & Word Limits: Sidebar Style -->
                            <div :class="['writing', 'speaking', 'upload'].includes(q.type) ? 'lg:col-span-12' : 'lg:col-span-4'"
                                class="flex flex-col space-y-8 bg-slate-50/80 p-8 md:p-10 rounded-[3rem] border border-slate-200/50 shadow-sm transition-all hover:shadow-md">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                            <i class="pi pi-calculator text-lg"></i>
                                        </div>
                                        <div>
                                            <label class="text-sm font-black text-slate-800 uppercase tracking-wide block">Scoring & Parameters</label>
                                            <span class="text-[10px] font-bold text-slate-400 uppercase">Define weight and constraints</span>
                                        </div>
                                    </div>
                                    <div v-if="q.type === 'writing'" class="hidden md:flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                                        <i class="pi pi-info-circle text-indigo-400 text-xs"></i>
                                        <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Writing Task Config</span>
                                    </div>
                                </div>

                                <div :class="['writing', 'speaking', 'upload'].includes(q.type) ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10' : 'grid grid-cols-1 gap-8'">
                                    <!-- Sort Order -->
                                    <div class="flex flex-col gap-3">
                                        <div class="flex items-center gap-2 ml-1">
                                            <i class="pi pi-sort-alt text-[10px] text-slate-400"></i>
                                            <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Display Order</label>
                                        </div>
                                        <InputNumber v-model="q.sort_order" :min="0" showButtons
                                            buttonLayout="horizontal" class="w-full h-12"
                                            inputClass="text-center font-black text-slate-700 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-400 transition-all"
                                            incrementButtonClass="bg-slate-50 text-slate-400 border-none rounded-r-2xl"
                                            decrementButtonClass="bg-slate-50 text-slate-400 border-none rounded-l-2xl"
                                            incrementButtonIcon="pi pi-plus text-[8px]"
                                            decrementButtonIcon="pi pi-minus text-[8px]" />
                                    </div>

                                    <!-- Points -->
                                    <div class="flex flex-col gap-3">
                                        <div class="flex items-center gap-2 ml-1">
                                            <i class="pi pi-star text-[10px] text-emerald-400"></i>
                                            <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Question Points</label>
                                        </div>
                                        <InputNumber v-model="q.points" :min="1" showButtons buttonLayout="horizontal"
                                            class="w-full h-12"
                                            inputClass="text-center font-black text-emerald-600 bg-emerald-50/30 border-2 border-emerald-100 rounded-2xl focus:border-emerald-400 transition-all"
                                            incrementButtonClass="bg-emerald-50 text-emerald-400 border-none rounded-r-2xl"
                                            decrementButtonClass="bg-emerald-50 text-emerald-400 border-none rounded-l-2xl"
                                            incrementButtonIcon="pi pi-plus text-[8px]"
                                            decrementButtonIcon="pi pi-minus text-[8px]" />
                                    </div>

                                    <!-- Writing Specific: Min Words -->
                                    <template v-if="q.type === 'writing'">
                                        <div class="flex flex-col gap-3 animate-in fade-in slide-in-from-left-4">
                                            <div class="flex items-center gap-2 ml-1">
                                                <i class="pi pi-minus-circle text-[10px] text-orange-400"></i>
                                                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Minimum Word Count</label>
                                            </div>
                                            <InputNumber v-model="q.min_words" placeholder="e.g. 150" class="w-full h-12"
                                                inputClass="font-black text-slate-700 bg-white border-2 border-slate-100 rounded-2xl px-6 focus:border-orange-400 transition-all" />
                                        </div>

                                        <!-- Writing Specific: Max Words -->
                                        <div class="flex flex-col gap-3 animate-in fade-in slide-in-from-left-8">
                                            <div class="flex items-center gap-2 ml-1">
                                                <i class="pi pi-plus-circle text-[10px] text-rose-400"></i>
                                                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maximum Word Count</label>
                                            </div>
                                            <InputNumber v-model="q.max_words" placeholder="e.g. 250" class="w-full h-12"
                                                inputClass="font-black text-slate-700 bg-white border-2 border-slate-100 rounded-2xl px-6 focus:border-rose-400 transition-all" />
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


            </div>

            <Button label="Add Another Question" icon="pi pi-plus" severity="success" rounded @click="addQuestion"
                class="font-black text-xs px-6 py-3" />

            <!-- Footer Action -->
            <div class="flex justify-center pt-10 border-t border-slate-100">
                <Button type="button" :loading="isSubmitting" label="Publish Questions" icon="pi pi-cloud-upload"
                    size="large" @click="saveBatch"
                    class="rounded-[2rem] px-24 py-6 font-black text-xl bg-slate-900 border-none hover:bg-emerald-600 shadow-2xl transition-all hover:scale-105 active:scale-95" />
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
:deep(.p-select) {
    border: none;
    background: white;
}

:deep(.p-inputnumber-input) {
    font-weight: 900;
    text-align: center;
    border-radius: 1rem;
}
</style>
