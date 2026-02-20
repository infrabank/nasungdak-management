import { put, del } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { logger, errorToContext } from '@/lib/logger'

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-key-change-in-production'
)

// Verify user is authenticated
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SESSION_SECRET)
    return (payload as { userId?: string }).userId || null
  } catch {
    return null
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Check authentication
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/svg+xml',
      'image/webp',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            '지원하지 않는 파일 형식입니다. PNG, JPG, GIF, SVG, WebP만 가능합니다.',
        },
        { status: 400 }
      )
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '파일 크기는 2MB 이하여야 합니다' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png'
    const filename = `logos/${userId}-${Date.now()}.${ext}`

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    logger.error('Upload error', errorToContext(error))
    return NextResponse.json(
      { error: '업로드 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    // Check authentication
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL이 없습니다' }, { status: 400 })
    }

    // Delete from Vercel Blob
    await del(url)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Delete error', errorToContext(error))
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
