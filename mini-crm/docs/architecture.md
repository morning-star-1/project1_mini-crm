# Architecture

## Overview
- Client: Vite + React SPA
- Server: Express API
- Database: PostgreSQL

## Data flow
Client UI -> API -> Postgres -> API -> Client UI

## Key decisions
- Simple plan gating in API for demo purposes
- SQL schema is managed in `schema.sql`
