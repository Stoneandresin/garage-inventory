import { NextRequest } from 'next/server';
import { getSession } from '@/lib/sessionStore';

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = getSession(params.sessionId);
  if (!session) {
    return new Response('session_not_found', { status: 404 });
  }

  let onUpdate: ((data: any) => void) | undefined;
  let onClose: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      onUpdate = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      onClose = () => controller.close();
      session.emitter.on('update', onUpdate);
      session.emitter.on('close', onClose);
    },
    cancel() {
      if (onUpdate) session.emitter.off('update', onUpdate);
      if (onClose) session.emitter.off('close', onClose);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
