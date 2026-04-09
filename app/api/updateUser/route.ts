import { adminAuth } from '@/lib/firebaseAdmin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { uid, disabled } = body as { uid?: string; disabled?: boolean }

    if (!uid || typeof disabled !== 'boolean') {
      return Response.json({ error: 'Missing uid or disabled' }, { status: 400 })
    }

    await adminAuth.updateUser(uid, { disabled })
    return Response.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update user'
    return Response.json({ error: message }, { status: 500 })
  }
}
