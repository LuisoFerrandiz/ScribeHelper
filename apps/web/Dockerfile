FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# nginx's own entrypoint runs every script here on container start, in
# name order, before nginx itself starts.
COPY docker-entrypoint.d/40-scribe-config.sh /docker-entrypoint.d/40-scribe-config.sh
RUN chmod +x /docker-entrypoint.d/40-scribe-config.sh
EXPOSE 80
