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
* [Roadmap](#roadmap)
* [Support](#support)

---

## Overview

Logstyx is implemented as a **microservices-based logging platform**. Each service is responsible for a clearly defined concern such as authentication, caching, ingestion, processing, and presentation. Services communicate over HTTP and RPC, and asynchronous workloads are handled via a message queue.

The system is designed to scale horizontally, run on commodity infrastructure, and remain fully operable in private or air‑gapped environments.

---

## Who Is This For?

Logstyx is built primarily for **developers who just want to see logs from deployed applications** — without adopting a complex observability stack or paying recurring SaaS fees.

It is especially suitable if you:

* Deploy applications to servers or VMs (not only Kubernetes)
* Want to inspect logs from production without SSH access
* Prefer simple SDK-based integration over agents and collectors
* Do not want to learn or operate a full logging ecosystem
* Cannot justify or approve recurring SaaS logging costs

Logstyx intentionally focuses on **"logging as a developer utility"**, not as a full observability platform.

---

## Why Logstyx Exists

Logstyx started from a practical, real-world problem.

Debugging deployed applications often meant:

* SSH-ing into production servers
* Manually opening log files
* Searching through rotated or truncated logs
* Repeating the process across multiple machines

This workflow is fragile, slow, and error-prone.

At the same time:

* Giving every developer SSH access is not ideal
* Sharing cloud provider dashboards broadly is often restricted
* Managed logging services introduce ongoing costs

In one real setup, a trial of AWS CloudWatch Logs resulted in **~$20 of charges in under a month** for minimal usage — enough to raise concerns. In addition, access to the AWS console could not be safely shared with the whole team.

Logstyx was built to solve exactly this gap:

* A **self-hosted log viewer** for deployed apps
* Accessible via a web UI
* No SSH access required
* No cloud dashboard sharing
* No usage-based pricing

If you just want to **deploy your app and see its logs**, Logstyx is built for that purpose.

---

## Key Features

### 🔐 Security & Privacy

* **Encrypted at Rest**: Sensitive log data is encrypted before storage
* **Application-Level Encryption**: Encryption keys are managed by the deployment owner
* **Encrypted Configuration Support**: Environment variables can be stored in encrypted form
* **Hashed Indexing**: Log indices are hashed to reduce exposure of raw log values
* **Self-Hosted by Design**: No third-party data access or telemetry
* **Two-Factor Authentication**: Authenticator app codes with one-time recovery codes; can be required for every user

### 📊 Logging & Processing

* **Structured Logging** via the official Logstyx SDK
* **Real-Time Ingestion**: Logs are available immediately after ingestion
* **Asynchronous Processing** using a message queue
* **Service-Oriented Architecture**: Clear separation of responsibilities

### ⚙️ Deployment & Operations

* **Docker-First**: Fully containerized services
* **One-Step Installer** for setup and updates: keeps existing settings, asks only for what is missing
* **Zero-Downtime API Updates**: Blue/green deploys; a new version takes traffic only after its health check passes
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

## Why Not Loki, Datadog, or ELK?

Logstyx is **not a drop-in replacement** for every logging platform. It is intentionally opinionated. Below is a practical comparison to help you decide.

### 🔍 Grafana Loki

**Loki is a good choice if you need:**

* Deep integration with Grafana dashboards
* Label-based querying with flexible text search
* Kubernetes-native logging

**Why you might choose Logstyx instead:**

* Loki still stores *raw log content* in plaintext by default
* Logstyx prioritizes **encrypted log storage** and privacy-first design
* Logstyx is simpler to operate outside Kubernetes environments
* No tight coupling to Grafana or Prometheus ecosystems

Logstyx trades advanced query flexibility for **stronger data control and simpler mental models**.

---

### 📈 Datadog Logs

**Datadog is a good choice if you need:**

* Fully managed SaaS with zero operational overhead
* Advanced analytics, correlations, and APM
* Deep integrations across cloud providers

**Why you might choose Logstyx instead:**

* Datadog pricing scales aggressively with log volume
* Logs are stored and processed by a third party
* Long-term retention can become prohibitively expensive

Logstyx is designed for teams that want **predictable costs**, self-hosting, and **no vendor lock‑in**.

---

### 🧱 ELK Stack (Elasticsearch, Logstash, Kibana)

**ELK is a good choice if you need:**

* Powerful full-text and fuzzy search
* Complex aggregations and analytics
* A highly flexible schema

**Why you might choose Logstyx instead:**

* ELK is operationally heavy and resource-intensive
* Elasticsearch clusters require careful tuning and maintenance
* Plaintext indexing increases data exposure risk

Logstyx deliberately avoids full-text indexing to reduce **operational complexity and security surface area**.

---

### Summary

| Platform    | Strengths                                          | Trade-offs                      |
| ----------- | -------------------------------------------------- | ------------------------------- |
| **Logstyx** | Privacy-first, encrypted storage, predictable cost | No fuzzy search                 |
| **Loki**    | Flexible queries, Grafana-native                   | Weaker data privacy guarantees  |
| **Datadog** | Zero ops, rich features                            | High cost, vendor lock-in       |
| **ELK**     | Powerful search                                    | Heavy ops, higher risk exposure |

Choose Logstyx if you value **control, simplicity, and privacy** over maximal query power.

---

## Quick Start

Install and run Logstyx using the official installer:

```bash
curl -fsSL https://raw.githubusercontent.com/devatlogstyx/logstyx/main/install.sh | bash
```

The installer needs only Docker, openssl and curl. It will:

* Check Docker prerequisites
* Read an existing `.env.encrypted` and **keep it**: only settings that are missing are asked for
  (a file from an older installer is picked up as is, including bundled or external services)
* On a first run, ask for the project title, CORS origins, port, and for MongoDB, RabbitMQ and Redis
  whether to run them here as containers or use existing servers (Redis can also be left out: in-memory cache)
* Generate the encryption and JWT secrets once (they are never replaced)
* Deploy every service, blue/green: a new version must pass its health check before it takes traffic

Once running, access Logstyx at:

```
http://localhost:5000
```

Run it again any time to update; unchanged services are left alone.

```bash
./install.sh                 # check the settings, then deploy everything
./install.sh auth core       # deploy only these (gateway auth cache utility core)
./install.sh configure       # ask every question again (enter keeps the current value)
./install.sh status          # what is running and which colour is live
./install.sh --force core    # recreate even when nothing changed
./install.sh rotate-key      # new MASTER_KEY: re-encrypt the settings (a backup is kept), then redeploy
./install.sh down            # stop everything; data volumes and settings are kept
```

> Keep `.env.encrypted` backed up: without its `MASTER_KEY` and secrets the data cannot be decrypted.

Upgrading from the docker compose setup: run `./install.sh` in the same directory. It reuses the existing
MongoDB, RabbitMQ and Redis containers (and their data) and replaces the application containers.

### Initial Setup

On first access, you need to go to the `/setup` page where you can create your user account. This page will only be accessible when no user accounts exist in the system.

After completing setup, you can log in with your credentials to start using Logstyx.

### Two-Factor Authentication

Every user can turn on two-factor authentication in **Profile → Two-factor**: scan the QR code with an
authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, ...), confirm a code, and save the
recovery codes. After that, signing in asks for the 6 digit code after the password.

* A recovery code signs in once instead of an app code; new ones can be generated from the profile
* Five wrong codes lock the sign in for 15 minutes
* A user with `WRITE_USER` can reset another user's two-factor authentication (lost phone and recovery codes)
* To require it for everyone, answer `true` to the installer question or set `MFA_REQUIRED=true` in
  `.env.encrypted` and run `./install.sh`. Users without it then set it up at their next sign in

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
* **Docker** – Containerization (Docker Compose for local development)
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

3. Create the settings (without deploying)

   ```bash
   ./install.sh configure
   ```

4. Start development services

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

5. Create your admin account by visiting `http://localhost:5000/setup`

Access the app at `http://localhost:5000`.

---

## Production Deployment

To deploy or update in production, run `./install.sh` (see [Quick Start](#quick-start)).

### Common Commands

```bash
# View logs of a service (the live colour is in ./install.sh status)
docker logs -f logstyx_core_service_blue

# Stop everything (data volumes and settings are kept)
./install.sh down

# Update to the latest images
./install.sh

# Remove the data too (cannot be undone)
./install.sh down --yes && docker volume rm logstyx-mongo-data logstyx-rabbitmq-data logstyx-redis-data
```

---

## Environment Variables

### Auto-Generated (Installer)

* `CRYPTO_SECRET` - Encryption secret for sensitive data
* `REFRESH_TOKEN_SECRET` - JWT refresh token secret
* `USER_AUTHENTICATION_JWT_SECRET` - JWT authentication secret
* `MASTER_KEY` - Master encryption key for .env.encrypted file

### Project Configuration (Installer)

* `SELF_PROJECT_TITLE` - Project title displayed in the UI
* `ALLOWED_ORIGIN` - (Optional) Comma-separated list of allowed CORS origins (e.g., `https://app.example.com:3000,https://admin.example.com:3000`)

### Services (Installer)

* `MONGO_MODE`, `RABBITMQ_MODE`, `REDIS_MODE` - `container` (run here) or `url` (existing server); Redis also `memory`
* `AMQP_HOST` - RabbitMQ connection URL
* `REDIS_URL` - Redis connection URL (empty = in-memory cache)
* `MONGODB_HOST` - MongoDB server URL, without a database name (must be a replica set)

### Deployment (Installer)

* `BIND_ADDRESS`, `GATEWAY_PORT` - where the site is published (default `0.0.0.0:5000`)
* `REGISTRY`, `IMAGE_TAG` - which images to run (default `devatlogstyx/logstyx-*-service:latest`)
* `MFA_REQUIRED` - `true` to require two-factor authentication for every user

Sensitive values are prefixed with `ENC_` and stored encrypted in the `.env.encrypted` file.

---

## Support

* **Issues**: GitHub Issues
* **Discussions**: GitHub Discussions

Contributions, feedback, and issues are welcome.