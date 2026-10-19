FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
# The app is fully dynamic, so the build only needs placeholder configuration
# to satisfy the environment schema. These are not secrets and are never used
# at runtime.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" \
    SESSION_SECRET="build-time-placeholder-not-used-at-runtime" \
    CHALLENGE_SERVER_SECRET="build-time-placeholder-not-used-at-runtime" \
    pnpm exec prisma generate && pnpm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/challenges ./challenges
COPY --from=build /app/lib ./lib
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/tsconfig.json ./tsconfig.json
EXPOSE 3000
# Wait for PostgreSQL, apply migrations, seed, synchronize the challenge
# metadata and only then start serving. Every step is idempotent so a restart
# is safe.
CMD ["sh", "-c", "until pnpm run db:deploy; do echo 'waiting for postgres'; sleep 3; done && pnpm run db:seed && pnpm run challenges:sync && pnpm run start"]
