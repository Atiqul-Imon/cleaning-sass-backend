#!/bin/bash

# Script to verify SSH key format
echo "=== Checking SSH Key Format ==="
echo ""

# Check if key file exists
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "❌ Private key not found: ~/.ssh/id_ed25519"
    exit 1
fi

echo "✅ Private key found"
echo ""

# Check key format
FIRST_LINE=$(head -1 ~/.ssh/id_ed25519)
LAST_LINE=$(tail -1 ~/.ssh/id_ed25519)

if [[ "$FIRST_LINE" == "-----BEGIN OPENSSH PRIVATE KEY-----" ]] && [[ "$LAST_LINE" == "-----END OPENSSH PRIVATE KEY-----" ]]; then
    echo "✅ Key format is correct (OpenSSH format)"
else
    echo "❌ Key format issue:"
    echo "   First line: $FIRST_LINE"
    echo "   Last line: $LAST_LINE"
    exit 1
fi

# Count lines
LINE_COUNT=$(wc -l < ~/.ssh/id_ed25519)
echo "✅ Key has $LINE_COUNT lines"

# Get fingerprint
FINGERPRINT=$(ssh-keygen -l -f ~/.ssh/id_ed25519.pub 2>/dev/null | awk '{print $2}')
echo "✅ Public key fingerprint: $FINGERPRINT"
echo ""

# Test connection
echo "=== Testing SSH Connection ==="
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@46.101.37.78 "echo 'Connection successful'" 2>/dev/null; then
    echo "✅ SSH connection works!"
else
    echo "❌ SSH connection failed"
    exit 1
fi

echo ""
echo "=== Key Content (for GitHub Secrets) ==="
echo "Copy everything below:"
echo ""
cat ~/.ssh/id_ed25519
echo ""
echo "=== End of Key ==="

