FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN node --max_old_space_size=4096 ./node_modules/@nestjs/cli/bin/nest.js build

RUN npx prisma generate

FROM node:20-alpine AS production

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/prisma ./prisma

ENV NODE_ENV=production

CMD ["node", "dist/main.js"]