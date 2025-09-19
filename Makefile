.PHONY: dev, frontend, go-back

dev:
	docker-compose up backend-test livekit postgres minio redis -d &
	cd apps/frontend && npm run dev

go-back:
	cd apps/test-backend && go run main.go

backend: 
	cd apps/backend && npm run start:dev

prisma:
	cd apps/backend && npx prisma studio

frontend:
	cd apps/frontend && npm run dev