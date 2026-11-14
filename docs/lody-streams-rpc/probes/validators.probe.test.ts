// Probe written for the lody-docs study. Lives only in the scratch copy.
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  deriveCodeCollabV2ContentKeyId,
  LoroStreamsTokenAuthError,
  MachinePingResponseSchema,
} from '@lody/shared';
import {
  createLoroStreamsJsonStreamClient,
  decryptCodeCollabV2RpcPayload,
  encryptCodeCollabV2RpcPayload,
  LoroStreamsGatewayError,
  LoroStreamsRpcRequestSchema,
  LoroStreamsRpcResponseSchema,
} from '../src/rpc';

const out: Record<string, unknown> = {};
const base = {
  jsonrpc: '2.0',
  id: '3f0e6c1e-5b7a-4c7e-9a3e-0d5f4d2b9a11',
  rpcVersion: '1',
  machineId: 'machine-1',
  workspaceId: 'workspace-1',
  replyTo: 'workspace-1:rpc:res:7b1d2c3e-0000-4000-8000-000000000001',
  sentAt: 1790000000000,
  expiresAt: 1790000030000,
};
const ping = { ...base, method: 'machine/ping', params: { requestId: 'ping-1' } };
const resBase = {
  jsonrpc: '2.0',
  id: base.id,
  method: 'machine/ping',
  rpcVersion: '1',
  machineId: 'machine-1',
};
const req = (v: unknown) => LoroStreamsRpcRequestSchema.safeParse(v).success;
const res = (v: unknown) => LoroStreamsRpcResponseSchema.safeParse(v).success;

describe('probe', () => {
  it('validates envelopes', async () => {
    out.requests = {
      'REQ-V1 ping': req(ping),
      'REQ-V2 fractional timestamps': req({ ...ping, sentAt: 1234.56, expiresAt: 2234.56 }),
      'REQ-V3 status empty params': req({ ...base, method: 'machine/status', params: {} }),
      'REQ-V4 status includeDisk true': req({
        ...base,
        method: 'machine/status',
        params: { includeDisk: true },
      }),
      'REQ-V5 legacy replyTo': req({ ...ping, replyTo: 'workspace-1:rpc:res:machine-1:abc' }),
      'REQ-V6 arbitrary replyTo': req({ ...ping, replyTo: 'anything at all' }),
      'REQ-V7 rpcVersion 2 (schema only)': req({ ...ping, rpcVersion: '2' }),
      'REQ-V8 expired (schema only)': req({ ...ping, sentAt: 1, expiresAt: 2 }),
      'REQ-V9 sentAt 0': req({ ...ping, sentAt: 0 }),
      'REQ-V10 expiresAt before sentAt': req({ ...ping, sentAt: 10, expiresAt: 5 }),
      'REQ-I1 unknown top-level key': req({ ...ping, traceId: 'abc' }),
      'REQ-I2 unknown method': req({ ...base, method: 'machine/reboot', params: {} }),
      'REQ-I3 expiresAt 0': req({ ...ping, expiresAt: 0 }),
      'REQ-I4 includeDisk false': req({
        ...base,
        method: 'machine/status',
        params: { includeDisk: false },
      }),
      'REQ-I5 unknown params key': req({ ...ping, params: { requestId: 'p', extra: 1 } }),
      'REQ-I6 params null': req({ ...ping, params: null }),
      'REQ-I7 missing params': req({ ...base, method: 'machine/ping' }),
      'REQ-I8 ISO expiresAt': req({ ...ping, expiresAt: '2026-01-01T00:00:00Z' }),
      'REQ-I9 plaintext params on file/preview': req({
        ...base,
        method: 'file/preview',
        params: { v: 3, sessionId: 's', path: 'a.txt' },
      }),
      'REQ-I10 whitespace id': req({ ...ping, id: '   ' }),
      'REQ-I11 jsonrpc 1.0': req({ ...ping, jsonrpc: '1.0' }),
      'REQ-I12 replyTo null': req({ ...ping, replyTo: null }),
      'REQ-I13 numeric rpcVersion': req({ ...ping, rpcVersion: 1 }),
      'REQ-I14 batch array': req([ping]),
    };
    const trimmed = LoroStreamsRpcRequestSchema.safeParse({ ...ping, id: '  padded  ' });
    out.trim = trimmed.success ? { id: trimmed.data.id } : 'rejected';
    const parsed = LoroStreamsRpcRequestSchema.parse({
      params: { requestId: 'ping-1' },
      expiresAt: base.expiresAt,
      sentAt: base.sentAt,
      replyTo: base.replyTo,
      workspaceId: base.workspaceId,
      machineId: base.machineId,
      rpcVersion: '1',
      method: 'machine/ping',
      id: base.id,
      jsonrpc: '2.0',
    });
    out.parsedKeyOrder = Object.keys(parsed);

    const pingResult = {
      type: 'machine/ping_response',
      machineId: 'machine-1',
      requestId: 'ping-1',
      success: true,
      message: 'pong',
    };
    out.responses = {
      'RES-V1 ping result': res({ ...resBase, result: pingResult }),
      'RES-V1 result matches MachinePingResponseSchema':
        MachinePingResponseSchema.safeParse(pingResult).success,
      'RES-V2 busy error': res({
        ...resBase,
        method: 'machine/status',
        error: {
          code: 'rpc_request_capacity_exceeded',
          message: 'The machine request queue is full.',
        },
      }),
      'RES-V3 result null (envelope only)': res({ ...resBase, result: null }),
      'RES-V4 error with data': res({
        ...resBase,
        error: { code: 'x', message: 'y', data: { a: 1 } },
      }),
      'RES-I1 both result and error': res({
        ...resBase,
        result: {},
        error: { code: 'internal_error', message: 'x' },
      }),
      'RES-I2 neither': res(resBase),
      'RES-I3 whitespace message': res({ ...resBase, error: { code: 'x', message: '   ' } }),
      'RES-I4 error null': res({ ...resBase, error: null, result: {} }),
      'RES-I5 unknown method': res({ ...resBase, method: 'machine/reboot', result: {} }),
      'RES-I6 extra key': res({ ...resBase, result: {}, workspaceId: 'w' }),
      'RES-I7 numeric error code': res({ ...resBase, error: { code: -32601, message: 'x' } }),
      'RES-I8 error extra key': res({
        ...resBase,
        error: { code: 'x', message: 'y', retryable: true },
      }),
    };

    // Owner-scoped content envelope round trip with the real implementation.
    const keyId = deriveCodeCollabV2ContentKeyId('session-1');
    const envelope = (await encryptCodeCollabV2RpcPayload('session-1', {
      v: 3,
      sessionId: 'session-1',
      path: 'a.txt',
    })) as Record<string, string>;
    const plain = await decryptCodeCollabV2RpcPayload(envelope, 'session-1');
    let wrongOwner = 'no error';
    try {
      await decryptCodeCollabV2RpcPayload(envelope, 'session-2');
    } catch (error) {
      wrongOwner = (error as Error).message;
    }
    out.ownerEnvelope = {
      derivedKeyIdForSession1: keyId,
      envelopeKeys: Object.keys(envelope),
      type: envelope.type,
      keyVersion: envelope.keyVersion,
      algorithm: envelope.algorithm,
      keyIdMatches: envelope.keyId === keyId,
      ivChars: envelope.iv.length,
      ciphertextIsBase64Url: /^[A-Za-z0-9_-]+$/.test(envelope.ciphertext),
      roundTrip: plain,
      wrongOwner,
      requestSchemaAccepts: req({ ...base, method: 'file/preview', params: envelope }),
    };
  });

  it('observes auth behaviour of the real stream client over a stub fetch', async () => {
    // (a) getToken throws LoroStreamsTokenAuthError: what class reaches the caller?
    const calls: string[] = [];
    const throwing = createLoroStreamsJsonStreamClient({
      bucketId: 'probe',
      baseUrl: 'http://stub.invalid',
      getToken: async () => {
        throw new LoroStreamsTokenAuthError('rejected', 401);
      },
      fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push(`${init?.method ?? 'GET'} ${String(input)}`);
        return new Response('', { status: 500 });
      }) as typeof fetch,
    });
    let readError: unknown;
    try {
      await throwing.readJsonLive('s', { nextOffset: '-1' }, async () => undefined, {
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      readError = error;
    }
    let appendError: unknown;
    try {
      await throwing.appendJson('s', { a: 1 });
    } catch (error) {
      appendError = error;
    }
    const describeError = (error: unknown) => ({
      thrown: error !== undefined,
      isTokenAuthError: error instanceof LoroStreamsTokenAuthError,
      isGatewayError: error instanceof LoroStreamsGatewayError,
      name: (error as Error | undefined)?.name,
      message: (error as Error | undefined)?.message?.slice(0, 300),
    });
    out.authThrow = {
      read: describeError(readError),
      append: describeError(appendError),
      fetchCalls: calls,
    };

    // (b) gateway answers 401 once on append: is getToken called again, with context?
    const tokenCalls: unknown[][] = [];
    const posts: Array<string | null> = [];
    let first = true;
    const client = createLoroStreamsJsonStreamClient({
      bucketId: 'probe',
      baseUrl: 'http://stub.invalid',
      getToken: (async (...args: unknown[]) => {
        tokenCalls.push(args);
        return `token-${tokenCalls.length}`;
      }) as () => Promise<string>,
      fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) => {
        posts.push(new Headers(init?.headers).get('authorization'));
        if (first) {
          first = false;
          return new Response('unauthorized', { status: 401 });
        }
        return new Response(null, { status: 204, headers: { 'Stream-Next-Offset': '1' } });
      }) as typeof fetch,
    });
    let retryError: unknown;
    try {
      await client.appendJson('s', { a: 1 });
    } catch (error) {
      retryError = error;
    }
    out.auth401 = {
      error: describeError(retryError),
      getTokenArgCounts: tokenCalls.map((args) => args.length),
      authorizationHeaders: posts,
    };

    // (c) append request shape.
    const seen: Array<Record<string, unknown>> = [];
    const shape = createLoroStreamsJsonStreamClient({
      bucketId: 'bucket-1',
      baseUrl: 'http://stub.invalid/',
      getToken: async () => 'tok',
      fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
        seen.push({
          method: init?.method,
          url: String(input),
          headers: Object.fromEntries(new Headers(init?.headers).entries()),
          body: typeof init?.body === 'string' ? init.body : `<${typeof init?.body}>`,
        });
        return new Response(null, { status: 204, headers: { 'Stream-Next-Offset': '1' } });
      }) as typeof fetch,
    });
    await shape.appendJson('workspace-1:rpc:req:machine-1', { hello: 'wörld' });
    out.appendShape = seen;

    writeFileSync(process.env.PROBE_OUT ?? '/dev/stdout', JSON.stringify(out, null, 2));
    expect(true).toBe(true);
  }, 30_000);
});
