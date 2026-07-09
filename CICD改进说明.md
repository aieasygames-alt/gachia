# CI/CD Workflow 改进说明

## 问题
GitHub OAuth应用缺少 `workflow` 权限，无法通过git push更新 `.github/workflows/` 目录下的文件。

## 解决方案

### 方案1：手动更新workflow文件（推荐）
由于权限限制，需要通过GitHub Web UI手动添加以下改进步骤到 `.github/workflows/deploy.yml`：

```yaml
# 在 "pnpm install --frozen-lockfile" 步骤后添加：

# CRITICAL FIX: Add type checking before build
- name: Type Check
  run: pnpm type-check

# CRITICAL FIX: Add tests before build
- name: Test
  run: pnpm test

# 在 "Build" 步骤后添加：

# CRITICAL FIX: Add database migration for production deployments
- name: Database Migration
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: |
    echo "Running database migrations..."
    # Note: Remote migrations should be applied via wrangler
    # npx wrangler d1 migrations apply gachia-db --remote
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 方案2：创建新的workflow文件
创建一个独立的新workflow文件 `.github/workflows/p0-quality-gates.yml`：

```yaml
name: P0 Quality Gates

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # P0 Quality Gates
      - name: Type Check
        run: pnpm type-check

      - name: Test
        run: pnpm test

      - name: Validate Fixes
        run: bash scripts/validate-fixes.sh

      - name: Security Tests
        run: bash scripts/test-security.sh

      - name: Performance Tests
        run: bash scripts/test-performance.sh
```

### 方案3：使用Personal Access Token
如果需要自动化更新workflow文件，可以：

1. 创建GitHub Personal Access Token (需要 `workflow` 权限)
2. 在本地配置使用PAT而不是OAuth
3. 重新尝试推送workflow文件

## 优先级
- **立即执行**: 核心P0修复已推送 ✅
- **建议执行**: 通过GitHub Web UI手动添加质量检查步骤
- **可选执行**: 创建独立的quality gates workflow

## 验证
核心修复包含的验证脚本可以立即使用：
- `scripts/validate-fixes.sh` - 快速验证16项P0修复
- `scripts/test-security.sh` - 安全测试
- `scripts/test-performance.sh` - 性能测试

这些脚本可以在本地运行或集成到CI中。
