# README

Welcome to the Logstyx Project! An open-source server implementation of the LOGSTYX logging platform that compatible with [logstyx SDK](https://github.com/devatlogstyx/logstyx-js-core). This project comprises several interdependent services, including authentication, caching, core processing, a frontend application, and utility functionalities, which communicate via HTTP and RPC protocols.

## Table of Contents
- [Overview](#overview)
- [Services Structure](#services-structure)
- [Technologies Used](#technologies-used)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Licenses](#licenses)

## Overview
This project implements a microservices architecture, with each service tailored to specific functionalities. The services include:
- **Authentication Service**: Manages user authentication and authorization.
- **Cache Service**: Provides caching capabilities across the microservices.
- **Core Service**: Handles essential application logic and data processing.
- **Gateway Service**: Acts as a single entry point for client requests.
- **Frontend Application**: An interactive user interface for interacting with the services.
- **Utility Service**: Contains miscellaneous utility functions including logging.

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
- **Docker**: For containerization of services.
- **React** + **Vite**: For building the frontend application.

## Setup Instructions
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
   - Create a `.env` file in the script directory then run it to generate an encrypted `.env.encrypted` file and build the frontend.
   - Make sure to set the required environment variables in `.env`.

4. To run the services locally, use the following command:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

## Licenses
This project is licensed under the UNLICENSED license. Please contact the author for more details if needed.

---

If you encounter issues or have questions, feel free to open an issue in the repository or contact the project maintainers. Happy coding!
