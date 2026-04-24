FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache gettext
COPY --from=build /app/dist /usr/share/nginx/html
# Template is rendered to /etc/nginx/conf.d/default.conf by docker-entrypoint.sh
# (envsubst fills in ${API_UPSTREAM}).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
# Fallback for environments that don't run the entrypoint (kept in sync with template).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
