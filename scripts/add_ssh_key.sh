#!/bin/bash
# One-time SSH key setup for automated deployments
# Run this script ONCE from your terminal to enable keyless SSH

IP="109.107.176.141"
PASSWORD="ja=z795+16t7LC48BhiG"
PUBKEY=$(cat ~/.ssh/id_rsa.pub)

echo "=== Adding SSH key to server ==="
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$IP "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$PUBKEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'Key added successfully!'"

echo "=== Testing keyless access ==="
ssh -o BatchMode=yes root@$IP "echo 'SSH OK: passwordless access works!'"
