# Stage 1: Build the React application
FROM node:20-slim AS build

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build (convex/_generated/ is committed in source)
COPY . .
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

# Build with vite
RUN npx vite build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Install curl for health checks + bind-tools for nslookup (used by entrypoint)
RUN apk add --no-cache curl bind-tools

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config (static fallback) and template
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

# Use custom entrypoint that generates nginx config from mc-config.json
CMD ["/entrypoint.sh"]
