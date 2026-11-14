"""Assemble the live probe test from Lody's own integration-test harness.

Run from ``packages/loro-streams-rpc`` inside a scratch copy of the Lody
checkout. The script reuses the lines of
``tests/loro-streams-rpc.integration.test.ts`` that start the local ``loro dev``
server, switches that server to HTTP/1, and appends the probe cases. It writes
``tests/zz-live.test.ts``; it never touches the original checkout.
"""

from pathlib import Path

HARNESS = Path("tests/loro-streams-rpc.integration.test.ts")
src = HARNESS.read_text(encoding="utf-8").split("\n")
head = "\n".join(src[:179])
head = head.replace(
    "import type { AgentConfigId, MachineId, WorkspaceId } from '@lody/shared';",
    "import type { MachineId, WorkspaceId } from '@lody/shared';\nimport { writeFileSync } from 'node:fs';",
)
head = head.replace("const configId = 'config-1' as AgentConfigId;\n", "")
head = head.replace(
    "const runIntegrationTests = process.env.LODY_LORO_STREAMS_RPC_INTEGRATION === '1';\n",
    "",
)
body = r"""
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const out: Record<string, unknown> = {};

describe('live probes against a local loro dev server', () => {
  let localServer: LocalLoroDevServer | null = null;
  beforeAll(async () => {
    localServer = await startLocalLoroDevServer();
  }, 60_000);
  afterAll(async () => {
    writeFileSync(process.env.PROBE_OUT ?? '/dev/stdout', JSON.stringify(out, null, 2));
    await localServer?.stop();
  }, 30_000);

  it('P-5..P-9 server behaviour through real Streams', async () => {
    const workspaceId = `workspace-${randomUUID()}` as WorkspaceId;
    const machineId = `machine-${randomUUID()}` as MachineId;
    const bucketId = `rpc-${randomUUID()}`;
    const baseUrl = localServer!.baseUrl;
    out['P-5 bucket create'] = (
      await fetch(`${baseUrl}/ds/${bucketId}`, { method: 'PUT', headers: { Authorization: 'Bearer dev-token' } })
    ).status;
    const createStreamClient = () =>
      createLoroStreamsJsonStreamClient({ bucketId, baseUrl, getToken: async () => 'dev-token' });
    const warnings: string[] = [];
    const pings: string[] = [];
    const makeServer = () =>
      new LoroStreamsMachineRpcServer({
        logger: { warn: (message: string) => warnings.push(message) },
        workspaceId,
        machineId,
        streamClient: createStreamClient(),
        pingMachine: async ({ requestId }: { requestId: string }) => {
          pings.push(requestId);
          return {
            type: 'machine/ping_response',
            machineId,
            requestId,
            success: true,
            message: 'pong',
          } as never;
        },
      } as never);

    const server = makeServer();
    await server.start();

    // P-5: real client round trip.
    const client = new LoroStreamsMachineRpcClient({
      workspaceId,
      machineId,
      streamClient: createStreamClient(),
    });
    const pong = await client.requestMachinePing({ requestId: 'p5', timeoutMs: 10_000 });
    out['P-5 round trip'] = pong;
    client.stop();

    // Raw caller: its own response stream and reader.
    const raw = createStreamClient();
    const replyTo = `${workspaceId}:rpc:res:${randomUUID()}`;
    const requestStream = `${workspaceId}:rpc:req:${machineId}`;
    await raw.ensureJsonStream(replyTo, 3600);
    const responses: Array<Record<string, unknown>> = [];
    const readerAbort = new AbortController();
    const state = { nextOffset: '-1' };
    void raw
      .readJsonLive(
        replyTo,
        state,
        async (batch: { messages: unknown[] }) => {
          for (const message of batch.messages) responses.push(message as Record<string, unknown>);
        },
        { signal: readerAbort.signal }
      )
      .catch(() => undefined);
    const now = Date.now();
    const envelope = (id: string, extra: Record<string, unknown> = {}) => ({
      jsonrpc: '2.0',
      id,
      method: 'machine/ping',
      rpcVersion: '1',
      machineId,
      workspaceId,
      replyTo,
      sentAt: now,
      expiresAt: now + 60_000,
      params: { requestId: id },
      ...extra,
    });

    await raw.appendJson(requestStream, envelope('ok-1'));
    await raw.appendJson(requestStream, envelope('unknown-method', { method: 'machine/reboot', params: {} }));
    await raw.appendJson(requestStream, envelope('extra-key', { traceId: 'x' }));
    await raw.appendJson(requestStream, envelope('wrong-machine', { machineId: 'someone-else' }));
    await raw.appendJson(requestStream, envelope('expired', { sentAt: 1, expiresAt: 2 }));
    await raw.appendJson(requestStream, envelope('bad-version', { rpcVersion: '0' }));
    await raw.appendJson(requestStream, envelope('status-no-handler', { method: 'machine/status', params: {} }));
    // An array body is flattened by the gateway into two messages.
    await raw.appendJson(requestStream, [envelope('batch-a'), envelope('batch-b')]);
    await sleep(4000);

    const byId = (id: string) => responses.filter((r) => r.id === id);
    const brief = (id: string) =>
      byId(id).map((r) => ({
        keys: Object.keys(r),
        result: r.result,
        error: r.error,
      }));
    out['P-6 valid raw request'] = brief('ok-1');
    out['P-6 unknown method'] = brief('unknown-method');
    out['P-6 extra key'] = brief('extra-key');
    out['P-6 wrong machine'] = brief('wrong-machine');
    out['P-6 expired'] = brief('expired');
    out['P-7 version mismatch'] = brief('bad-version');
    out['P-7 handler absent'] = brief('status-no-handler');
    out['P-8 array body flattened'] = { a: byId('batch-a').length, b: byId('batch-b').length };
    out['P-6 warnings'] = warnings.map((w) => w.replace(/raw=.*/s, 'raw=…').slice(0, 160));
    const pingsBeforeRestart = [...pings];
    out['P-9 handler calls before restart'] = pingsBeforeRestart;

    // P-9: stop the server and start a new instance: the retained stream is replayed.
    server.stop();
    await sleep(500);
    const second = makeServer();
    await second.start();
    await sleep(4000);
    out['P-9 handler calls after restart'] = pings.slice(pingsBeforeRestart.length);
    out['P-9 responses per id after restart'] = Object.fromEntries(
      ['p5', 'ok-1', 'batch-a', 'batch-b', 'bad-version', 'expired', 'unknown-method'].map((id) => [
        id,
        byId(id).length,
      ])
    );
    second.stop();
    readerAbort.abort();
    expect(true).toBe(true);
  }, 60_000);

  it('P-10 development server transport observations', async () => {
    const baseUrl = localServer!.baseUrl;
    const bucket = `rpc-${randomUUID()}`;
    const url = (stream: string, query = '') =>
      `${baseUrl}/ds/${bucket}/${encodeURIComponent(stream)}${query}`;
    const headers = { Authorization: 'Bearer dev-token', 'Content-Type': 'application/json' };
    const show = async (response: Response) => ({
      status: response.status,
      nextOffset: response.headers.get('stream-next-offset'),
      ttl: response.headers.get('stream-ttl'),
      upToDate: response.headers.get('stream-up-to-date'),
      contentType: response.headers.get('content-type'),
      body: (await response.text()).slice(0, 200),
    });
    out['P-10 stream op before bucket exists'] = await show(
      await fetch(url('x'), { method: 'PUT', headers })
    );
    out['P-10 bucket create'] = await show(
      await fetch(`${baseUrl}/ds/${bucket}`, { method: 'PUT', headers: { Authorization: 'Bearer dev-token' } })
    );
    const s = 'w:rpc:req:m';
    out['P-10 create'] = await show(
      await fetch(url(s), { method: 'PUT', headers: { ...headers, 'Stream-TTL': '4' } })
    );
    out['P-10 create again same ttl'] = await show(
      await fetch(url(s), { method: 'PUT', headers: { ...headers, 'Stream-TTL': '4' } })
    );
    out['P-10 create again other ttl'] = await show(
      await fetch(url(s), { method: 'PUT', headers: { ...headers, 'Stream-TTL': '99' } })
    );
    out['P-10 append object'] = await show(
      await fetch(url(s), { method: 'POST', headers, body: JSON.stringify({ n: 1 }) })
    );
    out['P-10 append empty array'] = await show(
      await fetch(url(s), { method: 'POST', headers, body: '[]' })
    );
    out['P-10 append wrong content type'] = await show(
      await fetch(url(s), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'text/plain' },
        body: 'x',
      })
    );
    out['P-10 read offset -1'] = await show(await fetch(url(s, '?offset=-1'), { headers }));
    out['P-10 read offset 0'] = await show(await fetch(url(s, '?offset=0'), { headers }));
    await sleep(2500);
    out['P-10 append at 2.5s'] = await show(
      await fetch(url(s), { method: 'POST', headers, body: JSON.stringify({ n: 2 }) })
    );
    out['P-10 head at 2.5s'] = await show(await fetch(url(s), { method: 'HEAD', headers }));
    await sleep(2500);
    out['P-10 head at 5s (ttl 4s from creation)'] = await show(
      await fetch(url(s), { method: 'HEAD', headers })
    );
    out['P-10 append to missing stream'] = await show(
      await fetch(url('never-created'), { method: 'POST', headers, body: '{}' })
    );
    out['P-10 read missing stream'] = await show(
      await fetch(url('never-created', '?offset=-1'), { headers })
    );
    expect(true).toBe(true);
  }, 60_000);
});
"""
head = head.replace("'--json']", "'--json', '--protocol', 'http1']")
Path("tests/zz-live.test.ts").write_text(head + body, encoding="utf-8")
