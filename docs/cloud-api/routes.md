# HTTP route index

Generated from the OpenAPI document. Consult each operation for its credential,
payload, and evidence limits. `backend` means <https://backend.lody.ai>;
`worker` means <https://api.lody.ai>; `convex` means <https://convex.lody.ai>.

| Method | Path | Origin | Operation |
| --- | --- | --- | --- |
| POST | `/api/auth/sign-in/email` | backend | Sign in with email and password |
| POST | `/api/auth/sign-up/email` | backend | Register with email and password |
| POST | `/api/auth/sign-in/social` | backend | Sign in with a Google ID token |
| POST | `/api/auth/send-verification-email` | backend | Send verification email |
| POST | `/api/auth/request-password-reset` | backend | Request password reset |
| GET | `/api/auth/mobile/start` | backend | Start GitHub or Discord native browser sign-in |
| POST | `/api/auth/mobile/exchange` | backend | Exchange the native callback code |
| GET | `/api/auth/get-session` | backend | Resolve the current account session |
| GET | `/api/auth/convex/token` | backend | Exchange a session credential for a Convex JWT |
| POST | `/api/auth/sign-out` | backend | Sign out the account session |
| GET | `/api/auth/organization/list` | backend | List the current account workspaces |
| GET | `/api/auth/organization/list-members` | backend | Page through organization members |
| GET | `/api/auth/organization/get-full-organization` | backend | Read organization and member metadata |
| GET | `/api/auth/device` | backend | Verify a device authorization user code |
| POST | `/api/cli/device/approve` | backend | Approve a CLI device authorization request |
| POST | `/api/cli/api-key/create` | backend | Create an automatic or manual CLI API key |
| POST | `/api/cli/api-key/list` | backend | List CLI key metadata |
| POST | `/api/cli/api-key/revoke` | backend | Revoke a CLI API key |
| POST | `/api/cli/machine-pairing/create` | backend | Create a short-lived machine connection token |
| POST | `/api/cli/machine-pairing/exchange` | backend | Exchange a connection token for a temporary machine API key |
| POST | `/api/account/verify-password` | backend | Verify the current account password |
| POST | `/api/session-history/request-token` | backend | Mint a session history read proof |
| POST | `/api/session-history/request-token-cli` | backend | Mint a session history read proof |
| POST | `/api/session-history/request-edit-token` | backend | Mint a session history edit proof |
| POST | `/api/session-history/request-edit-token-cli` | backend | Mint a session history edit proof |
| POST | `/api/session-history/verify` | backend | Verify a relayed session history proof |
| POST | `/api/session-history/verify-edit` | backend | Verify a relayed session history proof |
| POST | `/api/session-preview/request-token` | backend | Mint an exact remote preview intent proof |
| POST | `/api/session-preview/verify` | backend | Verify a remote preview intent proof |
| POST | `/api/session-automation/request-token` | backend | Mint an exact remote automation intent proof |
| POST | `/api/session-automation/verify` | backend | Verify a remote automation intent proof |
| POST | `/api/machine-lifecycle/request-token` | backend | Mint a machine restart or upgrade proof |
| POST | `/api/ios-simulator/ice-servers` | backend | Obtain short-lived simulator relay configuration |
| POST | `/api/bug-reports/request-token` | backend | Mint proof of the requester of machine logs |
| POST | `/api/bug-reports/create` | backend | Create a user or machine-backed bug report |
| POST | `/api/bug-reports/client-diagnostics` | backend | Attach client diagnostics to a bug report |
| POST | `/api/loro-streams/token` | backend | Obtain a workspace Streams grant |
| POST | `/api/e2ee/machine-pairing/claim` | command-pinned ingress | Claim an encrypted machine pairing offer |
| POST | `/api/workspaces/{workspaceId}/session-images/upload` | worker | Upload one session image |
| POST | `/api/workspaces/{workspaceId}/session-files/upload` | worker | Upload a file of at most 16 MiB |
| POST | `/api/workspaces/{workspaceId}/session-files/multipart/create` | worker | Reserve a multipart file upload |
| PUT | `/api/workspaces/{workspaceId}/session-files/multipart/{uploadId}/part/{partNumber}` | worker | Upload one numbered part |
| POST | `/api/workspaces/{workspaceId}/session-files/multipart/{uploadId}/complete` | worker | Complete an upload with ordered part receipts |
| DELETE | `/api/workspaces/{workspaceId}/session-files/multipart/{uploadId}` | worker | Abort an incomplete multipart upload |
| DELETE | `/api/workspaces/{workspaceId}/session-files/multipart/{uploadId}/abort` | worker | Abort an incomplete multipart upload |
| GET | `/api/workspaces/{workspaceId}/session-images/{sessionId}/{imageId}` | worker | Download session images |
| GET | `/api/workspaces/{workspaceId}/session-images/{sessionId}/{imageId}/thumbnail` | worker | Get an image thumbnail |
| GET | `/api/workspaces/{workspaceId}/session-files/{sessionId}/{fileId}` | worker | Download session files |
| GET | `/api/workspaces/{workspaceId}/session-files/{sessionId}/{fileId}/preview` | worker | Read a bounded text preview |
| POST | `/api/workspaces/{workspaceId}/avatars/upload` | worker | Upload a user or workspace avatar |
| GET | `/api/avatars/{avatarId}` | worker | Read a public avatar |
| GET | `/api/shares/{shareId}` | worker | Resolve a static share to a fixed deployment |
| GET | `/api/shares/{shareId}/deployments/{deploymentId}/objects/{objectId}` | worker | Read one manifest-listed share object |
| POST | `/api/shares/{shareId}/deployments/{deploymentId}/agent/{conversationId}` | worker | Mint a short-lived agent access URL |
| PUT | `/api/share-deployments/{deploymentId}/objects/{objectId}` | worker | Upload a verified object into a draft deployment |
| POST | `/api/share-deployments/{deploymentId}/seal` | worker | Seal an uploaded deployment with its manifest |
| GET | `/api/time` | worker | Read server time in milliseconds |
| GET | `/api/community/wechat-qr` | worker | Read the legacy community QR image |
| GET | `/api/cli/latest-version` | backend | Read the latest CLI package version |
| GET | `/api/runtimes/{distribution}/channels/{platform}/{channel}.json` | worker | Read a managed daemon channel manifest |
| GET | `/api/runtimes/{distribution}/{version}/{platform}/{fileName}` | worker | Download a versioned runtime artefact |
| POST | `/api/auth/organization/update` | backend | Update the organization name or logo |
| POST | `/api/query` | convex | Call a public Convex query |
| POST | `/api/mutation` | convex | Call a public Convex mutation |
| POST | `/api/action` | convex | Call a public Convex action |

_Table 1: Every documented HTTP route, with its origin and operation._
