import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware minimal — hanya melindungi halaman dashboard agar redirect ke
 * /login jika tidak ada token JWT di cookie atau localStorage.
 *
 * Catatan: localStorage tidak bisa dibaca di middleware (server-side).
 * Proteksi sesungguhnya ada di src/app/(dashboard)/layout.tsx (client-side).
 * Middleware ini hanya menangani kasus redirect dari root ("/") ke "/peta".
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect root ke halaman peta
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/peta', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
