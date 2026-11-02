FROM node:24-bookworm-slim
RUN npm install --global pnpm@10.10.0
WORKDIR /app/services/content-cms
COPY services/content-cms/package.json services/content-cms/pnpm-lock.yaml services/content-cms/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY packages/core /app/packages/core
COPY services/content-cms ./
# Disposable build settings, never runtime credentials or a live database.
RUN CMS_EDITOR_BUILD=1 CMS_MODE=editor CMS_DATA_DIR=/tmp/cms-build \
    CMS_SERVER_URL=https://cms.example.invalid \
    DATABASE_URL=postgres://build:unused@127.0.0.1/cms_build \
    PAYLOAD_SECRET=disposable-build-placeholder-not-a-runtime-secret \
    NEXT_TELEMETRY_DISABLED=1 pnpm build
RUN mkdir -p /var/lib/payload && chown -R node:node /var/lib/payload /app && chmod 700 /var/lib/payload
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
USER node
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=8s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/health',{signal:AbortSignal.timeout(5000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["pnpm", "start:editor"]
