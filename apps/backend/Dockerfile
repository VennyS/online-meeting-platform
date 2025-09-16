# -------- Development Stage --------
FROM node:20-alpine AS development

WORKDIR /usr/src/app

# Устанавливаем зависимости (копируем только package*.json для кэша)
COPY package*.json ./
RUN npm ci

# Копируем весь код
COPY . .

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
RUN npm run build

# -------- Production Runtime Stage --------
FROM node:20-alpine AS production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

# Копируем только собранный билд
COPY --from=build /usr/src/app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
