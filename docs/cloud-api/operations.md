# Convex operation reference

Generated from the public `CloudApi` type. See [the guide](README.md) for
transport and authentication, and [OpenAPI](openapi.yaml) for JSON Schemas. A
query reads data, a mutation changes database state, and an action may perform
external I/O. These labels do not imply that every action is safe to retry.

Request fields marked `?` are optional; `null` is an explicit value. Type names
link to the pinned source; complete expanded schemas are in OpenAPI. Types
marked `x-unresolved` in OpenAPI remain unconstrained and require the source
definition.

## e2eeMachineSharing

Public client-facing cloud operations.

### e2eeMachineSharing:listVersions

**QUERY** · schemas: `e2eeMachineSharing_listVersions_Args`,
`e2eeMachineSharing_listVersions_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L441)

Untrusted invalidation hints, never policy authority or content.

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
Array<{
        machineId: string;
        generation: string;
        revision: number;
      }>
```

### e2eeMachineSharing:readHead

**ACTION** · schemas: `e2eeMachineSharing_readHead_Args`,
`e2eeMachineSharing_readHead_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L450)

Arguments:

```ts
E2eeMachineSharingRequests['readHead']
```

Result:

```ts
E2eeMachineSharingReplies['readHead']
```

### e2eeMachineSharing:readVersion

**ACTION** · schemas: `e2eeMachineSharing_readVersion_Args`,
`e2eeMachineSharing_readVersion_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L451)

Arguments:

```ts
E2eeMachineSharingRequests['readVersion']
```

Result:

```ts
E2eeMachineSharingReplies['readVersion']
```

### e2eeMachineSharing:readRequest

**ACTION** · schemas: `e2eeMachineSharing_readRequest_Args`,
`e2eeMachineSharing_readRequest_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L455)

Arguments:

```ts
E2eeMachineSharingRequests['readRequest']
```

Result:

```ts
E2eeMachineSharingReplies['readRequest']
```

### e2eeMachineSharing:commit

**ACTION** · schemas: `e2eeMachineSharing_commit_Args`,
`e2eeMachineSharing_commit_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L459)

Arguments:

```ts
E2eeMachineSharingRequests['commit']
```

Result:

```ts
E2eeMachineSharingReplies['commit']
```

## e2eeMembers

Public client-facing cloud operations.

### e2eeMembers:workspaces

**QUERY** · schemas: `e2eeMembers_workspaces_Args`,
`e2eeMembers_workspaces_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L462)

Arguments:

```ts
Record<string, never>
```

Result:

```ts
import('./e2ee-members').E2eeMemberWorkspace[]
```

### e2eeMembers:createInvitation

**MUTATION** · schemas: `e2eeMembers_createInvitation_Args`,
`e2eeMembers_createInvitation_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L463)

Arguments:

```ts
E2eeMemberRequests['createInvitation']
```

Result:

```ts
E2eeMemberReplies['createInvitation']
```

### e2eeMembers:preview

**QUERY** · schemas: `e2eeMembers_preview_Args`, `e2eeMembers_preview_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L467)

Arguments:

```ts
E2eeMemberRequests['preview']
```

Result:

```ts
E2eeMemberReplies['preview']
```

### e2eeMembers:submit

**MUTATION** · schemas: `e2eeMembers_submit_Args`, `e2eeMembers_submit_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L468)

Arguments:

```ts
E2eeMemberRequests['submit']
```

Result:

```ts
E2eeMemberReplies['submit']
```

### e2eeMembers:retire

**MUTATION** · schemas: `e2eeMembers_retire_Args`, `e2eeMembers_retire_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L469)

Arguments:

```ts
E2eeMemberRequests['retire']
```

Result:

```ts
E2eeMemberReplies['retire']
```

### e2eeMembers:pending

**QUERY** · schemas: `e2eeMembers_pending_Args`, `e2eeMembers_pending_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L470)

Arguments:

```ts
E2eeMemberRequests['pending']
```

Result:

```ts
E2eeMemberReplies['pending']
```

### e2eeMembers:read

**QUERY** · schemas: `e2eeMembers_read_Args`, `e2eeMembers_read_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L471)

Arguments:

```ts
E2eeMemberRequests['read']
```

Result:

```ts
E2eeMemberReplies['read']
```

### e2eeMembers:reject

**MUTATION** · schemas: `e2eeMembers_reject_Args`, `e2eeMembers_reject_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L472)

Arguments:

```ts
E2eeMemberRequests['reject']
```

Result:

```ts
E2eeMemberReplies['reject']
```

### e2eeMembers:revoke

**MUTATION** · schemas: `e2eeMembers_revoke_Args`, `e2eeMembers_revoke_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L473)

Arguments:

```ts
E2eeMemberRequests['revoke']
```

Result:

```ts
E2eeMemberReplies['revoke']
```

### e2eeMembers:claim

**QUERY** · schemas: `e2eeMembers_claim_Args`, `e2eeMembers_claim_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L474)

Arguments:

```ts
E2eeMemberRequests['claim']
```

Result:

```ts
E2eeMemberReplies['claim']
```

## e2eeContent

Optional developer-only E2EE control plane; does not authorize content access.

### e2eeContent:contentStreamsToken

**ACTION** · schemas: `e2eeContent_contentStreamsToken_Args`,
`e2eeContent_contentStreamsToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L477)

Arguments:

```ts
E2eeContentTokenRequest
```

Result:

```ts
E2eeContentToken
```

## e2eeJoinMailbox

Public client-facing cloud operations.

### e2eeJoinMailbox:begin

**MUTATION** · schemas: `e2eeJoinMailbox_begin_Args`,
`e2eeJoinMailbox_begin_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L479)

Arguments:

```ts
E2eeJoinRequests['begin']
```

Result:

```ts
E2eeJoinReplies['begin']
```

### e2eeJoinMailbox:status

**QUERY** · schemas: `e2eeJoinMailbox_status_Args`,
`e2eeJoinMailbox_status_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L480)

Arguments:

```ts
E2eeJoinRequests['status']
```

Result:

```ts
E2eeJoinReplies['status']
```

### e2eeJoinMailbox:readRequest

**QUERY** · schemas: `e2eeJoinMailbox_readRequest_Args`,
`e2eeJoinMailbox_readRequest_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L481)

Arguments:

```ts
E2eeJoinRequests['readRequest']
```

Result:

```ts
E2eeJoinReplies['readRequest']
```

### e2eeJoinMailbox:cancel

**MUTATION** · schemas: `e2eeJoinMailbox_cancel_Args`,
`e2eeJoinMailbox_cancel_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L482)

Arguments:

```ts
E2eeJoinRequests['cancel']
```

Result:

```ts
E2eeJoinReplies['cancel']
```

### e2eeJoinMailbox:publish

**MUTATION** · schemas: `e2eeJoinMailbox_publish_Args`,
`e2eeJoinMailbox_publish_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L483)

Arguments:

```ts
E2eeJoinRequests['publish']
```

Result:

```ts
E2eeJoinReplies['publish']
```

### e2eeJoinMailbox:claim

**QUERY** · schemas: `e2eeJoinMailbox_claim_Args`,
`e2eeJoinMailbox_claim_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L484)

Arguments:

```ts
E2eeJoinRequests['claim']
```

Result:

```ts
E2eeJoinReplies['claim']
```

## e2eeAutomaticPairing

Account-wide personal device pairing relay; relays and notifies, never approves.

### e2eeAutomaticPairing:pending

**QUERY** · schemas: `e2eeAutomaticPairing_pending_Args`,
`e2eeAutomaticPairing_pending_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L488)

Arguments:

```ts
Record<string, never>
```

Result:

```ts
E2eeAutomaticPairingRecord[]
```

### e2eeAutomaticPairing:read

**QUERY** · schemas: `e2eeAutomaticPairing_read_Args`,
`e2eeAutomaticPairing_read_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L489)

Arguments:

```ts
{ id: string }
```

Result:

```ts
E2eeAutomaticPairingRecord | null
```

### e2eeAutomaticPairing:exchange

**MUTATION** · schemas: `e2eeAutomaticPairing_exchange_Args`,
`e2eeAutomaticPairing_exchange_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L490)

Arguments:

```ts
E2eeAutomaticPairingCommand
```

Result:

```ts
E2eeAutomaticPairingRecord
```

## e2eeAccountPairing

Public client-facing cloud operations.

### e2eeAccountPairing:submit

**MUTATION** · schemas: `e2eeAccountPairing_submit_Args`,
`e2eeAccountPairing_submit_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L493)

Arguments:

```ts
E2eeAccountPairingRequests['submit']
```

Result:

```ts
E2eeAccountPairingReplies['submit']
```

### e2eeAccountPairing:pending

**QUERY** · schemas: `e2eeAccountPairing_pending_Args`,
`e2eeAccountPairing_pending_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L494)

Arguments:

```ts
E2eeAccountPairingRequests['pending']
```

Result:

```ts
E2eeAccountPairingReplies['pending']
```

### e2eeAccountPairing:read

**QUERY** · schemas: `e2eeAccountPairing_read_Args`,
`e2eeAccountPairing_read_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L495)

Arguments:

```ts
E2eeAccountPairingRequests['read']
```

Result:

```ts
E2eeAccountPairingReplies['read']
```

### e2eeAccountPairing:decline

**MUTATION** · schemas: `e2eeAccountPairing_decline_Args`,
`e2eeAccountPairing_decline_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L496)

Arguments:

```ts
E2eeAccountPairingRequests['decline']
```

Result:

```ts
E2eeAccountPairingReplies['decline']
```

### e2eeAccountPairing:publish

**MUTATION** · schemas: `e2eeAccountPairing_publish_Args`,
`e2eeAccountPairing_publish_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L497)

Arguments:

```ts
E2eeAccountPairingRequests['publish']
```

Result:

```ts
E2eeAccountPairingReplies['publish']
```

### e2eeAccountPairing:claim

**QUERY** · schemas: `e2eeAccountPairing_claim_Args`,
`e2eeAccountPairing_claim_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L498)

Arguments:

```ts
E2eeAccountPairingRequests['claim']
```

Result:

```ts
E2eeAccountPairingReplies['claim']
```

## e2eeMailbox

Public client-facing cloud operations.

### e2eeMailbox:put

**MUTATION** · schemas: `e2eeMailbox_put_Args`, `e2eeMailbox_put_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L501)

Arguments:

```ts
E2eeMailboxRequests['put']
```

Result:

```ts
E2eeMailboxReplies['put']
```

### e2eeMailbox:read

**QUERY** · schemas: `e2eeMailbox_read_Args`, `e2eeMailbox_read_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L502)

Arguments:

```ts
E2eeMailboxRequests['read']
```

Result:

```ts
E2eeMailboxReplies['read']
```

### e2eeMailbox:fetch

**QUERY** · schemas: `e2eeMailbox_fetch_Args`, `e2eeMailbox_fetch_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L503)

Arguments:

```ts
E2eeMailboxRequests['fetch']
```

Result:

```ts
E2eeMailboxReplies['fetch']
```

### e2eeMailbox:status

**QUERY** · schemas: `e2eeMailbox_status_Args`, `e2eeMailbox_status_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L504)

Arguments:

```ts
E2eeMailboxRequests['status']
```

Result:

```ts
E2eeMailboxReplies['status']
```

### e2eeMailbox:report

**MUTATION** · schemas: `e2eeMailbox_report_Args`, `e2eeMailbox_report_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L505)

Arguments:

```ts
E2eeMailboxRequests['report']
```

Result:

```ts
E2eeMailboxReplies['report']
```

### e2eeMailbox:repair

**MUTATION** · schemas: `e2eeMailbox_repair_Args`, `e2eeMailbox_repair_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L506)

Arguments:

```ts
E2eeMailboxRequests['repair']
```

Result:

```ts
E2eeMailboxReplies['repair']
```

## e2eeMachinePairing

Public client-facing cloud operations.

### e2eeMachinePairing:begin

**MUTATION** · schemas: `e2eeMachinePairing_begin_Args`,
`e2eeMachinePairing_begin_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L509)

Arguments:

```ts
E2eeMachinePairingRequests['begin']
```

Result:

```ts
E2eeMachinePairingStatus
```

### e2eeMachinePairing:inspect

**QUERY** · schemas: `e2eeMachinePairing_inspect_Args`,
`e2eeMachinePairing_inspect_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L510)

Arguments:

```ts
E2eeMachinePairingRequests['inspect']
```

Result:

```ts
E2eeMachinePairingStatus
```

### e2eeMachinePairing:cancel

**MUTATION** · schemas: `e2eeMachinePairing_cancel_Args`,
`e2eeMachinePairing_cancel_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L511)

Arguments:

```ts
E2eeMachinePairingRequests['cancel']
```

Result:

```ts
E2eeMachinePairingStatus
```

### e2eeMachinePairing:authorizeExisting

**MUTATION** · schemas: `e2eeMachinePairing_authorizeExisting_Args`,
`e2eeMachinePairing_authorizeExisting_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L512)

Arguments:

```ts
E2eeMachinePairingRequests['inspect']
```

Result:

```ts
E2eeMachinePairingStatus
```

### e2eeMachinePairing:bootstrap

**QUERY** · schemas: `e2eeMachinePairing_bootstrap_Args`,
`e2eeMachinePairing_bootstrap_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L513)

Arguments:

```ts
{ workspaceId: string; credential: string; machineId: string }
```

Result:

```ts
| {
          status: 'authorized';
          userId: string;
          workspaces: (WorkspaceSummary & { contentMode: 'e2ee'; genesisHash: string })[];
        }
      | { status: 'unauthorized'; reason: string }
```

### e2eeMachinePairing:workspaceEntitlement

**QUERY** · schemas: `e2eeMachinePairing_workspaceEntitlement_Args`,
`e2eeMachinePairing_workspaceEntitlement_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L523)

The paired machine's own workspace plan, authenticated by its device credential.

Arguments:

```ts
{ workspaceId: string; credential: string; machineId: string }
```

Result:

```ts
| { valid: false; reason: string }
      | { valid: true; effectivePlanTier: PlanTier; checkoutPending: boolean }
```

### e2eeMachinePairing:complete

**MUTATION** · schemas: `e2eeMachinePairing_complete_Args`,
`e2eeMachinePairing_complete_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L528)

Arguments:

```ts
E2eeMachinePairingRequests['inspect']
```

Result:

```ts
E2eeMachinePairingStatus
```

## e2eeWorkspaces

Public client-facing cloud operations.

### e2eeWorkspaces:ledgerHead

**QUERY** · schemas: `e2eeWorkspaces_ledgerHead_Args`,
`e2eeWorkspaces_ledgerHead_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L531)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
E2eeWorkspaceLedgerHead
```

### e2eeWorkspaces:appendRecord

**ACTION** · schemas: `e2eeWorkspaces_appendRecord_Args`,
`e2eeWorkspaces_appendRecord_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L532)

Arguments:

```ts
E2eeAppendRecordRequest
```

Result:

```ts
E2eeAppendRecordReply
```

### e2eeWorkspaces:create

**ACTION** · schemas: `e2eeWorkspaces_create_Args`,
`e2eeWorkspaces_create_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L533)

Arguments:

```ts
E2eeWorkspaceCreateRequest
```

Result:

```ts
E2eeWorkspaceCreateResult
```

### e2eeWorkspaces:describe

**QUERY** · schemas: `e2eeWorkspaces_describe_Args`,
`e2eeWorkspaces_describe_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L534)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
WorkspaceAdmissionDescriptor
```

### e2eeWorkspaces:reportDeviceProfile

**MUTATION** · schemas: `e2eeWorkspaces_reportDeviceProfile_Args`,
`e2eeWorkspaces_reportDeviceProfile_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L535)

Arguments:

```ts
| E2eeDeviceProfileUpdate
      | { workspaceId: string; credential: string; cliToken?: string; profile: E2eeDeviceProfile }
```

Result:

```ts
null
```

### e2eeWorkspaces:memberProfiles

**QUERY** · schemas: `e2eeWorkspaces_memberProfiles_Args`,
`e2eeWorkspaces_memberProfiles_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L540)

Arguments:

```ts
E2eeWorkspaceMemberProfilesRequest
```

Result:

```ts
E2eeWorkspaceMemberProfiles
```

### e2eeWorkspaces:history

**ACTION** · schemas: `e2eeWorkspaces_history_Args`,
`e2eeWorkspaces_history_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L541)

Arguments:

```ts
E2eeWorkspaceHistoryRequest
```

Result:

```ts
E2eeWorkspaceHistoryPage
```

## accountSecurityEvents

Optional E2EE ciphertext staging. No ordinary/local product constructs it.

### accountSecurityEvents:list

**QUERY** · schemas: `accountSecurityEvents_list_Args`,
`accountSecurityEvents_list_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L545)

Arguments:

```ts
{ cursor?: string | null; limit?: number }
```

Result:

```ts
{ events: E2eeAccountSecurityEvent[]; nextCursor: string | null }
```

## e2eeRecoveryVault

Public client-facing cloud operations.

### e2eeRecoveryVault:hasAccountVault

**QUERY** · schemas: `e2eeRecoveryVault_hasAccountVault_Args`,
`e2eeRecoveryVault_hasAccountVault_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L551)

Arguments:

```ts
Record<string, never>
```

Result:

```ts
{ exists: boolean }
```

### e2eeRecoveryVault:replacementState

**QUERY** · schemas: `e2eeRecoveryVault_replacementState_Args`,
`e2eeRecoveryVault_replacementState_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L552)

Arguments:

```ts
Record<string, never>
```

Result:

```ts
{ current: string | null; replacing: string | null }
```

### e2eeRecoveryVault:reserveReplacementVault

**MUTATION** · schemas: `e2eeRecoveryVault_reserveReplacementVault_Args`,
`e2eeRecoveryVault_reserveReplacementVault_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L556)

Arguments:

```ts
{ vaultId: string }
```

Result:

```ts
{ ok: true }
```

### e2eeRecoveryVault:finishReplacement

**MUTATION** · schemas: `e2eeRecoveryVault_finishReplacement_Args`,
`e2eeRecoveryVault_finishReplacement_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L557)

Arguments:

```ts
{ oldVaultId: string; newVaultId: string }
```

Result:

```ts
{ ok: true }
```

### e2eeRecoveryVault:abandonReplacement

**MUTATION** · schemas: `e2eeRecoveryVault_abandonReplacement_Args`,
`e2eeRecoveryVault_abandonReplacement_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L558)

Arguments:

```ts
{ vaultId: string }
```

Result:

```ts
{ ok: true }
```

### e2eeRecoveryVault:putImmutable

**MUTATION** · schemas: `e2eeRecoveryVault_putImmutable_Args`,
`e2eeRecoveryVault_putImmutable_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L559)

Arguments:

```ts
RecoveryVaultPutRequest
```

Result:

```ts
{ ok: true }
```

### e2eeRecoveryVault:readEntry

**QUERY** · schemas: `e2eeRecoveryVault_readEntry_Args`,
`e2eeRecoveryVault_readEntry_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L560)

Arguments:

```ts
RecoveryVaultReadRequest
```

Result:

```ts
RecoveryVaultCiphertextDto | null
```

### e2eeRecoveryVault:readIndex

**QUERY** · schemas: `e2eeRecoveryVault_readIndex_Args`,
`e2eeRecoveryVault_readIndex_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L561)

Arguments:

```ts
RecoveryVaultIndexReadRequest
```

Result:

```ts
RecoveryVaultCiphertextDto | null
```

### e2eeRecoveryVault:compareAndSwapIndex

**MUTATION** · schemas: `e2eeRecoveryVault_compareAndSwapIndex_Args`,
`e2eeRecoveryVault_compareAndSwapIndex_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L562)

Arguments:

```ts
RecoveryVaultIndexCasRequest
```

Result:

```ts
RecoveryVaultIndexCasReply
```

### e2eeRecoveryVault:deleteUnreferenced

**MUTATION** · schemas: `e2eeRecoveryVault_deleteUnreferenced_Args`,
`e2eeRecoveryVault_deleteUnreferenced_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L563)

Arguments:

```ts
RecoveryVaultDeleteRequest
```

Result:

```ts
{ ok: true }
```

## e2eeEpochStaging

Public client-facing cloud operations.

### e2eeEpochStaging:stageGroup

**MUTATION** · schemas: `e2eeEpochStaging_stageGroup_Args`,
`e2eeEpochStaging_stageGroup_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L566)

Arguments:

```ts
StageEpochGroupRequest
```

Result:

```ts
StageEpochGroupReply
```

### e2eeEpochStaging:readGroup

**QUERY** · schemas: `e2eeEpochStaging_readGroup_Args`,
`e2eeEpochStaging_readGroup_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L567)

Arguments:

```ts
ReadEpochGroupRequest
```

Result:

```ts
EpochStagedGroupDto | null
```

### e2eeEpochStaging:deleteGroup

**MUTATION** · schemas: `e2eeEpochStaging_deleteGroup_Args`,
`e2eeEpochStaging_deleteGroup_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L568)

Arguments:

```ts
DeleteEpochGroupRequest
```

Result:

```ts
{ ok: true; done: boolean }
```

## promptShortcuts

Public client-facing cloud operations.

### promptShortcuts:stageDocument

**MUTATION** · schemas: `promptShortcuts_stageDocument_Args`,
`promptShortcuts_stageDocument_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L571)

Arguments:

```ts
{
        workspaceId: string;
        ownerUserId: string;
        shortcutId: string;
        bodyDocId: string;
        visibility: 'private' | 'workspace';
      }
```

Result:

```ts
{ bodyDocId: string; status: 'staged' | 'active' }
```

### promptShortcuts:activateDocument

**MUTATION** · schemas: `promptShortcuts_activateDocument_Args`,
`promptShortcuts_activateDocument_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L581)

Arguments:

```ts
{
        workspaceId: string;
        bodyDocId: string;
        previousBodyDocId: string | null;
        previousRevision: string | null;
        revision: string;
        slug: string;
        indexBytes: number;
      }
```

Result:

```ts
null
```

### promptShortcuts:settleDocument

**MUTATION** · schemas: `promptShortcuts_settleDocument_Args`,
`promptShortcuts_settleDocument_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L593)

Arguments:

```ts
{
        workspaceId: string;
        shortcutId: string;
        bodyDocId: string;
        visibility: 'private' | 'workspace';
      }
```

Result:

```ts
'active' | 'cancelled'
```

### promptShortcuts:revokeShortcut

**MUTATION** · schemas: `promptShortcuts_revokeShortcut_Args`,
`promptShortcuts_revokeShortcut_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L602)

Arguments:

```ts
{
        workspaceId: string;
        shortcutId: string;
        bodyDocId: string;
        visibility: 'private' | 'workspace';
      }
```

Result:

```ts
null
```

### promptShortcuts:listAccessibleDocuments

**QUERY** · schemas: `promptShortcuts_listAccessibleDocuments_Args`,
`promptShortcuts_listAccessibleDocuments_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L611)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
Array<{
        shortcutId: string;
        bodyDocId: string;
        ownerUserId: string;
        visibility: 'private' | 'workspace';
        revision: string | null;
        deleted?: boolean;
      }>
```

### promptShortcuts:getStreamToken

**ACTION** · schemas: `promptShortcuts_getStreamToken_Args`,
`promptShortcuts_getStreamToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L622)

Arguments:

```ts
{
        workspaceId: string;
        target:
          | { kind: 'index'; ownerUserId: string; visibility: 'private' | 'workspace' }
          | { kind: 'body'; bodyDocId: string };
        write: boolean;
      }
```

Result:

```ts
{ token: string; expiresIn: number; gatewayBaseUrl: string; streamId: string }
```

## sessionSharing

Public client-facing cloud operations.

### sessionSharing:requestFromCli

**MUTATION** · schemas: `sessionSharing_requestFromCli_Args`,
`sessionSharing_requestFromCli_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L634)

Arguments:

```ts
SessionShareRequestInput & { cliToken: string }
```

Result:

```ts
SessionShareRequestResult
```

### sessionSharing:listRequests

**QUERY** · schemas: `sessionSharing_listRequests_Args`,
`sessionSharing_listRequests_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L638)

Arguments:

```ts
{ workspaceId: string; sourceSessionId: string }
```

Result:

```ts
SessionShareRequest[]
```

### sessionSharing:getRequestResultFromCli

**QUERY** · schemas: `sessionSharing_getRequestResultFromCli_Args`,
`sessionSharing_getRequestResultFromCli_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L639)

Arguments:

```ts
{
        cliToken: string;
        workspaceId: string;
        shareRequestId: string;
        sourceSessionId: string;
        requesterUserId: string;
        deliveryPublicKey: string;
      }
```

Result:

```ts
SessionShareRequestResult
```

### sessionSharing:cancelRequest

**MUTATION** · schemas: `sessionSharing_cancelRequest_Args`,
`sessionSharing_cancelRequest_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L650)

Arguments:

```ts
{ requestId: string }
```

Result:

```ts
void
```

### sessionSharing:list

**QUERY** · schemas: `sessionSharing_list_Args`, `sessionSharing_list_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L651)

Arguments:

```ts
{ workspaceId: string; paginationOpts: { numItems: number; cursor: string | null } }
```

Result:

```ts
PublishedSessionSharePage
```

### sessionSharing:getManagement

**QUERY** · schemas: `sessionSharing_getManagement_Args`,
`sessionSharing_getManagement_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L655)

Arguments:

```ts
{ workspaceId: string; rootSessionId: string; shareId?: string }
```

Result:

```ts
SessionShareManagement
```

### sessionSharing:beginDeployment

**MUTATION** · schemas: `sessionSharing_beginDeployment_Args`,
`sessionSharing_beginDeployment_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L659)

Arguments:

```ts
BeginShareDeployment
```

Result:

```ts
SessionShareView & { deploymentId: string }
```

### sessionSharing:publishDeployment

**MUTATION** · schemas: `sessionSharing_publishDeployment_Args`,
`sessionSharing_publishDeployment_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L660)

Arguments:

```ts
{ deploymentId: string }
```

Result:

```ts
SessionShareView
```

### sessionSharing:resetCredential

**MUTATION** · schemas: `sessionSharing_resetCredential_Args`,
`sessionSharing_resetCredential_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L661)

Arguments:

```ts
{ shareId: string; expectedRevision: number; credentialHash: string }
```

Result:

```ts
SessionShareView
```

### sessionSharing:revoke

**MUTATION** · schemas: `sessionSharing_revoke_Args`,
`sessionSharing_revoke_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L665)

Arguments:

```ts
{ shareId: string; expectedRevision: number }
```

Result:

```ts
SessionShareView
```

## activity

Public client-facing cloud operations.

### activity:recordMyWorkspaceDailyActiveUser

**MUTATION** · schemas: `activity_recordMyWorkspaceDailyActiveUser_Args`,
`activity_recordMyWorkspaceDailyActiveUser_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L668)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{ created: boolean; dayStartMs: number }
```

## workspaceMembers

Public client-facing cloud operations.

### workspaceMembers:list

**QUERY** · schemas: `workspaceMembers_list_Args`,
`workspaceMembers_list_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L674)

Arguments:

```ts
{ workspaceId: string; accountId: string }
```

Result:

```ts
WorkspaceDirectoryMember[]
```

## auth

Public client-facing cloud operations.

### auth:transferWorkspaceOwnership

**MUTATION** · schemas: `auth_transferWorkspaceOwnership_Args`,
`auth_transferWorkspaceOwnership_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L677)

Arguments:

```ts
{ workspaceId: string; targetMemberId: string }
```

Result:

```ts
null
```

### auth:getMyWorkspaceMembershipFingerprint

**QUERY** · schemas: `auth_getMyWorkspaceMembershipFingerprint_Args`,
`auth_getMyWorkspaceMembershipFingerprint_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L678)

Arguments:

```ts
Record<string, never>
```

Result:

```ts
string | null
```

### auth:getUserById

**QUERY** · schemas: `auth_getUserById_Args`, `auth_getUserById_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L679)

Arguments:

```ts
{ workspaceId?: string; userId: string }
```

Result:

```ts
{ id: string; name?: string; email?: string; image?: string | null } | null
```

### auth:getWorkspaceAccessBySlug

**QUERY** · schemas: `auth_getWorkspaceAccessBySlug_Args`,
`auth_getWorkspaceAccessBySlug_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L683)

Arguments:

```ts
{ slug: string }
```

Result:

```ts
WorkspaceAccess
```

### auth:isWorkspaceSlugAvailable

**QUERY** · schemas: `auth_isWorkspaceSlugAvailable_Args`,
`auth_isWorkspaceSlugAvailable_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L684)

Arguments:

```ts
{ slug: string }
```

Result:

```ts
{ available: boolean }
```

### auth:getWorkspaceUserProfileForCliToken

**QUERY** · schemas: `auth_getWorkspaceUserProfileForCliToken_Args`,
`auth_getWorkspaceUserProfileForCliToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L685)

Arguments:

```ts
{ userId: string; workspaceId: string; cliToken: string }
```

Result:

```ts
{
        id: string;
        name?: string;
        email?: string;
        githubLogin?: string;
        githubAccountId?: string;
      } | null
```

## referrals

Public client-facing cloud operations.

### referrals:createLink

**MUTATION** · schemas: `referrals_createLink_Args`,
`referrals_createLink_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L697)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{ code: string; url: string }
```

### referrals:getOverview

**QUERY** · schemas: `referrals_getOverview_Args`,
`referrals_getOverview_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L698)

Arguments:

```ts
{ workspaceId: string; policyRefreshKey?: number }
```

Result:

```ts
ReferralOverview | null
```

### referrals:listLedger

**QUERY** · schemas: `referrals_listLedger_Args`, `referrals_listLedger_Result`
·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L699)

Arguments:

```ts
{ workspaceId: string; paginationOpts: { numItems: number; cursor: string | null } }
```

Result:

```ts
{ page: ReferralLedgerEntry[]; isDone: boolean; continueCursor: string }
```

### referrals:getCheckoutOffer

**QUERY** · schemas: `referrals_getCheckoutOffer_Args`,
`referrals_getCheckoutOffer_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L704)

Without `workspaceId`, previews a workspace the caller is about to create.

Arguments:

```ts
{ workspaceId?: string; code?: string; policyRefreshKey?: number }
```

Result:

```ts
ReferralCheckoutOffer
```

### referrals:attachLead

**MUTATION** · schemas: `referrals_attachLead_Args`,
`referrals_attachLead_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L709)

Remember the referral link the signed-in person followed, across devices.

Arguments:

```ts
{ code: string; clickedAt?: number }
```

Result:

```ts
{ status: 'attached' | 'kept' | 'self' | 'invalid' }
```

### referrals:dismissLead

**MUTATION** · schemas: `referrals_dismissLead_Args`,
`referrals_dismissLead_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L714)

The person declined the referral discount.

Arguments:

```ts
Record<string, never>
```

Result:

```ts
null
```

## billing

Public client-facing cloud operations.

### billing:createBillingPortalSession

**ACTION** · schemas: `billing_createBillingPortalSession_Args`,
`billing_createBillingPortalSession_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L717)

Arguments:

```ts
{ workspaceId: string; returnUrl?: string; returnTarget?: 'web' | 'desktop' }
```

Result:

```ts
{ url: string }
```

### billing:createCheckoutSession

**ACTION** · schemas: `billing_createCheckoutSession_Args`,
`billing_createCheckoutSession_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L721)

Arguments:

```ts
CheckoutUrls & { workspaceId: string; interval: BillingInterval; referralCode?: string }
```

Result:

```ts
{ url: string; checkoutKind?: 'subscription' | 'gift_setup' }
```

### billing:createPaidWorkspaceCheckout

**ACTION** · schemas: `billing_createPaidWorkspaceCheckout_Args`,
`billing_createPaidWorkspaceCheckout_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L725)

Arguments:

```ts
CheckoutUrls & {
        name: string;
        slug: string;
        interval: BillingInterval;
        referralCode?: string;
      }
```

Result:

```ts
{ workspaceId: string; workspaceSlug: string; url: string | null; existing: boolean }
```

### billing:getBillingOverview

**QUERY** · schemas: `billing_getBillingOverview_Args`,
`billing_getBillingOverview_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L734)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
BillingOverview | null
```

### billing:getMyNewWorkspacePricing

**QUERY** · schemas: `billing_getMyNewWorkspacePricing_Args`,
`billing_getMyNewWorkspacePricing_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L735)

Arguments:

```ts
Record<string, never>
```

Result:

```ts
Pricing | null
```

### billing:getMyPaidWorkspacePlanTiers

**QUERY** · schemas: `billing_getMyPaidWorkspacePlanTiers_Args`,
`billing_getMyPaidWorkspacePlanTiers_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L736)

Arguments:

```ts
Record<string, never>
```

Result:

```ts
Array<{ workspaceId: string; planTier: Exclude<PlanTier, 'free'> }>
```

### billing:getWorkspaceBillingEntitlement

**QUERY** · schemas: `billing_getWorkspaceBillingEntitlement_Args`,
`billing_getWorkspaceBillingEntitlement_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L740)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{
        planTier: PlanTier;
        effectivePlanTier: PlanTier;
        entitlementSource: BillingEntitlementSource;
        promotionalEntitlementEndsAt: number | null;
        checkoutPending: boolean;
      } | null
```

### billing:getWorkspaceCreationAvailability

**QUERY** · schemas: `billing_getWorkspaceCreationAvailability_Args`,
`billing_getWorkspaceCreationAvailability_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L750)

Arguments:

```ts
Record<string, never>
```

Result:

```ts
{
        canCreateFree: boolean;
        current: number;
        limit: number;
        pendingWorkspace: { workspaceId: string; workspaceSlug: string } | null;
      } | null
```

### billing:getWorkspaceMemberLimitState

**QUERY** · schemas: `billing_getWorkspaceMemberLimitState_Args`,
`billing_getWorkspaceMemberLimitState_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L759)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{
        memberLimit: number | null;
        canInvite: boolean;
        isPaid: boolean;
        memberCount: number;
        pendingInvitationCount: number;
      } | null
```

### billing:getWorkspaceSeatInvitePreview

**QUERY** · schemas: `billing_getWorkspaceSeatInvitePreview_Args`,
`billing_getWorkspaceSeatInvitePreview_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L769)

Arguments:

```ts
{ workspaceId: string; requestedSeats?: number }
```

Result:

```ts
SeatInvitePreview | null
```

### billing:listDeletedWorkspaceBillingAccounts

**QUERY** · schemas: `billing_listDeletedWorkspaceBillingAccounts_Args`,
`billing_listDeletedWorkspaceBillingAccounts_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L773)

Arguments:

```ts
Record<string, never>
```

Result:

```ts
Array<{ workspaceId: string; name: string }>
```

### billing:listBillingInvoices

**ACTION** · schemas: `billing_listBillingInvoices_Args`,
`billing_listBillingInvoices_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L777)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{ invoices: BillingInvoiceRecord[]; upcoming: UpcomingInvoicePreview | null }
```

### billing:purchaseWorkspaceMemberSeat

**ACTION** · schemas: `billing_purchaseWorkspaceMemberSeat_Args`,
`billing_purchaseWorkspaceMemberSeat_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L781)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{ status: 'ready' }
```

### billing:getBillingInvoice

**ACTION** · schemas: `billing_getBillingInvoice_Args`,
`billing_getBillingInvoice_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L782)

Arguments:

```ts
{ workspaceId: string; invoiceId: string }
```

Result:

```ts
BillingInvoiceDetail
```

### billing:cancelPendingSeatInvoice

**ACTION** · schemas: `billing_cancelPendingSeatInvoice_Args`,
`billing_cancelPendingSeatInvoice_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L783)

Arguments:

```ts
{ workspaceId: string; invoiceId: string }
```

Result:

```ts
{ status: 'canceled' }
```

### billing:previewSubscriptionIntervalChange

**ACTION** · schemas: `billing_previewSubscriptionIntervalChange_Args`,
`billing_previewSubscriptionIntervalChange_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L787)

Arguments:

```ts
{ workspaceId: string; interval: BillingInterval }
```

Result:

```ts
{
        quoteId: string;
        continuation?: boolean;
        currency: string;
        interval: BillingInterval;
        quantity: number;
        unitAmount: number;
        subtotalAmount: number;
        promoDiscountAmount: number;
        accruedSeatAmount?: number;
        adjustmentAmount?: number;
        taxAmount?: number;
        balanceAmount?: number;
        creditAmount: number;
        deferredToBalanceAmount: number;
        amountDueNow: number;
        remainingCredit: number;
        nextRenewalAt: number | null;
        promoApplied: boolean;
      } | null
```

### billing:reconcileWorkspaceCheckout

**ACTION** · schemas: `billing_reconcileWorkspaceCheckout_Args`,
`billing_reconcileWorkspaceCheckout_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L810)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{ status: 'pending' | 'expired' | 'paid' | 'none' }
```

### billing:redeemStripePromotionCode

**ACTION** · schemas: `billing_redeemStripePromotionCode_Args`,
`billing_redeemStripePromotionCode_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L814)

Arguments:

```ts
CheckoutUrls & { workspaceId: string; code: string }
```

Result:

```ts
| { status: 'gift_redeemed'; endsAt: number; durationMonths: number }
      | { status: 'checkout_required'; url: string }
      | {
          status:
            | 'invalid_code'
            | 'rate_limited'
            | 'workspace_already_plus'
            | 'subscription_not_eligible'
            | 'checkout_in_progress'
            | 'redemption_in_progress'
            | 'transfer_in_progress';
        }
```

### billing:setSubscriptionCancelAtPeriodEnd

**ACTION** · schemas: `billing_setSubscriptionCancelAtPeriodEnd_Args`,
`billing_setSubscriptionCancelAtPeriodEnd_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L829)

Arguments:

```ts
{ workspaceId: string; cancel: boolean }
```

Result:

```ts
{ cancelAtPeriodEnd: boolean; currentPeriodEnd: number | null }
```

### billing:getSubscriptionPaymentStatus

**ACTION** · schemas: `billing_getSubscriptionPaymentStatus_Args`,
`billing_getSubscriptionPaymentStatus_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L833)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
SubscriptionPaymentStatus
```

### billing:setSubscriptionInterval

**ACTION** · schemas: `billing_setSubscriptionInterval_Args`,
`billing_setSubscriptionInterval_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L834)

Arguments:

```ts
{ workspaceId: string; interval: BillingInterval; quoteId?: string }
```

Result:

```ts
SubscriptionPaymentStatus
```

## githubPersonalAuthorization

Public client-facing cloud operations.

### githubPersonalAuthorization:begin

**ACTION** · schemas: `githubPersonalAuthorization_begin_Args`,
`githubPersonalAuthorization_begin_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L840)

Arguments:

```ts
{ workspaceId: string; challenge: string; callbackURL: string }
```

Result:

```ts
{ state: string; url: string }
```

### githubPersonalAuthorization:complete

**ACTION** · schemas: `githubPersonalAuthorization_complete_Args`,
`githubPersonalAuthorization_complete_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L844)

Arguments:

```ts
{ workspaceId: string; state: string; code: string; verifier: string }
```

Result:

```ts
{ success: true }
```

## github

Public client-facing cloud operations.

### github:createGitHubInstallState

**ACTION** · schemas: `github_createGitHubInstallState_Args`,
`github_createGitHubInstallState_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L850)

Arguments:

```ts
{ returnTarget?: 'desktop' | 'web'; workspaceSlug?: string; workspaceId: string }
```

Result:

```ts
{ state: string }
```

### github:getPersonalOperationSettings

**QUERY** · schemas: `github_getPersonalOperationSettings_Args`,
`github_getPersonalOperationSettings_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L854)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
PersonalOperationSettings
```

### github:resolveLegacyPrRepositoryIdentity

**MUTATION** · schemas: `github_resolveLegacyPrRepositoryIdentity_Args`,
`github_resolveLegacyPrRepositoryIdentity_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L855)

Arguments:

```ts
{ workspaceId: string; repoFullName: string; prNumber: number; sessionId: string }
```

Result:

```ts
{ resolved: boolean }
```

### github:getPrCacheVersions

**QUERY** · schemas: `github_getPrCacheVersions_Args`,
`github_getPrCacheVersions_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L859)

Arguments:

```ts
{ workspaceId: string; repoFullName: string; prNumber: number; sessionId?: string }
```

Result:

```ts
{
        repoFullName?: string;
        repositoryId?: number;
        identityPending?: boolean;
        prDetailsUpdatedAt: number | null;
        reviewCommentsUpdatedAt: number | null;
        reviewsUpdatedAt: number | null;
        issueCommentsUpdatedAt: number | null;
        checkRunsUpdatedAt: number | null;
        rowUpdatedAt: number;
      } | null
```

### github:getWorkspaceRepositories

**QUERY** · schemas: `github_getWorkspaceRepositories_Args`,
`github_getWorkspaceRepositories_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L873)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
WorkspaceRepository[] | null
```

### github:listWorkspaceReposWithStatus

**QUERY** · schemas: `github_listWorkspaceReposWithStatus_Args`,
`github_listWorkspaceReposWithStatus_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L874)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
Array<{
        repoFullName: string;
        name: string;
        repositoryId: number;
        private: boolean;
        enabled: boolean;
        worktreeSetup?: WorktreeSetupScriptConfig;
        worktreeCleanup?: WorktreeCleanupScriptConfig;
      }> | null
```

### github:refreshPersonalGitHubProfile

**ACTION** · schemas: `github_refreshPersonalGitHubProfile_Args`,
`github_refreshPersonalGitHubProfile_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L886)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{ success: boolean }
```

### github:removeRepoFromWorkspace

**MUTATION** · schemas: `github_removeRepoFromWorkspace_Args`,
`github_removeRepoFromWorkspace_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L887)

Arguments:

```ts
{ workspaceId: string; repoFullName: string }
```

Result:

```ts
{ removed: number }
```

### github:setPersonalOperationPreference

**MUTATION** · schemas: `github_setPersonalOperationPreference_Args`,
`github_setPersonalOperationPreference_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L891)

Arguments:

```ts
{ workspaceId: string; enabled: boolean }
```

Result:

```ts
null
```

### github:setRepoEnabled

**MUTATION** · schemas: `github_setRepoEnabled_Args`,
`github_setRepoEnabled_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L892)

Arguments:

```ts
{ workspaceId: string; enabled: boolean; repoFullName: string }
```

Result:

```ts
{ updated: boolean }
```

### github:setRepoWorktreeCleanup

**MUTATION** · schemas: `github_setRepoWorktreeCleanup_Args`,
`github_setRepoWorktreeCleanup_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L896)

Arguments:

```ts
{ workspaceId: string; repoFullName: string; config: WorktreeCleanupScriptConfig }
```

Result:

```ts
{ updated: boolean }
```

### github:setRepoWorktreeSetup

**MUTATION** · schemas: `github_setRepoWorktreeSetup_Args`,
`github_setRepoWorktreeSetup_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L900)

Arguments:

```ts
{ workspaceId: string; repoFullName: string; config: WorktreeSetupScriptConfig }
```

Result:

```ts
{ updated: boolean }
```

### github:getAccessTokenByRepoNameForClient

**ACTION** · schemas: `github_getAccessTokenByRepoNameForClient_Args`,
`github_getAccessTokenByRepoNameForClient_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L904)

Arguments:

```ts
{ workspaceId: string; repoFullName: string }
```

Result:

```ts
BasicGitHubTokenResult
```

### github:getOperationAccessTokenByRepoNameForClient

**ACTION** · schemas: `github_getOperationAccessTokenByRepoNameForClient_Args`,
`github_getOperationAccessTokenByRepoNameForClient_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L908)

Arguments:

```ts
{
        forceAppFallback?: boolean;
        invalidatedPersonalToken?: string;
        workspaceId: string;
        repoFullName: string;
        operation: 'read' | 'write';
      }
```

Result:

```ts
OperationGitHubTokenResult
```

### github:getAccessTokenByRepoNameForCli

**ACTION** · schemas: `github_getAccessTokenByRepoNameForCli_Args`,
`github_getAccessTokenByRepoNameForCli_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L918)

Arguments:

```ts
{ workspaceId: string; repoFullName: string; cliToken: string }
```

Result:

```ts
BasicGitHubTokenResult
```

### github:getCredentialPolicyForCli

**ACTION** · schemas: `github_getCredentialPolicyForCli_Args`,
`github_getCredentialPolicyForCli_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L922)

Arguments:

```ts
{ cliToken: string; workspaceId: string; requesterUserId: string; machineId: string }
```

Result:

```ts
{ personalEnabled: boolean }
```

### github:getOperationAccessTokenByRepoNameForCli

**ACTION** · schemas: `github_getOperationAccessTokenByRepoNameForCli_Args`,
`github_getOperationAccessTokenByRepoNameForCli_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L926)

Arguments:

```ts
{
        credentialSource?: 'personal' | 'app';
        machineId?: string;
        requesterUserId?: string;
        forceAppFallback?: boolean;
        invalidatedPersonalToken?: string;
        workspaceId: string;
        repoFullName: string;
        cliToken: string;
        operation: 'read' | 'write';
      }
```

Result:

```ts
OperationGitHubTokenResult
```

### github:listWorkspaceRepositoriesForCliToken

**QUERY** · schemas: `github_listWorkspaceRepositoriesForCliToken_Args`,
`github_listWorkspaceRepositoriesForCliToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L940)

Arguments:

```ts
{
        requesterUserId?: string;
        enabledOnly?: boolean;
        workspaceId: string;
        cliToken: string;
      }
```

Result:

```ts
| { valid: false; repositories: WorkspaceRepository[] }
      | { valid: true; repositories: WorkspaceRepository[] }
```

## localProjects

Public client-facing cloud operations.

### localProjects:listVisibleLocalProjects

**QUERY** · schemas: `localProjects_listVisibleLocalProjects_Args`,
`localProjects_listVisibleLocalProjects_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L952)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
Array<{
        machineId: string;
        localProjectId: string;
        ownerUserId: string;
        sharedWithTeam: boolean;
        updatedAt: number;
      }>
```

### localProjects:setLocalProjectSharedWithTeam

**MUTATION** · schemas: `localProjects_setLocalProjectSharedWithTeam_Args`,
`localProjects_setLocalProjectSharedWithTeam_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L962)

Arguments:

```ts
{
        workspaceId: string;
        machineId: string;
        sharedWithTeam: boolean;
        localProjectId: string;
      }
```

Result:

```ts
{ success: true; sharedWithTeam: boolean }
```

## machineCredentials

Public client-facing cloud operations.

### machineCredentials:getMachineCredentialState

**QUERY** · schemas: `machineCredentials_getMachineCredentialState_Args`,
`machineCredentials_getMachineCredentialState_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L973)

Arguments:

```ts
{ workspaceId: string; machineId: string }
```

Result:

```ts
{ revocableCount: number }
```

### machineCredentials:revokeMachineCredentials

**MUTATION** · schemas: `machineCredentials_revokeMachineCredentials_Args`,
`machineCredentials_revokeMachineCredentials_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L977)

Arguments:

```ts
{ workspaceId: string; machineId: string }
```

Result:

```ts
{ revokedCount: number }
```

## machinePairing

Public client-facing cloud operations.

### machinePairing:cancelRequest

**MUTATION** · schemas: `machinePairing_cancelRequest_Args`,
`machinePairing_cancelRequest_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L983)

Arguments:

```ts
{ requestId: string }
```

Result:

```ts
{ success: true }
```

### machinePairing:claimFromDesktop

**MUTATION** · schemas: `machinePairing_claimFromDesktop_Args`,
`machinePairing_claimFromDesktop_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L984)

Arguments:

```ts
{ machineId: string; machineName: string; requestId: string }
```

Result:

```ts
MachinePairingView
```

### machinePairing:getRequest

**QUERY** · schemas: `machinePairing_getRequest_Args`,
`machinePairing_getRequest_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L988)

Arguments:

```ts
{ requestId: string }
```

Result:

```ts
MachinePairingView | null
```

## machines

Public client-facing cloud operations.

### machines:listSessionAccess

**QUERY** · schemas: `machines_listSessionAccess_Args`,
`machines_listSessionAccess_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L992)

Account-member directory of grants only; this never grants machine execution.

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
Array<{
        machineId: string;
        readSharedSessionIds: string[];
        memberReadSharedSessions?: Array<{ sessionId: string; userId: string }>;
        canManage: boolean;
      }>
```

### machines:setSessionReadSharedWithTeam

**MUTATION** · schemas: `machines_setSessionReadSharedWithTeam_Args`,
`machines_setSessionReadSharedWithTeam_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1001)

Arguments:

```ts
{
        workspaceId: string;
        machineId: string;
        sessionId: string;
        sharedWithTeam: boolean;
        audience?: 'team' | { userId: string };
      }
```

Result:

```ts
{ success: true }
```

### machines:listVisibleMachines

**QUERY** · schemas: `machines_listVisibleMachines_Args`,
`machines_listVisibleMachines_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1012)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
Array<{
        machineId: string;
        ownerUserId: string;
        sharedWithTeam: boolean;
        updatedAt: number;
      }>
```

### machines:setMachineSharedWithTeam

**MUTATION** · schemas: `machines_setMachineSharedWithTeam_Args`,
`machines_setMachineSharedWithTeam_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1021)

Arguments:

```ts
{ workspaceId: string; machineId: string; sharedWithTeam: boolean }
```

Result:

```ts
{ success: true; sharedWithTeam: boolean }
```

### machines:upsertMachineRegistrationFromCliToken

**MUTATION** · schemas: `machines_upsertMachineRegistrationFromCliToken_Args`,
`machines_upsertMachineRegistrationFromCliToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1025)

Arguments:

```ts
{ machineName?: string; workspaceId: string; machineId: string; cliToken: string }
```

Result:

```ts
{ success: true; existing: boolean; sharedWithTeam: boolean }
```

### machines:canUseMachineFromCliToken

**QUERY** · schemas: `machines_canUseMachineFromCliToken_Args`,
`machines_canUseMachineFromCliToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1029)

Arguments:

```ts
{
        localProjectId?: string;
        workspaceId: string;
        machineId: string;
        cliToken: string;
        requesterUserId: string;
      }
```

Result:

```ts
| { allowed: true }
      | {
          allowed: false;
          reason:
            | 'requester_not_member'
            | 'machine_not_registered'
            | 'not_visible'
            | 'project_not_shared';
        }
```

### machines:canDelegateMachineUseFromCliToken

**QUERY** · schemas: `machines_canDelegateMachineUseFromCliToken_Args`,
`machines_canDelegateMachineUseFromCliToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1048)

Both the token user and `requesterUserId` must be able to use the target.

Arguments:

```ts
{
        localProjectId?: string;
        workspaceId: string;
        machineId: string;
        cliToken: string;
        requesterUserId: string;
      }
```

Result:

```ts
| { allowed: true }
      | {
          allowed: false;
          reason:
            | 'requester_not_member'
            | 'machine_not_registered'
            | 'not_visible'
            | 'project_not_shared';
        }
```

### machines:canRequestSessionReadFromCliToken

**QUERY** · schemas: `machines_canRequestSessionReadFromCliToken_Args`,
`machines_canRequestSessionReadFromCliToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1066)

Arguments:

```ts
{
        cliToken: string;
        workspaceId: string;
        machineId: string;
        sessionId: string;
        rootSessionId: string;
        sessionOwnerUserId?: string;
        localProjectId?: string;
        requester: { userId: string; machineId: string };
      }
```

Result:

```ts
{ allowed: boolean }
```

### machines:canRequestMachineFromCliToken

**QUERY** · schemas: `machines_canRequestMachineFromCliToken_Args`,
`machines_canRequestMachineFromCliToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1079)

Arguments:

```ts
{
        localProjectId?: string;
        workspaceId: string;
        machineId: string;
        cliToken: string;
      }
```

Result:

```ts
| { allowed: true; requesterUserId: string }
      | {
          allowed: false;
          reason: 'machine_not_registered' | 'not_visible' | 'project_not_shared';
        }
```

## usage

Public client-facing cloud operations.

### usage:getWorkspaceUsageSummary

**QUERY** · schemas: `usage_getWorkspaceUsageSummary_Args`,
`usage_getWorkspaceUsageSummary_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1094)

Arguments:

```ts
{ workspaceId: string; range: UsageRange }
```

Result:

```ts
UsageSummary
```

### usage:getWorkspaceUsageTimeline

**QUERY** · schemas: `usage_getWorkspaceUsageTimeline_Args`,
`usage_getWorkspaceUsageTimeline_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1095)

Arguments:

```ts
{ workspaceId: string; range: UsageRange; granularity?: UsageTimelineGranularity }
```

Result:

```ts
UsageTimeline
```

### usage:getWorkspaceUsageCalendar

**QUERY** · schemas: `usage_getWorkspaceUsageCalendar_Args`,
`usage_getWorkspaceUsageCalendar_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1099)

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
UsageCalendar
```

### usage:getWorkspaceUsageDay

**QUERY** · schemas: `usage_getWorkspaceUsageDay_Args`,
`usage_getWorkspaceUsageDay_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1100)

Arguments:

```ts
{ workspaceId: string; dayStartMs: number }
```

Result:

```ts
UsageDay
```

### usage:getWorkspaceUsageSummaryBundleFromCliToken

**QUERY** · schemas: `usage_getWorkspaceUsageSummaryBundleFromCliToken_Args`,
`usage_getWorkspaceUsageSummaryBundleFromCliToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1101)

Arguments:

```ts
{ workspaceId: string; cliToken: string }
```

Result:

```ts
{
        workspaceId: string;
        endMs: number;
        total: UsageSummary;
        day: UsageSummary;
        week: UsageSummary;
        month: UsageSummary;
      }
```

### usage:getWorkspaceUsageTimelineFromCliToken

**QUERY** · schemas: `usage_getWorkspaceUsageTimelineFromCliToken_Args`,
`usage_getWorkspaceUsageTimelineFromCliToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1112)

Arguments:

```ts
{ workspaceId: string; cliToken: string; range: UsageRange }
```

Result:

```ts
UsageTimeline
```

### usage:upsertSessionUsageFromCli

**MUTATION** · schemas: `usage_upsertSessionUsageFromCli_Args`,
`usage_upsertSessionUsageFromCli_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1116)

Arguments:

```ts
{
        usage: {
          cacheCreationInputTokens?: number;
          reasoningOutputTokens?: number;
          costUSD?: number;
          contextWindow?: number;
          inputTokens: number;
          outputTokens: number;
          cacheReadInputTokens: number;
        };
        userId: string;
        workspaceId: string;
        sessionId: string;
        machineId: string;
        acpSessionId: string;
        cliType: string;
        modelUsage: Record<
          string,
          {
            cacheCreationInputTokens?: number;
            reasoningOutputTokens?: number;
            costUSD?: number;
            webSearchRequests?: number;
            inputTokens: number;
            outputTokens: number;
            cacheReadInputTokens: number;
          }
        >;
        cliToken: string;
      }
```

Result:

```ts
{ success: boolean }
```

## deviceAuth

Public client-facing cloud operations.

### deviceAuth:listMyWorkspacesForCliToken

**QUERY** · schemas: `deviceAuth_listMyWorkspacesForCliToken_Args`,
`deviceAuth_listMyWorkspacesForCliToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1151)

Arguments:

```ts
{ token: string; includeEncrypted?: boolean }
```

Result:

```ts
| { valid: false; userId: null; workspaces: WorkspaceSummary[] }
      | { valid: true; userId: string; workspaces: WorkspaceSummary[] }
```

### deviceAuth:getWorkspaceBillingEntitlementForCliToken

**QUERY** · schemas:
`deviceAuth_getWorkspaceBillingEntitlementForCliToken_Args`,
`deviceAuth_getWorkspaceBillingEntitlementForCliToken_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1156)

Arguments:

```ts
{ workspaceId: string; token: string }
```

Result:

```ts
{ valid: false } | { effectivePlanTier: PlanTier; checkoutPending: boolean; valid: true }
```

## agentFeedback

Public client-facing cloud operations.

### agentFeedback:submitFromCli

**MUTATION** · schemas: `agentFeedback_submitFromCli_Args`,
`agentFeedback_submitFromCli_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1162)

Arguments:

```ts
{
        source: 'cli' | 'mcp';
        feedback: string;
        systemInfo: { cliVersion: string; platform: string; arch: string };
        cliToken: string;
      }
```

Result:

```ts
{ ok: true; feedbackId: string }
```

## notifications

Public client-facing cloud operations.

### notifications:notifySessionCompleted

**ACTION** · schemas: `notifications_notifySessionCompleted_Args`,
`notifications_notifySessionCompleted_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1173)

Arguments:

```ts
{
        sessionTitle?: string;
        pullRequests?: Array<{ reportedAt?: string; number: number; status: string }>;
        userId: string;
        workspaceId: string;
        sessionId: string;
        occurrenceId: string;
        outcome?: TerminalOutcome;
        presentation?: NotificationPresentation;
        cliToken: string;
        workspaceSlug: string;
      }
```

Result:

```ts
null
```

### notifications:notifyPermissionRequested

**ACTION** · schemas: `notifications_notifyPermissionRequested_Args`,
`notifications_notifyPermissionRequested_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1188)

Arguments:

```ts
{
        sessionTitle?: string;
        toolTitle?: string;
        toolKind?: string;
        requestKind?: 'permission' | 'ask_user_question';
        presentation?: NotificationPresentation;
        userId: string;
        workspaceId: string;
        sessionId: string;
        cliToken: string;
        workspaceSlug: string;
        deliveryVersion?: 1;
        requestId: string;
        toolCallId: string;
      }
```

Result:

```ts
null
```

### notifications:recordPermissionRequested

**ACTION** · schemas: `notifications_recordPermissionRequested_Args`,
`notifications_recordPermissionRequested_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1206)

Arguments:

```ts
{
        sessionTitle?: string;
        toolTitle?: string;
        toolKind?: string;
        requestKind?: 'permission' | 'ask_user_question';
        userId: string;
        workspaceId: string;
        sessionId: string;
        cliToken: string;
        workspaceSlug: string;
        requestId: string;
        toolCallId: string;
      }
```

Result:

```ts
{ recorded: boolean }
```

### notifications:resolvePermissionRequested

**ACTION** · schemas: `notifications_resolvePermissionRequested_Args`,
`notifications_resolvePermissionRequested_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1222)

Arguments:

```ts
{
        userId: string;
        workspaceId: string;
        sessionId: string;
        cliToken: string;
        requestId: string;
        toolCallId: string;
      }
```

Result:

```ts
{ updated: boolean }
```

### notifications:syncLiveActivitySummary

**ACTION** · schemas: `notifications_syncLiveActivitySummary_Args`,
`notifications_syncLiveActivitySummary_Result` ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1233)

Arguments:

```ts
{
        permissionAlert?: { body: string; title: string };
        userId: string;
        workspaceId: string;
        updatedAt: number;
        cliToken: string;
        items: Array<{
          permissionRequestId?: string;
          permissionCommand?: string;
          id: string;
          updatedAt: number;
          status: 'permission' | 'question' | 'running' | 'unread';
          title: string;
          statusLabel: string;
          agentLogoKind: 'codex' | 'claude' | 'deepseek' | 'mimo' | 'minimax' | 'glm' | 'agent';
          agentLogoText: string;
          updatedAtLabel: string;
        }>;
        statusCounts: {
          permission: number;
          question: number;
          running: number;
          unread: number;
        };
        activityId: string;
        totalCount: number;
      }
```

Result:

```ts
| { sent: boolean; reason: string; ended?: never }
      | { sent: boolean; ended: boolean; reason?: never }
```

## Additional observed operations

These calls occur outside the exported `CloudApi` type. The schemas retain only
what the callers establish.

### deviceAuth:validateCliToken

**QUERY** ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/auth.ts#L802)

Observed CLI call to backend ingress /api/query without a bearer header; token
is in args. This function is absent from the public CloudApi type. User fields
reflect the local response parser.

Arguments:

```json
{
  "type": "object",
  "properties": {
    "token": {
      "type": "string"
    }
  },
  "required": [
    "token"
  ]
}
```

Result schema: `deviceAuth_validateCliToken_Result`.

### github:associatePullRequestForCli

**ACTION** ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-pr-association.ts#L52)

Observed CLI call to backend ingress /api/action without a bearer header. Client
treats any successful HTTP response as acknowledgement and does not parse a
result body; result remains unspecified. This function is absent from CloudApi.

Arguments:

```json
{
  "type": "object",
  "properties": {
    "workspaceId": {
      "type": "string"
    },
    "repoFullName": {
      "type": "string"
    },
    "prNumber": {
      "type": "number"
    },
    "prUrl": {
      "type": "string"
    },
    "branch": {
      "type": "string"
    },
    "status": {
      "type": "string"
    },
    "sessionId": {
      "type": "string"
    },
    "cliToken": {
      "type": "string"
    }
  },
  "required": [
    "workspaceId",
    "repoFullName",
    "prNumber",
    "prUrl",
    "branch",
    "status",
    "sessionId",
    "cliToken"
  ]
}
```

Result schema: `github_associatePullRequestForCli_Result`.

### pushSubscriptions:configuration

**QUERY** ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/mobile/ios/packages/LodyKit/Sources/LodyKit/Notifications/PushRegistration.swift)

Native clients obtain an account Convex JWT, then query push registration
configuration. No subscription message transport is established here.

Arguments:

```json
{
  "type": "object",
  "properties": {}
}
```

Result schema: `pushSubscriptions_configuration_Result`.

### pushSubscriptions:register

**MUTATION** ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/mobile/ios/packages/LodyKit/Sources/LodyKit/Notifications/PushRegistration.swift)

Registers native push credentials with an account Convex JWT. iOS includes
bundleId; Android does not. Caller ignores the result after the success
envelope. Timeout leaves remote commit unknown.

Arguments:

```json
{
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "installationId": {
          "type": "string"
        },
        "platform": {
          "const": "ios"
        },
        "purpose": {
          "const": "notification"
        },
        "token": {
          "type": "string"
        },
        "bundleId": {
          "type": "string"
        },
        "language": {
          "type": "string"
        }
      },
      "required": [
        "installationId",
        "platform",
        "purpose",
        "token",
        "bundleId",
        "language"
      ]
    },
    {
      "type": "object",
      "properties": {
        "installationId": {
          "type": "string"
        },
        "platform": {
          "const": "android"
        },
        "purpose": {
          "const": "notification"
        },
        "token": {
          "type": "string"
        },
        "language": {
          "type": "string"
        }
      },
      "required": [
        "installationId",
        "platform",
        "purpose",
        "token",
        "language"
      ]
    }
  ]
}
```

Result schema: `pushSubscriptions_register_Result`.

### pushSubscriptions:unregister

**MUTATION** ·
[source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/mobile/ios/packages/LodyKit/Sources/LodyKit/Notifications/PushRegistration.swift)

Removes this installation registration using the original account
credential/JWT. Caller ignores the result after the success envelope.

Arguments:

```json
{
  "type": "object",
  "properties": {
    "installationId": {
      "type": "string"
    }
  },
  "required": [
    "installationId"
  ]
}
```

Result schema: `pushSubscriptions_unregister_Result`.
