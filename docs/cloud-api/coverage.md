# Coverage and evidence limits

Source snapshot: `LodyAI/Lody` revision
`61bd9701a5ed6899a9f42787df682acfc3fd7d4b`. Paths below are relative to that
repository. The source checkout was clean when this snapshot was produced.
No hosted backend, production account or private deployment configuration was
used. The reference documents what the public clients expose and expect.

## Included contracts

| Surface | Primary evidence | Representation |
| --- | --- | --- |
| 167 typed cloud operations | `packages/cloud-api/src/index.ts` and imported public DTOs | OpenAPI transport branches and expanded DTO schemas; `operations.md` |
| Five additional cloud calls | CLI auth/PR association and native push callers | `supplemental.json`, OpenAPI and `operations.md` |
| Native email/Google/browser authentication | Android `CloudAuthHttp.kt`, iOS `AuthAPI.swift` and `NativeAuthHandoff.swift` | Explicit HTTP routes and credential flow |
| Session and organization HTTP lookups/updates | Native account/settings clients | Observed requests and consumed response fields |
| CLI API key and ordinary pairing management | Component `cli-api-key.ts`, CLI `auth.ts`, shared key/pairing DTOs | Explicit HTTP routes and metadata schemas |
| History, preview, automation, lifecycle and report proofs | Component proof issuers; CLI `cloud-cli-port.ts` | HTTP mint/verify routes, partial action-specific payloads |
| Workspace Streams token | `packages/shared/src/loro-streams-auth.ts` | HTTP credential exchange only |
| Remote encrypted-machine claim | CLI `lib/e2ee/remote-pairing.ts`, transport and shared pairing schemas | HTTP claim, prepared material and status DTOs |
| Images, files, multipart transfer and avatars | Shared helpers, component upload clients and iOS attachment client | HTTP routes, headers, payloads and limits |
| Static share objects, resolution and agent links | `packages/shared/src/session-share-client.ts` and manifest schemas | HTTP data plane plus authenticated cloud publication operations |
| Public runtime artefacts and daemon channel manifests | CLI runtime/release clients, shared daemon schema and platform default | Versioned downloads and manifest schemas |
| Time and retained community QR | Shared time/community contracts | Public HTTP routes |

_Table 1: Contracts included in the reference, with their evidence and
representation._

The [source manifest](sources.json) hashes the specific source files consumed by
the extractor and authored route evidence. It records the complete operation
count and expressions requiring further interpretation. It is a provenance
record, not proof that the hosted service matches those bytes.

## Known discrepancies

### Multipart abort URL

`packages/shared/src/session-file.ts:getSessionFileMultipartAbortApiPath`
builds:

```plaintext
DELETE /api/workspaces/{workspaceId}/session-files/multipart/{uploadId}
```

`apps/mobile/ios/packages/LodyKit/Sources/LodyKit/Cloud/SessionAttachments.swift`
instead appends `/abort`. Both observed URLs appear in OpenAPI with an explicit
discrepancy note. The TypeScript client uses the shared helper. The public
source cannot establish which URL the private worker accepts. Verify the handler
before using multipart cleanup in a new client.

### Convex ingress and JSON encoding

Ordinary native functions target `convex.lody.ai`, while CLI key validation and
PR association explicitly target the configured auth/site origin. The latter
calls pass credentials in their arguments. Both origins occur in OpenAPI's
generic transport server list, with the limitation attached to the backend
entry.

Public upstream HTTP documentation specifies named arguments with
`format: "json"`. Native clients send `format: "convex_encoded_json"` and a
one-element argument array. The guide records this observation separately;
OpenAPI models the public JSON form. Deployment compatibility for SDK encodings
requires the matched Convex client/service versions.

### Response shapes and caller policies

The TypeScript file upload parser accepts both `{ file: reference }` and a bare
file reference; the iOS parser requires the wrapper. Both observed shapes are
represented. Error mappings are client policies, not exhaustive server status
guarantees. Image/file limits and retention constants are published policies;
this checkout cannot independently prove enforcement in hosted storage.

## SDK-mediated account operations

The source configures Better Auth organization, Convex and cross-domain plugins;
the CLI adds device authorization and API-key plugins. Public callers also use
the following SDK methods. Their presence is established, but a method name
alone does not establish its HTTP route, all plugin validation or deployment
settings. The OpenAPI document includes routes independently demonstrated by raw
HTTP clients; it does not mechanically turn every SDK method into an invented
URL.

| SDK methods | Public call sites and intent |
| --- | --- |
| `getSession`, `signOut`, `updateSession` | Component auth/session owners; account session lifecycle |
| `signIn.social`, `linkSocial`, `listAccounts` | Login and account settings; browser provider sign-in and linked accounts |
| `updateUser`, `changeEmail`, `changePassword` | Account settings and complete-email route |
| `requestPasswordReset`, `resetPassword` | Forgot/reset password routes |
| `deleteUser` | Account settings; follows owned-organization cleanup checks |
| `organization.list`, `setActive`, `create`, `update`, `delete`, `leave` | `packages/components/src/hooks/useOrganization.ts` |
| `organization.getInvitation`, `acceptInvitation` | `packages/components/src/routes/invite/$invitationId.tsx` |
| `organization.listInvitations`, `inviteMember`, `cancelInvitation` | Account settings and onboarding invite screen |
| `organization.removeMember`, `updateMemberRole` | Account settings; member management |
| `device.code`, `device.token` | CLI `lib/auth.ts`; device authorization grant and polling |
| `convex.token` | Component JWT owner; account JWT exchange |
| `$fetch('/electron/token')` | Electron auth service; SDK-relative browser callback exchange |

_Table 2: Account operations reached through the Better Auth SDK, and where they
are called._

React session/organization hooks are client state APIs, not additional cloud
routes. The browser social-sign-in variant sends `provider` and `callbackURL`;
OpenAPI's `/api/auth/sign-in/social` schema describes the independently observed
native Google ID-token variant. Add other variants only after establishing their
full wire contract. SDK-mediated operations remain part of the product API
inventory, even where the public checkout does not define a complete REST
schema.

## Constants, callbacks and internal boundaries

These names occur in the public source but do not establish a complete supported
end-user REST operation. They are retained here to make the inventory explicit.

| Path or pattern | Evidence and disposition |
| --- | --- |
| `/api/github/callback?setup_action=request` | Native GitHub settings authorization navigation and callback allowlist; full provider callback contract is private |
| `/api/auth/mobile/email-verified` | Native sign-up/verification callback URL; callback handler/redirect contract is private |
| `/api/sharing/read` | Exported constant in `packages/shared/src/session-sharing.ts`; no active HTTP caller found, so no method or body is asserted |
| `/api/share-agent/{token}` | Agent URL returned by the share client; URL validation is documented, content media/schema and full handler behaviour are not established |
| `/api/internal/account-data/purge-r2` | Internal account-data cleanup constant; not an end-user route |
| `/internal/account-data/purge-durable-object` | Internal cleanup constant; not an end-user route |
| `/api/loro-streams/server-token` | Server-to-server grant path; no public hosted handler contract |
| `/api/action/sessionBootstrap:bootstrapSessionCreateInStreams` | Signing-domain path constant; not evidence for a callable public REST route |

_Table 3: Paths and patterns that are constants, callbacks, or internal
boundaries._

`packages/shared/src/loro-server-auth.ts` publishes HMAC-SHA-256 signing
constants: `X-Lody-Signature`, `X-Lody-Timestamp`,
`X-Lody-Signature-Version: v1`, with canonical bytes formed by joining
timestamp, uppercased method, path and exact body using newlines. This does not
establish timestamp tolerance, key distribution, signature verification policy
or public access to the server-only paths above. They are therefore not
presented as ready-to-call client endpoints.

Local machine/session/schedule/project control, local Model Context Protocol
(MCP) HTTP, preview viewers, loopback credential brokers, provider API traffic,
GitHub's API and lab-only HTTP fixtures are outside the cloud REST contract. A
URL containing `/api/` is not sufficient to include it.

## Types requiring additional authority

The Agent Client Protocol (ACP) extension core submodule is not populated in the
inspected checkout. `ModelUsage`, imported by cloud usage DTOs, consequently
stays explicitly unexpanded. Its fields must be obtained from the matched
`acp-extension-core` revision rather than guessed from another usage payload.

The extractor retains structural fields but marks callback-based semantic
refinements for local machine names, command-pinned HTTPS origins, share titles
and share manifests. Examples include UTF-8 byte limits, graph/reference
validity, aggregate decoded size and allowed origin components. Consult the
original validator before accepting payloads; JSON Schema structure alone is
insufficient.

Preview device commands and automation settings are intentionally partial at
the HTTP proof boundary. They reference command contracts owned by the separate
RPC effort. Generic unknown response bodies are explicitly marked; they do not
pretend to establish fields the client ignores.

## Private implementation needed for stronger guarantees

The following cannot be completed truthfully from the supplied public checkout:

- A complete inventory of private or operator-only endpoints, webhooks and jobs.
- Exact authentication/authorization checks for every operation and role.
- Complete Better Auth plugin route schemas, cookie, cross-origin resource
  sharing (CORS), and cross-site request forgery (CSRF) policy and redirect
  allowlists for each deployment.
- Exhaustive HTTP status/error codes, throttling, quotas and retry headers.
- Server-side request length limits where only a TypeScript DTO exists.
- A versioning/deprecation policy or third-party availability commitment.
- Resolution of the multipart abort discrepancy and proof of worker enforcement.
- A realtime channel/message contract suitable for AsyncAPI in this scope.

These gaps do not justify importing Flock, Loro usage or Streams RPC into this
effort. Their separate documentation should link to the cloud token/proof
exchanges where relevant, while retaining ownership of their own data and wire
protocols.
