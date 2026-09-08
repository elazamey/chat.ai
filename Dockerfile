# Stage 1: Build & Prune
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

# Stage 2: Lightweight Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Security: Use non-root user
USER node

COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
