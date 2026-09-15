# Pinned to the Node version node:sqlite was verified against locally
# (DECISIONS.md D-016). Bump deliberately, not silently.
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY db ./db
COPY seed ./seed

# Schema is idempotent (CREATE TABLE IF NOT EXISTS) — safe to run on
# every start (RULES.md R-13: all data, db included, lives under the
# mounted /data volume, set via DATA_DIR).
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
