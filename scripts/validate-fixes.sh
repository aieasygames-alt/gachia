#!/bin/bash
# Quick validation script for Gachia P0 fixes
# Fast checks to verify all critical fixes are in place

set -e

echo "⚡ Gachia P0 Fixes Quick Validation"
echo "===================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
TOTAL=0

check() {
    local name="$1"
    local command="$2"

    TOTAL=$((TOTAL + 1))
    echo -n "[$TOTAL] $name... "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC}"
        FAILED=$((FAILED + 1))
    fi
}

echo "🔐 Security Fixes"
echo "----------------"

check "Shared builds API authentication" \
    "grep -q 'Authentication required' apps/web/app/api/shared-builds/route.ts"

check "BuildData validation added" \
    "grep -q 'buildData: z.string().max(10000)' apps/web/app/api/shared-builds/route.ts"

check "OAuth credential validation" \
    "grep -q 'throw new Error.*GOOGLE_CLIENT_ID' apps/web/lib/auth.ts"

check "Security headers in middleware" \
    "grep -q 'X-Content-Type-Options' apps/web/middleware.ts"

echo ""
echo "⚡ Performance Fixes"
echo "-------------------"

check "Image optimization enabled" \
    "grep -q 'unoptimized: false' apps/web/next.config.ts"

check "WebP formats configured" \
    "grep -q 'formats:.*image/webp' apps/web/next.config.ts"

check "IndexNow async function" \
    "grep -q 'export async function notifyIndexNow' apps/web/lib/indexnow.ts"

check "Data access layer created" \
    "test -f packages/data/lib/game-data-access.ts"

echo ""
echo "🗄️  Data Fixes"
echo "--------------"

check "validate.ts has await" \
    "grep -q 'await getGameData' packages/data/scripts/validate.ts"

check "Schema uses kebab-case" \
    "grep -q \"'tier-list': z.boolean\" packages/core/schemas/index.ts"

check "Sea branch logic fixed" \
    "grep -q 'cm.materials?.some.*materialId' packages/data/material-characters.ts"

check "Endfield branch added" \
    "grep -q 'if (gameId === .endfield.' packages/data/weapon-characters.ts"

echo ""
echo "🚀 Deployment Fixes"
echo "------------------"

check "CI has type-check step" \
    "grep -q 'name: Type Check' .github/workflows/deploy.yml"

check "CI has test step" \
    "grep -q 'name: Test' .github/workflows/deploy.yml"

check "Safe migration created" \
    "test -f packages/db/src/migrations/0005_safe_better_auth_migration.sql"

check "Environment template created" \
    "test -f apps/web/.env.example"

echo ""
echo "===================================="
echo "📊 Validation Results"
echo "===================================="
echo -e "Total checks: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All P0 fixes validated!${NC}"
    echo ""
    echo "🎯 Ready for:"
    echo "   • Security: API authentication, OAuth validation, security headers"
    echo "   • Performance: Image optimization, data access layer, IndexNow"
    echo "   • Data: Schema validation, Sea/Endfield fixes, validate script"
    echo "   • Deployment: CI quality gates, safe migration, env templates"
    echo ""
    echo "📝 Next: Run comprehensive tests:"
    echo "   bash scripts/test-security.sh"
    echo "   bash scripts/test-performance.sh"
    exit 0
else
    echo -e "${RED}❌ Some fixes not in place. Please review failed checks above.${NC}"
    exit 1
fi