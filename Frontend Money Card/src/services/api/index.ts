import { mockClient } from '../mock/mockClient';
import { realClient } from './realClient';

// ─── Swappable API Architecture (M0 & M2 Spec) ──────────────
// Feature components import `apiService`.
// By default in M2/M3, calls execute against `mockClient`.
// When Developer 2's backend is ready, setting VITE_USE_MOCK_API=false
// routes calls to `realClient` without altering feature components.

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export const apiService = USE_MOCK_API ? mockClient : realClient;

export { apiClient } from './client';
export type { ApiError } from './client';
export { mockClient } from '../mock/mockClient';
export { realClient } from './realClient';
