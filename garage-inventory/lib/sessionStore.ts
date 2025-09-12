import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

interface Session {
  token?: string;
  emitter: EventEmitter;
}

const sessions = new Map<string, Session>();

export function createSession() {
  const id = randomUUID();
  // Generate a token only if INGEST_TOKEN env var is set
  const token = process.env.INGEST_TOKEN ? randomUUID() : undefined;
  sessions.set(id, { token, emitter: new EventEmitter() });
  return { id, token };
}

export function getSession(id: string) {
  return sessions.get(id);
}

export function deleteSession(id: string) {
  const session = sessions.get(id);
  if (session) {
    session.emitter.emit('close');
    sessions.delete(id);
  }
}

export function validateSession(id: string, token?: string) {
  const session = sessions.get(id);
  if (!session) return false;
  if (session.token && session.token !== token) return false;
  return true;
}

export function pushUpdate(id: string, data: any) {
  const session = sessions.get(id);
  if (session) {
    session.emitter.emit('update', data);
  }
}
