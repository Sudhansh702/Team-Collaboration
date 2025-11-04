#!/bin/bash

# Test script for file upload API endpoints
# This script tests the backend file upload functionality

API_URL="http://localhost:5000/api"
BASE_URL="http://localhost:5000"

echo "=== Testing File Upload API Endpoints ==="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
HEALTH=$(curl -s "$BASE_URL/health")
echo "Response: $HEALTH"
echo ""

# Note: File upload requires authentication
# To test file upload, you need:
# 1. A valid JWT token (from login)
# 2. A valid channel ID
# 3. A test file

echo "2. File Upload Endpoint (POST /api/messages/upload)"
echo "   Requires:"
echo "   - Authorization: Bearer <token>"
echo "   - Form data: file, channelId, content (optional)"
echo ""

echo "3. File Download Endpoint (GET /api/files/:filename)"
echo "   Requires:"
echo "   - Authorization: Bearer <token>"
echo "   - filename parameter"
echo ""

echo "To test file upload manually:"
echo "curl -X POST $API_URL/messages/upload \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  -F 'file=@test.jpg' \\"
echo "  -F 'channelId=CHANNEL_ID' \\"
echo "  -F 'content=Test file upload'"
echo ""

echo "To test file download manually:"
echo "curl -X GET $API_URL/files/FILENAME \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  -o downloaded_file.jpg"
echo ""

echo "=== Test Complete ==="


