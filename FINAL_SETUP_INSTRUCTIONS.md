# ✅ Final Setup Instructions

## 🎉 Great News!

Your Okta IGA MCP server is **fully configured and working**! The authentication with DPoP is successful. You just need to grant the required scopes in your Okta Admin Console.

---

## 📋 Next Steps

### Step 1: Grant OAuth Scopes to Your Service App

1. **Open Okta Admin Console**: https://craigverzosa.oktapreview.com/admin
2. Go to **Applications** → **Applications**
3. Find and click on your service app (Client ID: `0oathievo49n5FQEQ1d7`)
4. Go to the **Okta API Scopes** tab
5. Click **Grant** for these scopes:

#### Required Scopes for IGA:
```
✅ okta.governance.accessCertifications.read
✅ okta.governance.accessCertifications.manage
✅ okta.governance.accessRequests.read
✅ okta.governance.accessRequests.manage
✅ okta.governance.entitlements.read
```

#### Optional Scopes (for additional features):
```
⚪ okta.users.read         - To look up user details
⚪ okta.groups.read        - To look up group details
⚪ okta.apps.read          - To look up application details
⚪ okta.logs.read          - To view audit logs
```

6. Click **Save** after granting scopes

---

### Step 2: Configure Cursor to Use the MCP Server

#### Option A: Global Configuration (Recommended)

1. **Open Cursor Settings**:
   - Press `Cmd + ,` (Mac) or `Ctrl + ,` (Windows/Linux)
   - Search for "MCP" or go to **Features** → **Model Context Protocol**

2. **Edit MCP Configuration**:
   - Click "Edit Config" or "Configure MCP Servers"
   - This opens your global MCP configuration file

3. **Add this configuration**:
   ```json
   {
     "mcpServers": {
       "okta-iga": {
         "command": "node",
         "args": ["/Users/craigverzosa/Documents/OIGMCP/dist/index.js"],
         "env": {
           "OKTA_DOMAIN": "https://craigverzosa.oktapreview.com",
           "OKTA_CLIENT_ID": "0oathievo49n5FQEQ1d7",
           "OKTA_PRIVATE_KEY_PATH": "/Users/craigverzosa/Documents/OIGMCP/private-key.pem"
         }
       }
     }
   }
   ```

   **Note:** If you already have other MCP servers configured, just add the `"okta-iga"` section inside the existing `"mcpServers"` object.

4. **Save the file**

5. **Restart Cursor** (Quit completely with `Cmd + Q`, then reopen)

#### Option B: Project-Specific Configuration

If you prefer to configure it just for this project:

1. Create `.cursor/mcp.json` in your project root
2. Use the same JSON configuration as above
3. Restart Cursor

---

### Step 3: Verify It's Working

After restarting Cursor and granting the scopes:

1. **Open a new chat in Cursor**

2. **Try this command**:
   ```
   Show me all active certification campaigns in my Okta org
   ```

3. **Or try**:
   ```
   List all entitlements with HIGH risk level
   ```

4. **Or simply**:
   ```
   What IGA tools do I have available?
   ```

---

## 🧪 Test from Command Line

You can also test the server directly from the command line:

```bash
cd /Users/craigverzosa/Documents/OIGMCP

# Set environment variables
export OKTA_DOMAIN="https://craigverzosa.oktapreview.com"
export OKTA_CLIENT_ID="0oathievo49n5FQEQ1d7"
export OKTA_PRIVATE_KEY_PATH="/Users/craigverzosa/Documents/OIGMCP/private-key.pem"

# Test listing campaigns (after granting scopes)
node dist/cli.js call iga_campaigns_list '{}'

# Test listing entitlements
node dist/cli.js call iga_entitlements_list '{}'

# List all available tools
node dist/cli.js tools
```

---

## 🎯 What You Can Do

Once configured, you'll have **63 AI-powered tools** to manage Okta Identity Governance:

### 📊 Access Certifications
- Create, launch, and manage certification campaigns
- Review access rights and make decisions
- Bulk approve/deny review items
- Track campaign statistics

### 🎫 Access Requests
- Submit and manage access requests
- Approve or deny pending requests
- Browse the access catalog
- View request history and events

### 🔐 Entitlements & Grants
- List entitlements and their risk levels
- View user access grants
- Analyze effective permissions
- Track entitlement assignments

### ⚙️ Admin Configuration
- Configure request approval workflows
- Set up conditional access policies
- Manage approval sequences
- Configure resource-specific settings

### 👤 End-User Self-Service
- View my pending requests
- Browse available catalogs
- Submit self-service requests
- Process approval tasks

---

## 🔍 Example Prompts

Try these after setup:

**Access Reviews:**
> "Create a quarterly certification campaign for all Finance department users"

**User Access:**
> "What access does john.doe@company.com currently have?"

**Pending Approvals:**
> "Show me all pending access requests that need my approval"

**Risk Analysis:**
> "Find all HIGH or CRITICAL risk entitlements in the system"

**Catalog Browsing:**
> "What applications can users in the Marketing group request access to?"

**Bulk Operations:**
> "Approve all pending review items for user jane.smith@company.com"

---

## 📁 Files Created

Here's what was set up for you:

```
/Users/craigverzosa/Documents/OIGMCP/
├── private-key.pem                    # ✅ Converted PEM key (from JWK)
├── cursor-mcp-config.json             # ✅ Configuration template
├── convert-jwk-to-pem.js              # 🔧 Key conversion utility
├── debug-api-call.js                  # 🔍 Debug/testing script
├── dist/                              # ✅ Compiled MCP server
│   ├── index.js                       # Main entry point
│   ├── cli.js                         # CLI tool
│   └── ...                            # Other compiled files
└── src/                               # ✅ Updated source with DPoP support
    ├── index.ts                       # MCP server
    ├── okta/
    │   ├── client.ts                  # HTTP client with DPoP
    │   └── oauthServiceApp.ts         # OAuth with DPoP + nonce handling
    └── ...
```

---

## 🔧 Technical Changes Made

I've made several enhancements to support your Okta org:

### 1. **JWK to PEM Conversion**
   - Your private key was in JWK (JSON Web Key) format
   - Converted it to PKCS#8 PEM format required by the MCP server
   - File: `private-key.pem`

### 2. **DPoP Authentication**
   - Added full DPoP (Demonstrating Proof-of-Possession) support
   - Generates ephemeral EC key pairs for DPoP proofs
   - Handles DPoP nonce challenges automatically
   - Ensures unique client assertions on retry

### 3. **Token Management**
   - Automatic token caching with refresh
   - Proper DPoP proof generation for all API calls
   - HTU correctly formatted (without query parameters)
   - Nonce tracking across requests

### 4. **Security Improvements**
   - Each client assertion uses a unique JTI
   - DPoP proofs include access token hash (ath claim)
   - Proper nonce handling prevents replay attacks

---

## 🐛 Troubleshooting

### "403 Forbidden" Error
**Cause:** Service app doesn't have required scopes granted  
**Solution:** Follow Step 1 above to grant scopes in Okta Admin Console

### "MCP Server Not Appearing in Cursor"
**Cause:** Configuration not loaded or Cursor not restarted  
**Solution:**
1. Verify the configuration is in the correct location
2. Check for JSON syntax errors
3. Completely quit Cursor (`Cmd + Q`) and reopen

### "Token Request Failed"
**Cause:** Invalid credentials or key mismatch  
**Solution:**
1. Verify `OKTA_CLIENT_ID` is correct
2. Ensure `private-key.pem` matches the public key in Okta
3. Check that the service app is active (not deactivated)

### "Cannot Find Module" or "Path Not Found"
**Cause:** Incorrect file paths in configuration  
**Solution:** Verify these paths exist:
- `/Users/craigverzosa/Documents/OIGMCP/dist/index.js`
- `/Users/craigverzosa/Documents/OIGMCP/private-key.pem`

---

##  Success Indicators

You'll know everything is working when:

1. ✅ Cursor shows the "okta-iga" MCP server as connected
2. ✅ You can ask questions about IGA and get responses
3. ✅ Tools return data instead of permission errors
4. ✅ The server shows "Okta IGA MCP server started" in logs

---

## 📚 Additional Resources

- **Full Documentation**: See `README.md` in this folder
- **Tool Descriptions**: Run `node dist/cli.js tools` for the complete list
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Okta IGA API Docs**: https://developer.okta.com/docs/api/openapi/okta-management/

---

## 🙋 Need Help?

If you encounter issues after following these steps:

1. Check the Cursor logs: **Help → Show Logs**
2. Test from command line to isolate the issue
3. Verify scopes are granted in Okta Admin Console
4. Ensure the service app is active and not expired

---

**You're all set! Grant the scopes and start using the MCP server in Cursor!** 🚀

