import { adminAuth } from '@/lib/firebaseAdmin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { uid } = body as { uid?: string }

    if (!uid) {
      return Response.json({ error: 'Missing uid' }, { status: 400 })
    }

    await adminAuth.deleteUser(uid)
    return Response.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete user'
    return Response.json({ error: message }, { status: 500 })
  }
}
