import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In cross-domain production deployment (Vercel frontend + Render backend),
// auth cookies are set on the backend domain and are NOT visible to
// Next.js server-side middleware on the frontend domain.
// All auth protection is handled client-side by the ProtectedRoute component.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
