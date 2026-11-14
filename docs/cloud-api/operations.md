# Convex operation reference

Generated from the public `CloudApi` type. See [the guide](README.md) for transport and authentication, and [OpenAPI](openapi.yaml) for JSON Schemas. A query reads data, a mutation changes database state, and an action may perform external I/O. These labels do not imply that every action is safe to retry.

Request fields marked `?` are optional; `null` is an explicit value. Type names link to the pinned source; complete expanded schemas are in OpenAPI. Types marked `x-unresolved` in OpenAPI remain unconstrained and require the source definition.

## e2eeMachineSharing

Public client-facing cloud operations.

### e2eeMachineSharing:listVersions

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L441) · schemas: `e2eeMachineSharing_listVersions_Args`, `e2eeMachineSharing_listVersions_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L450) · schemas: `e2eeMachineSharing_readHead_Args`, `e2eeMachineSharing_readHead_Result`

Arguments:

```ts
E2eeMachineSharingRequests['readHead']
```

Result:

```ts
E2eeMachineSharingReplies['readHead']
```

### e2eeMachineSharing:readVersion

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L451) · schemas: `e2eeMachineSharing_readVersion_Args`, `e2eeMachineSharing_readVersion_Result`

Arguments:

```ts
E2eeMachineSharingRequests['readVersion']
```

Result:

```ts
E2eeMachineSharingReplies['readVersion']
```

### e2eeMachineSharing:readRequest

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L455) · schemas: `e2eeMachineSharing_readRequest_Args`, `e2eeMachineSharing_readRequest_Result`

Arguments:

```ts
E2eeMachineSharingRequests['readRequest']
```

Result:

```ts
E2eeMachineSharingReplies['readRequest']
```

### e2eeMachineSharing:commit

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L459) · schemas: `e2eeMachineSharing_commit_Args`, `e2eeMachineSharing_commit_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L462) · schemas: `e2eeMembers_workspaces_Args`, `e2eeMembers_workspaces_Result`

Arguments:

```ts
Record<string, never>
```

Result:

```ts
import('./e2ee-members').E2eeMemberWorkspace[]
```

### e2eeMembers:createInvitation

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L463) · schemas: `e2eeMembers_createInvitation_Args`, `e2eeMembers_createInvitation_Result`

Arguments:

```ts
E2eeMemberRequests['createInvitation']
```

Result:

```ts
E2eeMemberReplies['createInvitation']
```

### e2eeMembers:preview

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L467) · schemas: `e2eeMembers_preview_Args`, `e2eeMembers_preview_Result`

Arguments:

```ts
E2eeMemberRequests['preview']
```

Result:

```ts
E2eeMemberReplies['preview']
```

### e2eeMembers:submit

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L468) · schemas: `e2eeMembers_submit_Args`, `e2eeMembers_submit_Result`

Arguments:

```ts
E2eeMemberRequests['submit']
```

Result:

```ts
E2eeMemberReplies['submit']
```

### e2eeMembers:retire

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L469) · schemas: `e2eeMembers_retire_Args`, `e2eeMembers_retire_Result`

Arguments:

```ts
E2eeMemberRequests['retire']
```

Result:

```ts
E2eeMemberReplies['retire']
```

### e2eeMembers:pending

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L470) · schemas: `e2eeMembers_pending_Args`, `e2eeMembers_pending_Result`

Arguments:

```ts
E2eeMemberRequests['pending']
```

Result:

```ts
E2eeMemberReplies['pending']
```

### e2eeMembers:read

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L471) · schemas: `e2eeMembers_read_Args`, `e2eeMembers_read_Result`

Arguments:

```ts
E2eeMemberRequests['read']
```

Result:

```ts
E2eeMemberReplies['read']
```

### e2eeMembers:reject

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L472) · schemas: `e2eeMembers_reject_Args`, `e2eeMembers_reject_Result`

Arguments:

```ts
E2eeMemberRequests['reject']
```

Result:

```ts
E2eeMemberReplies['reject']
```

### e2eeMembers:revoke

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L473) · schemas: `e2eeMembers_revoke_Args`, `e2eeMembers_revoke_Result`

Arguments:

```ts
E2eeMemberRequests['revoke']
```

Result:

```ts
E2eeMemberReplies['revoke']
```

### e2eeMembers:claim

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L474) · schemas: `e2eeMembers_claim_Args`, `e2eeMembers_claim_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L477) · schemas: `e2eeContent_contentStreamsToken_Args`, `e2eeContent_contentStreamsToken_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L479) · schemas: `e2eeJoinMailbox_begin_Args`, `e2eeJoinMailbox_begin_Result`

Arguments:

```ts
E2eeJoinRequests['begin']
```

Result:

```ts
E2eeJoinReplies['begin']
```

### e2eeJoinMailbox:status

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L480) · schemas: `e2eeJoinMailbox_status_Args`, `e2eeJoinMailbox_status_Result`

Arguments:

```ts
E2eeJoinRequests['status']
```

Result:

```ts
E2eeJoinReplies['status']
```

### e2eeJoinMailbox:readRequest

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L481) · schemas: `e2eeJoinMailbox_readRequest_Args`, `e2eeJoinMailbox_readRequest_Result`

Arguments:

```ts
E2eeJoinRequests['readRequest']
```

Result:

```ts
E2eeJoinReplies['readRequest']
```

### e2eeJoinMailbox:cancel

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L482) · schemas: `e2eeJoinMailbox_cancel_Args`, `e2eeJoinMailbox_cancel_Result`

Arguments:

```ts
E2eeJoinRequests['cancel']
```

Result:

```ts
E2eeJoinReplies['cancel']
```

### e2eeJoinMailbox:publish

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L483) · schemas: `e2eeJoinMailbox_publish_Args`, `e2eeJoinMailbox_publish_Result`

Arguments:

```ts
E2eeJoinRequests['publish']
```

Result:

```ts
E2eeJoinReplies['publish']
```

### e2eeJoinMailbox:claim

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L484) · schemas: `e2eeJoinMailbox_claim_Args`, `e2eeJoinMailbox_claim_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L488) · schemas: `e2eeAutomaticPairing_pending_Args`, `e2eeAutomaticPairing_pending_Result`

Arguments:

```ts
Record<string, never>
```

Result:

```ts
E2eeAutomaticPairingRecord[]
```

### e2eeAutomaticPairing:read

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L489) · schemas: `e2eeAutomaticPairing_read_Args`, `e2eeAutomaticPairing_read_Result`

Arguments:

```ts
{ id: string }
```

Result:

```ts
E2eeAutomaticPairingRecord | null
```

### e2eeAutomaticPairing:exchange

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L490) · schemas: `e2eeAutomaticPairing_exchange_Args`, `e2eeAutomaticPairing_exchange_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L493) · schemas: `e2eeAccountPairing_submit_Args`, `e2eeAccountPairing_submit_Result`

Arguments:

```ts
E2eeAccountPairingRequests['submit']
```

Result:

```ts
E2eeAccountPairingReplies['submit']
```

### e2eeAccountPairing:pending

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L494) · schemas: `e2eeAccountPairing_pending_Args`, `e2eeAccountPairing_pending_Result`

Arguments:

```ts
E2eeAccountPairingRequests['pending']
```

Result:

```ts
E2eeAccountPairingReplies['pending']
```

### e2eeAccountPairing:read

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L495) · schemas: `e2eeAccountPairing_read_Args`, `e2eeAccountPairing_read_Result`

Arguments:

```ts
E2eeAccountPairingRequests['read']
```

Result:

```ts
E2eeAccountPairingReplies['read']
```

### e2eeAccountPairing:decline

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L496) · schemas: `e2eeAccountPairing_decline_Args`, `e2eeAccountPairing_decline_Result`

Arguments:

```ts
E2eeAccountPairingRequests['decline']
```

Result:

```ts
E2eeAccountPairingReplies['decline']
```

### e2eeAccountPairing:publish

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L497) · schemas: `e2eeAccountPairing_publish_Args`, `e2eeAccountPairing_publish_Result`

Arguments:

```ts
E2eeAccountPairingRequests['publish']
```

Result:

```ts
E2eeAccountPairingReplies['publish']
```

### e2eeAccountPairing:claim

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L498) · schemas: `e2eeAccountPairing_claim_Args`, `e2eeAccountPairing_claim_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L501) · schemas: `e2eeMailbox_put_Args`, `e2eeMailbox_put_Result`

Arguments:

```ts
E2eeMailboxRequests['put']
```

Result:

```ts
E2eeMailboxReplies['put']
```

### e2eeMailbox:read

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L502) · schemas: `e2eeMailbox_read_Args`, `e2eeMailbox_read_Result`

Arguments:

```ts
E2eeMailboxRequests['read']
```

Result:

```ts
E2eeMailboxReplies['read']
```

### e2eeMailbox:fetch

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L503) · schemas: `e2eeMailbox_fetch_Args`, `e2eeMailbox_fetch_Result`

Arguments:

```ts
E2eeMailboxRequests['fetch']
```

Result:

```ts
E2eeMailboxReplies['fetch']
```

### e2eeMailbox:status

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L504) · schemas: `e2eeMailbox_status_Args`, `e2eeMailbox_status_Result`

Arguments:

```ts
E2eeMailboxRequests['status']
```

Result:

```ts
E2eeMailboxReplies['status']
```

### e2eeMailbox:report

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L505) · schemas: `e2eeMailbox_report_Args`, `e2eeMailbox_report_Result`

Arguments:

```ts
E2eeMailboxRequests['report']
```

Result:

```ts
E2eeMailboxReplies['report']
```

### e2eeMailbox:repair

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L506) · schemas: `e2eeMailbox_repair_Args`, `e2eeMailbox_repair_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L509) · schemas: `e2eeMachinePairing_begin_Args`, `e2eeMachinePairing_begin_Result`

Arguments:

```ts
E2eeMachinePairingRequests['begin']
```

Result:

```ts
E2eeMachinePairingStatus
```

### e2eeMachinePairing:inspect

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L510) · schemas: `e2eeMachinePairing_inspect_Args`, `e2eeMachinePairing_inspect_Result`

Arguments:

```ts
E2eeMachinePairingRequests['inspect']
```

Result:

```ts
E2eeMachinePairingStatus
```

### e2eeMachinePairing:cancel

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L511) · schemas: `e2eeMachinePairing_cancel_Args`, `e2eeMachinePairing_cancel_Result`

Arguments:

```ts
E2eeMachinePairingRequests['cancel']
```

Result:

```ts
E2eeMachinePairingStatus
```

### e2eeMachinePairing:authorizeExisting

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L512) · schemas: `e2eeMachinePairing_authorizeExisting_Args`, `e2eeMachinePairing_authorizeExisting_Result`

Arguments:

```ts
E2eeMachinePairingRequests['inspect']
```

Result:

```ts
E2eeMachinePairingStatus
```

### e2eeMachinePairing:bootstrap

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L513) · schemas: `e2eeMachinePairing_bootstrap_Args`, `e2eeMachinePairing_bootstrap_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L523) · schemas: `e2eeMachinePairing_workspaceEntitlement_Args`, `e2eeMachinePairing_workspaceEntitlement_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L528) · schemas: `e2eeMachinePairing_complete_Args`, `e2eeMachinePairing_complete_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L531) · schemas: `e2eeWorkspaces_ledgerHead_Args`, `e2eeWorkspaces_ledgerHead_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
E2eeWorkspaceLedgerHead
```

### e2eeWorkspaces:appendRecord

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L532) · schemas: `e2eeWorkspaces_appendRecord_Args`, `e2eeWorkspaces_appendRecord_Result`

Arguments:

```ts
E2eeAppendRecordRequest
```

Result:

```ts
E2eeAppendRecordReply
```

### e2eeWorkspaces:create

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L533) · schemas: `e2eeWorkspaces_create_Args`, `e2eeWorkspaces_create_Result`

Arguments:

```ts
E2eeWorkspaceCreateRequest
```

Result:

```ts
E2eeWorkspaceCreateResult
```

### e2eeWorkspaces:describe

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L534) · schemas: `e2eeWorkspaces_describe_Args`, `e2eeWorkspaces_describe_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
WorkspaceAdmissionDescriptor
```

### e2eeWorkspaces:reportDeviceProfile

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L535) · schemas: `e2eeWorkspaces_reportDeviceProfile_Args`, `e2eeWorkspaces_reportDeviceProfile_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L540) · schemas: `e2eeWorkspaces_memberProfiles_Args`, `e2eeWorkspaces_memberProfiles_Result`

Arguments:

```ts
E2eeWorkspaceMemberProfilesRequest
```

Result:

```ts
E2eeWorkspaceMemberProfiles
```

### e2eeWorkspaces:history

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L541) · schemas: `e2eeWorkspaces_history_Args`, `e2eeWorkspaces_history_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L545) · schemas: `accountSecurityEvents_list_Args`, `accountSecurityEvents_list_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L551) · schemas: `e2eeRecoveryVault_hasAccountVault_Args`, `e2eeRecoveryVault_hasAccountVault_Result`

Arguments:

```ts
Record<string, never>
```

Result:

```ts
{ exists: boolean }
```

### e2eeRecoveryVault:replacementState

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L552) · schemas: `e2eeRecoveryVault_replacementState_Args`, `e2eeRecoveryVault_replacementState_Result`

Arguments:

```ts
Record<string, never>
```

Result:

```ts
{ current: string | null; replacing: string | null }
```

### e2eeRecoveryVault:reserveReplacementVault

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L556) · schemas: `e2eeRecoveryVault_reserveReplacementVault_Args`, `e2eeRecoveryVault_reserveReplacementVault_Result`

Arguments:

```ts
{ vaultId: string }
```

Result:

```ts
{ ok: true }
```

### e2eeRecoveryVault:finishReplacement

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L557) · schemas: `e2eeRecoveryVault_finishReplacement_Args`, `e2eeRecoveryVault_finishReplacement_Result`

Arguments:

```ts
{ oldVaultId: string; newVaultId: string }
```

Result:

```ts
{ ok: true }
```

### e2eeRecoveryVault:abandonReplacement

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L558) · schemas: `e2eeRecoveryVault_abandonReplacement_Args`, `e2eeRecoveryVault_abandonReplacement_Result`

Arguments:

```ts
{ vaultId: string }
```

Result:

```ts
{ ok: true }
```

### e2eeRecoveryVault:putImmutable

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L559) · schemas: `e2eeRecoveryVault_putImmutable_Args`, `e2eeRecoveryVault_putImmutable_Result`

Arguments:

```ts
RecoveryVaultPutRequest
```

Result:

```ts
{ ok: true }
```

### e2eeRecoveryVault:readEntry

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L560) · schemas: `e2eeRecoveryVault_readEntry_Args`, `e2eeRecoveryVault_readEntry_Result`

Arguments:

```ts
RecoveryVaultReadRequest
```

Result:

```ts
RecoveryVaultCiphertextDto | null
```

### e2eeRecoveryVault:readIndex

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L561) · schemas: `e2eeRecoveryVault_readIndex_Args`, `e2eeRecoveryVault_readIndex_Result`

Arguments:

```ts
RecoveryVaultIndexReadRequest
```

Result:

```ts
RecoveryVaultCiphertextDto | null
```

### e2eeRecoveryVault:compareAndSwapIndex

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L562) · schemas: `e2eeRecoveryVault_compareAndSwapIndex_Args`, `e2eeRecoveryVault_compareAndSwapIndex_Result`

Arguments:

```ts
RecoveryVaultIndexCasRequest
```

Result:

```ts
RecoveryVaultIndexCasReply
```

### e2eeRecoveryVault:deleteUnreferenced

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L563) · schemas: `e2eeRecoveryVault_deleteUnreferenced_Args`, `e2eeRecoveryVault_deleteUnreferenced_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L566) · schemas: `e2eeEpochStaging_stageGroup_Args`, `e2eeEpochStaging_stageGroup_Result`

Arguments:

```ts
StageEpochGroupRequest
```

Result:

```ts
StageEpochGroupReply
```

### e2eeEpochStaging:readGroup

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L567) · schemas: `e2eeEpochStaging_readGroup_Args`, `e2eeEpochStaging_readGroup_Result`

Arguments:

```ts
ReadEpochGroupRequest
```

Result:

```ts
EpochStagedGroupDto | null
```

### e2eeEpochStaging:deleteGroup

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L568) · schemas: `e2eeEpochStaging_deleteGroup_Args`, `e2eeEpochStaging_deleteGroup_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L571) · schemas: `promptShortcuts_stageDocument_Args`, `promptShortcuts_stageDocument_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L581) · schemas: `promptShortcuts_activateDocument_Args`, `promptShortcuts_activateDocument_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L593) · schemas: `promptShortcuts_settleDocument_Args`, `promptShortcuts_settleDocument_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L602) · schemas: `promptShortcuts_revokeShortcut_Args`, `promptShortcuts_revokeShortcut_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L611) · schemas: `promptShortcuts_listAccessibleDocuments_Args`, `promptShortcuts_listAccessibleDocuments_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L622) · schemas: `promptShortcuts_getStreamToken_Args`, `promptShortcuts_getStreamToken_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L634) · schemas: `sessionSharing_requestFromCli_Args`, `sessionSharing_requestFromCli_Result`

Arguments:

```ts
SessionShareRequestInput & { cliToken: string }
```

Result:

```ts
SessionShareRequestResult
```

### sessionSharing:listRequests

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L638) · schemas: `sessionSharing_listRequests_Args`, `sessionSharing_listRequests_Result`

Arguments:

```ts
{ workspaceId: string; sourceSessionId: string }
```

Result:

```ts
SessionShareRequest[]
```

### sessionSharing:getRequestResultFromCli

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L639) · schemas: `sessionSharing_getRequestResultFromCli_Args`, `sessionSharing_getRequestResultFromCli_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L650) · schemas: `sessionSharing_cancelRequest_Args`, `sessionSharing_cancelRequest_Result`

Arguments:

```ts
{ requestId: string }
```

Result:

```ts
void
```

### sessionSharing:list

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L651) · schemas: `sessionSharing_list_Args`, `sessionSharing_list_Result`

Arguments:

```ts
{ workspaceId: string; paginationOpts: { numItems: number; cursor: string | null } }
```

Result:

```ts
PublishedSessionSharePage
```

### sessionSharing:getManagement

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L655) · schemas: `sessionSharing_getManagement_Args`, `sessionSharing_getManagement_Result`

Arguments:

```ts
{ workspaceId: string; rootSessionId: string; shareId?: string }
```

Result:

```ts
SessionShareManagement
```

### sessionSharing:beginDeployment

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L659) · schemas: `sessionSharing_beginDeployment_Args`, `sessionSharing_beginDeployment_Result`

Arguments:

```ts
BeginShareDeployment
```

Result:

```ts
SessionShareView & { deploymentId: string }
```

### sessionSharing:publishDeployment

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L660) · schemas: `sessionSharing_publishDeployment_Args`, `sessionSharing_publishDeployment_Result`

Arguments:

```ts
{ deploymentId: string }
```

Result:

```ts
SessionShareView
```

### sessionSharing:resetCredential

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L661) · schemas: `sessionSharing_resetCredential_Args`, `sessionSharing_resetCredential_Result`

Arguments:

```ts
{ shareId: string; expectedRevision: number; credentialHash: string }
```

Result:

```ts
SessionShareView
```

### sessionSharing:revoke

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L665) · schemas: `sessionSharing_revoke_Args`, `sessionSharing_revoke_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L668) · schemas: `activity_recordMyWorkspaceDailyActiveUser_Args`, `activity_recordMyWorkspaceDailyActiveUser_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L674) · schemas: `workspaceMembers_list_Args`, `workspaceMembers_list_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L677) · schemas: `auth_transferWorkspaceOwnership_Args`, `auth_transferWorkspaceOwnership_Result`

Arguments:

```ts
{ workspaceId: string; targetMemberId: string }
```

Result:

```ts
null
```

### auth:getMyWorkspaceMembershipFingerprint

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L678) · schemas: `auth_getMyWorkspaceMembershipFingerprint_Args`, `auth_getMyWorkspaceMembershipFingerprint_Result`

Arguments:

```ts
Record<string, never>
```

Result:

```ts
string | null
```

### auth:getUserById

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L679) · schemas: `auth_getUserById_Args`, `auth_getUserById_Result`

Arguments:

```ts
{ workspaceId?: string; userId: string }
```

Result:

```ts
{ id: string; name?: string; email?: string; image?: string | null } | null
```

### auth:getWorkspaceAccessBySlug

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L683) · schemas: `auth_getWorkspaceAccessBySlug_Args`, `auth_getWorkspaceAccessBySlug_Result`

Arguments:

```ts
{ slug: string }
```

Result:

```ts
WorkspaceAccess
```

### auth:isWorkspaceSlugAvailable

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L684) · schemas: `auth_isWorkspaceSlugAvailable_Args`, `auth_isWorkspaceSlugAvailable_Result`

Arguments:

```ts
{ slug: string }
```

Result:

```ts
{ available: boolean }
```

### auth:getWorkspaceUserProfileForCliToken

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L685) · schemas: `auth_getWorkspaceUserProfileForCliToken_Args`, `auth_getWorkspaceUserProfileForCliToken_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L697) · schemas: `referrals_createLink_Args`, `referrals_createLink_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{ code: string; url: string }
```

### referrals:getOverview

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L698) · schemas: `referrals_getOverview_Args`, `referrals_getOverview_Result`

Arguments:

```ts
{ workspaceId: string; policyRefreshKey?: number }
```

Result:

```ts
ReferralOverview | null
```

### referrals:listLedger

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L699) · schemas: `referrals_listLedger_Args`, `referrals_listLedger_Result`

Arguments:

```ts
{ workspaceId: string; paginationOpts: { numItems: number; cursor: string | null } }
```

Result:

```ts
{ page: ReferralLedgerEntry[]; isDone: boolean; continueCursor: string }
```

### referrals:getCheckoutOffer

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L704) · schemas: `referrals_getCheckoutOffer_Args`, `referrals_getCheckoutOffer_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L709) · schemas: `referrals_attachLead_Args`, `referrals_attachLead_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L714) · schemas: `referrals_dismissLead_Args`, `referrals_dismissLead_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L717) · schemas: `billing_createBillingPortalSession_Args`, `billing_createBillingPortalSession_Result`

Arguments:

```ts
{ workspaceId: string; returnUrl?: string; returnTarget?: 'web' | 'desktop' }
```

Result:

```ts
{ url: string }
```

### billing:createCheckoutSession

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L721) · schemas: `billing_createCheckoutSession_Args`, `billing_createCheckoutSession_Result`

Arguments:

```ts
CheckoutUrls & { workspaceId: string; interval: BillingInterval; referralCode?: string }
```

Result:

```ts
{ url: string; checkoutKind?: 'subscription' | 'gift_setup' }
```

### billing:createPaidWorkspaceCheckout

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L725) · schemas: `billing_createPaidWorkspaceCheckout_Args`, `billing_createPaidWorkspaceCheckout_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L734) · schemas: `billing_getBillingOverview_Args`, `billing_getBillingOverview_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
BillingOverview | null
```

### billing:getMyNewWorkspacePricing

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L735) · schemas: `billing_getMyNewWorkspacePricing_Args`, `billing_getMyNewWorkspacePricing_Result`

Arguments:

```ts
Record<string, never>
```

Result:

```ts
Pricing | null
```

### billing:getMyPaidWorkspacePlanTiers

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L736) · schemas: `billing_getMyPaidWorkspacePlanTiers_Args`, `billing_getMyPaidWorkspacePlanTiers_Result`

Arguments:

```ts
Record<string, never>
```

Result:

```ts
Array<{ workspaceId: string; planTier: Exclude<PlanTier, 'free'> }>
```

### billing:getWorkspaceBillingEntitlement

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L740) · schemas: `billing_getWorkspaceBillingEntitlement_Args`, `billing_getWorkspaceBillingEntitlement_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L750) · schemas: `billing_getWorkspaceCreationAvailability_Args`, `billing_getWorkspaceCreationAvailability_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L759) · schemas: `billing_getWorkspaceMemberLimitState_Args`, `billing_getWorkspaceMemberLimitState_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L769) · schemas: `billing_getWorkspaceSeatInvitePreview_Args`, `billing_getWorkspaceSeatInvitePreview_Result`

Arguments:

```ts
{ workspaceId: string; requestedSeats?: number }
```

Result:

```ts
SeatInvitePreview | null
```

### billing:listDeletedWorkspaceBillingAccounts

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L773) · schemas: `billing_listDeletedWorkspaceBillingAccounts_Args`, `billing_listDeletedWorkspaceBillingAccounts_Result`

Arguments:

```ts
Record<string, never>
```

Result:

```ts
Array<{ workspaceId: string; name: string }>
```

### billing:listBillingInvoices

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L777) · schemas: `billing_listBillingInvoices_Args`, `billing_listBillingInvoices_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{ invoices: BillingInvoiceRecord[]; upcoming: UpcomingInvoicePreview | null }
```

### billing:purchaseWorkspaceMemberSeat

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L781) · schemas: `billing_purchaseWorkspaceMemberSeat_Args`, `billing_purchaseWorkspaceMemberSeat_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{ status: 'ready' }
```

### billing:getBillingInvoice

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L782) · schemas: `billing_getBillingInvoice_Args`, `billing_getBillingInvoice_Result`

Arguments:

```ts
{ workspaceId: string; invoiceId: string }
```

Result:

```ts
BillingInvoiceDetail
```

### billing:cancelPendingSeatInvoice

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L783) · schemas: `billing_cancelPendingSeatInvoice_Args`, `billing_cancelPendingSeatInvoice_Result`

Arguments:

```ts
{ workspaceId: string; invoiceId: string }
```

Result:

```ts
{ status: 'canceled' }
```

### billing:previewSubscriptionIntervalChange

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L787) · schemas: `billing_previewSubscriptionIntervalChange_Args`, `billing_previewSubscriptionIntervalChange_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L810) · schemas: `billing_reconcileWorkspaceCheckout_Args`, `billing_reconcileWorkspaceCheckout_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{ status: 'pending' | 'expired' | 'paid' | 'none' }
```

### billing:redeemStripePromotionCode

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L814) · schemas: `billing_redeemStripePromotionCode_Args`, `billing_redeemStripePromotionCode_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L829) · schemas: `billing_setSubscriptionCancelAtPeriodEnd_Args`, `billing_setSubscriptionCancelAtPeriodEnd_Result`

Arguments:

```ts
{ workspaceId: string; cancel: boolean }
```

Result:

```ts
{ cancelAtPeriodEnd: boolean; currentPeriodEnd: number | null }
```

### billing:getSubscriptionPaymentStatus

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L833) · schemas: `billing_getSubscriptionPaymentStatus_Args`, `billing_getSubscriptionPaymentStatus_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
SubscriptionPaymentStatus
```

### billing:setSubscriptionInterval

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L834) · schemas: `billing_setSubscriptionInterval_Args`, `billing_setSubscriptionInterval_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L840) · schemas: `githubPersonalAuthorization_begin_Args`, `githubPersonalAuthorization_begin_Result`

Arguments:

```ts
{ workspaceId: string; challenge: string; callbackURL: string }
```

Result:

```ts
{ state: string; url: string }
```

### githubPersonalAuthorization:complete

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L844) · schemas: `githubPersonalAuthorization_complete_Args`, `githubPersonalAuthorization_complete_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L850) · schemas: `github_createGitHubInstallState_Args`, `github_createGitHubInstallState_Result`

Arguments:

```ts
{ returnTarget?: 'desktop' | 'web'; workspaceSlug?: string; workspaceId: string }
```

Result:

```ts
{ state: string }
```

### github:getPersonalOperationSettings

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L854) · schemas: `github_getPersonalOperationSettings_Args`, `github_getPersonalOperationSettings_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
PersonalOperationSettings
```

### github:resolveLegacyPrRepositoryIdentity

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L855) · schemas: `github_resolveLegacyPrRepositoryIdentity_Args`, `github_resolveLegacyPrRepositoryIdentity_Result`

Arguments:

```ts
{ workspaceId: string; repoFullName: string; prNumber: number; sessionId: string }
```

Result:

```ts
{ resolved: boolean }
```

### github:getPrCacheVersions

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L859) · schemas: `github_getPrCacheVersions_Args`, `github_getPrCacheVersions_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L873) · schemas: `github_getWorkspaceRepositories_Args`, `github_getWorkspaceRepositories_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
WorkspaceRepository[] | null
```

### github:listWorkspaceReposWithStatus

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L874) · schemas: `github_listWorkspaceReposWithStatus_Args`, `github_listWorkspaceReposWithStatus_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L886) · schemas: `github_refreshPersonalGitHubProfile_Args`, `github_refreshPersonalGitHubProfile_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
{ success: boolean }
```

### github:removeRepoFromWorkspace

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L887) · schemas: `github_removeRepoFromWorkspace_Args`, `github_removeRepoFromWorkspace_Result`

Arguments:

```ts
{ workspaceId: string; repoFullName: string }
```

Result:

```ts
{ removed: number }
```

### github:setPersonalOperationPreference

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L891) · schemas: `github_setPersonalOperationPreference_Args`, `github_setPersonalOperationPreference_Result`

Arguments:

```ts
{ workspaceId: string; enabled: boolean }
```

Result:

```ts
null
```

### github:setRepoEnabled

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L892) · schemas: `github_setRepoEnabled_Args`, `github_setRepoEnabled_Result`

Arguments:

```ts
{ workspaceId: string; enabled: boolean; repoFullName: string }
```

Result:

```ts
{ updated: boolean }
```

### github:setRepoWorktreeCleanup

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L896) · schemas: `github_setRepoWorktreeCleanup_Args`, `github_setRepoWorktreeCleanup_Result`

Arguments:

```ts
{ workspaceId: string; repoFullName: string; config: WorktreeCleanupScriptConfig }
```

Result:

```ts
{ updated: boolean }
```

### github:setRepoWorktreeSetup

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L900) · schemas: `github_setRepoWorktreeSetup_Args`, `github_setRepoWorktreeSetup_Result`

Arguments:

```ts
{ workspaceId: string; repoFullName: string; config: WorktreeSetupScriptConfig }
```

Result:

```ts
{ updated: boolean }
```

### github:getAccessTokenByRepoNameForClient

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L904) · schemas: `github_getAccessTokenByRepoNameForClient_Args`, `github_getAccessTokenByRepoNameForClient_Result`

Arguments:

```ts
{ workspaceId: string; repoFullName: string }
```

Result:

```ts
BasicGitHubTokenResult
```

### github:getOperationAccessTokenByRepoNameForClient

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L908) · schemas: `github_getOperationAccessTokenByRepoNameForClient_Args`, `github_getOperationAccessTokenByRepoNameForClient_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L918) · schemas: `github_getAccessTokenByRepoNameForCli_Args`, `github_getAccessTokenByRepoNameForCli_Result`

Arguments:

```ts
{ workspaceId: string; repoFullName: string; cliToken: string }
```

Result:

```ts
BasicGitHubTokenResult
```

### github:getCredentialPolicyForCli

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L922) · schemas: `github_getCredentialPolicyForCli_Args`, `github_getCredentialPolicyForCli_Result`

Arguments:

```ts
{ cliToken: string; workspaceId: string; requesterUserId: string; machineId: string }
```

Result:

```ts
{ personalEnabled: boolean }
```

### github:getOperationAccessTokenByRepoNameForCli

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L926) · schemas: `github_getOperationAccessTokenByRepoNameForCli_Args`, `github_getOperationAccessTokenByRepoNameForCli_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L940) · schemas: `github_listWorkspaceRepositoriesForCliToken_Args`, `github_listWorkspaceRepositoriesForCliToken_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L952) · schemas: `localProjects_listVisibleLocalProjects_Args`, `localProjects_listVisibleLocalProjects_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L962) · schemas: `localProjects_setLocalProjectSharedWithTeam_Args`, `localProjects_setLocalProjectSharedWithTeam_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L973) · schemas: `machineCredentials_getMachineCredentialState_Args`, `machineCredentials_getMachineCredentialState_Result`

Arguments:

```ts
{ workspaceId: string; machineId: string }
```

Result:

```ts
{ revocableCount: number }
```

### machineCredentials:revokeMachineCredentials

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L977) · schemas: `machineCredentials_revokeMachineCredentials_Args`, `machineCredentials_revokeMachineCredentials_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L983) · schemas: `machinePairing_cancelRequest_Args`, `machinePairing_cancelRequest_Result`

Arguments:

```ts
{ requestId: string }
```

Result:

```ts
{ success: true }
```

### machinePairing:claimFromDesktop

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L984) · schemas: `machinePairing_claimFromDesktop_Args`, `machinePairing_claimFromDesktop_Result`

Arguments:

```ts
{ machineId: string; machineName: string; requestId: string }
```

Result:

```ts
MachinePairingView
```

### machinePairing:getRequest

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L988) · schemas: `machinePairing_getRequest_Args`, `machinePairing_getRequest_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L992) · schemas: `machines_listSessionAccess_Args`, `machines_listSessionAccess_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1001) · schemas: `machines_setSessionReadSharedWithTeam_Args`, `machines_setSessionReadSharedWithTeam_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1012) · schemas: `machines_listVisibleMachines_Args`, `machines_listVisibleMachines_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1021) · schemas: `machines_setMachineSharedWithTeam_Args`, `machines_setMachineSharedWithTeam_Result`

Arguments:

```ts
{ workspaceId: string; machineId: string; sharedWithTeam: boolean }
```

Result:

```ts
{ success: true; sharedWithTeam: boolean }
```

### machines:upsertMachineRegistrationFromCliToken

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1025) · schemas: `machines_upsertMachineRegistrationFromCliToken_Args`, `machines_upsertMachineRegistrationFromCliToken_Result`

Arguments:

```ts
{ machineName?: string; workspaceId: string; machineId: string; cliToken: string }
```

Result:

```ts
{ success: true; existing: boolean; sharedWithTeam: boolean }
```

### machines:canUseMachineFromCliToken

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1029) · schemas: `machines_canUseMachineFromCliToken_Args`, `machines_canUseMachineFromCliToken_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1048) · schemas: `machines_canDelegateMachineUseFromCliToken_Args`, `machines_canDelegateMachineUseFromCliToken_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1066) · schemas: `machines_canRequestSessionReadFromCliToken_Args`, `machines_canRequestSessionReadFromCliToken_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1079) · schemas: `machines_canRequestMachineFromCliToken_Args`, `machines_canRequestMachineFromCliToken_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1094) · schemas: `usage_getWorkspaceUsageSummary_Args`, `usage_getWorkspaceUsageSummary_Result`

Arguments:

```ts
{ workspaceId: string; range: UsageRange }
```

Result:

```ts
UsageSummary
```

### usage:getWorkspaceUsageTimeline

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1095) · schemas: `usage_getWorkspaceUsageTimeline_Args`, `usage_getWorkspaceUsageTimeline_Result`

Arguments:

```ts
{ workspaceId: string; range: UsageRange; granularity?: UsageTimelineGranularity }
```

Result:

```ts
UsageTimeline
```

### usage:getWorkspaceUsageCalendar

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1099) · schemas: `usage_getWorkspaceUsageCalendar_Args`, `usage_getWorkspaceUsageCalendar_Result`

Arguments:

```ts
{ workspaceId: string }
```

Result:

```ts
UsageCalendar
```

### usage:getWorkspaceUsageDay

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1100) · schemas: `usage_getWorkspaceUsageDay_Args`, `usage_getWorkspaceUsageDay_Result`

Arguments:

```ts
{ workspaceId: string; dayStartMs: number }
```

Result:

```ts
UsageDay
```

### usage:getWorkspaceUsageSummaryBundleFromCliToken

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1101) · schemas: `usage_getWorkspaceUsageSummaryBundleFromCliToken_Args`, `usage_getWorkspaceUsageSummaryBundleFromCliToken_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1112) · schemas: `usage_getWorkspaceUsageTimelineFromCliToken_Args`, `usage_getWorkspaceUsageTimelineFromCliToken_Result`

Arguments:

```ts
{ workspaceId: string; cliToken: string; range: UsageRange }
```

Result:

```ts
UsageTimeline
```

### usage:upsertSessionUsageFromCli

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1116) · schemas: `usage_upsertSessionUsageFromCli_Args`, `usage_upsertSessionUsageFromCli_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1151) · schemas: `deviceAuth_listMyWorkspacesForCliToken_Args`, `deviceAuth_listMyWorkspacesForCliToken_Result`

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1156) · schemas: `deviceAuth_getWorkspaceBillingEntitlementForCliToken_Args`, `deviceAuth_getWorkspaceBillingEntitlementForCliToken_Result`

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1162) · schemas: `agentFeedback_submitFromCli_Args`, `agentFeedback_submitFromCli_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1173) · schemas: `notifications_notifySessionCompleted_Args`, `notifications_notifySessionCompleted_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1188) · schemas: `notifications_notifyPermissionRequested_Args`, `notifications_notifyPermissionRequested_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1206) · schemas: `notifications_recordPermissionRequested_Args`, `notifications_recordPermissionRequested_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1222) · schemas: `notifications_resolvePermissionRequested_Args`, `notifications_resolvePermissionRequested_Result`

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/packages/cloud-api/src/index.ts#L1233) · schemas: `notifications_syncLiveActivitySummary_Args`, `notifications_syncLiveActivitySummary_Result`

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

These calls occur outside the exported CloudApi type. The schemas retain only what the callers establish.

### deviceAuth:validateCliToken

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/auth.ts#L802)

Observed CLI call to backend ingress /api/query without a bearer header; token is in args. This function is absent from the public CloudApi type. User fields reflect the local response parser.

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

**ACTION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/cli/src/lib/cloud-pr-association.ts#L52)

Observed CLI call to backend ingress /api/action without a bearer header. Client treats any successful HTTP response as acknowledgement and does not parse a result body; result remains unspecified. This function is absent from CloudApi.

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

**QUERY** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/mobile/ios/packages/LodyKit/Sources/LodyKit/Notifications/PushRegistration.swift)

Native clients obtain an account Convex JWT, then query push registration configuration. No subscription message transport is established here.

Arguments:

```json
{
  "type": "object",
  "properties": {}
}
```

Result schema: `pushSubscriptions_configuration_Result`.

### pushSubscriptions:register

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/mobile/ios/packages/LodyKit/Sources/LodyKit/Notifications/PushRegistration.swift)

Registers native push credentials with an account Convex JWT. iOS includes bundleId; Android does not. Caller ignores the result after the success envelope. Timeout leaves remote commit unknown.

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

**MUTATION** · [source](https://github.com/LodyAI/Lody/blob/61bd9701a5ed6899a9f42787df682acfc3fd7d4b/apps/mobile/ios/packages/LodyKit/Sources/LodyKit/Notifications/PushRegistration.swift)

Removes this installation registration using the original account credential/JWT. Caller ignores the result after the success envelope.

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
