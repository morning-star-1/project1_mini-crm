# Mini CRM (Full-Stack Demo)

Mini CRM is a small full-stack CRM demo for sales teams that shows how to manage accounts and contacts with simple plan gating.

## Features
- Accounts and contacts CRUD
- Free vs pro plan gating
- REST API backed by PostgreSQL
- Vite + React client

## Screenshot
![Screenshot](docs/screenshot.png)

Replace `docs/screenshot.png` with a real screenshot or GIF.

## Quickstart
### Prerequisites
- Node.js 20+
- npm
- PostgreSQL 14+

### Setup database
```bash
createdb mini_crm
psql -U postgres -d mini_crm -f schema.sql
```

### Configure environment
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Update `server/.env` to replace the `DATABASE_URL` placeholder password (`change_me`).

### Run the API
```bash
cd server
npm install
npm run dev
```

### Run the client
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

## Configuration
- `server/.env` controls database URL, port, and CORS origin.
- `client/.env` points the UI at the API.

## Project structure
- `client/` React UI
- `server/` Express API
- `tasks-api/` small related API stub (not required for the CRM demo)
- `schema.sql` database schema and seed

## Tests
```bash
cd server && npm test
cd ../client && npm test
cd ../tasks-api && npm test
```
