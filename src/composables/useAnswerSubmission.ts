import { ref, type Ref, type ComputedRef } from 'vue';
import api from '@/services/api';
import { VALIDATORS, type AnswerObj } from './useExamAnswers';

export interface SubmitBatchResult {
    success: boolean;
    finished_exam?: boolean;
    next_step?: string;
    retry_attempt?: boolean;
    isTimeout?: boolean;
    data?: any;
    error?: string;
}

export function useAnswerSubmission(
    attemptId: Ref<string | number | null>,
    answers: Ref<AnswerObj[]>,
    currentIndex: Ref<number>,
    currentQ: ComputedRef<any>,
    questionSubmitted: Ref<boolean>,
    isStarting: Ref<boolean>,
    cheatWarnings: Ref<number>,
    cheatAttempts: Ref<any[]>,
    showAlert: (msg: string) => Promise<void>
) {
    const isSubmittingBatch = ref(false);
    const isUploadingAnswer = ref(false);
    const showConfirmAnswerModal = ref(false);

    /**
     * Submit single answer validation check
     */
    const submitAnswer = async () => {
        const ans = answers.value[currentIndex.value];
        const q = currentQ.value;
        if (!ans || !q) return;

        const validator = VALIDATORS[q.type];
        const isValid = validator ? validator(ans, q) : !!ans.text_answer;
        if (!isValid) {
            showConfirmAnswerModal.value = true;
            return;
        }
        questionSubmitted.value = true;
    };

    /**
     * Builds standard FormData for a single answer draft
     */
    const createDraftFormData = (ans: AnswerObj): FormData => {
        const formData = new FormData();
        if (ans.question_id !== null && ans.question_id !== undefined) {
            formData.append('question_id', String(ans.question_id));
        }
        if (ans.option_id !== null && ans.option_id !== undefined) {
            formData.append('option_id', String(ans.option_id));
        }
        if (ans.text_answer) {
            formData.append('text_answer', ans.text_answer);
        }

        // Single audio file (voice recording)
        if (ans.recorded_file && !ans.is_media_uploaded) {
            const fileName = (ans.recorded_file as File).name || 'voice.webm';
            formData.append('audio_file', ans.recorded_file, fileName);
        }

        // Writing: multiple uploaded files (e.g. PDFs / images)
        if (ans.recorded_files && ans.recorded_files.length > 0 && !ans.is_media_uploaded) {
            ans.recorded_files.forEach((file, fIdx) => {
                const fName = (file as File).name || `file_${fIdx}`;
                formData.append(`pdf_files[${fIdx}]`, file, fName);
            });
        }

        // PDF annotation: attached generated annotated PDF
        if (ans.pdf_file) {
            const pdfName = (ans.pdf_file as File).name || 'answer.pdf';
            formData.append('pdf_file', ans.pdf_file, pdfName);
            if (!ans.text_answer) {
                formData.append('text_answer', 'PDF_ANNOTATED');
            }
        }

        // Interactive array fields
        const arrayFields: Record<string, (string | null)[]> = {
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

        // Matching questions (JSON string)
        if (ans.matching_answers && Object.keys(ans.matching_answers).length > 0) {
            formData.append('matching_answers', JSON.stringify(ans.matching_answers));
        }

        return formData;
    };

    /**
     * Saves current active answer as draft to the backend
     */
    const saveCurrentAnswerDraft = async (ansToSave: AnswerObj | null = null, qToSave: any = null) => {
        if (isStarting.value || !attemptId.value) return;

        const ans = ansToSave || answers.value[currentIndex.value];
        const q = qToSave || currentQ.value;
        if (!ans || !q) return;

        try {
            const formData = createDraftFormData(ans);
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
     * Builds full batch FormData for all answers in current batch
     */
    const createBatchFormData = (): FormData => {
        const formData = new FormData();

        answers.value.forEach((ans, index) => {
            if (ans.question_id !== null && ans.question_id !== undefined) {
                formData.append(`answers[${index}][question_id]`, String(ans.question_id));
            }
            if (ans.option_id !== null && ans.option_id !== undefined) {
                formData.append(`answers[${index}][option_id]`, String(ans.option_id));
            }
            if (ans.text_answer) {
                formData.append(`answers[${index}][text_answer]`, ans.text_answer);
            }

            // Audio file
            if (ans.recorded_file && !ans.is_media_uploaded) {
                const fileName = (ans.recorded_file as File).name || 'voice.webm';
                formData.append(`answers[${index}][audio_file]`, ans.recorded_file, fileName);
            }

            // Multiple uploaded files for writing
            if (ans.recorded_files && ans.recorded_files.length > 0 && !ans.is_media_uploaded) {
                ans.recorded_files.forEach((file, fIdx) => {
                    const fName = (file as File).name || `file_${fIdx}`;
                    formData.append(`answers[${index}][pdf_files][${fIdx}]`, file, fName);
                });
            }

            // PDF annotation
            if (ans.pdf_file) {
                const pdfName = (ans.pdf_file as File).name || 'answer.pdf';
                formData.append(`answers[${index}][pdf_file]`, ans.pdf_file, pdfName);
                if (!ans.text_answer) {
                    formData.append(`answers[${index}][text_answer]`, 'PDF_ANNOTATED');
                }
            }

            // Array fields
            const arrayFields: Record<string, (string | null)[]> = {
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

            // Matching answers JSON
            if (ans.matching_answers && Object.keys(ans.matching_answers).length > 0) {
                formData.append(`answers[${index}][matching_answers]`, JSON.stringify(ans.matching_answers));
            }
        });

        return formData;
    };

    /**
     * Submits batch of answers to server
     */
    const submitCurrentBatch = async (
        isTimeout = false,
        currentSkillId: number | string | null = null
    ): Promise<SubmitBatchResult> => {
        if (isSubmittingBatch.value || !attemptId.value) {
            return { success: false };
        }

        isSubmittingBatch.value = true;
        try {
            const formData = createBatchFormData();
            const res = await api.post(`/attempts/${attemptId.value}/submit-batch`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (isTimeout) {
                try {
                    await api.post(`/attempts/${attemptId.value}/timeout`, { skill_id: currentSkillId });
                } catch (err) {
                    console.warn('Failed to mark timeout', err);
                }
                return { success: true, isTimeout: true, data: res.data };
            }

            if (res.data.finished_exam) {
                if (cheatAttempts.value.length > 0) {
                    try {
                        await api.post(`/attempts/${attemptId.value}/cheat-report`, {
                            total_warnings: cheatWarnings.value,
                            attempts: cheatAttempts.value
                        });
                    } catch (err) {
                        console.warn('Failed to send cheat report', err);
                    }
                }
                return { success: true, finished_exam: true, data: res.data };
            } else if (res.data.next_step === 'dashboard') {
                return { success: true, next_step: 'dashboard', data: res.data };
            } else {
                return {
                    success: true,
                    retry_attempt: !!res.data.retry_attempt,
                    data: res.data
                };
            }
        } catch (err: any) {
            console.error('Submission failed', err);
            if (!isTimeout) {
                await showAlert('Data transmission error. Try again.');
            }
            return {
                success: false,
                isTimeout,
                error: err.response?.data?.error || 'Submission failed'
            };
        } finally {
            isSubmittingBatch.value = false;
        }
    };

    return {
        isSubmittingBatch,
        isUploadingAnswer,
        showConfirmAnswerModal,
        submitAnswer,
        saveCurrentAnswerDraft,
        submitCurrentBatch
    };
}
