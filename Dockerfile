# Stage 1: Build SvelteKit static SPA
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with nginx, som også ruter /api til TS-serveren (#376, #1026).
# Bildet setter inn KOE_TS_SERVEREN (vert:port) og navnetjenerne fra
# /etc/resolv.conf (NGINX_LOCAL_RESOLVERS) i malen ved oppstart.
FROM nginx:1.27-alpine
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
