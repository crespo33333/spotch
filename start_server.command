#!/bin/bash
echo "🚀 Spotch Backend Server Starting..."
# Navigate to the directory where this script is located
cd "$(dirname "$0")/backend"
# Run the dev server
npm run dev
