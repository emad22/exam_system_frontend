/**
 * Feature flags — toggle temporarily without removing code.
 * Set VITE_PROCTORING_ENABLED=true in .env to re-enable proctoring.
 */
export const PROCTORING_ENABLED = import.meta.env.VITE_PROCTORING_ENABLED === 'true';
