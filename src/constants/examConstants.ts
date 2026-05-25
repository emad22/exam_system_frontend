// Question Types Constants
export const QUESTION_TYPES_WITHOUT_OPTIONS = [
    'speaking',
    'fill_blank',
    'drag_drop',
    'word_selection',
    'click_word',
    'highlight',
    'matching',
    'ordering',
    'writing',
    'short_answer'
];

export const STIMULUS_QUESTION_TYPES = ['writing', 'short_answer'];

export const QUESTION_TYPES_WITH_AUDIO = [
    'speaking',
    'fill_blank',
    'drag_drop',
    'word_selection',
    'click_word',
    'highlight',
    'matching',
    'ordering',
    'writing',
    'short_answer'
];

// Timer Constants
export const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
export const TIMER_WARNING_THRESHOLD = 300; // 5 minutes in seconds

// Attempt States
export const ATTEMPT_STATUS = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    VOIDED: 'voided',
    TIMEOUT: 'timeout',
    ABANDONED: 'abandoned'
};

// Role Constants
export const DEMO_ROLES = ['demo', 'staff'];

// Debounce Delays
export const DEBOUNCE_ANSWER_SAVE = 500;
export const DEBOUNCE_ACTIVITY = 500;
export const DEBOUNCE_PROGRESS_UPDATE = 300;

// UI Constants
export const INACTIVITY_MODAL_TIMEOUT = 5000; // 5 seconds before auto-logout

// Content Validation
export const MIN_STIMULUS_TEXT_LENGTH = 150;
export const MIN_SHORT_ANSWER_LENGTH = 1;
