FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN npm run build

RUN npx prisma generate

FROM node:20-alpine AS production

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/prisma ./prisma

ENV NODE_ENV=production
ENV DATABASE_URL=postgres://nestuser:nestpass@db:5432/nestdb

CMD ["node", "dist/main.js"]
