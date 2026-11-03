FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
# Shared corepack home so the unprivileged runtime user can run pnpm offline.
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate \
 && chmod -R a+rX /opt/corepack

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
# The app is fully dynamic, so the build only needs placeholder configuration
# to satisfy the environment schema. These are not secrets and are never used
# at runtime. The two must differ: the schema rejects identical values.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" \
    DIRECT_URL="postgresql://build:build@localhost:5432/build?schema=public" \
    SESSION_SECRET="build-time-placeholder-session-secret" \
    CHALLENGE_SERVER_SECRET="build-time-placeholder-challenge-secret" \
    pnpm exec prisma generate && pnpm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Run as the unprivileged `node` user that ships with the image.
COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/challenges ./challenges
COPY --from=build --chown=node:node /app/lib ./lib
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/next.config.ts /app/tsconfig.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["./scripts/start.sh"]
