# Use RSA Key Instead of Ed25519

## The Problem

Your local SSH connection uses `id_rsa` (RSA key), but GitHub secrets has `id_ed25519`. The `id_rsa` public key is authorized on the droplet, but `id_ed25519` is not.

## The Solution

Update GitHub secrets to use the **RSA key** (`id_rsa`) instead of Ed25519.

### Step 1: Get Your RSA Private Key

The key is displayed above. Copy the **ENTIRE** content including:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All lines in between (should be ~38 lines)
- `-----END OPENSSH PRIVATE KEY-----`

### Step 2: Update GitHub Secret

1. Go to: https://github.com/Atiqul-Imon/cleaning-sass-backend/settings/secrets/actions
2. Click the **pencil icon** (edit) next to `DO_SSH_KEY`
3. **Delete everything** in the value field
4. **Paste the RSA key** (the one displayed above, ~38 lines)
5. Make sure:
   - ✅ No extra spaces before `-----BEGIN`
   - ✅ No extra spaces after `-----END`
   - ✅ No extra newlines at start/end
   - ✅ All lines included (~38 lines)
6. Click **Update secret**

### Step 3: Test Again

1. Go to **Actions** tab
2. Click **Deploy Backend to Digital Ocean**
3. Click **Run workflow** → **Run workflow**

## Why This Works

- ✅ Your local SSH uses `id_rsa` and it works
- ✅ The `id_rsa` public key is on the droplet
- ✅ Using the same key in GitHub secrets will work

## Alternative: Add Ed25519 to Droplet

If you prefer to use Ed25519, you can add it to the droplet:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@46.101.37.78
```

But using RSA is simpler since it's already set up.

