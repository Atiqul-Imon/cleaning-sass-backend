# Fix SSH Key Authentication Error

## The Problem
```
ssh: handshake failed: ssh: unable to authenticate, attempted methods [none publickey], no supported methods remain
```

## The Solution

Your SSH key in GitHub secrets needs to be updated. Here's the exact key to use:

### Step 1: Copy This Exact Key

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACC8GEOdncmOa2diwvS7r7LkCahMi81jb63j7e2q4t3cywAAAKg5qxQLOasU
CwAAAAtzc2gtZWQyNTUxOQAAACC8GEOdncmOa2diwvS7r7LkCahMi81jb63j7e2q4t3cyw
AAAEAMSpoNJ++unbFH1h3NvYf8xFNdSDqfuKdoxvbi+PKMGbwYQ52dyY5rZ2LC9LuvsuQJ
qEyLzWNvrePt7ari3dzLAAAAIWF0aXF1bC1pc2xhbUBhdGlxdWwtaXNsYW0tTVMtN0Q0OA
ECAwQ=
-----END OPENSSH PRIVATE KEY-----
```

### Step 2: Update GitHub Secret

1. Go to: https://github.com/Atiqul-Imon/cleaning-sass-backend/settings/secrets/actions
2. Find `DO_SSH_KEY` and click the **pencil icon** (edit)
3. **Delete everything** in the value field
4. **Paste the exact key above** (all 7 lines)
5. Make sure there are:
   - ✅ No extra spaces before `-----BEGIN`
   - ✅ No extra spaces after `-----END`
   - ✅ No extra newlines at the start or end
   - ✅ All 7 lines are included
6. Click **Update secret**

### Step 3: Test Again

1. Go to **Actions** tab
2. Click **Deploy Backend to Digital Ocean**
3. Click **Run workflow** → **Run workflow**

## Common Mistakes to Avoid

❌ **Don't add extra spaces** before or after the key
❌ **Don't add extra newlines** at the start or end
❌ **Don't copy only part of the key** - need all 7 lines
❌ **Don't use the public key** - must be the private key

✅ **Do copy exactly** as shown above
✅ **Do include BEGIN and END lines**
✅ **Do verify** all 7 lines are there

## Verify It Works

After updating, the workflow should:
1. ✅ Successfully authenticate via SSH
2. ✅ Connect to your droplet
3. ✅ Deploy the application

If it still fails, check the GitHub Actions logs for the exact error message.

