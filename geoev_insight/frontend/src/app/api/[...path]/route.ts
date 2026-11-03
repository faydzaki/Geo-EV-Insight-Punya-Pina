/**
 * Next.js Route Handler – Proxy ke backend Flask/Dash di port 8050.
 *
 * Menggantikan rewrites() di next.config.js agar kita bisa:
 * 1. Menghapus header WWW-Authenticate sebelum response dikirim ke browser
 *    (sehingga browser tidak menampilkan dialog Basic Auth bawaan)
 * 2. Meneruskan semua method (GET, POST, PUT, PATCH, DELETE) dan body
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND = 'http://localhost:8050'

// Header yang TIDAK diteruskan ke browser (mencegah dialog Basic Auth)
const STRIP_RESPONSE_HEADERS = new Set([
  'www-authenticate',
  'proxy-authenticate',
])

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  const pathSegments = params.path ?? []
  const targetPath = '/api/' + pathSegments.join('/')
  const search = request.nextUrl.search ?? ''
  const targetUrl = `${BACKEND}${targetPath}${search}`

  // Salin request headers, hapus headers yang tidak perlu diteruskan
  const reqHeaders = new Headers()
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    // Jangan teruskan host header asli (Next.js) ke backend
    if (lower === 'host') return
    reqHeaders.set(key, value)
  })

  // Baca body untuk method yang memiliki body
  let body: BodyInit | null = null
  const method = request.method.toUpperCase()
  if (!['GET', 'HEAD'].includes(method)) {
    body = await request.arrayBuffer()
  }

  let backendRes: Response
  try {
    backendRes = await fetch(targetUrl, {
      method,
      headers: reqHeaders,
      body: body ?? undefined,
      // Jangan ikuti redirect secara otomatis
      redirect: 'manual',
    })
  } catch {
    return NextResponse.json(
      { error: 'Backend tidak tersedia. Pastikan server Python sudah berjalan.' },
      { status: 503 }
    )
  }

  // Salin response headers, hapus header yang bisa memicu dialog browser
  const resHeaders = new Headers()
  backendRes.headers.forEach((value, key) => {
    if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) return
    resHeaders.set(key, value)
  })

  // Pastikan CORS header ada agar tidak ada masalah
  resHeaders.set('Access-Control-Allow-Origin', '*')

  const responseBody = await backendRes.arrayBuffer()

  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: resHeaders,
  })
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params)
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params)
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params)
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params)
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params)
}

export async function OPTIONS(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params)
}

