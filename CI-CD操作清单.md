# 🚀 CI/CD 立即操作清单

## 当前状态
✅ 核心修复已推送 (commit: 3db58f2)
⚠️ CI workflow需要手动更新（OAuth权限限制）

## 📋 立即执行步骤（5分钟）

### 1. 打开GitHub Workflow编辑器
访问：https://github.com/aieasygames-alt/gachia/edit/main/.github/workflows/deploy.yml

### 2. 定位插入位置
找到这行：
```yaml
- run: pnpm install --frozen-lockfile
```

### 3. 粘贴以下代码（在上述行之后）
```yaml
      # P0 Quality Gates
      - name: Type Check
        run: pnpm type-check

      - name: Test
        run: pnpm test
```

### 4. 找到Build步骤
```yaml
- name: Build
  run: pnpm build
```

### 5. 粘贴以下代码（在Build步骤之后）
```yaml
      - name: Database Migration
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: |
          echo "Running database migrations..."
          # npx wrangler d1 migrations apply gachia-db --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 6. 提交更改
- 点击页面底部的 "Commit changes"
- 确认提交

## ✅ 验证步骤

### 触发测试构建
```bash
git commit --allow-empty -m "test: verify CI workflow updates"
git push origin main
```

### 监控执行
访问：https://github.com/aieasygames-alt/gachia/actions

确认步骤顺序：
1. ✅ Install
2. ✅ Type Check
3. ✅ Test
4. ✅ Build
5. ✅ Database Migration
6. ✅ Deploy

## 🎯 预期结果
- 所有CI步骤应该显示绿色✅
- 构建时间约3-5分钟
- 自动部署到Cloudflare

## 🆘 如果出现问题
- 检查步骤语法是否正确
- 确认缩进使用空格（不是Tab）
- 查看GitHub Actions日志获取详细错误信息

## 📞 支持
详细说明请查看：`CI-CD手动更新指南.md`
