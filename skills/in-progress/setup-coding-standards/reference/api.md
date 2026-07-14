# HTTP and REST API design reference

Load this reference when the repo exposes HTTP / REST endpoints (Node Hono/Fastify/Express/Nest, Python FastAPI/Django, Go `net/http`, Rust Axum, Java/Kotlin Spring/Quarkus/Ktor). Check the repo's existing routes and OpenAPI spec first so new endpoints match the established house contract (`camelCase` vs `snake_case`, envelope vs flat response, versioning prefix).

## Mechanical checks

- **Schema validation at every boundary:** every request body, query object, and path parameter is parsed through a runtime schema (Zod/Valibot, Pydantic v2 with `extra="forbid"` on write models, Go/Rust typed structs + validator, Jakarta Bean Validation `@Valid`) before reaching a service or domain function. TypeScript types do not exist at runtime.
- **Explicit response shaping (no ORM entity passthrough):** endpoints return a dedicated response DTO/schema (`response_model` in FastAPI, `select` projection or DTO in TS/Java/Go/Rust), never a raw database row or ORM model that can leak `password_hash`, internal flags, or tenant metadata.
- **OpenAPI / schema drift check** (when the repo generates or commits an OpenAPI spec): run the spec generator or schema diff in CI so undocumented routes and status codes fail the build.

## Conventions (record the repo's choice in `CODING_STANDARDS.md`)

### Resource URLs and HTTP methods

- **Plural kebab-case nouns** for collections (`/api/v1/team-members`, `/api/v1/orders/:id/items`); use `POST /api/v1/orders/:id/cancel` sparingly for state transitions that do not map to a resource.
- **Method semantics:**
  - `GET`: safe, idempotent, never mutates state; never pass secrets or tokens in query strings.
  - `POST`: creates a resource (`201 Created` with `Location` header) or triggers a non-idempotent action; support an `Idempotency-Key` header on payment and order-creation routes.
  - `PUT`: idempotent full replacement; `PATCH`: partial update; `DELETE`: idempotent removal (`204 No Content`).

### Status codes (never `200 OK` with `{ "success": false }`)

| Code | When to return |
|---|---|
| `200 OK` / `201 Created` / `204 No Content` | read or update with body / resource created / delete or update with no body |
| `400 Bad Request` | malformed JSON, unparseable query or syntax error |
| `401 Unauthorized` | missing or invalid authentication credentials |
| `403 Forbidden` | authenticated principal lacks permission for this resource or action |
| `404 Not Found` | resource does not exist (or caller is not allowed to know it exists) |
| `409 Conflict` | unique-constraint collision or invalid state transition (rely on atomic DB constraints, not racy pre-selects) |
| `422 Unprocessable Content` | valid JSON that fails domain or field-schema validation (include field-level details) |
| `429 Too Many Requests` | rate limit exceeded (include `Retry-After` header) |
| `500 Internal Server Error` | unhandled server failure (log full context with correlation ID server-side; return a generic message with no stack trace or SQL error to the client) |

### Error and response shape

Pick one response shape per repo and record it in `CODING_STANDARDS.md` so agents never mix two conventions across endpoints:

- **Option A (RFC 9457 Problem Details, recommended for new APIs):** `application/problem+json` with `type`, `title`, `status`, `detail`, `instance`, plus an `errors` array for field validation failures.
- **Option B (Structured error envelope):** `{ "error": { "code": "validation_error", "message": "...", "details": [{ "field": "email", "code": "invalid_format", "message": "..." }] } }`.

### Pagination and ordering

- **Always bound list endpoints** with a maximum page size (`limit <= 100`) and a **deterministic sort order** ending in a unique tie-breaker (`ORDER BY created_at DESC, id DESC`).
- **Cursor pagination** (`?cursor=...&limit=20` returning `{ data, next_cursor, has_next }`) for feeds, infinite scroll, and large tables; **offset pagination** (`?page=1&per_page=20`) only for small admin tables that require jumping to page N.

### Authorization

- Enforce **object-level authorization** on every route that takes an ID (`/orders/:id` verifies the order belongs to the caller's user or tenant in the query or service) and **property-level authorization** via the request/response schemas.
