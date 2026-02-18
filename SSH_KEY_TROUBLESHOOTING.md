# SSH Key Authentication Troubleshooting

## Error
```
ssh: handshake failed: ssh: unable to authenticate, attempted methods [none publickey], no supported methods remain
```

This means the SSH key in GitHub secrets doesn't match what's on the droplet.

## Solution Steps

### Step 1: Verify Your Local SSH Key Works

```bash
# Test SSH connection
ssh root@46.101.37.78 "echo 'Connection successful'"
```

If this works, your local key is correct.

### Step 2: Get Your Private Key for GitHub

```bash
# Display your private key
cat ~/.ssh/id_ed25519
```

Copy the **ENTIRE** output, including:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All the content in between
- `-----END OPENSSH PRIVATE KEY-----`

### Step 3: Verify Public Key is on Droplet

```bash
# Check if your public key is authorized
ssh root@46.101.37.78 "cat /root/.ssh/authorized_keys | grep -E '$(cat ~/.ssh/id_ed25519.pub | cut -d\" \" -f2)'"
```

If nothing is returned, add your public key:

```bash
# Copy your public key to the droplet
ssh-copy-id root@46.101.37.78
```

### Step 4: Update GitHub Secret

1. Go to: https://github.com/Atiqul-Imon/cleaning-sass-backend/settings/secrets/actions
2. Click on `DO_SSH_KEY` (or create it if it doesn't exist)
3. Click **Update**
4. Paste the **ENTIRE** private key (from Step 2)
5. Make sure it includes:
   - The BEGIN line
   - All content
   - The END line
   - No extra spaces or newlines at the start/end
6. Click **Update secret**

### Step 5: Common Issues

#### Issue: Key has extra whitespace
- Remove any leading/trailing spaces
- Ensure no extra newlines

#### Issue: Wrong key format
- Must be OpenSSH format: `-----BEGIN OPENSSH PRIVATE KEY-----`
- Not old format: `-----BEGIN RSA PRIVATE KEY-----`

#### Issue: Wrong key file
- Make sure you're using the key that works locally
- Test with: `ssh -i ~/.ssh/id_ed25519 root@46.101.37.78`

### Step 6: Test Again

After updating the secret, trigger the workflow again:
1. Go to Actions tab
2. Click "Deploy Backend to Digital Ocean"
3. Click "Run workflow" → "Run workflow"

## Quick Fix Script

Run this to get your key ready for GitHub:

```bash
# Display key with clear markers
echo "=== COPY EVERYTHING BELOW ==="
cat ~/.ssh/id_ed25519
echo "=== COPY EVERYTHING ABOVE ==="
```

Then paste it into GitHub Secrets as `DO_SSH_KEY`.

