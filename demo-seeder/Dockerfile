FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY public/ ./public/
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --retries=6 \
  CMD curl -f http://localhost:3001/health || exit 1
CMD ["node", "dist/server.js"]
