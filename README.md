# Finance & Tax Community — Aloka

Finance, tax, and professional-services community platform. Implemented functionality and known limitations are tracked in [docs/development-progress.md](./docs/development-progress.md).

## Technology

- Client: React, Vite, Tailwind CSS, React Router, Axios, TanStack Query
- Server: Node.js, Express, Mongoose, MongoDB, JWT, Helmet, rate limiting
- Integrations planned: Google OAuth, Cloudinary, Resend, RSS aggregation

## Requirements

- Node.js 20 or newer
- npm
- MongoDB locally or a MongoDB Atlas connection string

## Run locally (Windows PowerShell)

Start the backend in one terminal:

```powershell
Set-Location 'E:\Aloka\FInal aloka\server'
Copy-Item .env.example .env
npm install
npm run dev
```

Set `MONGO_URI` in `server/.env` to your local MongoDB or Atlas URI. If Atlas SRV DNS resolution is blocked by your network, optionally set `MONGODB_DNS_SERVERS` to resolvers allowed by your network.

Start the frontend in a second terminal:

```powershell
Set-Location 'E:\Aloka\FInal aloka\client'
Copy-Item .env.example .env
npm install
npm run dev
```

The Vite development server runs at `http://localhost:5173` and proxies `/api` requests to `http://localhost:5000`. The backend health endpoint is `http://localhost:5000/api/health`.

Do not commit `.env` files or put server secrets in client environment variables. `.env.example` files contain placeholders only.

## Calculator catalogue

The public catalogue is served at `/api/v1/calculators`. Seed the categories and calculator metadata from the server directory:

```powershell
Set-Location 'E:\Aloka\FInal aloka\server'
npm run seed:calculators
```

Calculator engines currently cover a subset of the catalogue; see the development progress document for the verified list. Only supported calculators should be marked available.

## Admin access and calculator management

There is **no default admin username or password**. Do not put credentials in this README or source control. Create a normal account through `/register`, then promote that account using its email:

```powershell
Set-Location 'E:\Aloka\FInal aloka\server'
# Add ADMIN_EMAIL=your-registration-email@example.com to server/.env
npm run admin:promote
```

The command changes only that existing account's role to `admin`; it does not create, display, or change a password. Sign in at `/login` using the password you chose during registration. Keep the `.env` file private and use a strong, unique password. If this admin email is already configured on the deployment, use that account's existing credentials rather than committing them to documentation.

After signing in with an admin account, open `/admin/calculators` to create, edit, publish, feature, deactivate, and search calculator listings and manage categories. Open `/admin/inquiries` to review contact form submissions and update their status. The admin navigation displays a count of new enquiries. These APIs require the signed-in account's `admin` role.

## Project layout

- `client/` — Vite application, layouts, routes, shared UI and pages
- `shared/` — shared calculator catalogue metadata and calculation engines
- `server/src/app.js` — Express application and middleware configuration
- `server/src/index.js` — database connection and HTTP server lifecycle
- `server/src/config/` — backend configuration
- `server/src/models/` — Mongoose models
- `server/src/controllers/`, `routes/`, `middleware/` — API layers
- `server/scripts/` — calculator catalogue seeding and admin role promotion commands
- `docs/development-progress.md` — phase completion tracking and known limitations

## Current status

See [docs/development-progress.md](./docs/development-progress.md) for implemented features, tested calculator engines, and remaining work. Calculator management is available in the admin UI and protected API; other admin sections may still contain placeholder data.
