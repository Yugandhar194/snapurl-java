# SnapURL — Java/Spring Boot URL Shortener

Live Deployed URL: https://snapurl.hatchable.site/

GitHub-ready version of the SnapURL project. The UI is in `src/main/resources/static` and the backend is Java 17 + Spring Boot + Spring Data JPA + PostgreSQL + Flyway.

## Core features
- Shorten HTTP/HTTPS URLs
- Custom aliases (4–32 characters)
- Random Base62 short-code generation
- Expiry, enable/disable and delete
- Click counter + last-click timestamp
- Management token hashed with SHA-256
- Repository + Service Layer + Strategy Pattern
- PostgreSQL persistence and Flyway migrations

## File & document tools
- Image Compressor with validated 10–1000 KB target input
- JPG ↔ PNG
- JPG/PNG → PDF
- Word → PDF
- PDF → Word
- Excel → PDF with sheet selection, portrait/landscape, A4/A3/Letter, normal/narrow/custom margins and fit-to-width/fit-to-page/original scaling
- Image Workspace with multi-image upload, camera capture, resize presets, templates (Original, Grayscale, Black & White, High Contrast, Document Scan, ID Photo, Passport Photo, Receipt, Notes/Document), sorting, renaming patterns and ZIP export
- PDF Scale / Resize with percentage controls
- PDF Toolbox: Merge, Split/Extract, Reorder, Rotate, Watermark, Page Numbers and PDF → JPG ZIP export
- Responsive premium 3D-gradient utility cards and dedicated tool pages

## QR Code Generator
Supports:
- URL
- PDF/document URL or uploaded PDF
- Contact/vCard
- Plain text
- App/store URL
- SMS
- Gmail
- Google Maps/location
- Phone
- Social handles: Instagram, YouTube, Snapchat, WhatsApp, GitHub, LinkedIn, Facebook and X
- QR color, size and error-correction controls
- Optional logo overlay
- Local QR history

Uploaded PDFs used for QR generation are stored by the backend under `data/qr-pdfs` and served from `/qr-pdfs/**`. The Spring Boot endpoint is `POST /api/qr-upload` and enforces PDF type and a 15 MB size limit.

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
- `POST /api/qr-upload`
- `GET /api/health`
- `GET /s/{code}`
- `GET /api/redirect/{code}`

## Interview talking points
- Why Repository? Keeps persistence concerns out of business logic.
- Why Strategy? Code generation can evolve without modifying the service.
- Why a DB unique constraint? Application checks alone are unsafe under concurrency.
- Why not microservices? A modular monolith is enough for the current scope; split services when scaling/ownership requires it.
- Production next steps: Redis for hot redirects, rate limiting, authentication, async click events, metrics, and horizontal scaling.

## Deployment
The public demo is deployed on Hatchable. The Java/Spring Boot implementation in this repository is the source-of-truth backend implementation for local/Docker/VPS deployment.
