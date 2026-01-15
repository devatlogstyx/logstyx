# README

Welcome to the Logstyx Project! An open-source server implementation of the LOGSTYX logging platform that compatible with [logstyx SDK](https://github.com/devatlogstyx/logstyx-js-core). This project comprises several interdependent services, including authentication, caching, core processing, a frontend application, and utility functionalities, which communicate via HTTP and RPC protocols.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Why Logstyx?](#why-logstyx)
- [Roadmap](#roadmap)
- [Quick Start](#quick-start)
- [Services Structure](#services-structure)
- [Technologies Used](#technologies-used)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)

## Overview
This project implements a microservices architecture, with each service tailored to specific functionalities. The services include:
- **Authentication Service**: Manages user authentication and authorization.
- **Cache Service**: Provides caching capabilities across the microservices.
- **Core Service**: Handles essential application logic and data processing.
- **Gateway Service**: Acts as a single entry point for client requests.
- **Frontend Application**: An interactive user interface for interacting with the services.
- **Utility Service**: Contains miscellaneous utility functions.

## Features

### 🔒 Security & Privacy
- **End-to-End Encryption**: All sensitive data is encrypted at rest
- **Encrypted Configuration**: Support for encrypted environment variables to protect credentials
- **Hashed Indexing**: Log indices are hashed for improved query performance while maintaining privacy
- **Self-Hosted**: Full control over your data - no third-party access

### 📊 Logging & Monitoring
- **Structured Logging**: Built for modern application logging with the [logstyx SDK](https://github.com/devatlogstyx/logstyx-js-core)
- **Real-time Processing**: Logs are processed and available immediately
- **Microservices Architecture**: Scalable design with separate services for auth, caching, and core processing
- **Message Queue Integration**: Uses RabbitMQ for reliable inter-service communication

### 🚀 Deployment & Operations
- **Docker-Ready**: Complete Docker Compose setup for both development and production
- **Easy Configuration**: Simple `.env` file configuration with encryption support
- **Multiple Deployment Options**: Use bundled services or connect to external Redis/MongoDB/RabbitMQ
- **Development Mode**: Hot-reload enabled for rapid development

### ⚡ Performance
- **Redis Caching**: Fast data access with integrated caching layer
- **Optimized Queries**: Hashed indexing for efficient log retrieval
- **Horizontal Scalability**: Microservices can be scaled independently

### ⚠️ Current Limitations
- **No Partial Search**: Exact match queries only (hashed indexing trade-off for privacy)
- Consider this when deciding if Logstyx fits your use case

## Why Logstyx?

**Choose Logstyx if you need:**
- ✅ Complete data ownership and privacy
- ✅ Self-hosted solution with no vendor lock-in
- ✅ Encrypted log storage
- ✅ Cost-effective at any scale (no per-GB pricing)
- ✅ Microservices-ready architecture

**Consider alternatives if you need:**
- ❌ Partial/fuzzy text search across logs
- ❌ Managed service with zero maintenance
- ❌ Advanced APM features out of the box

## Roadmap

We're actively working on these features:

### 🔔 Alerting & Notifications
- **Alert Setup**: Configure custom alerts based on log patterns, error rates, or specific conditions
- **Webhooks Integration**: Send notifications to external services (Slack, Discord, PagerDuty, etc.)
- **Multi-channel Notifications**: Support for email, SMS, and other notification channels

### 📊 Custom Dashboards
- **Dashboard Builder**: Create custom dashboards tailored to your monitoring needs
- **Widget System**: Flexible widgets for charts, graphs, and log visualizations
- **Dashboard Sharing**: Share dashboards across teams

### 🔗 Integrations
- **Third-party Service Connectors**: Connect to incident management and collaboration tools
- **API Webhooks**: Trigger external workflows based on log events

Want to contribute or have feature suggestions? Open an issue on our repository!

## Quick Start

Get Logstyx up and running in a single command:
```bash
curl -fsSL https://raw.githubusercontent.com/devatlogstyx/logstyx/main/install.sh | bash
```

Follow the prompts to configure your installation. The installer will optionally start services immediately.

That's it! Access Logstyx at http://localhost:5000

The installer will:
- ✓ Check Docker prerequisites
- ✓ Collect your admin credentials
- ✓ Generate secure encryption keys
- ✓ Create encrypted configuration
- ✓ Optionally start services immediately

## Services Structure
The project uses a monorepo structure managed with `pnpm`. Below is an overview of the main directories:

```
microservice
├── auth-service
│   ├── ...
├── cache-service
│   ├── ...
├── core-service
│   ├── ...
├── frontend
│   ├── ...
├── gateway-service
│   ├── ...
├── utility-service
│   ├── ...
├── common
│   ├── ...
```
Each service has its own Docker configuration (`Dockerfile` and `docker-compose` files) and may have its own dependencies defined in a `package.json` file.

## Technologies Used
- **Node.js**: Backend to run the services.
- **Express.js**: Web framework for building APIs.
- **MongoDB**: Database used for persistent data storage.
- **RabbitMQ**: Message broker for managing communication between services.
- **Redis**: In-memory caching for improved performance.
- **Docker**: For containerization of services.
- **React** + **Vite**: For building the frontend application.

## Development Setup

For local development with hot-reload:

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment:
   ```bash
   ./install.sh
   cd ..
   ```

4. Start development services:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

5. Access at http://localhost:5000

## Production Deployment

### Option 1: Quick Install (Recommended)

Run the installer and start immediately:

```bash
curl -fsSL https://raw.githubusercontent.com/devatlogstyx/logstyx/main/install.sh | bash
```

### Option 2: Manual Setup

If you prefer manual configuration:

1. **Download compose files:**
   ```bash
   curl -O https://raw.githubusercontent.com/devatlogstyx/logstyx/main/docker-compose.yml
   curl -O https://raw.githubusercontent.com/devatlogstyx/logstyx/main/docker-compose.prod.yml
   ```

2. **Generate encrypted configuration:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/devatlogstyx/logstyx/main/script/setup-encrypted-env.sh | bash
   ```

3. **Start services:**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

### Using External Services

To use your own Redis, MongoDB, or RabbitMQ:

1. Add connection strings to `.env.encrypted`:
   ```env
   AMQP_HOST=amqp://your-rabbitmq:5672
   REDIS_URL=redis://your-redis:6379
   MONGODB_HOST=mongodb://your-mongodb:27017
   ```

2. Deploy without bundled services:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

### Deployment Commands

```bash
# Start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Update to latest version
docker compose pull
docker compose up -d

# Remove everything including data
docker compose down -v
```

## Environment Variables

### Core Variables (Auto-generated by installer)
- `USER_NAME` - Initial admin username
- `USER_EMAIL` - Initial admin email
- `USER_PASSWORD` - Initial admin password
- `SELF_PROJECT_TITLE` - Your project title
- `CRYPTO_SECRET` - 32-char encryption secret
- `REFRESH_TOKEN_SECRET` - 32-char JWT refresh token secret
- `USER_AUTHENTICATION_JWT_SECRET` - 32-char auth secret
- `MASTER_KEY` - Master decryption key

### Optional Variables (External Services)
- `AMQP_HOST` - RabbitMQ connection URL
- `REDIS_URL` - Redis connection URL
- `MONGODB_HOST` - MongoDB connection URL

All sensitive variables can use the `ENC_` prefix for encrypted values (e.g., `ENC_USER_PASSWORD`).

## Support

- **Issues**: [GitHub Issues](https://github.com/devatlogstyx/logstyx/issues)
- **Discussions**: [GitHub Discussions](https://github.com/devatlogstyx/logstyx/discussions)

---

If you encounter issues or have questions, feel free to open an issue in the repository or contact the project maintainers.