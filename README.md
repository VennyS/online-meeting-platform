# Online Meeting Platform

Это fullstack-приложение для видеозвонков, основанное на [LiveKit](https://livekit.io/), с разделением на фронтенд, бэкенд и медиа-сервер.

## Структура проекта

```bash
.
├── apps
│   ├── frontend         # Next.js клиент с интеграцией LiveKit
│   └── backend          # Node.js/Express сервер для выдачи токенов
├── infrastructure
│   └── livekit          # Конфигурация LiveKit сервера
├── docker-compose.yml   # Общий Docker setup
```

## Быстрый старт

### 1. Клонируй репозиторий:

```bash
git clone git@github.com:VennyS/online-meeting-platform.git
```

### 2. Создай .env файлы

- apps/frontend/.env

```.env
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- apps/backend/.env

```.env
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
PORT=3001
```

- infrastructure/livekit/.env

```.env
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_LOG_LEVEL=debug
```

### 3. Запусти

```bash
docker-compose up --build
```

Сервисы будут доступны по следующим ссылкам:

- Фронтенд: http://localhost:3000
- Бэкенд: http://localhost:3001
- Livekit: ws://localhost:7880
