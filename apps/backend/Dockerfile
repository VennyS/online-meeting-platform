# -------- Development Stage --------
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Устанавливаем зависимости (копируем только package*.json для кэша)
COPY package*.json ./
RUN npm ci

# Копируем весь код
COPY . .

# Генерируем Prisma-клиент
RUN npx prisma generate

# Открываем порт
EXPOSE 3000

# Запуск с hot-reload
CMD ["npm", "run", "start:dev"]

# -------- Production Build Stage --------
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
# Генерируем Prisma-клиент перед сборкой
RUN npx prisma generate
RUN npm run build

# -------- Production Runtime Stage --------
FROM node:20-alpine AS production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

# Копируем только собранный билд и Prisma-клиент
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3000

CMD ["node", "dist/main"]