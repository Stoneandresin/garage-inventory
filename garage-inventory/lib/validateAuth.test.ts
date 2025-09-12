import assert from 'node:assert';
import { validateAuth } from './validateAuth';
import { NextResponse } from 'next/server';

// Set the environment token for tests.
process.env.INGEST_TOKEN = 'secret';

// Helper to get status from NextResponse.
function getStatus(res: NextResponse | undefined) {
  return res?.status;
}

// Missing Authorization header
assert.strictEqual(getStatus(validateAuth(new Headers())), 401);

// Wrong Authorization header
assert.strictEqual(getStatus(validateAuth(new Headers({ authorization: 'Bearer wrong' }))), 401);

// Correct Authorization header
assert.strictEqual(getStatus(validateAuth(new Headers({ authorization: 'Bearer secret' }))), undefined);

console.log('validateAuth tests passed');
