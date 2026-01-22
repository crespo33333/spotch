import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../backend/src/routers/index';

export const trpc = createTRPCReact<AppRouter>();
