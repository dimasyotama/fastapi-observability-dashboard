# FastAPI Observability Dashboard

This project demonstrates a FastAPI application integrated with a comprehensive observability stack using Prometheus, Grafana, Loki, and Tempo, all managed via Docker Compose.

![Screenshot 1](https://github.com/dimasyotama/fastapi-observability-dashboard/blob/master/Screenshot%202025-04-19%20at%2014.53.18.png)

![Screenshot 2](https://github.com/dimasyotama/fastapi-observability-dashboard/blob/master/Screenshot%202025-04-19%20at%2014.53.25.png)

![Screenshot 3](https://github.com/dimasyotama/fastapi-observability-dashboard/blob/master/Screenshot%202025-08-19%20at%2008.11.47.png)


## Overview

The setup includes:
* A simple **FastAPI** application (`the-app`) with several example endpoints and built-in metrics exposure (`/metrics`).
* **Prometheus** (`prometheus-observer`) for scraping and storing metrics from the FastAPI application.
* **Grafana** (`grafana-observer`) for visualizing metrics from Prometheus, logs from Loki, and traces from Tempo. It includes provisioned dashboards and datasources for all observability components.
* **Loki** (`loki-observer`) for log aggregation.
* **Promtail** (`promtail-observer`) for collecting logs from Docker containers (specifically `the-app`) and sending them to Loki.
* **Tempo** (`tempo`) for distributed tracing and trace storage.
* **OpenTelemetry Collector** (`otel-collector`) for receiving, processing, and forwarding traces to Tempo.

## Features

* **Metrics Collection:** FastAPI app exposes Prometheus metrics via `/metrics` using `prometheus-fastapi-instrumentator`. Prometheus scrapes this endpoint.
* **Log Aggregation:** Promtail tails Docker container logs and pushes them to Loki.
* **Distributed Tracing:** OpenTelemetry Collector receives traces and forwards them to Tempo for storage and analysis.
* **Visualization:** Grafana provides dashboards to view metrics (Prometheus datasource), logs (Loki datasource), and traces (Tempo datasource).
* **Containerized:** All services run in Docker containers orchestrated by Docker Compose.
* **Load Testing:** Includes a k6 script (`stress_test.js`) to generate load against the FastAPI application.

## Directory Structure
```bash
.
├── docker-compose.yaml         # Main Docker Compose file
├── Dockerfile                  # Defines the FastAPI application image (implied)
├── main.py                     # FastAPI application source code
├── requirements.txt            # Python dependencies for FastAPI app
├── stress_test.js              # k6 load test script
├── locust.py                   # Locust load test script (optional)
├── grafana/
│   └── provisioning/
│       ├── datasources/        # Grafana datasource configurations (Loki, Prometheus, Tempo)
│       │   ├── datasource.yml
│       │   ├── loki-datasource.yml
│       │   └── tempo-datasource.yml
│       └── dashboards/         # Grafana dashboard configurations
│           ├── dashboard.yml
│           └── fastapi-dashboard.json
├── loki/
│   └── config.yml              # Loki configuration file
├── prometheus/
│   └── prometheus.yml          # Prometheus configuration file
├── promtail/
│   └── config.yml              # Promtail configuration file
├── tempo/
│   └── tempo.yaml              # Tempo configuration file
└── otel-collection-config.yaml # OpenTelemetry Collector configuration
```
## Prerequisites

* Docker ([Install Docker](https://docs.docker.com/engine/install/))
* Docker Compose ([Install Docker Compose](https://docs.docker.com/compose/install/))

## Setup and Running

1.  **Create External Docker Network:**
    The services communicate over a shared Docker network named `monitoring`. Create it if it doesn't exist:
    ```bash
    docker network create monitoring
    ```

2.  **Build and Start Services:**
    Navigate to the project's root directory (where `docker-compose.yaml` is located) and run:
    ```bash
    docker compose up -d --build
    ```
    * `--build`: Ensures the FastAPI application image (`the-app`) is built using the `Dockerfile`.
    * `-d`: Runs the containers in detached mode (in the background).

3.  **Stop Services:**
    To stop the running services:
    ```bash
    docker compose down
    ```

## Accessing Services

Once the containers are running, you can access the services via your browser:

* **FastAPI Application:** [http://localhost:5060](http://localhost:5060) 
* **FastAPI Metrics:** [http://localhost:5060/metrics](http://localhost:5060/metrics)
* **Grafana:** [http://localhost:3000](http://localhost:3000) (Login: admin/admin) 
* **Prometheus:** [http://localhost:9090](http://localhost:9090) 
* **Loki:** (Usually accessed via Grafana, but API is at port 3100) 
* **Tempo:** [http://localhost:3200](http://localhost:3200) (Tempo UI for trace exploration)
* **OpenTelemetry Collector:** OTLP receivers at ports 4317 (gRPC) and 4318 (HTTP)
* **Promtail:** (Runs as an agent, typically no UI access needed) 

## Load Testing

A k6 script (`stress_test.js`) is included to simulate traffic against the FastAPI application.

1.  **Install k6:** Follow the instructions at [k6.io](https://k6.io/docs/getting-started/installation/).
2.  **Run the test:**
    ```bash
    k6 run stress_test.js
    ```
    You should see metrics and logs populate in Grafana as the test runs.

## Configuration

* **FastAPI:** Configuration is within `main.py` and dependencies in `requirements.txt`. The application runs on port 5060 internally.
* **Prometheus:** Configured in `prometheus/prometheus.yml` to scrape itself and the `the-app:5060` target.
* **Loki:** Configured in `loki/config.yml`.
* **Promtail:** Configured in `promtail/config.yml` to read Docker socket logs and send to `loki-app:3100`.
* **Tempo:** Configured in `tempo/tempo.yaml` to receive traces via OTLP gRPC on port 4317 and expose UI on port 3200.
* **OpenTelemetry Collector:** Configured in `otel-collection-config.yaml` to receive traces via OTLP (gRPC port 4317, HTTP port 4318) and forward them to Tempo.
* **Grafana:** Datasources and dashboards are provisioned via files in `grafana/provisioning/`, including Tempo datasource for trace visualization.
