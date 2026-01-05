# Okta IGA MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for Okta Identity Governance (IGA) APIs. Enables AI agents to manage access certifications, access requests, entitlements, grants, and administrative configuration in your Okta org.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [VS Code (GitHub Copilot)](#with-vs-code-github-copilot)
  - [Claude Desktop](#with-claude-desktop)
  - [Cursor](#with-cursor)
- [Available Tools](#available-tools)
- [Tool Features](#tool-features)
  - [Fields Projection](#fields-projection)
  - [Pagination](#pagination)
  - [Error Handling](#error-handling)
  - [Rate Limiting](#rate-limiting)
- [Example Prompts](#example-prompts)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Features

- **63 tools** covering the full Okta IGA API surface:
  - Access Certifications: campaigns, reviews, review items (read + write)
  - Access Requests: requests, events, catalog items, packages (read + write)
  - Entitlements & Grants: entitlements, grants, bundles, resources (read)
  - Admin v2: request settings, conditions, approval sequences (read + write)
  - End-user v2: my requests, my catalog, my tasks (read + write)
- **Service-app OAuth** authentication using `private_key_jwt`
- **Automatic token caching** with proactive refresh
- **Rate limit awareness** with proactive throttling and retry logic
- **Structured error responses** with actionable suggestions
- **Fields projection** to limit response size and reduce token usage
- **Consistent pagination** via `nextAfter` cursors

---

## Prerequisites

### 1. Okta Org with Identity Governance

Your Okta org must have Identity Governance (IGA) enabled. This is an add-on feature - contact your Okta representative if not already enabled.

### 2. OAuth 2.0 Service App

Create a service app in Okta for machine-to-machine authentication:

1. Go to **Okta Admin Console** → **Applications** → **Create App Integration**
2. Select **API Services** (machine-to-machine)
3. Name it (e.g., "IGA MCP Server")
4. Under **Client Credentials**, select **Public key / Private key**
5. Click **Add Key** → **Generate new key**
6. **Save the private key** (PEM format) - you'll need this for configuration
7. Copy the **Client ID**

### 3. Grant OAuth Scopes

In the Okta Admin Console, grant the required scopes to your service app:

1. Go to **Security** → **API** → **Tokens (Scopes)**
2. Or in newer UI: **Applications** → Your App → **Okta API Scopes**
3. Grant the following scopes:

```
# IGA - Access Certifications
okta.governance.accessCertifications.read
okta.governance.accessCertifications.manage

# IGA - Access Requests
okta.governance.accessRequests.read
okta.governance.accessRequests.manage

# IGA - Entitlements (read-only)
okta.governance.entitlements.read

# Optional: Core Okta Management (for ID resolution)
okta.users.read
okta.groups.read
okta.apps.read
okta.logs.read
```

> **Note**: Use only `.read` scopes if you want read-only access. Exact scope names may vary by Okta org configuration.

---

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd okta-iga-mcp

# Install dependencies
npm install

# Build the TypeScript source
npm run build

# Verify the build
ls dist/index.js
```

---

## Configuration

### Environment Variables

Create a `.env` file or pass environment variables directly:

```bash
cp .env.example .env
# Edit .env with your Okta credentials
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OKTA_DOMAIN` | Yes | - | Your Okta org URL (e.g., `https://your-org.okta.com`) |
| `OKTA_CLIENT_ID` | Yes | - | OAuth service app client ID |
| `OKTA_PRIVATE_KEY` | Yes* | - | Private key (PEM format) for JWT signing |
| `OKTA_PRIVATE_KEY_PATH` | Yes* | - | Path to private key file (alternative to inline) |
| `OKTA_SCOPES` | No | IGA read/manage | Space-separated OAuth scopes |
| `OKTA_AUTH_SERVER_ID` | No | `""` (org AS) | Custom auth server ID |
| `OKTA_TIMEOUT_MS` | No | `30000` | HTTP request timeout (ms) |
| `OKTA_MAX_RETRIES` | No | `3` | Max retries on 429/5xx errors |

*Either `OKTA_PRIVATE_KEY` or `OKTA_PRIVATE_KEY_PATH` must be set.

### Private Key Format

The private key should be in PEM format:

```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASC...
...
-----END PRIVATE KEY-----
```

When setting `OKTA_PRIVATE_KEY` inline, use `\n` for newlines:

```bash
OKTA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvg...\n-----END PRIVATE KEY-----"
```

---

## Usage

### With VS Code (GitHub Copilot)

Add to your workspace's `.vscode/mcp.json`:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "okta-domain",
      "description": "Okta domain (e.g., https://your-org.okta.com)"
    },
    {
      "type": "promptString",
      "id": "okta-client-id",
      "description": "Okta OAuth Client ID"
    },
    {
      "type": "promptString",
      "id": "okta-private-key",
      "description": "Okta private key (PEM format)",
      "password": true
    }
  ],
  "servers": {
    "okta-iga": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "env": {
        "OKTA_DOMAIN": "${input:okta-domain}",
        "OKTA_CLIENT_ID": "${input:okta-client-id}",
        "OKTA_PRIVATE_KEY": "${input:okta-private-key}"
      }
    }
  }
}
```

Then in Copilot Chat, type `@okta-iga` to invoke the tools.

### With Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "okta-iga": {
      "command": "node",
      "args": ["/absolute/path/to/okta-iga-mcp/dist/index.js"],
      "env": {
        "OKTA_DOMAIN": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "0oaxxxxxxxxxx",
        "OKTA_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
      }
    }
  }
}
```

### With Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "okta-iga": {
      "command": "node",
      "args": ["/absolute/path/to/okta-iga-mcp/dist/index.js"],
      "env": {
        "OKTA_DOMAIN": "https://your-org.okta.com",
        "OKTA_CLIENT_ID": "0oaxxxxxxxxxx",
        "OKTA_PRIVATE_KEY_PATH": "/path/to/private-key.pem"
      }
    }
  }
}
```

---

## Available Tools

### Access Certifications

| Tool | Type | Description |
|------|------|-------------|
| `iga_campaigns_list` | Read | List certification campaigns with filters |
| `iga_campaigns_get` | Read | Get campaign details, scope, and statistics |
| `iga_reviews_list` | Read | List reviews within a campaign |
| `iga_reviews_get` | Read | Get review status and item counts |
| `iga_review_items_list` | Read | List access items to be certified |
| `iga_campaigns_create` | Write | Create a new certification campaign |
| `iga_campaigns_launch` | Write | Launch a scheduled campaign |
| `iga_campaigns_end` | Write | End an active campaign |
| `iga_campaigns_delete` | Write | Delete a scheduled campaign |
| `iga_review_items_decide` | Write | Approve/deny/abstain a review item |
| `iga_review_items_reassign` | Write | Reassign item to another reviewer |
| `iga_review_items_bulk_decide` | Write | Bulk decision on multiple items |
| `iga_reviews_complete` | Write | Mark a review as completed |

### Access Requests

| Tool | Type | Description |
|------|------|-------------|
| `iga_requests_list` | Read | List access requests with filters |
| `iga_requests_get` | Read | Get request details and approval status |
| `iga_request_events_list` | Read | List request history/audit events |
| `iga_catalog_items_list` | Read | List requestable catalog items |
| `iga_catalog_items_get` | Read | Get catalog item details |
| `iga_packages_list` | Read | List access packages |
| `iga_packages_get` | Read | Get package details and included items |
| `iga_requests_create` | Write | Submit a new access request |
| `iga_requests_approve` | Write | Approve a pending request |
| `iga_requests_deny` | Write | Deny a pending request |
| `iga_requests_cancel` | Write | Cancel a pending request |
| `iga_requests_reassign` | Write | Reassign to different approver |

### Entitlements & Grants

| Tool | Type | Description |
|------|------|-------------|
| `iga_entitlements_list` | Read | List entitlements with filters |
| `iga_entitlements_get` | Read | Get entitlement details and risk level |
| `iga_grants_list` | Read | List grants (entitlement assignments) |
| `iga_grants_get` | Read | Get grant details and source |
| `iga_users_grants_list` | Read | List all grants for a user |
| `iga_entitlements_grants_list` | Read | List all grants for an entitlement |
| `iga_bundles_list` | Read | List entitlement bundles |
| `iga_bundles_get` | Read | Get bundle and included entitlements |
| `iga_resources_list` | Read | List governed resources |
| `iga_resources_get` | Read | Get governed resource details |
| `iga_principal_access_get` | Read | Get effective access for user/group |
| `iga_resources_entitlements_list` | Read | List entitlements for a resource |

### Admin v2 - Request Configuration

| Tool | Type | Description |
|------|------|-------------|
| `iga_admin_v2_request_settings_get_global` | Read | Get org-level request settings |
| `iga_admin_v2_request_settings_update_global` | Write | Update org-level settings |
| `iga_admin_v2_request_settings_get_resource` | Read | Get resource-specific settings |
| `iga_admin_v2_request_settings_upsert_resource` | Write | Set resource-specific settings |
| `iga_admin_v2_request_settings_delete_resource` | Write | Revert to global defaults |
| `iga_admin_v2_conditions_list` | Read | List request conditions |
| `iga_admin_v2_conditions_get` | Read | Get condition details |
| `iga_admin_v2_conditions_create` | Write | Create request condition |
| `iga_admin_v2_conditions_update` | Write | Update request condition |
| `iga_admin_v2_conditions_delete` | Write | Delete request condition |
| `iga_admin_v2_sequences_list` | Read | List approval sequences |
| `iga_admin_v2_sequences_get` | Read | Get approval sequence details |
| `iga_admin_v2_sequences_create` | Write | Create approval sequence |
| `iga_admin_v2_sequences_update` | Write | Update approval sequence |
| `iga_admin_v2_sequences_delete` | Write | Delete approval sequence |

### End-User v2 - Self-Service

| Tool | Type | Description |
|------|------|-------------|
| `iga_user_v2_my_requests_list` | Read | List my submitted requests |
| `iga_user_v2_my_requests_get` | Read | Get my request details |
| `iga_user_v2_my_requests_create` | Write | Submit self-service request |
| `iga_user_v2_my_requests_cancel` | Write | Cancel my pending request |
| `iga_user_v2_my_catalogs_list` | Read | List catalogs available to me |
| `iga_user_v2_my_catalog_items_list` | Read | List items in a catalog |
| `iga_user_v2_my_catalog_items_search` | Read | Search across all my catalogs |
| `iga_user_v2_my_tasks_list` | Read | List my pending approval tasks |
| `iga_user_v2_my_tasks_get` | Read | Get task details |
| `iga_user_v2_my_tasks_approve` | Write | Approve a task |
| `iga_user_v2_my_tasks_deny` | Write | Deny a task |

---

## Tool Features

### Fields Projection

Reduce response size by requesting only specific fields:

```json
{
  "tool": "iga_campaigns_list",
  "arguments": {
    "status": "ACTIVE",
    "fields": ["id", "name", "status", "statistics"]
  }
}
```

Or as a comma-separated string:

```json
{
  "fields": "id,name,status"
}
```

This is especially useful for list operations to reduce token usage.

### Pagination

List operations return paginated responses:

```json
{
  "items": [...],
  "nextAfter": "cursor_string",
  "nextLink": "https://..."
}
```

To get the next page, pass `nextAfter` to the same tool:

```json
{
  "tool": "iga_campaigns_list",
  "arguments": {
    "status": "ACTIVE",
    "after": "cursor_string"
  }
}
```

### Error Handling

Errors return structured responses with actionable suggestions:

```json
{
  "type": "not_found_error",
  "message": "Resource not found: Campaign with ID xyz",
  "statusCode": 404,
  "errorCode": "E0000007",
  "errorId": "oae123abc",
  "suggestion": "Resource not found. Verify the ID is correct using the corresponding list tool.",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Error types:
- `api_error` - General API error
- `validation_error` - Invalid request parameters
- `rate_limit_error` - Rate limit exceeded (includes `retryAfterMs`)
- `network_error` - Connection/timeout issues
- `auth_error` - Authentication/authorization failure
- `not_found_error` - Resource not found

### Rate Limiting

The server automatically handles Okta rate limits:

1. **Automatic retry** on 429 responses with exponential backoff
2. **Proactive throttling** when approaching limits (< 10% remaining)
3. **Rate limit info** in error responses:

```json
{
  "type": "rate_limit_error",
  "message": "Rate limit exceeded",
  "retryAfterMs": 5000,
  "rateLimitRemaining": 0,
  "rateLimitReset": 1705312200,
  "suggestion": "Rate limit exceeded. Wait for retryAfterMs before retrying, or reduce request frequency."
}
```

---

## Example Prompts

Here are example prompts you can use with the MCP server:

**List active certification campaigns:**
> "Show me all active certification campaigns"

**Check a user's access:**
> "What access does user john.doe@company.com have?"

**Review pending requests:**
> "List all pending access requests and show who's waiting for approval"

**Find high-risk entitlements:**
> "Show me all entitlements with HIGH or CRITICAL risk level"

**Create a certification campaign:**
> "Create a quarterly user access review campaign for the Finance department"

**Approve a request:**
> "Approve access request REQ123 with the comment 'Approved per manager request'"

**Search the catalog:**
> "What applications can I request access to?"

---

## Development

```bash
# Run in development mode (auto-recompile)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Watch mode for development
npm run watch
```

### Project Structure

```
okta-iga-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── config.ts             # Configuration loading
│   ├── mcp/
│   │   └── tools.ts          # Tool definitions and schemas
│   └── okta/
│       ├── client.ts         # HTTP client with retry/rate-limit
│       ├── oauthServiceApp.ts # OAuth token management
│       └── iga/
│           ├── accessCertifications.ts
│           ├── accessRequests.ts
│           ├── accessRequestsAdminV2.ts
│           ├── accessRequestsEndUserV2.ts
│           └── entitlements.ts
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Troubleshooting

### "Authentication failed" errors

1. Verify `OKTA_CLIENT_ID` is correct
2. Check the private key matches the public key registered in Okta
3. Ensure the service app is active (not deactivated)
4. Verify required scopes are granted to the app

### "Rate limit exceeded" errors

The server automatically retries, but if you see persistent issues:
1. Reduce request frequency
2. Use `fields` projection to reduce response processing
3. Increase `OKTA_MAX_RETRIES` if needed

### "Resource not found" errors

1. Use the corresponding `*_list` tool to verify valid IDs
2. Check that the resource exists and is accessible
3. Verify the service app has the required scopes

### Connection/timeout errors

1. Verify `OKTA_DOMAIN` is correct (include `https://`)
2. Check network connectivity to Okta
3. Increase `OKTA_TIMEOUT_MS` for slow networks

### "Invalid scope" errors

1. Check Okta Admin Console → Security → API → Tokens
2. Verify scope names match exactly (case-sensitive)
3. Some scopes require Okta support to enable

---

## License

MIT
