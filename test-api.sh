#!/bin/bash

# Slack Clone API Test Script
API_URL="https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so/api"

echo "🚀 Testing Slack Clone API"
echo "=========================="

# Test 1: Health Check
echo -e "\n1️⃣ Testing Health Endpoint..."
curl -s "$API_URL/../health" | python3 -m json.tool

# Test 2: Register a new user
echo -e "\n2️⃣ Registering a new test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@slackclone.com",
    "password": "demo123456",
    "username": "demouser",
    "fullName": "Demo User",
    "workspaceName": "Demo Workspace"
  }')

echo "$REGISTER_RESPONSE" | python3 -m json.tool

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ ! -z "$TOKEN" ]; then
  echo -e "\n✅ Registration successful! Token received."
  
  # Test 3: Get user info
  echo -e "\n3️⃣ Getting user information..."
  curl -s -X GET "$API_URL/auth/me" \
    -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
  
  # Test 4: Create a channel
  echo -e "\n4️⃣ Creating a test channel..."
  WORKSPACE_ID=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['workspace']['id'])" 2>/dev/null)
  
  if [ ! -z "$WORKSPACE_ID" ]; then
    CHANNEL_RESPONSE=$(curl -s -X POST "$API_URL/channels/workspace/$WORKSPACE_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "test-channel",
        "displayName": "Test Channel",
        "description": "A test channel for API testing",
        "type": "public"
      }')
    
    echo "$CHANNEL_RESPONSE" | python3 -m json.tool
    
    # Extract channel ID
    CHANNEL_ID=$(echo "$CHANNEL_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['channel']['id'])" 2>/dev/null)
    
    if [ ! -z "$CHANNEL_ID" ]; then
      # Test 5: Send a message
      echo -e "\n5️⃣ Sending a test message..."
      curl -s -X POST "$API_URL/messages/channel/$CHANNEL_ID" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "content": "Hello from the API test script! 👋",
          "type": "text"
        }' | python3 -m json.tool
    fi
  fi
else
  echo -e "\n⚠️ Registration failed or user already exists."
  
  # Try to login instead
  echo -e "\n🔄 Attempting to login..."
  LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "demo@slackclone.com",
      "password": "demo123456"
    }')
  
  echo "$LOGIN_RESPONSE" | python3 -m json.tool
fi

echo -e "\n✨ API tests complete!"
echo -e "\n📱 You can now visit the frontend at:"
echo "   https://slack-frontend-morphvm-8p9e2k2g.http.cloud.morph.so"
echo -e "\n📝 Login with:"
echo "   Email: demo@slackclone.com"
echo "   Password: demo123456"
