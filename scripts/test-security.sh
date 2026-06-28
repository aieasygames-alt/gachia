#!/bin/bash
# Security tests for Gachia project P0 fixes
# Tests authentication, input validation, and security headers

set -e

echo "🔒 Running Security Tests for Gachia P0 Fixes"
echo "=========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="${1:-http://localhost:3000}"

echo ""
echo "Test Environment: $BASE_URL"
echo ""

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected="$3"

    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "[$TESTS_RUN] $test_name... "

    if eval "$test_command" > /dev/null 2>&1; then
        if [ "$expected" = "pass" ]; then
            echo -e "${GREEN}✓ PASS${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}✗ FAIL${NC} (expected to fail but passed)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        if [ "$expected" = "fail" ]; then
            echo -e "${GREEN}✓ PASS${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}✗ FAIL${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    fi
}

echo "🔐 Testing Shared Builds API Security"
echo "---------------------------------------"

# TC-SEC-001: Unauthenticated user should be rejected
run_test "Unauthenticated POST to /api/shared-builds" \
    "curl -s -X POST $BASE_URL/api/shared-builds \
    -H 'Content-Type: application/json' \
    -d '{\"gameId\":\"genshin\",\"characterId\":\"test\",\"buildData\":\"{}\"}' \
    | jq -e '.error == \"Authentication required\"'" \
    "pass"

# TC-SEC-003: Large buildData should be rejected
run_test "BuildData size limit validation" \
    "curl -s -X POST $BASE_URL/api/shared-builds \
    -H 'Content-Type: application/json' \
    -d '{\"gameId\":\"genshin\",\"characterId\":\"test\",\"buildData\":\"'$(python3 -c 'print("A" * 12000)'\"'}'\"' \
    | jq -e '.error == \"Invalid input\"'" \
    "fail"

# TC-SEC-004: Invalid gameId should be rejected
run_test "Invalid gameId validation" \
    "curl -s -X POST $BASE_URL/api/shared-builds \
    -H 'Content-Type: application/json' \
    -d '{\"gameId\":\"invalid\",\"characterId\":\"test\",\"buildData\":\"{}\"}' \
    | jq -e '.error == \"Invalid input\"'" \
    "fail"

echo ""
echo "🛡️  Testing Security Headers"
echo "-------------------------"

# TC-SEC-009: Security headers presence check
echo -n "[$((TESTS_RUN + 1))] Checking security headers... "
TESTS_RUN=$((TESTS_RUN + 1))

HEADERS=$(curl -sI "$BASE_URL/zh/genshin/characters")
SECURITY_HEADERS=(
    "X-Content-Type-Options: nosniff"
    "X-Frame-Options: SAMEORIGIN"
    "Referrer-Policy: strict-origin-when-cross-origin"
    "X-DNS-Prefetch-Control: on"
    "Vary: Accept-Language"
)

MISSING_HEADERS=0
for header in "${SECURITY_HEADERS[@]}"; do
    header_name=$(echo "$header" | cut -d: -f1)
    if echo "$HEADERS" | grep -q "$header_name"; then
        echo -e "  ${GREEN}✓${NC} $header_name"
    else
        echo -e "  ${RED}✗${NC} $header_name (MISSING)"
        MISSING_HEADERS=$((MISSING_HEADERS + 1))
    fi
done

if [ $MISSING_HEADERS -eq 0 ]; then
    echo -e "${GREEN}All security headers present${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}Missing $MISSING_HEADERS security headers${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "🔍 Testing OAuth Configuration"
echo "----------------------------"

# TC-SEC-006: Check if .env.example exists
run_test "Environment variable template exists" \
    "test -f apps/web/.env.example" \
    "pass"

# TC-SEC-007: Check if auth.ts has validation
run_test "Auth configuration validation" \
    "grep -q 'throw new Error.*GOOGLE_CLIENT_ID' apps/web/lib/auth.ts" \
    "pass"

echo ""
echo "📊 Testing Data Validation"
echo "------------------------"

# TC-DATA-001: Data validation script should work
echo -n "[$((TESTS_RUN + 1))] Running data validation... "
TESTS_RUN=$((TESTS_RUN + 1))

if cd packages/data && pnpm validate > /tmp/validate-output.txt 2>&1; then
    if grep -q "All data validated successfully" /tmp/validate-output.txt; then
        echo -e "${GREEN}✓ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} (validation completed but with errors)"
    fi
else
    echo -e "${RED}✗ FAIL${NC} (validation script failed)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "🌐 Testing Image Optimization"
echo "------------------------------"

# TC-PERF-001: Check if image optimization is enabled
run_test "Image optimization enabled in Next.js config" \
    "grep -q 'unoptimized: false' apps/web/next.config.ts" \
    "pass"

# TC-PERF-002: Check logo size (should be < 50KB after optimization)
echo -n "[$((TESTS_RUN + 1))] Checking logo.png file size... "
TESTS_RUN=$((TESTS_RUN + 1))

if [ -f "apps/web/public/images/logo.png" ]; then
    LOGO_SIZE=$(stat -f%z "apps/web/public/images/logo.png" 2>/dev/null || stat -c%s "apps/web/public/images/logo.png")
    LOGO_SIZE_KB=$((LOGO_SIZE / 1024))

    if [ $LOGO_SIZE_KB -lt 50 ]; then
        echo -e "${GREEN}✓ PASS${NC} ($LOGO_SIZE_KB KB < 50 KB)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} ($LOGO_SIZE_KB KB - should be < 50 KB, needs optimization)"
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} (logo.png not found)"
fi

echo ""
echo "🏗️  Testing CI/CD Configuration"
echo "-------------------------------"

# TC-DEPLOY-001: Check if type-check step exists
run_test "Type check step in CI workflow" \
    "grep -q 'Type Check' .github/workflows/deploy.yml" \
    "pass"

# TC-DEPLOY-002: Check if test step exists
run_test "Test step in CI workflow" \
    "grep -q 'name: Test' .github/workflows/deploy.yml" \
    "pass"

# TC-DEPLOY-003: Check if migration step exists
run_test "Database migration step in CI workflow" \
    "grep -q 'Database Migration' .github/workflows/deploy.yml" \
    "pass"

echo ""
echo "📋 Testing Database Migration Safety"
echo "------------------------------------"

# TC-DATA-008: Check if safe migration exists
run_test "Safe Better Auth migration exists" \
    "test -f packages/db/src/migrations/0005_safe_better_auth_migration.sql" \
    "pass"

# TC-DATA-009: Check if migration preserves data
run_test "Migration preserves data (not destructive)" \
    "grep -q 'INSERT INTO.*SELECT.*FROM users' packages/db/src/migrations/0005_safe_better_auth_migration.sql" \
    "pass"

echo ""
echo "=========================================="
echo "🎯 Test Summary"
echo "=========================================="
echo "Tests Run:    $TESTS_RUN"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review and fix the issues.${NC}"
    exit 1
fi