# syntax=docker/dockerfile:1
# Single-container image: the API serves the built frontend too, so the whole
# app runs as one service on one URL (used for the Render deploy).
# For separate API and nginx images see backend/Dockerfile and frontend/Dockerfile.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace backend --workspace frontend --include-workspace-root=false
COPY backend/ backend/
COPY frontend/ frontend/
RUN npm run build --workspace backend && npm run build --workspace frontend

FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    STATIC_DIR=/app/public
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace backend --include-workspace-root=false --omit=dev \
  && npm cache clean --force
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist public

USER node
WORKDIR /app/backend
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "dist/main.js"]
