# Development progress

## Services directory and inquiry management

Status: Implemented; live MongoDB-backed smoke testing is still required.

### Implemented

- Public service directory with category, search, price, service-format, delivery, qualification, and popularity filters; paginated listings and service details.
- Service categories and detailed service records with pricing, FAQs, gallery, SEO metadata, publication state, and soft archive support.
- Admin service, category, and inquiry management pages. Category images can be uploaded through the existing authenticated Cloudinary blog-image endpoint.
- Public service inquiry submission with validation and rate limiting, plus user-owned inquiry tracking and cancellation.
- Admin inquiry status updates, customer-facing responses, and internal notes; Resend email integration is conditional on `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- User dashboard service-inquiry counts and recent activity; homepage service cards now load published services instead of placeholder service data.
- Admin authorization supports both `admin` and `superadmin` roles.

### Verification

- Server tests: passed (20 tests).
- Client tests: passed (12 tests).
- Client production build: passed; the existing large-chunk warning remains.

### Remaining

- Verify authenticated service CRUD, category changes, inquiry ownership/cancellation, and admin response workflows against the configured live database.
- Inquiry assignment is not exposed yet. Deleting a service is intentionally a soft archive to preserve historical inquiry data.
- Guest inquiries are saved but do not appear in a user's dashboard unless submitted while logged in.
- Responsive layouts have not yet been browser-tested across breakpoints.

## Phase 1 — Foundation

Status: Foundation implemented; existing API/runtime foundation retained.

### Implemented

- React/Vite client with Tailwind, React Router, and TanStack Query providers.
- Aloka brand identity, tagline, responsive logo component, and Aloka browser/page titles.
- Centralized light/dark theme tokens; initial system preference, persistent theme selection, and theme controls in public, user, and admin layouts.
- Separate responsive public, user, and admin layout route groups.
- Shared Button variants and loading state, accessible text input, card, modal, toast, and section-heading primitives.
- Global form, focus, selection, and reduced-motion styles.
- Express app configuration separated from the server entry point.
- Helmet, JSON body-size limit, cookie parsing, rate limiting, CORS allowlist, JSON not-found response, and safe error responses.
- MongoDB connection configuration, health endpoint, environment templates, and development startup scripts.
- Setup instructions and this progress record.

### Verification

- Client production build: passed after brand and design-system changes.
- Server JavaScript syntax checks: passed.
- Backend runtime on a temporary port: started successfully and connected to MongoDB.
- Health endpoint: returned `database: connected`.
- Unknown API route: returned HTTP 404.
- CORS: rejected an untrusted origin with HTTP 403.
- Client test command: passed (5 calculator tests).
- Client build reports a non-blocking large JavaScript chunk warning.

### Known limitations

- Some unrelated legacy page sections may still use mock content; confirm each data source before treating it as production-ready.
- Public content search, legal routes, verified social links, and a dedicated user appearance-settings page are not implemented.
- Automated coverage is based on Node's built-in test runner; there is no dedicated React component-test runner.

### Environment configuration

- Server: `PORT`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `FRONTEND_URL`, `BACKEND_URL`, optional integration credentials, and optional `MONGODB_DNS_SERVERS`.
- Client: `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`.
- Use `.env.example` as a template. Never commit actual credentials.

## Calculator hub — Phase 1: Foundation

Status: Implemented. No new calculation formulas, backend APIs, models, or saved-history features were added in this phase.

### Implemented

- Public calculator discovery route at `/calculators`; existing `/income-tax-calculator` URL redirects to the canonical calculator route.
- Searchable registry for calculator listings organized into nine categories, with topic keywords, category filters, featured/popular/recent filters, and alphabetical/category sorting.
- Responsive calculator cards and clear availability status. Only the existing old/new Indian income-tax estimate is linked as functional; all other directory entries are labeled as planned.
- Reusable calculator page layout adopted by the income-tax calculator.
- Public navigation, home-page CTA, and footer links to the calculators hub.
- Page title, description, and canonical metadata for the hub and current income-tax calculator page.

### Verification

- Client production build: passed.
- Client automated tests: passed, including registry identifiers, search, filters, sorting, and available-route checks.
- Browser verification: hub search, category/discovery filters, empty state, mobile layout (no horizontal overflow), and existing income-tax route/legacy redirect.

### Remaining

- General/GST, investment, loan/savings, salary/retirement, income-tax expansion, and business calculation engines remain for their later phases.
- Catalogue metadata is seeded in MongoDB and served through the public `/api/v1/calculators` APIs; the client uses that catalogue and shows its saved directory if the API is unavailable.
- Administrator-only calculator and category management APIs are available under `/api/v1/admin/calculators`; calculator deletion is a soft deactivation.
- The public contact form validates and stores enquiries in MongoDB. Admins can view, filter, and update enquiry statuses in `/admin/inquiries`; the admin navigation shows the current new-enquiry count and refreshes it periodically.
- Usage analytics, calculation history, and saved plans do not exist yet. Popularity remains an admin-managed catalogue flag because no analytics source exists.
- Run `cd server` then `npm run seed:calculators` to safely insert the initial nine categories and calculator listings. Seeding fills missing entries without overwriting existing admin edits.

## Calculator engines — first functional release

Status: Shared, tested calculation engines and a reusable calculator page are implemented for the following catalogue entries:

- GST amount, GST-inclusive/reverse GST, CGST/SGST split, and IGST (the user enters the rate).
- SIP, lumpsum, mutual-fund growth estimate, CAGR, and inflation.
- Home, personal, car, education, and business loan EMI.
- Simple interest, compound interest, percentage, discount, ROI, profit margin, gross profit, markup, break-even, revenue growth, and tax-inclusive price.

These are illustrative estimators with visible assumptions, user-editable rates, validation, and no fabricated official tax/GST slabs. Current tax and jurisdiction-specific calculators, STP, detailed cash-flow schedules, and the rest of the 94-entry catalogue still require dedicated engines and validation. Run `cd server` then `npm run seed:calculators` after adding engines to synchronize public availability flags.

### Backend catalogue API

- Public: `GET /api/v1/calculators` (search, category, featured/popular filters, sorting, pagination), `/categories`, `/categories/:slug`, `/category/:slug`, `/featured`, `/popular`, `/recent`, `/search?q=...`, and `/:slug`.
- Admin (requires a signed-in user with the `admin` role): `GET/POST /api/v1/admin/calculators`, `GET/PATCH/DELETE /api/v1/admin/calculators/:id`, plus `GET/POST /api/v1/admin/calculators/categories` and `PATCH/DELETE /api/v1/admin/calculators/categories/:id`.
- Public catalogue results include only active calculators in active categories with a publication date that has arrived. Calculator calculation engines remain out of scope for this backend phase.

## Role-aware navigation and dashboards — core scope

Status: Implemented in code; automated checks pass. Live MongoDB integration could not be reverified because the configured MongoDB SRV lookup has been refusing connections.

### Implemented

- Email and Google sign-in route administrators to `/admin` and other signed-in accounts to `/user`.
- Admin pages and `/api/admin/*` endpoints require an authenticated account with the `admin` role. Both account types can continue to browse public routes.
- Signed-in public navigation links to the role-appropriate dashboard and supports signing out.
- Admin overview metrics and six-month user/article activity are read from MongoDB; the admin navigation continues to show the new-enquiry count.
- User dashboard counts, recent activity, authored articles, and saved-item lists are read from the signed-in user's records.
- Saved items are persisted with ownership checks and duplicate prevention. Available calculators can be bookmarked from their calculator page.
- Dashboard links avoid routing database-backed blog/news items to public detail pages that still contain placeholder content.
- Signed-in users can save blog drafts, edit drafts or rejected submissions, recover local unsaved work, and submit articles for admin review; ordinary users cannot publish directly.
- The dashboard editor at `/dashboard/blogs/create` and `/dashboard/blogs/:id/edit` includes autosave, title/subtitle, category, tags, excerpt, SEO settings, optional cover upload, TipTap rich text, preview, rejection feedback, and a pending-review workflow.
- Cover and inline images upload through the authenticated Cloudinary endpoint with JPG/PNG/WebP type and size validation. Uploads report an explicit configuration error if Cloudinary is not configured.
- Article JSON is validated against an allow-listed TipTap structure and rendered through a safe React renderer rather than arbitrary HTML. Published article pages use SEO metadata and omit absent covers.
- Admins can inspect pending submissions and approve or reject them with required review feedback.
- Public blog details load only published posts by slug and include responsive reading layout, generated table of contents, reading progress, share actions, persisted bookmarks, category/tag filters, and related published articles.
- Article metadata and BlogPosting structured data use available database fields; missing author biographies, images, comments, and engagement metrics are not fabricated.

### Verification and remaining scope

- Client tests: 12 passed. Server tests: 12 passed.
- Client production build: passed; Vite reports a non-blocking large-bundle warning.
- Live MongoDB/API, Cloudinary upload, and browser responsive smoke testing remain outstanding while the configured MongoDB SRV lookup is unavailable and credentials are not verified.
- Several admin content-management sections still use placeholder/mock data.

## News Hub

Status: Provider-backed public news and admin workflows are implemented; live provider and MongoDB verification remain outstanding.

### Implemented

- Public news list, search, filters, categories, sources, countries, latest, trending, featured, detail, and related-story APIs backed by MongoDB.
- Public news pages use the API instead of mock stories and retain source attribution and links to the publisher. Aloka displays only provider/feed summaries, not copied full articles.
- RSS sources can be administered from `/admin/news`; categories can be added, activated/deactivated, and reordered. Admins can search and filter the editorial queue, run a rate-limited manual fetch, and review fetch logs.
- Admin moderation supports publish, hide, archive, reject, feature, trend, pin, and category/tag updates.
- GNews, NewsAPI, configured HTTPS RSS feeds, and database-managed RSS sources are supported. News records are deduplicated and retain editorial overrides during provider refreshes.
- RSS fetches disallow redirects, pin requests to validated public DNS addresses, bound response size and request time, and limit a fetch run to 20 RSS sources. Image URLs are limited to publisher/feed hosts and `NEWS_IMAGE_HOSTS`.
- News cards, details, related stories, the home page, and the admin queue use a consistent branded category fallback when a publisher omits an image or its image URL fails. Approved publisher CDNs must be explicitly listed in `NEWS_IMAGE_HOSTS`; current configured hosts are Times of India, Yahoo, BusinessLine, and Economic Times CDNs.
- Scheduled fetching defaults to every 15 minutes in `Asia/Kolkata`; the schedule and timezone are configurable. A MongoDB lease prevents overlapping fetch runs across server instances.

### Configuration and operational notes

- Copy `server/.env.example` to the server's environment file and configure at least one provider (`GNEWS_API_KEY`, `NEWSAPI_API_KEY`, or an authorized HTTPS URL in `NEWS_RSS_FEEDS`). Database-managed RSS sources are also available to admins.
- Set `NEWS_FETCH_ENABLED=false` to disable scheduled fetching. `NEWS_FETCH_CRON`, `NEWS_FETCH_TIMEZONE`, `NEWS_FETCH_TIMEOUT_MS`, `NEWS_FETCH_MAX_RETRIES`, and `NEWS_FETCH_BATCH_SIZE` control fetch behavior.
- `NEWS_AUTO_PUBLISH=true` is the current default. Set it to `false` to send fetched items to the review queue; admins can still moderate stories. Confirm the provider/feed terms permit the intended use before enabling automated public display.
- Verify commercial-use rights for the selected provider plan and the image/display rights for each feed before production. A free provider tier may not permit commercial use. API credentials must remain server-side.
- Public APIs are mounted under `/api/v1/news` (and the legacy `/api/news` route). Admin APIs require the existing admin role and are mounted under `/api/v1/admin/news` (and the legacy `/api/admin/news` route).

### Verification and remaining scope

- Client tests: 12 passed. Client production build: passed with Vite's existing large-bundle warning.
- Server tests: 17 passed, including normalization, classification, model indexes, auto-publish configuration, private/reserved RSS address rejection, and publisher image-host allowlisting.
- Live MongoDB, real provider credentials, source/provider rights, and browser responsive verification remain outstanding. Check the admin fetch log and public feed after configuring a provider.
