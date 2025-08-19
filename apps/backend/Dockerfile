FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY . .
RUN npx tsc  # Компилируем TypeScript в JavaScript

EXPOSE 3001

CMD ["node", "dist/index.js"]