#!/bin/bash
set -e

echo "=== Building Server ==="
cd server
npm install

# Copy shared types into server directory so imports resolve
mkdir -p shared
cp -r ../shared/types ./shared/

npm run build
echo "=== Server build complete ==="