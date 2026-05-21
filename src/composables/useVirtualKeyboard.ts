import { ref } from 'vue';

// Global shared state - all components share the same keyboard instance
const keyboardLayout = ref('arabic');
const showVirtualKeyboard = ref(false);
const onKeyPressCallback = ref(null);

export function useVirtualKeyboard() {
    const toggleKeyboardLayout = () => {
        keyboardLayout.value = keyboardLayout.value === 'arabic' ? 'english' : 'arabic';
    };

    const registerKeyPressListener = (callback) => {
        onKeyPressCallback.value = callback;
    };

    const unregisterKeyPressListener = () => {
        onKeyPressCallback.value = null;
    };

    const triggerKeyPress = (button) => {
        if (onKeyPressCallback.value) {
            onKeyPressCallback.value(button);
        }
    };

    return {
        keyboardLayout,
        showVirtualKeyboard,
        toggleKeyboardLayout,
        onKeyPressCallback,
        registerKeyPressListener,
        unregisterKeyPressListener,
        triggerKeyPress
    };
}

