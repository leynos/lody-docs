# Evidence index

Every citation of the form `E-O…` in this document set resolves to a row below.
Lody sources are linked at commit
[`61bd9701a`](https://github.com/LodyAI/Lody/tree/61bd9701a5ed6899a9f42787df682acfc3fd7d4b);
line numbers refer to that commit.

The **Basis** column says how each row was established:

- **Checked**: reported by a research pass, then verified mechanically: the
  cited lines of the pinned source contain the text in the **Decisive text**
  column.
- **Reported**: reported by a research pass and not checked mechanically, beyond
  confirming that the cited range exists.

## `apps/cli`

| Id | Location | Decisive text | Basis |
| -- | -------- | ------------- | ----- |
| <a id="e-o1"></a>E-O1 | `apps/cli/src/agent/acp-runner.ts` [889–891](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/agent/acp-runner.ts#L889-L891) | `ndJsonStream` | Checked |
| <a id="e-o2"></a>E-O2 | `apps/cli/src/agent/agent-client.ts` [764–771](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/agent/agent-client.ts#L764-L771) | `lody-mcp-server` | Checked |
| <a id="e-o3"></a>E-O3 | `apps/cli/src/commands/daemon-runner.ts` [98–151](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/commands/daemon-runner.ts#L98-L151) | `'start'` | Checked |
| <a id="e-o4"></a>E-O4 | `apps/cli/src/commands/daemon-runner.ts` [272–282](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/commands/daemon-runner.ts#L272-L282) | `daemon watchdog process` | Checked |
| <a id="e-o5"></a>E-O5 | `apps/cli/src/commands/daemon-runner.ts` [920–1049](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/commands/daemon-runner.ts#L920-L1049) | `Remote restart requested` | Checked |
| <a id="e-o6"></a>E-O6 | `apps/cli/src/commands/daemon-shared.ts` [357–376](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/commands/daemon-shared.ts#L357-L376) | `daemon-runner` | Checked |
| <a id="e-o7"></a>E-O7 | `apps/cli/src/index.ts` [38–45](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/index.ts#L38-L45) | `__internal` | Checked |
| <a id="e-o8"></a>E-O8 | `apps/cli/src/lib/AGENTS.md` [29–31](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/AGENTS.md#L29-L31) | `never borrows an account API key` | Checked |
| <a id="e-o9"></a>E-O9 | `apps/cli/src/lib/cli-platform.ts` [35–46](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cli-platform.ts#L35-L46) | `LODY_AUTH_URL` | Checked |
| <a id="e-o10"></a>E-O10 | `apps/cli/src/lib/cli-platform.ts` [48–92](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cli-platform.ts#L48-L92) | `local-identity.json`; `LOCAL_USER_ID_PREFIX` | Checked |
| <a id="e-o11"></a>E-O11 | `apps/cli/src/lib/cli-platform.ts` [110–151](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cli-platform.ts#L110-L151) | `LOCAL_WORKSPACE_ID_PREFIX` | Checked |
| <a id="e-o12"></a>E-O12 | `apps/cli/src/lib/cli-runtime-state.ts` [34–55](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cli-runtime-state.ts#L34-L55) | `startupStage` | Checked |
| <a id="e-o13"></a>E-O13 | `apps/cli/src/lib/cloud-cli-port.ts` [129–159](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-cli-port.ts#L129-L159) | `requestFromCli` | Checked |
| <a id="e-o14"></a>E-O14 | `apps/cli/src/lib/cloud-cli-port.ts` [406–429](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-cli-port.ts#L406-L429) | `/ds/` | Checked |
| <a id="e-o15"></a>E-O15 | `apps/cli/src/lib/cloud-cli-port.ts` [609–641](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-cli-port.ts#L609-L641) | `ConvexClient` | Checked |
| <a id="e-o16"></a>E-O16 | `apps/cli/src/lib/cloud-cli-port.ts` [649–695](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-cli-port.ts#L649-L695) | `/api/session-history/verify` | Checked |
| <a id="e-o17"></a>E-O17 | `apps/cli/src/lib/cloud-cli-port.ts` [696–711](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-cli-port.ts#L696-L711) | `listMyWorkspacesForCliToken`; `userId` | Checked |
| <a id="e-o18"></a>E-O18 | `apps/cli/src/lib/cloud-cli-port.ts` [739–760](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-cli-port.ts#L739-L760) | `notifications` | Checked |
| <a id="e-o19"></a>E-O19 | `apps/cli/src/lib/cloud-cli-port.ts` [739–773](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-cli-port.ts#L739-L773) | `usage` | Checked |
| <a id="e-o20"></a>E-O20 | `apps/cli/src/lib/cloud-cli-port.ts` [761–769](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-cli-port.ts#L761-L769) | `usage` | Checked |
| <a id="e-o21"></a>E-O21 | `apps/cli/src/lib/cloud-cli-port.ts` [771–773](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-cli-port.ts#L771-L773) | `githubTokens` | Checked |
| <a id="e-o22"></a>E-O22 | `apps/cli/src/lib/cloud-cli-port.ts` [795](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-cli-port.ts#L795) | `attachmentUpload` | Checked |
| <a id="e-o23"></a>E-O23 | `apps/cli/src/lib/cloud-cli-port.ts` [796–850](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-cli-port.ts#L796-L850) | `/api/session-automation/verify` | Checked |
| <a id="e-o24"></a>E-O24 | `apps/cli/src/lib/local-control-handler.ts` [420–457](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/local-control-handler.ts#L420-L457) | `LOCAL_MACHINE_RPC_PATH` | Checked |
| <a id="e-o25"></a>E-O25 | `apps/cli/src/lib/local-ipc-socket-server.ts` [184–219](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/local-ipc-socket-server.ts#L184-L219) | `createLocalProbeRequestHandler` | Checked |
| <a id="e-o26"></a>E-O26 | `apps/cli/src/lib/local-ipc-socket-server.ts` [257–266](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/local-ipc-socket-server.ts#L257-L266) | `token` | Checked |
| <a id="e-o27"></a>E-O27 | `apps/cli/src/lib/local-loro-data-plane-server.ts` [63–110](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/local-loro-data-plane-server.ts#L63-L110) | `authenticate` | Checked |
| <a id="e-o28"></a>E-O28 | `apps/cli/src/lib/local-session-control.ts` [73–122](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/local-session-control.ts#L73-L122) | `LOCAL_CONTROL_HEADER` | Checked |
| <a id="e-o29"></a>E-O29 | `apps/cli/src/lib/local-supervisor-control.ts` [35–47](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/local-supervisor-control.ts#L35-L47) | `LODY_DAEMON_SUPERVISED` | Checked |
| <a id="e-o30"></a>E-O30 | `apps/cli/src/lib/local-terminal-server.ts` [252–264](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/local-terminal-server.ts#L252-L264) | — | Reported |
| <a id="e-o31"></a>E-O31 | `apps/cli/src/lib/lody-fleet.ts` [296–348](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/lody-fleet.ts#L296-L348) | `RemoteBridge`; `does not match Fleet identity` | Checked |
| <a id="e-o32"></a>E-O32 | `apps/cli/src/lib/lody-fleet.ts` [350–500](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/lody-fleet.ts#L350-L500) | `bootstrapFromLocalCatalog`; `Zero cloud I/O` | Checked |
| <a id="e-o33"></a>E-O33 | `apps/cli/src/lib/lody-fleet.ts` [523–559](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/lody-fleet.ts#L523-L559) | `snapshot.identity?.userId` | Checked |
| <a id="e-o34"></a>E-O34 | `apps/cli/src/lib/lody-fleet.ts` [562–564](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/lody-fleet.ts#L562-L564) | `bootstrap source` | Checked |
| <a id="e-o35"></a>E-O35 | `apps/cli/src/lib/lody-fleet.ts` [973–1043](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/lody-fleet.ts#L973-L1043) | `attachAllowedRuntimes` | Checked |
| <a id="e-o36"></a>E-O36 | `apps/cli/src/lib/lody-fleet.ts` [2013–2028](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/lody-fleet.ts#L2013-L2028) | `workspace_runtime_unavailable` | Checked |
| <a id="e-o37"></a>E-O37 | `apps/cli/src/lib/lody.ts` [217–234](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/lody.ts#L217-L234) | `execution.sqlite` | Checked |
| <a id="e-o38"></a>E-O38 | `apps/cli/src/lib/lody.ts` [307–322](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/lody.ts#L307-L322) | `shared-durable` | Checked |
| <a id="e-o39"></a>E-O39 | `apps/cli/src/lib/lody.ts` [725–750](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/lody.ts#L725-L750) | `startBuiltinAgentRegistration` | Checked |
| <a id="e-o40"></a>E-O40 | `apps/cli/src/lib/loro/doc.ts` [614–628](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/loro/doc.ts#L614-L628) | `LoroRepo.create` | Checked |
| <a id="e-o41"></a>E-O41 | `apps/cli/src/lib/loro/doc.ts` [1911–1938](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/loro/doc.ts#L1911-L1938) | `uuidv4` | Checked |
| <a id="e-o42"></a>E-O42 | `apps/cli/src/lib/loro/doc.ts` [2035–2044](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/loro/doc.ts#L2035-L2044) | `uuidv4` | Checked |
| <a id="e-o43"></a>E-O43 | `apps/cli/src/lib/loro/sqlite-repo-store.ts` [16–20](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/loro/sqlite-repo-store.ts#L16-L20) | `loro-repo` | Checked |
| <a id="e-o44"></a>E-O44 | `apps/cli/src/lib/machine-lifecycle.ts` [46–81](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/machine-lifecycle.ts#L46-L81) | `canRemoteRestart: false` | Checked |
| <a id="e-o45"></a>E-O45 | `apps/cli/src/lib/machine-lifecycle.ts` [126–168](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/machine-lifecycle.ts#L126-L168) | `/api/machine-lifecycle/verify` | Checked |
| <a id="e-o46"></a>E-O46 | `apps/cli/src/lib/machine-runtime.ts` [131–191](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/machine-runtime.ts#L131-L191) | `registerMachine` | Checked |
| <a id="e-o47"></a>E-O47 | `apps/cli/src/lib/machine-runtime.ts` [238–296](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/machine-runtime.ts#L238-L296) | `activateRemoteServices` | Checked |
| <a id="e-o48"></a>E-O48 | `apps/cli/src/lib/message-handler.ts` [3757–3762](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/message-handler.ts#L3757-L3762) | `session-history-rpc-rejections` | Checked |
| <a id="e-o49"></a>E-O49 | `apps/cli/src/lib/message-handler.ts` [6776–6830](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/message-handler.ts#L6776-L6830) | `cliVersion` | Checked |
| <a id="e-o50"></a>E-O50 | `apps/cli/src/lib/message-handler.ts` [11319–11322](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/message-handler.ts#L11319-L11322) | `sessionDispatchWatcher.start` | Checked |
| <a id="e-o51"></a>E-O51 | `apps/cli/src/lib/message-handler.ts` [11324–11397](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/message-handler.ts#L11324-L11397) | `startMachineRpcServer` | Checked |
| <a id="e-o52"></a>E-O52 | `apps/cli/src/lib/pr-poller/pr-poller-state.ts` [60–71](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/pr-poller/pr-poller-state.ts#L60-L71) | `pr-poller-state.sqlite3` | Checked |
| <a id="e-o53"></a>E-O53 | `apps/cli/src/lib/remote-bridge.ts` [117–133](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/remote-bridge.ts#L117-L133) | `attachRemoteBridge` | Checked |
| <a id="e-o54"></a>E-O54 | `apps/cli/src/lib/session-file-blob-store.ts` [20–33](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/session-file-blob-store.ts#L20-L33) | `session-files` | Checked |
| <a id="e-o55"></a>E-O55 | `apps/cli/src/lib/workspace.ts` [149–158](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/workspace.ts#L149-L158) | `getWorkspaceBillingEntitlementForCliToken` | Checked |
| <a id="e-o56"></a>E-O56 | `apps/cli/src/lib/workspace.ts` [206–218](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/workspace.ts#L206-L218) | `upsertMachineRegistrationFromCliToken` | Checked |
| <a id="e-o57"></a>E-O57 | `apps/cli/src/lib/workspace.ts` [206–261](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/workspace.ts#L206-L261) | `canUseMachineFromCliToken`; `machineId` | Checked |
| <a id="e-o58"></a>E-O58 | `apps/cli/src/lib/workspace.ts` [238–261](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/workspace.ts#L238-L261) | `canUseMachineFromCliToken` | Checked |
| <a id="e-o59"></a>E-O59 | `apps/cli/src/mcp/lody-mcp-http-server.ts` [169–185](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/mcp/lody-mcp-http-server.ts#L169-L185) | `lody-mcp-http-host` | Checked |
| <a id="e-o60"></a>E-O60 | `apps/cli/src/orchestration/operation-store.ts` [313–321](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/orchestration/operation-store.ts#L313-L321) | `operations.sqlite3` | Checked |
| <a id="e-o61"></a>E-O61 | `apps/cli/src/session/session-dispatch-watcher.ts` [511–541](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/session/session-dispatch-watcher.ts#L511-L541) | `doc-metadata` | Checked |
| <a id="e-o62"></a>E-O62 | `apps/cli/src/session/worktree/worktree-manager.ts` [337](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/session/worktree/worktree-manager.ts#L337) | `repos` | Checked |
| <a id="e-o63"></a>E-O63 | `apps/cli/src/utils/const.ts` [92–128](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/utils/const.ts#L92-L128) | `crypto.randomUUID`; `machineIdPath` | Checked |
| <a id="e-o64"></a>E-O64 | `apps/cli/src/utils/index.ts` [19–21](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/utils/index.ts#L19-L21) | `credentials.json` | Checked |

_Table 1: Evidence under `apps/cli`._

## `apps/electron`

| Id | Location | Decisive text | Basis |
| -- | -------- | ------------- | ----- |
| <a id="e-o65"></a>E-O65 | `apps/electron/src/main/services/cli-service.ts` [673–681](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/electron/src/main/services/cli-service.ts#L673-L681) | `CLI_ELECTRON_BOOTSTRAP_ENV` | Checked |

_Table 2: Evidence under `apps/electron`._

## `packages/cli-supervisor`

| Id | Location | Decisive text | Basis |
| -- | -------- | ------------- | ----- |
| <a id="e-o66"></a>E-O66 | `packages/cli-supervisor/src/supervisor.ts` [29–40](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cli-supervisor/src/supervisor.ts#L29-L40) | `60_000` | Checked |

_Table 3: Evidence under `packages/cli-supervisor`._

## `packages/platform`

| Id | Location | Decisive text | Basis |
| -- | -------- | ------------- | ----- |
| <a id="e-o67"></a>E-O67 | `packages/platform/src/cloud-port.ts` [111–153](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/platform/src/cloud-port.ts#L111-L153) | `streamsTokens` | Checked |
| <a id="e-o68"></a>E-O68 | `packages/platform/src/local.ts` [22–27](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/platform/src/local.ts#L22-L27) | `Convex-minted` | Checked |
| <a id="e-o69"></a>E-O69 | `packages/platform/src/local.ts` [93–126](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/platform/src/local.ts#L93-L126) | `kind: 'local'` | Checked |

_Table 4: Evidence under `packages/platform`._

## `packages/shared`

| Id | Location | Decisive text | Basis |
| -- | -------- | ------------- | ----- |
| <a id="e-o70"></a>E-O70 | `packages/shared/src/index.ts` [404–455](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/index.ts#L404-L455) | `getLoroStreamIdForDocId` | Checked |
| <a id="e-o71"></a>E-O71 | `packages/shared/src/loro-streams-auth.ts` [251–252](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/loro-streams-auth.ts#L251-L252) | `/api/loro-streams/token` | Checked |
| <a id="e-o72"></a>E-O72 | `packages/shared/src/machine-flock.ts` [44–47](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/machine-flock.ts#L44-L47) | `mf` | Checked |
| <a id="e-o73"></a>E-O73 | `packages/shared/src/node/installation-profile.ts` [16–34](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/node/installation-profile.ts#L16-L34) | `.lody-oss` | Checked |
| <a id="e-o74"></a>E-O74 | `packages/shared/src/node/installation-profile.ts` [47–54](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/node/installation-profile.ts#L47-L54) | `LODY_DATA_DIR` | Checked |
| <a id="e-o75"></a>E-O75 | `packages/shared/src/node/local-cli-host-lease.ts` [106–120](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/node/local-cli-host-lease.ts#L106-L120) | `localCliHostPort` | Checked |
| <a id="e-o76"></a>E-O76 | `packages/shared/src/node/local-cli-supervisor.ts` [1–13](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/node/local-cli-supervisor.ts#L1-L13) | `LOCAL_CLI_SUPERVISOR_CONTRACT_VERSION` | Checked |
| <a id="e-o77"></a>E-O77 | `packages/shared/src/node/local-cli-supervisor.ts` [15–24](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/node/local-cli-supervisor.ts#L15-L24) | `CLI_EXIT_CODE_REMOTE_UPGRADE` | Checked |
| <a id="e-o78"></a>E-O78 | `packages/shared/src/node/local-cli-supervisor.ts` [26–44](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/node/local-cli-supervisor.ts#L26-L44) | `lody/supervisor-shutdown` | Checked |
| <a id="e-o79"></a>E-O79 | `packages/shared/src/node/local-ipc.ts` [70–76](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/node/local-ipc.ts#L70-L76) | `probe` | Checked |
| <a id="e-o80"></a>E-O80 | `packages/shared/src/node/local-ipc.ts` [328–338](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/node/local-ipc.ts#L328-L338) | `daemon.json` | Checked |
| <a id="e-o81"></a>E-O81 | `packages/shared/src/node/local-ipc.ts` [1161–1192](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/node/local-ipc.ts#L1161-L1192) | `Never send a daemon secret` | Checked |
| <a id="e-o82"></a>E-O82 | `packages/shared/src/node/local-project.ts` [74–91](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/node/local-project.ts#L74-L91) | `local-project-` | Checked |
| <a id="e-o83"></a>E-O83 | `packages/shared/src/node/local-workspace-catalog.ts` [9–11](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/node/local-workspace-catalog.ts#L9-L11) | `workspace-catalog.json` | Checked |
| <a id="e-o84"></a>E-O84 | `packages/shared/src/platform-kind.ts` [20–23](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/platform-kind.ts#L20-L23) | `local` | Checked |
| <a id="e-o85"></a>E-O85 | `packages/shared/src/schema.ts` [1116–1120](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/schema.ts#L1116-L1120) | `latestUserMsgId` | Checked |
| <a id="e-o86"></a>E-O86 | `packages/shared/src/workspace-flock.ts` [17–21](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/shared/src/workspace-flock.ts#L17-L21) | `wf` | Checked |

_Table 5: Evidence under `packages/shared`._
