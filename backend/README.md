# Photographer Portfolio — Backend

Spring Boot 4.1 + PostgreSQL API for the portfolio site. Serves the public gallery, the
admin dashboard, and the booking enquiry form.

## Running locally

```bash
docker compose up -d          # Postgres on host port 5433
./mvnw spring-boot:run        # API on http://localhost:8080
```

> **Port 5433, not 5432** — this machine already runs a native PostgreSQL 18 Windows service on
> 5432. Publishing the container there appears to work, but `localhost:5432` resolves to the
> native server and the app silently connects to the wrong database.

On first start an admin account is seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD`
(defaults `admin` / `changeme`). It is only created when absent, so restarts never reset it.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | Postgres connection | `localhost:5433`, `portfolio`/`portfolio` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Seeded admin account | `admin` / `changeme` |
| `JWT_SECRET` | Base64 HMAC key, min 256 bits — `openssl rand -base64 32` | dev-only key |
| `JWT_EXPIRATION_MS` | Token lifetime | 43200000 (12h) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Media storage | unset |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins | `http://localhost:3000` |

The JWT secret and admin password **must** be set to real values before deploying anywhere
public. Cloudinary endpoints fail with a clear 422 rather than a 500 while unset.

## API

### Public — no auth
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/public/categories` | Visible categories, ordered. Drives the sidebar. |
| GET | `/api/public/categories/{slug}` | 404s for hidden categories — not 403, which would confirm they exist. |
| GET | `/api/public/categories/{slug}/media` | Visible media in display order. |
| GET | `/api/public/videos` | Standalone video section. |
| GET | `/api/public/hero` | Featured media for the home page. **204** when no media exists. |
| GET | `/api/public/featured` | Everything flagged featured. |
| GET | `/api/public/settings` | Editable site copy — name, tagline, bio, contact. |
| POST | `/api/public/bookings` | The booking form. **The only public write.** 202 on success. |

`POST /api/public/bookings` is guarded three ways: bean validation on the payload, a honeypot
field (`website` — filled only by bots, whose submissions are discarded with a 202 so they
learn nothing), and a per-IP rate limit of 5/hour returning 429. A request always lands as
`PENDING`; nothing a visitor sends can set a status.

### Auth
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/login` | `{username, password}` → JWT. |
| GET | `/api/auth/me` | Validates a stored token on dashboard load. |

### Admin — requires `Authorization: Bearer <token>`
| Method | Path | Notes |
| --- | --- | --- |
| GET/POST | `/api/admin/categories` | List includes hidden ones. |
| PUT/DELETE | `/api/admin/categories/{id}` | Delete orphans its media instead of destroying it. |
| PATCH | `/api/admin/categories/{id}/visibility?visible=` | The hide/show toggle. |
| PATCH | `/api/admin/categories/reorder` | `{orderedIds: [...]}` |
| POST | `/api/admin/media/upload-signature` | Step 2 of the upload flow. |
| GET/POST | `/api/admin/media` | `?categoryId=` filter on GET. |
| PATCH/DELETE | `/api/admin/media/{id}` | Delete removes the Cloudinary asset too. |
| PATCH | `/api/admin/media/reorder` | `{orderedIds: [...]}` |
| GET | `/api/admin/bookings`, `/upcoming`, `/{id}` | `/upcoming` is accepted shoots from today on. |
| PATCH | `/api/admin/bookings/{id}/accept` | Confirms an enquiry. |
| PATCH | `/api/admin/bookings/{id}/reject`, `/cancel` | Optional `{note}` — private to the dashboard. |
| DELETE | `/api/admin/bookings/{id}` | For spam that got past the honeypot. |
| GET/PUT | `/api/admin/settings` | All editable site copy. |

`PATCH /api/admin/media/{id}` accepts `featured: true` to set the home page hero.

Errors use RFC 9457 `ProblemDetail` (`status`, `title`, `detail`).

## Media upload flow

The backend never touches the file bytes.

1. Dashboard calls `POST /api/admin/media/upload-signature`
2. Backend returns a signature covering `folder` + `timestamp` — **the API secret never leaves the server**
3. Browser uploads directly to Cloudinary with that signature
4. Cloudinary returns URL, public ID, dimensions
5. Dashboard calls `POST /api/admin/media` to persist the metadata

Deletion runs Cloudinary-first: if the remote call fails the database row is kept, so the
admin can retry rather than stranding an orphaned file nobody can see or remove.

## Architecture

```
controller/   HTTP only — bind, validate, choose status codes
service/      Business logic and transactions
repository/   Spring Data JPA interfaces
entity/       JPA mappings (BaseEntity supplies id + audit timestamps)
dto/          Request/response records — entities are never serialised directly
security/     JWT issuing, the auth filter, and the filter chain
exception/    ProblemDetail translation via @RestControllerAdvice
config/       Typed properties, JPA auditing, admin seeding
```

## Notes on Spring Boot 4

Worth knowing, since most tutorials still target 3.x:

- `spring-boot-starter-web` is now `spring-boot-starter-webmvc`
- `spring-boot-starter-test` is split into per-slice test starters
- Jackson 3 (`tools.jackson.databind`) replaces Jackson 2 — `write-dates-as-timestamps` moved
  from `spring.jackson.serialization` to `spring.jackson.datatype.datetime`
- `HttpStatus.UNPROCESSABLE_ENTITY` is deprecated in favour of `UNPROCESSABLE_CONTENT`
- `org.springframework.lang.NonNull` is deprecated in favour of JSpecify
- `RestClient.Builder` is not auto-configured without a REST client starter

## Before deploying

- Set every secret listed above
- Switch `spring.jpa.hibernate.ddl-auto` from `update` to `validate` and add Flyway migrations —
  `update` never drops or alters a column and will drift from the entities over time
- Add the Vercel domain to `CORS_ALLOWED_ORIGINS`
