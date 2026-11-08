# Aloka — Finance, Tax & Knowledge Platform

Aloka is a finance-first web platform built for a modern community of users who want access to trusted financial information, practical calculators, service discovery, and the ability to publish and manage articles.

This project combines:

- a public-facing knowledge and content platform
- a user dashboard and personal account system
- an admin portal for content, news, services, and inquiries
- a services directory with category management and service inquiries
- a calculator library for user-facing financial tools
- blog authoring and review workflows

The app is structured as a full-stack product using a React frontend and Express + MongoDB backend.

## Project goals

- Help users learn about finance, tax, and business decisions
- Support public article publishing and review workflows
- Present curated and approved finance/news content
- Offer a directory of professional services with inquiry capture
- Make calculators easy to discover and use
- Give admins a central dashboard to manage content and user requests

## Core features

### Public website
- Landing page with brand positioning and CTA sections
- Blogs and article detail pages
- News hub with provider-backed RSS/news feeds
- Service directory and service detail pages
- Contact form and inquiry management
- Calculator discovery page and financial tools

### User experience
- User registration and login
- Role-aware routing for normal users, authors, and admins
- User dashboard with activity summary
- Saved items and bookmarks
- Personal blog writing, editing, and deletion
- Service inquiry tracking from the user side

### Admin experience
- Blog moderation and approval flow
- News moderation and feed source management
- Calculator catalogue management and publishing controls
- Service categories and service management
- Service inquiry management, status updates, and customer responses
- User and enquiry oversight

### Content and integrations
- MongoDB-backed data storage
- Cloudinary uploads for blog and service media
- JWT-based authentication with cookie session support
- Google OAuth support
- Resend email integration for notices and replies
- RSS/news aggregation from configured external providers

## Tech stack

### Frontend
- React 18
- Vite
- React Router DOM
- Tailwind CSS
- Axios
- TanStack Query
- TipTap rich text editor
- Lucide icons

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Zod validation
- Helmet, CORS, cookie parser, rate limiter
- Cloudinary
- Resend
- RSS Parser

### Project structure

```text
Aloka-final/
├─ client/                     # React frontend application
│  ├─ src/
│  │  ├─ components/          # Reusable UI and feature components
│  │  ├─ context/             # Theme, toast, app context providers
│  │  ├─ layouts/             # Public, user, and admin layouts
│  │  ├─ pages/               # Pages for public, user, and admin flows
│  │  ├─ services/            # API clients and integrations
│  │  ├─ utils/               # App utility functions and tests
│  │  ├─ App.jsx              # Route configuration
│  │  └─ main.jsx             # App bootstrapping
│  ├─ .env.example
│  ├─ .env.production.example
│  ├─ package.json
│  └─ vite.config.*
├─ server/
│  ├─ src/
│  │  ├─ controllers/         # Express controllers
│  │  ├─ middleware/          # Auth, role checks, request guards
│  │  ├─ models/              # Mongoose models
│  │  ├─ routes/              # API routes
│  │  ├─ services/            # Validation, news fetching, logic helpers
│  │  ├─ utils/              # Shared backend helpers
│  │  ├─ app.js              # Express app setup
│  │  ├─ index.js            # Server entry and DB connection
│  │  └─ server config files
│  ├─ scripts/
│  │  ├─ promoteAdmin.js      # Promote an existing account to admin
│  │  └─ seedCalculators.js   # Seed calculator catalogue
│  ├─ test/                   # Backend tests
│  ├─ .env.example
│  ├─ .env.production.example
│  └─ package.json
├─ shared/                    # @aloka/shared local package used by both apps
│  ├─ calculators.js          # Shared calculator catalogue definitions
│  ├─ calculatorEngines.js    # Shared calculator formulas and engines
│  └─ package.json
├─ docs/
│  └─ development-progress.md # Current implementation progress and limitations
├─ README.md
└─ .gitignore
```

## Requirements

Before running the project, make sure you have:

- Node.js 20+ recommended
- npm
- MongoDB running locally or a valid MongoDB Atlas connection
- Cloudinary credentials if you want image uploads
- Resend API key if email sending is enabled
- Optional: Google OAuth credentials

## Local setup

### 1) Clone and install dependencies

Install each application from its own directory. Both use `shared/` through a local package dependency; keep the `shared/` directory alongside `client/` and `server/`.

```powershell
cd E:\Aloka\FInal aloka

cd server
npm install --install-links

cd ..\client
npm install --install-links
```

`--install-links` installs the local shared package without requiring Windows symlink permissions.

### 2) Configure environment variables

Create a `.env` file in `server/` from the example file:

```powershell
cd E:\Aloka\FInal aloka\server
Copy-Item .env.example .env
```

Then update the file with your values. At minimum, set:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/finance-tax-community
JWT_SECRET=your-secure-secret
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
ADMIN_EMAIL=your-admin-email
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=Aloka <notifications@example.com>
```

Create a `.env` in `client/`:

```powershell
cd E:\Aloka\FInal aloka\client
Copy-Item .env.example .env
```

Typical client config:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=
```

## Run the project

### Start the backend

```powershell
cd E:\Aloka\FInal aloka\server
npm run dev
```

Backend runs on:

- `http://localhost:5000`
- health endpoint: `http://localhost:5000/api/health`

### Start the frontend

```powershell
cd E:\Aloka\FInal aloka\client
npm run dev
```

Frontend runs on:

- `http://localhost:5173`

In development, Vite proxies `/api` requests to `http://localhost:5000`. `VITE_API_URL` may be set to `http://localhost:5000/api` in `client/.env`; in production it must point to the deployed API.

## Separate frontend and backend deployment

The recommended production split is:

| Component | Custom domain | Project directory | Install and build command (from repository root) | Start / output |
|---|---|---|---|---|
| Frontend | `https://aloka.co.in` (optionally `https://www.aloka.co.in`) | `client/` | `npm install --prefix client --install-links` then `npm run build --prefix client` | Publish `client/dist/` as a static site |
| Backend API | `https://api.aloka.co.in` | `server/` | `npm install --prefix server --install-links` then `npm run build --prefix server` | `npm start --prefix server` |

Both deployment services must check out the **whole repository**, including the sibling `shared/` directory, and use the repository root as their build context. The shared code is installed locally by each app's `file:../shared` dependency. Do not deploy only the `client/` or `server/` folder without `shared/`. If you change files in `shared/` during local development, reinstall the package in the app you changed with `npm install --install-links`.

Configure the frontend service's build-time variables:

```env
VITE_API_URL=https://api.aloka.co.in/api
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

`VITE_API_URL` is embedded into the frontend at build time. The frontend defaults to the Aloka API domain for production if this variable is omitted, but setting it explicitly is recommended.

Configure the backend service's environment:

```env
NODE_ENV=production
MONGO_URI=your-production-mongodb-connection-string
JWT_SECRET=your-long-random-production-secret
CLIENT_URL=https://aloka.co.in
FRONTEND_URL=https://aloka.co.in
CORS_ORIGINS=https://aloka.co.in,https://www.aloka.co.in
BACKEND_URL=https://api.aloka.co.in
GOOGLE_CALLBACK_URL=https://api.aloka.co.in/api/auth/google/callback
```

Also configure any integrations you use, such as Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`), Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`), and news providers. Let the hosting provider supply `PORT` unless it requires a fixed value.

### DNS, HTTPS, and sign-in checklist

1. Add `aloka.co.in` (and optionally `www.aloka.co.in`) to the frontend host and `api.aloka.co.in` to the backend host.
2. Create the DNS records requested by each host (commonly an apex A/ALIAS record for the frontend and a CNAME for the API). DNS targets depend on the hosting provider.
3. Enable HTTPS for both domains before using production sign-in.
4. Set the frontend build variable `VITE_API_URL` to `https://api.aloka.co.in/api`.
5. Set backend `CLIENT_URL`, `FRONTEND_URL`, and `CORS_ORIGINS` to the exact frontend origins. Add any additional frontend hostnames explicitly.
6. In Google OAuth settings, add `https://aloka.co.in` as an authorized JavaScript origin and `https://api.aloka.co.in/api/auth/google/callback` as an authorized redirect URI. Use the same OAuth client ID in `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID`; keep `GOOGLE_CLIENT_SECRET` only on the backend.
7. Check `https://api.aloka.co.in/api/health` after deployment. It should report `database: connected`.

The client sends credentialed requests to the API. The API must allow the frontend origin with credentialed CORS. Production auth cookies are secure and host-only to `api.aloka.co.in`; do not set a cookie domain unless your authentication design is intentionally changed.

## Important routes

### Public routes
- `/` — homepage
- `/blogs` — published articles
- `/blogs/:slug` — article detail view
- `/news` — finance news hub
- `/services` — service directory
- `/services/:id` — service detail page
- `/contact` — contact/inquiry form
- `/calculators` — calculator library

### User routes
- `/login` / `/register`
- `/user` — user dashboard
- `/user/blogs` — my articles
- `/dashboard/blogs/create` — create a blog post
- `/dashboard/blogs/:id/edit` — edit your own blog (editing a published or pending article returns it to draft)
- `/dashboard/my-inquiries` — service inquiries submitted by the user

### Admin routes
- `/admin` — admin dashboard
- `/admin/blogs` — blog moderation
- `/admin/news` — news source moderation
- `/admin/services` — service listing and management
- `/admin/services/categories` — service categories
- `/admin/service-inquiries` — service inquiry inbox
- `/admin/inquiries` — contact inquiries
- `/admin/calculators` — calculator catalogue management

## Admin access

There is no default hardcoded admin username/password stored in this repository.

The recommended workflow is:

1. Create a normal user account from the frontend registration page
2. Add the email address to `server/.env` as `ADMIN_EMAIL`
3. Run the promotion script:

```powershell
cd E:\Aloka\FInal aloka\server
npm run admin:promote
```

This updates that existing account to an admin role.


Important:
- Do not commit real passwords or secrets into the repository
- Use a strong unique password for your admin account
- Keep `.env` files private and local only

## Calculator setup

Seed the calculator catalogue if needed:

```powershell
cd E:\Aloka\FInal aloka\server
npm run seed:calculators
```

This populates the admin-managed calculator catalogue and category metadata.

## Blog workflow

Users can:
- write drafts
- save automatically to local recovery storage
- edit draft content
- submit posts for review
- see status updates such as draft, pending, rejected, or published
- delete their own posts

Admins can review submitted content and approve or reject it.

## News workflow

The platform can fetch and display news from configured RSS/third-party providers. Valid feed URLs and approved image hosts must be configured in the environment.

## Service workflow

The service directory supports:
- category management
- service creation and editing
- public listings and detail pages
- service inquiries from users
- inquiry tracking and admin response workflow

## Testing and build checks

### Backend tests

```powershell
cd E:\Aloka\FInal aloka\server
npm test
```

### Frontend tests

```powershell
cd E:\Aloka\FInal aloka\client
npm test
```

### Production build

```powershell
cd E:\Aloka\FInal aloka\client
npm run build
```

## Deployment notes

- Keep Node.js and MongoDB versions compatible with the project
- Store secrets using deployment environment variables, not in the repo
- Set secure production CORS and cookie settings
- Use production-grade MongoDB credentials and Cloudinary/Resend keys
- Ensure `JWT_SECRET` is unique and strong in production

## Current status

This project is in active development. The implementation includes the main application areas above, but some features are still evolving and should be checked against the project’s live progress notes:

- [docs/development-progress.md](./docs/development-progress.md)

## Security reminder

- Never commit `.env` files
- Never expose real credentials in source control or documentation
- Use environment-specific secrets for local development and production deployment
- Keep admin access restricted to trusted users only

## Final note

Aloka is designed as a finance knowledge, publishing, service discovery, and admin management platform. The codebase is organized to support both public use and secure internal administration, while remaining flexible enough for future growth and feature expansion.
