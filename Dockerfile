FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/schema.sql ./server/schema.sql
COPY --from=build /app/server/catalog-seed.json ./server/catalog-seed.json
COPY --from=build /app/server/index.js ./server/index.js
COPY --from=build /app/server/admin.js ./server/admin.js
COPY --from=build /app/server/integration.js ./server/integration.js
COPY --from=build /app/server/settings.js ./server/settings.js
EXPOSE 3000
CMD ["node", "server/index.js"]
