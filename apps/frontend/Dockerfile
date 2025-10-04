FROM node:22.3.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22.3.0-alpine
WORKDIR /app
COPY --from=build /app/.next /app/.next
COPY --from=build /app/public /app/public
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/package-lock.json* /app/package-lock.json
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["npm", "start"]