#!/bin/bash

echo "🧪 Running all tests..."
echo "======================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

FAILED=0

# Test 1: OpenRouter
echo "Running test-openrouter.js..."
node test/test-openrouter.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ OpenRouter test passed${NC}\n"
else
    echo -e "${RED}❌ OpenRouter test failed${NC}\n"
    FAILED=1
fi

# Test 2: Bidding Engine
echo "Running test-bidding-engine.js..."
node test/test-bidding-engine.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Bidding Engine test passed${NC}\n"
else
    echo -e "${RED}❌ Bidding Engine test failed${NC}\n"
    FAILED=1
fi

# Test 3: Quality Control
echo "Running test-quality-control.js..."
node test/test-quality-control.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Quality Control test passed${NC}\n"
else
    echo -e "${RED}❌ Quality Control test failed${NC}\n"
    FAILED=1
fi

echo "======================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
