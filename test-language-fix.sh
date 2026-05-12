#!/bin/bash

# Test script for AI language parameter fix
# This script tests that the language parameter is properly passed through the chain

echo "=== Testing AI Language Parameter Fix ==="
echo ""

# Note: Replace these values with actual test data
API_URL="http://localhost:3000/api/ai/analyze-recipe"
AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"
RECIPE_ID="YOUR_TEST_RECIPE_ID_HERE"

echo "Test 1: Sending language='en' (should return English)"
echo "------------------------------------------------------"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{\"recipeId\": \"$RECIPE_ID\", \"language\": \"en\"}" \
  | jq '.data.summary' 2>/dev/null || echo "Failed or returned non-JSON"

echo ""
echo ""

echo "Test 2: Sending language='zh' (should return Chinese)"
echo "------------------------------------------------------"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{\"recipeId\": \"$RECIPE_ID\", \"language\": \"zh\"}" \
  | jq '.data.summary' 2>/dev/null || echo "Failed or returned non-JSON"

echo ""
echo ""

echo "Test 3: No language parameter (should default to Chinese)"
echo "-----------------------------------------------------------"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{\"recipeId\": \"$RECIPE_ID\"}" \
  | jq '.data.summary' 2>/dev/null || echo "Failed or returned non-JSON"

echo ""
echo ""
echo "=== Check logs for debug output ==="
echo "Look for:"
echo "  [AI Analysis] Received language: ..."
echo "  [LLM] Using language: ..."
echo "  [LLM] System prompt preview: ..."
