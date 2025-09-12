import { NextResponse } from 'next/server';

/**
 * Validates the Authorization header against the INGEST_TOKEN environment variable.
 * If INGEST_TOKEN is unset, all requests are permitted.
 * @param headers Request headers to validate.
 * @returns NextResponse if unauthorized, otherwise undefined.
 */
export function validateAuth(headers: Headers) {
  const expectedToken = process.env.INGEST_TOKEN;
  if (expectedToken) {
    const authHeader = headers.get('authorization') || '';
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  return undefined;
}
