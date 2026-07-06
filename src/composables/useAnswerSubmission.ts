import { ref, computed } from 'vue';
import api from '@/services/api';

/**
 * useAnswerSubmission - إدارة الإجابات والتحقق والإرسال
 */
export const useAnswerSubmission = (attemptId, currentQuestion, questions, currentIndex, isStarting) => {
    // States
    const answers = ref([]);
    const questionSubmitted = ref(false);
    const isSubmittingBatch = ref(false);
    const showConfirmAnswerModal = ref(false);
    const cheatWarnings = ref(0);
    const cheatAttempts = ref([]);

    /**
     * معايير التحقق من صحة الإجابات لكل نوع سؤال
     */
    const VALIDATORS = {
        mcq: (ans) => !!ans.option_id,
        true_false: (ans) => !!ans.option_id,
        speaking: (ans) => !!ans.recorded_file,
        writing: (ans) => !!(ans.text_answer && ans.text_answer.trim().length > 0) || !!ans.recorded_file,
        drag_drop: (ans) => ans.drag_drop_answers.every(a => a !== null && a !== ''),
        fill_blank: (ans) => ans.fill_blank_answers.every(a => a && a.trim().length > 0),
        matching: (ans, q) => Object.keys(ans.matching_answers).length === q.options.filter(o => o.is_correct).length,
        ordering: (ans, q) => ans.ordering_answers.length === q.options.length,
        highlight: (ans) => ans.highlight_answers.length > 0,
        short_answer: (ans) => ans.text_answer && ans.text_answer.trim().length > 0,
        click_word: (ans) => ans.selected_words.length > 0,
        word_selection: (ans) => ans.selected_words.length > 0,
    };

    /**
     * تهيئة إجابات فارغة للأسئلة
     */
    const initializeAnswers = (qs) => {
        answers.value = qs.map(q => {
            const answerObj = {
                question_id: q.id,
                option_id: null,
                text_answer: '',
                recorded_file: null,
                is_media_uploaded: false,
                drag_drop_answers: [],
                selected_words: [],
                fill_blank_answers: [],
                matching_answers: {},
                ordering_answers: [],
                highlight_answers: []
            };

            // Initialize based on question type
            const content = q.content || '';
            if (q.type === 'drag_drop') {
                const slotCount = (content.match(/\.{10,}|\[\s*target\s*\]|\[\s*\]/gi) || []).length;
                answerObj.drag_drop_answers = Array(slotCount).fill(null);
            } else if (q.type === 'word_selection' || q.type === 'click_word') {
                answerObj.selected_words = [];
            } else if (q.type === 'fill_blank') {
                const slotCount = (content.match(/\[\s*input\s*\]|\[\s*\]/gi) || []).length;
                answerObj.fill_blank_answers = Array(slotCount).fill('');
            } else if (q.type === 'matching') {
                answerObj.matching_answers = {};
            } else if (q.type === 'ordering') {
                answerObj.ordering_answers = [];
            } else if (q.type === 'highlight') {
                answerObj.highlight_answers = [];
            }

            return answerObj;
        });
    };

    /**
     * التحقق من صحة الإجابة الحالية
     */
    const submitAnswer = () => {
        const ans = answers.value[currentIndex.value];
        const q = currentQuestion.value;
        
        if (!q) return;

        const isValid = VALIDATORS[q.type] ? VALIDATORS[q.type](ans, q) : !!ans.text_answer;
        if (!isValid) {
            showConfirmAnswerModal.value = true;
            return;
        }
        questionSubmitted.value = true;
    };

    /**
     * حفظ الإجابة الحالية كمسودة
     */
    const saveCurrentAnswerDraft = async (ansToSave = null, qToSave = null) => {
        if (isStarting.value) return;
        
        const ans = ansToSave || answers.value[currentIndex.value];
        const q = qToSave || currentQuestion.value;
        
        if (!ans || !q) return;

        try {
            const formData = new FormData();
            formData.append('question_id', ans.question_id);
            if (ans.option_id) formData.append('option_id', ans.option_id);
            if (ans.text_answer) formData.append('text_answer', ans.text_answer);

            // Handle file upload
            if (ans.recorded_file && !ans.is_media_uploaded) {
                const fileName = ans.recorded_file.name || 'voice.webm';
                formData.append('audio_file', ans.recorded_file, fileName);
            }

            // Handle array fields
            const arrayFields = {
                selected_words: ans.selected_words,
                drag_drop_answers: ans.drag_drop_answers,
                fill_blank_answers: ans.fill_blank_answers,
                ordering_answers: ans.ordering_answers,
                highlight_answers: ans.highlight_answers
            };

            Object.entries(arrayFields).forEach(([fieldName, value]) => {
                if (value && Array.isArray(value) && value.length > 0) {
                    value.forEach((val, vIdx) => {
                        formData.append(`${fieldName}[${vIdx}]`, val || '');
                    });
                }
            });

            // Handle matching answers
            if (ans.matching_answers && Object.keys(ans.matching_answers).length > 0) {
                formData.append('matching_answers', JSON.stringify(ans.matching_answers));
            }

            await api.post(`/attempts/${attemptId.value}/save-answer`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (ans.recorded_file) {
                ans.is_media_uploaded = true;
            }
        } catch (err) {
            console.warn('Failed to save answer draft', err);
        }
    };

    /**
     * إرسال مجموعة الإجابات
     */
    const submitBatch = async () => {
        if (isSubmittingBatch.value) return;
        isSubmittingBatch.value = true;

        try {
            const formData = new FormData();
            
            answers.value.forEach((ans, index) => {
                formData.append(`answers[${index}][question_id]`, ans.question_id);
                if (ans.option_id) formData.append(`answers[${index}][option_id]`, ans.option_id);
                if (ans.text_answer) formData.append(`answers[${index}][text_answer]`, ans.text_answer);

                // Handle file uploads
                if (ans.recorded_file && !ans.is_media_uploaded) {
                    const fileName = ans.recorded_file.name || 'voice.webm';
                    formData.append(`answers[${index}][audio_file]`, ans.recorded_file, fileName);
                }

                // Handle array fields
                const arrayFields = {
                    selected_words: ans.selected_words,
                    drag_drop_answers: ans.drag_drop_answers,
                    fill_blank_answers: ans.fill_blank_answers,
                    ordering_answers: ans.ordering_answers,
                    highlight_answers: ans.highlight_answers
                };

                Object.entries(arrayFields).forEach(([fieldName, value]) => {
                    if (value && Array.isArray(value) && value.length > 0) {
                        value.forEach((val, vIdx) => {
                            formData.append(`answers[${index}][${fieldName}][${vIdx}]`, val || '');
                        });
                    }
                });

                // Handle matching answers
                if (ans.matching_answers && Object.keys(ans.matching_answers).length > 0) {
                    formData.append(`answers[${index}][matching_answers]`, JSON.stringify(ans.matching_answers));
                }
            });

            const response = await api.post(`/attempts/${attemptId.value}/submit-batch`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            return response.data;
        } catch (err) {
            console.error('Submission failed', err);
            throw err;
        } finally {
            isSubmittingBatch.value = false;
        }
    };

    /**
     * إضافة محاولة غش للقائمة
     */
    const recordCheatAttempt = (warningCount) => {
        if (warningCount > cheatWarnings.value) {
            cheatAttempts.value.push({
                timestamp: new Date().toISOString(),
                type: 'tab_switching',
                warning_number: warningCount
            });
        }
    };

    // Computed properties
    const isCurrentAnswerValid = computed(() => {
        if (!currentQuestion.value || !answers.value[currentIndex.value]) return false;
        const ans = answers.value[currentIndex.value];
        const q = currentQuestion.value;
        return VALIDATORS[q.type] ? VALIDATORS[q.type](ans, q) : !!ans.text_answer;
    });

    const wordCount = computed(() => {
        return (answers.value[currentIndex.value]?.text_answer || '').trim().split(/\s+/).filter(w => w).length;
    });

    return {
        // States
        answers,
        questionSubmitted,
        isSubmittingBatch,
        showConfirmAnswerModal,
        cheatWarnings,
        cheatAttempts,

        // Methods
        initializeAnswers,
        submitAnswer,
        saveCurrentAnswerDraft,
        submitBatch,
        recordCheatAttempt,

        // Computed
        isCurrentAnswerValid,
        wordCount,

        // Validators
        VALIDATORS
    };
};
