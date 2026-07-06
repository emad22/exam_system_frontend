/**
 * Feature flags — toggle temporarily without removing code.
 * Set VITE_PROCTORING_ENABLED=false in .env to disable proctoring.
 */
export const PROCTORING_ENABLED = import.meta.env.VITE_PROCTORING_ENABLED !== 'false';
