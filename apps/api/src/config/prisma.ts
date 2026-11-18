import { PrismaClient } from '@prisma/client';

// Global declaration for singleton instance across development reloads
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Log errors cleanly
if (process.env.NODE_ENV === 'development') {
  (prisma as any).$on('error', (e: any) => {
    console.error('[Prisma Error]:', e.message);
  });
}
