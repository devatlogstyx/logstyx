# Logstyx

**Logstyx** is an open-source, self-hosted logging platform built for teams that want **full data ownership, strong privacy guarantees, and predictable costs**. It is compatible with the official [Logstyx SDK](https://github.com/devatlogstyx/logstyx-js-core) and designed to run entirely in your own infrastructure.

Logstyx focuses on *secure, structured logging* for modern backend systems without per‑GB pricing, vendor lock‑in, or third‑party access.

---

## Table of Contents

* [Overview](#overview)
* [Who Is This For?](#who-is-this-for)
* [Key Features](#key-features)
* [Architecture](#architecture)
* [Current Limitations](#current-limitations)
* [Why Logstyx?](#why-logstyx)
* [Quick Start](#quick-start)
* [Repository Structure](#repository-structure)
* [Technologies Used](#technologies-used)
* [Development Setup](#development-setup)
* [Production Deployment](#production-deployment)
* [Environment Variables](#environment-variables)
* [Support](#support)

---

## Overview

Logstyx is implemented as a **microservices-based logging platform**. Each service is responsible for a clearly defined concern such as authentication, caching, ingestion, processing, and presentation. Services communicate over HTTP and RPC, and asynchronous workloads are handled via a message queue.

The system is designed to scale horizontally, run on commodity infrastructure, and remain fully operable in private or air‑gapped environments.

---

## Who Is This For?

Logstyx is a good fit if you:

* Run backend or microservice-based systems
* Require **full control over log data**
* Operate in privacy‑sensitive or regulated environments
* Want predictable infrastructure costs (no usage-based billing)
* Prefer self‑hosting over managed SaaS logging tools

Logstyx may *not* be suitable if you require advanced fuzzy search, full-text indexing, or zero‑maintenance managed services.

---

## Key Features

### 🔐 Security & Privacy

* **Encrypted at Rest**: Sensitive log data is encrypted before storage
* **Application-Level Encryption**: Encryption keys are managed by the deployment owner
* **Encrypted Configuration Support**: Environment variables can be stored in encrypted form
* **Hashed Indexing**: Log indices are hashed to reduce exposure of raw log values
* **Self-Hosted by Design**: No third-party data access or telemetry

### 📊 Logging & Processing

* **Structured Logging** via the official Logstyx SDK
* **Real-Time Ingestion**: Logs are available immediately after ingestion
* **Asynchronous Processing** using a message queue
* **Service-Oriented Architecture**: Clear separation of responsibilities

### ⚙️ Deployment & Operations

* **Docker-First**: Fully containerized services
* **Docker Compose** configurations for development and production
* **One-Step Installer** for secure initial setup
* **External Service Support**: Use bundled or external Redis, MongoDB, and RabbitMQ

### ⚡ Performance

* **Redis Caching Layer** for fast access
* **Optimized Lookups** using hashed indices
* **Independent Scaling** of ingestion, processing, and frontend services

---

## Architecture

High-level data flow:

```
Application
   │
   ▼
Logstyx SDK
   │
   ▼
Gateway Service
   │
   ▼
RabbitMQ  ───► Core Service ───► MongoDB
   │                    │
   │                    └──► Redis (cache)
   ▼
Auth / Utility Services
```

* **Gateway Service**: Single entry point for clients
* **Core Service**: Log processing, indexing, and persistence
* **Auth Service**: Authentication and authorization
* **Cache Service**: Shared Redis-based caching
* **Frontend**: Web UI for querying and viewing logs

---

## Current Limitations

* **No partial or fuzzy text search**

  * Queries require exact matches due to hashed indexing
  * This is a deliberate trade-off for privacy and predictable performance

Consider this carefully when evaluating Logstyx for your use case.

---

## Why Logstyx?

### Choose Logstyx if you need:

* ✅ Full ownership of your log data
* ✅ Strong privacy guarantees
* ✅ Self-hosted infrastructure
* ✅ Predictable costs at any scale
* ✅ A logging system designed for backend engineers

### Consider alternatives if you need:

* ❌ Fuzzy or full-text log search
* ❌ Fully managed SaaS with zero maintenance
* ❌ Built-in APM, metrics, or tracing

---

## Quick Start

Install and run Logstyx using the official installer:

```bash
curl -fsSL https://raw.githubusercontent.com/devatlogstyx/logstyx/main/install.sh | bash
```

The installer will:

* Check Docker prerequisites
* Collect initial admin credentials
* Generate encryption and JWT secrets
* Create encrypted configuration files
* Optionally start all services

Once running, access Logstyx at:

```
http://localhost:5000
```

---

## Repository Structure

This repository uses a **pnpm-managed monorepo** layout:

```
microservice
├── auth-service
├── cache-service
├── core-service
├── gateway-service
├── frontend
├── utility-service
├── common
```

Each service has its own Dockerfile and dependency definitions.

---

## Technologies Used

* **Node.js** – Backend runtime
* **Express.js** – HTTP APIs
* **MongoDB** – Persistent storage
* **RabbitMQ** – Message queue
* **Redis** – Caching layer
* **Docker & Docker Compose** – Containerization
* **React + Vite** – Frontend UI

---

## Development Setup

For local development with hot reload:

1. Clone the repository

   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies

   ```bash
   pnpm install
   ```

3. Run installer

   ```bash
   ./install.sh
   cd ..
   ```

4. Start development services

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

Access the app at `http://localhost:5000`.

---

## Production Deployment

To deploy in production:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Common Commands

```bash
# View logs
docker compose logs -f

# Stop services
docker compose down

# Update services
docker compose pull
docker compose up -d

# Remove everything including data
docker compose down -v
```

---

## Environment Variables

### Auto-Generated (Installer)

* `USER_NAME`
* `USER_EMAIL`
* `USER_PASSWORD`
* `SELF_PROJECT_TITLE`
* `CRYPTO_SECRET`
* `REFRESH_TOKEN_SECRET`
* `USER_AUTHENTICATION_JWT_SECRET`
* `MASTER_KEY`

### Optional (External Services)

* `AMQP_HOST`
* `REDIS_URL`
* `MONGODB_HOST`

Sensitive values can be prefixed with `ENC_` to store encrypted values.

---

## Support

* **Issues**: GitHub Issues
* **Discussions**: GitHub Discussions

Contributions, feedback, and issues are welcome.
