
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../backend/src/routers/index';

// We import AppRouter type from backend. 
// Since backend is local, we can just relative import the TYPE.
// But backend might not be built/referenced correctly if it's outside tsconfig.
// Ideally, we share a type package. For now, let's assume loose types or allow relative if TS supports it.
// If relative import fails due to TS, we might cast to any for MVP or fix tsconfig.

export const trpc = createTRPCReact<AppRouter>();
