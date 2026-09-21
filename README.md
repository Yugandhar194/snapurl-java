# SnapURL — Java/Spring Boot URL Shortener

Live Deployed URL: https://snapurl.hatchable.site/

GitHub-ready version of the SnapURL project. The UI is kept in `src/main/resources/static` and the backend is Java 17 + Spring Boot + Spring Data JPA + PostgreSQL + Flyway.

## Features
- Shorten HTTP/HTTPS URLs
- Custom aliases (4–32 characters)
- Random Base62 short-code generation
- Expiry (1–365 days)
- Enable/disable links
- Delete links
- Click counter + last-click timestamp
- Management token hashed with SHA-256
- JPG ↔ PNG image conversion
- JPG/PNG → PDF conversion
- Image compressor with target size in KB
- Word → PDF and PDF → Word browser tools
- Light/dark mode UI
- Responsive dashboard
- Repository + Service Layer + Strategy Pattern
- PostgreSQL persistence and Flyway migrations.

## Run locally
1. Start PostgreSQL: `docker compose up -d`
2. Run: `mvn spring-boot:run`
3. Open: `http://localhost:8080`

Or package it with `mvn clean package` and run `java -jar target/snapurl-1.0.0.jar`.

## API
- `POST /api/shorten`
- `POST /api/manage`
- `POST /api/toggle`
- `POST /api/delete`
- `GET /api/health`
- `GET /s/{code}` — browser-friendly short-link redirect
- `GET /api/redirect/{code}` — API-compatible redirect

## Interview talking points
- Why Repository? Keeps persistence concerns out of business logic.
- Why Strategy? Code generation can evolve without modifying the service.
- Why a DB unique constraint? Application checks alone are unsafe under concurrency.
- Why not microservices? A modular monolith is enough for the current scope; split services when scaling/ownership requires it.
- Production next steps: Redis for hot redirects, rate limiting, authentication, async click events, metrics, and horizontal scaling.


## Deployment
The public demo is deployed on Hatchable. The Java/Spring Boot implementation in this repository is the source-of-truth backend implementation for local/Docker/VPS deployment.
