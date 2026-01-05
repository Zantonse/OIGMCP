# Cursor Integration Setup Guide

This MCP server is now **built and ready to use**! Follow these steps to integrate it with Cursor.

## ✅ What's Already Done

- ✅ Project built successfully (`dist/` folder created)
- ✅ Configuration template created (`cursor-mcp-config.json`)

## 🔧 Next Steps

### Option 1: Configure in Cursor Settings (Recommended)

1. **Open Cursor Settings**
   - Press `Cmd + ,` (Mac) or `Ctrl + ,` (Windows/Linux)
   - Go to "Features" → "Model Context Protocol"

2. **Add MCP Server**
   - Click "Add MCP Server" or "Edit Config"
   - This will open your global Cursor MCP configuration file

3. **Add the Okta IGA Server**
   - Copy the contents from `cursor-mcp-config.json` in this project
   - Update these values with your actual Okta credentials:
     - `OKTA_DOMAIN`: Your Okta org URL (e.g., `https://your-org.okta.com`)
     - `OKTA_CLIENT_ID`: Your OAuth service app client ID
     - `OKTA_PRIVATE_KEY_PATH`: Path to your private key PEM file

   **Example:**
   ```json
   {
     "mcpServers": {
       "okta-iga": {
         "command": "node",
         "args": ["/Users/craigverzosa/Documents/OIGMCP/dist/index.js"],
         "env": {
           "OKTA_DOMAIN": "https://your-org.okta.com",
           "OKTA_CLIENT_ID": "0oabc123xyz",
           "OKTA_PRIVATE_KEY_PATH": "/Users/craigverzosa/.okta/private-key.pem"
         }
       }
     }
   }
   ```

4. **Save and Restart Cursor**
   - Save the configuration file
   - Restart Cursor to load the MCP server

### Option 2: Use Environment Variables

Alternatively, you can create a `.env` file in this project:

1. **Create `.env` file** in the project root:
   ```bash
   OKTA_DOMAIN=https://your-org.okta.com
   OKTA_CLIENT_ID=0oabc123xyz
   OKTA_PRIVATE_KEY_PATH=/path/to/private-key.pem
   ```

2. **Update Cursor config** to use the project directory:
   ```json
   {
     "mcpServers": {
       "okta-iga": {
         "command": "node",
         "args": ["/Users/craigverzosa/Documents/OIGMCP/dist/index.js"],
         "cwd": "/Users/craigverzosa/Documents/OIGMCP"
       }
     }
   }
   ```

## 🔑 Getting Okta Credentials

If you don't have your Okta credentials yet, follow these steps:

### 1. Create OAuth Service App in Okta

1. Go to **Okta Admin Console** → **Applications** → **Create App Integration**
2. Select **API Services** (machine-to-machine)
3. Name it (e.g., "IGA MCP Server")
4. Under **Client Credentials**, select **Public key / Private key**
5. Click **Add Key** → **Generate new key**
6. **Save the private key** (PEM format) to a secure location
7. Copy the **Client ID**

### 2. Grant Required OAuth Scopes

1. Go to **Security** → **API** → **Tokens (Scopes)**
2. Or: **Applications** → Your App → **Okta API Scopes**
3. Grant these scopes:
   - `okta.governance.accessCertifications.read`
   - `okta.governance.accessCertifications.manage`
   - `okta.governance.accessRequests.read`
   - `okta.governance.accessRequests.manage`
   - `okta.governance.entitlements.read`
   - Optional: `okta.users.read`, `okta.groups.read`, `okta.apps.read`

## 🧪 Testing the Integration

After configuration, test it in Cursor:

1. Open a new chat in Cursor
2. The MCP server should appear in the available tools
3. Try a test command like:
   ```
   List all active certification campaigns in my Okta org
   ```

## 📚 Available Tools

Once integrated, you'll have access to **63 Okta IGA tools**:

### Access Certifications
- List/get campaigns, reviews, and review items
- Create campaigns, make decisions, reassign items

### Access Requests
- List/get requests, catalog items, packages
- Submit requests, approve/deny, reassign

### Entitlements & Grants
- List entitlements, grants, bundles, resources
- Get user access, resource permissions

### Admin Configuration
- Manage request settings, conditions, approval sequences

### End-User Self-Service
- View my requests, my catalogs, my tasks
- Submit requests, approve/deny tasks

## 🎯 Example Prompts

Try these prompts once integrated:

- "Show me all active certification campaigns"
- "What access does user john.doe@company.com have?"
- "List all pending access requests"
- "Create a quarterly user access review campaign"
- "What applications can I request access to?"

## 🔍 Troubleshooting

### "Authentication failed"
- Verify `OKTA_CLIENT_ID` is correct
- Check the private key matches the public key in Okta
- Ensure required scopes are granted

### MCP server not appearing
- Restart Cursor after configuration changes
- Check Cursor logs: Help → Show Logs
- Verify the path to `dist/index.js` is correct

### Connection errors
- Verify `OKTA_DOMAIN` includes `https://`
- Check network connectivity to Okta
- Test with the CLI tool: `npm run cli -- tools`

## 📖 More Information

For detailed documentation, see the [README.md](./README.md) file.

---

**Need Help?** Check the [Troubleshooting](./README.md#troubleshooting) section in the README.

