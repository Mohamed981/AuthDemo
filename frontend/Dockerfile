# syntax=docker/dockerfile:1
# Build from the repository root: docker build -f frontend/Dockerfile .

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace frontend --include-workspace-root=false
COPY frontend/ frontend/
RUN npm run build --workspace frontend

FROM nginx:1.27-alpine AS runtime
# Where nginx forwards /api; override at run time if the API is elsewhere.
ENV API_UPSTREAM=http://api:3000
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
