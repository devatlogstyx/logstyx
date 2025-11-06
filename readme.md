# README

Welcome to the Logstyx Project! An open-source server implementation of the LOGSTYX logging platform that compatible with [logstyx SDK](https://github.com/devatlogstyx/logstyx-js-core). This project comprises several interdependent services, including authentication, caching, core processing, a frontend application, and utility functionalities, which communicate via HTTP and RPC protocols.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Why Logstyx?](#why-logstyx)
- [Services Structure](#services-structure)
- [Technologies Used](#technologies-used)
- [Setup Instructions](#setup-instructions)
- [Setup For Production](#setup-for-production)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)

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
└── script
    ├── ...
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

## Setup Instructions

### Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies using `pnpm`:
   ```bash
   pnpm install
   ```

3. Set up your environment variables:
   - Create a `.env` file in the script directory
   - Run the encryption script to generate an encrypted `.env.encrypted` file and build the frontend
   - Make sure to set the required environment variables in `.env`

4. To run the services locally, use the following command:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

5. Access the application:
   - Open http://localhost:5000 from your browser

## Setup For Production

We provide `docker-compose.prod.yml` to use the latest release from the Docker registry.

### Option 1: Using Docker Compose with bundled services
This uses the included Redis, MongoDB, and RabbitMQ services:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Option 2: Using external/separate services

If you want to use separate services (external Redis, MongoDB, or RabbitMQ), you can override the default configuration:

1. Create a `.env` file with your service URLs:
   ```env
   AMQP_HOST=amqp://your-rabbitmq-host:5672
   REDIS_URL=redis://your-redis-host:6379
   MONGODB_HOST=mongodb://your-mongodb-host:27017
   ```

2. Optionally, run the encryption script to use encrypted variables:
   ```env
   ENC_AMQP_HOST=your-encrypted-value
   ENC_REDIS_URL=your-encrypted-value
   ENC_MONGODB_HOST=your-encrypted-value
   ```

3. Run docker compose:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

**Note**: Environment variables in your `.env` file will automatically override the values in `docker-compose.prod.yml`. You don't need to remove anything from the compose file.

## Environment Variables

Key environment variables used across services:

- `AMQP_HOST`: RabbitMQ connection URL
- `REDIS_URL`: Redis connection URL
- `MONGODB_HOST`: MongoDB connection URL
- `ENC_*`: Encrypted versions of sensitive variables

Refer to individual service directories for service-specific environment variables.

## Scripts

The project includes utility scripts in the `script` directory for:
- Environment variable encryption
- Frontend build automation
- Development setup helpers

---

If you encounter issues or have questions, feel free to open an issue in the repository or contact the project maintainers. Happy coding!