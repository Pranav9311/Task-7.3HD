# DevOps Pipeline Report — Deakin Learning App

## 1. Project Overview

### Application Description
The **Deakin Learning App** is a full-featured React single-page application built for Deakin University students. It provides course browsing, news feeds, user authentication (email, Google, GitHub, Microsoft OAuth), and a personalised dashboard.

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + JSX | 19.2 |
| Build Tool | Vite | 7.2 |
| Routing | React Router | 7.13 |
| Backend/BaaS | Firebase (Auth + Firestore) | 12.11 |
| Testing | Vitest + React Testing Library | 3.1 |
| Code Quality | SonarQube | 10.x |
| Security | npm audit + OWASP Dependency-Check + Trivy | Latest |
| Container Security | Trivy (image vulnerability scanner) | Latest |
| Containerisation | Docker (multi-stage) | 24.x |
| Orchestration | Docker Compose | 2.x |
| Web Server | Nginx | 1.27 |
| Artifact Registry | Docker Hub | - |
| Monitoring | Prometheus + Grafana | 2.51 / 10.4 |
| CI/CD | Jenkins (Declarative Pipeline) | 2.4+ |

### Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                             JENKINS PIPELINE                                 │
├──────────┬──────────┬────────────┬──────────┬──────────┬──────────┬──────────┤
│  BUILD   │   TEST   │CODE QUALITY│ SECURITY │  PUSH    │  DEPLOY  │ RELEASE  │
│ npm ci   │ Vitest   │ SonarQube  │npm audit │ Docker   │ Staging  │  Prod    │
│ vite     │ ESLint   │ Quality    │ OWASP    │ Hub      │ Docker   │ Git      │
│ docker   │ Coverage │ Gate       │ Trivy    │ Registry │ Compose  │ Tag      │
│ build    │(parallel)│            │(parallel)│ Tags     │ Health ✓ │ Docker   │
└────┬─────┴────┬─────┴─────┬──────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘
     │          │           │           │          │          │          │
     ▼          ▼           ▼           ▼          ▼          ▼          ▼
 Docker     JUnit XML   SonarQube   Audit      Docker   localhost  localhost
 Image      Coverage    Dashboard   Reports    Hub       :3000      :80
                                    Trivy      Push                  │
                                    Report     ✓              ┌──────┘
                                                              ▼
                                                    ┌──────────────────┐
                                                    │   MONITORING     │
                                                    │  Prometheus:9090 │
                                                    │  Grafana:3001    │
                                                    │  Nginx Exporter  │
                                                    │  Alert Rules     │
                                                    └──────────────────┘
```

---

## 2. Pipeline Stages — Detailed Explanation

### Stage 1: Build

**Purpose:** Compile the application and produce a deployable artefact (Docker image).

**What it does:**
1. Runs `npm ci` for deterministic, clean dependency installation
2. Executes `npm run build` to create the optimised Vite production bundle in `dist/`
3. Builds a multi-stage Docker image:
   - **Stage 1 (builder):** Node 20 Alpine compiles the app
   - **Stage 2 (production):** Nginx 1.27 Alpine serves static files (~25MB final image)
4. Tags the image with `BUILD_NUMBER-GIT_COMMIT_SHORT` for traceability

**Tools:** npm, Vite, Docker

**Expected Output:**
- `dist/` directory with optimised static assets
- Docker image: `deakin-app:<build-version>` and `deakin-app:latest`
- Archived build artefacts in Jenkins

---

### Stage 2: Test

**Purpose:** Validate application correctness through automated testing.

**What it does (runs in PARALLEL):**

**2a. Unit & Integration Tests (Vitest):**
- Executes 30+ test cases covering utility functions
- Tests include: email validation, password strength, date formatting, text truncation, slugification, reading time calculation
- Integration tests verify multiple utilities work together
- Generates JUnit XML report for Jenkins integration
- Produces code coverage report (V8 provider) with 60% minimum threshold

**2b. Lint Check (ESLint):**
- Runs ESLint with React Hooks and React Refresh plugins
- Produces JSON report for review
- Runs in parallel with tests for speed

**Tools:** Vitest, React Testing Library, ESLint

**Expected Output:**
- JUnit XML test results published to Jenkins
- HTML coverage report accessible via Jenkins
- ESLint JSON report archived

---

### Stage 3: Code Quality

**Purpose:** Analyse code health — structure, maintainability, complexity, and code smells.

**What it does:**
1. Runs SonarQube Scanner against the source code
2. Sends coverage data (lcov) for quality gate evaluation
3. Analyses: code smells, duplications, cyclomatic complexity, cognitive complexity, maintainability rating
4. **Quality Gate Check:** Pipeline waits (up to 5 min) for SonarQube's webhook to confirm the gate passed or failed. If it fails, the pipeline ABORTS.

**Quality Gate Thresholds (configured in SonarQube):**
| Metric | Threshold |
|--------|-----------|
| Code Coverage | ≥ 60% |
| Duplicated Lines | < 10% |
| Maintainability Rating | A |
| Reliability Rating | A |
| Security Rating | A |
| New Critical/Blocker Issues | 0 |

**Tools:** SonarQube, sonar-scanner

**Expected Output:**
- SonarQube dashboard with metrics
- Quality gate pass/fail result
- Pipeline abort if gate fails

---

### Stage 4: Security

**Purpose:** Identify known vulnerabilities in dependencies, the codebase, and Docker images.

**What it does (runs in PARALLEL — 3 tools concurrently):**

**4a. NPM Audit:**
- Scans `package-lock.json` against the npm advisory database
- Identifies CVEs in direct and transitive dependencies
- Produces JSON report with severity levels (low, moderate, high, critical)

**4b. OWASP Dependency-Check:**
- Scans all project files against the National Vulnerability Database (NVD)
- Identifies CVEs with CVSS scores
- Generates HTML and JSON reports
- Results published via the Dependency-Check Jenkins plugin

**4c. Trivy Container Scan (NEW):**
- Scans the built Docker image (`deakin-app:<version>`) for OS-package and library vulnerabilities
- Auto-installs Trivy if not present on the Jenkins agent (script-based install)
- Generates two reports:
  - **JSON report** (`trivy-report.json`) — machine-readable, archived in Jenkins
  - **Table report** (`trivy-report.txt`) — human-readable, displayed in Jenkins console
- **Fail threshold:** Pipeline fails ONLY if **CRITICAL** vulnerabilities are found (configurable via `TRIVY_SEVERITY` env var)
- Reports are archived and published as HTML in Jenkins

**Tools:** npm audit, OWASP Dependency-Check, Trivy

#### Security Vulnerability Analysis

Below is an example of a real vulnerability commonly found in React/Node.js projects:

##### Vulnerability 1: Prototype Pollution in `minimist` (Transitive Dependency)

| Field | Detail |
|-------|--------|
| **CVE** | CVE-2021-44906 |
| **Package** | minimist (transitive via build tools) |
| **Severity** | **Critical** (CVSS 9.8) |
| **Description** | The `minimist` package before 1.2.6 is vulnerable to Prototype Pollution. An attacker can inject properties into `Object.prototype` by passing specially crafted arguments, leading to property injection, denial of service, or remote code execution. |
| **Impact** | An attacker could manipulate application behaviour by polluting JavaScript prototypes, potentially bypassing authentication or causing crashes. |
| **Mitigation** | Updated `minimist` to version ≥1.2.6 by running `npm audit fix`. For transitive dependencies, forced resolution via `overrides` in `package.json`. Verified fix by re-running `npm audit`. |

##### Vulnerability 2: Cross-Site Scripting (XSS) in Older React Versions

| Field | Detail |
|-------|--------|
| **Package** | react-dom (if using version < 16.13) |
| **Severity** | **High** (CVSS 6.1) |
| **Description** | Certain versions of react-dom could allow XSS attacks through `dangerouslySetInnerHTML` or unescaped user input rendered in JSX. |
| **Impact** | Malicious scripts could execute in users' browsers, stealing session tokens or performing actions on behalf of the user. |
| **Mitigation** | Using React 19.2 (latest) which has built-in XSS protections. All user inputs are escaped by default in JSX. Added Content-Security-Policy headers in Nginx configuration. |

##### Vulnerability 3: Firebase API Key Exposure

| Field | Detail |
|-------|--------|
| **Type** | Secret Exposure |
| **Severity** | **Medium** |
| **Description** | Firebase API keys are present in client-side code (`firebase.js`). While Firebase API keys are designed to be public (they are restricted by Firebase Security Rules), exposing them without proper rules could allow unauthorized database access. |
| **Impact** | Without proper Firestore Security Rules, an attacker could read/write data directly. |
| **Mitigation** | Configured strict Firestore Security Rules requiring authentication. Firebase API keys are restricted by domain in the Firebase Console. Added `.env` support for environment-specific configurations and ensured `.env` files are excluded from version control via `.gitignore`. |

---

### Stage 4.5: Push to Docker Registry (NEW)

**Purpose:** Store versioned Docker images externally in Docker Hub for artifact traceability and disaster recovery.

**What it does:**
1. Authenticates with Docker Hub using Jenkins credentials (username/password — **never hardcoded**)
2. Tags the verified Docker image with **four** identifiers:
   - `<build-number>-<git-commit>` — exact build version
   - `<git-commit-short>` — commit-level traceability
   - `build-<build-number>` — Jenkins build number
   - `latest` — rolling latest tag
3. Pushes all four tags to Docker Hub
4. Logs out from Docker Hub in the `post` block (always runs)
5. **Only executes if Build + Security stages pass** (sequential pipeline ordering ensures this)

**Prerequisites:**
- Jenkins credential `DOCKER_HUB_CREDENTIALS` (type: Username with password)
- Jenkins credential `DOCKER_HUB_REPO` (type: Secret text, e.g. `yourusername/deakin-app`)

**Tools:** Docker CLI, Docker Hub

**Expected Output:**
- Image pushed to Docker Hub with 4 tags
- Docker logout after push (security best practice)
- No push if preceding stages fail

---

### Stage 5: Deploy to Staging

**Purpose:** Deploy the verified build to a staging environment for pre-production validation.

**What it does:**
1. Tears down any existing staging containers
2. Deploys via `docker-compose.staging.yml` on port 3000
3. Runs a health check loop (30 attempts, 5-second intervals) to verify the container is healthy
4. Performs a smoke test hitting `http://localhost:3000/health` and verifying HTTP 200
5. On failure: automatically tears down the staging environment (rollback)

**Tools:** Docker Compose, curl

**Expected Output:**
- Application running at `http://localhost:3000`
- Health endpoint returning `{"status":"healthy"}`
- Container status: `healthy`

---

### Stage 6: Release to Production

**Purpose:** Promote the staging-verified image to production.

**What it does:**
1. Re-tags the Docker image: `deakin-app:release-<version>` and `deakin-app:production`
2. Creates a Git tag: `v<build-version>` with a descriptive message
3. Pushes the tag to the remote repository
4. Deploys via `docker-compose.production.yml` on port 80 with:
   - Resource limits (1 CPU, 512MB RAM)
   - JSON file logging with rotation
   - `always` restart policy
5. Runs production health check loop
6. **Rollback:** On failure, redeploys the previous production image

**Tools:** Docker, Docker Compose, Git

**Expected Output:**
- Application running at `http://localhost:80`
- Git tag `v<version>` pushed to repository
- Container with resource constraints and logging

---

### Stage 7: Monitoring & Alerting

**Purpose:** Provide real-time observability into the production application.

**What it does:**
1. Deploys a full monitoring stack via `docker-compose.monitoring.yml`:
   - **Prometheus** (port 9090) — metric collection with 7-day retention
   - **Nginx Exporter** (port 9113) — translates nginx stub_status to Prometheus metrics
   - **Grafana** (port 3001) — pre-configured dashboards
2. Verifies Prometheus is ready and scraping targets
3. Verifies Grafana is accessible
4. Confirms alert rules are loaded

**Alert Rules:**

| Alert | Condition | Severity | Trigger |
|-------|-----------|----------|---------|
| AppDown | `up{job="nginx"} == 0` | 🔴 Critical | App unreachable for >1 min |
| HighErrorRate | 5xx rate > 5% over 5 min | 🟡 Warning | Server errors spike |
| HighConnectionCount | Active connections > 500 for 5 min | 🟡 Warning | Potential overload |
| RequestSpike | Rate > 100 req/min for 3 min | 🔵 Info | Traffic anomaly |
| HealthCheckFailing | `/health` endpoint down for 30s | 🔴 Critical | App crash |
| PrometheusTargetDown | Any target `up == 0` for 5 min | 🟡 Warning | Monitoring gap |

**Grafana Dashboard Panels:**
1. **Application Health Status** — Stat panel (UP/DOWN with color)
2. **Active Connections** — Gauge (green/yellow/red zones)
3. **Request Rate** — Time series chart (req/sec by status code)
4. **Connection Throughput** — Time series (accepted vs handled)
5. **Connection States** — Bar gauge (active/reading/writing/waiting)
6. **Alerts Table** — Live firing alerts

**Example Alert Scenario — App Downtime:**
> If the Deakin App goes down (container crashes or becomes unresponsive), the `AppDown` alert fires after 1 minute. Prometheus evaluates `up{job="nginx"} == 0`, marks the alert as `FIRING`, and it appears in the Grafana Alerts Table. The health status panel turns RED showing "DOWN". This enables the team to respond within minutes.

**Tools:** Prometheus, Grafana, nginx-prometheus-exporter

---

## 3. Tools Used and Justification

| Tool | Stage | Why This Tool |
|------|-------|--------------|
| **npm** | Build | Native Node.js package manager; `npm ci` ensures reproducible builds |
| **Vite** | Build | Fastest React build tool; tree-shaking, code-splitting, sub-second HMR |
| **Docker** | Build/Deploy | Containerisation ensures consistency across all environments |
| **Vitest** | Test | Vite-native test runner; 10x faster than Jest for Vite projects |
| **ESLint** | Test | Industry-standard linter for JavaScript/React code quality |
| **SonarQube** | Code Quality | Comprehensive static analysis with quality gates and trend tracking |
| **npm audit** | Security | Built-in, zero-config vulnerability scanner for npm dependencies |
| **OWASP DC** | Security | Industry-standard CVE scanner using the NVD; comprehensive reports |
| **Trivy** | Security | Aqua Security's container image scanner; detects OS + library CVEs |
| **Docker Hub** | Artifact Storage | Industry-standard container registry; versioned image storage |
| **Docker Compose** | Deploy/Release | Multi-container orchestration with health checks and networking |
| **Nginx** | Deploy | High-performance web server; SPA routing, gzip, security headers |
| **Prometheus** | Monitoring | Pull-based metrics with powerful PromQL; de facto standard |
| **Grafana** | Monitoring | Beautiful dashboards; auto-provisioning; alerting integration |
| **Git Tags** | Release | Immutable release markers; integrates with semantic versioning |

---

## 4. Pipeline Features for Top HD

### ✅ Full Automation
All 7 stages execute without manual intervention. The only manual step is the initial Jenkins job configuration.

### ✅ Parallel Stages
- Test stage: Unit tests + Lint run simultaneously
- Security stage: npm audit + OWASP + Trivy run simultaneously (3-way parallel)

### ✅ Secrets Management
Jenkins Credentials store is used for `SONAR_HOST_URL`, `SONAR_AUTH_TOKEN`, `DOCKER_HUB_CREDENTIALS`, and `DOCKER_HUB_REPO`. No secrets are hardcoded. Docker Hub login/logout is handled securely within the pipeline.

### ✅ Rollback Strategy
- **Staging:** Automatic teardown on failure
- **Production:** Redeploys previous image on failure
- Health checks gate each deployment

### ✅ Versioning
- Docker images tagged with `BUILD_NUMBER-GIT_COMMIT`
- Git tags created automatically for releases
- Build metadata stored as Docker labels

### ✅ Notifications
Email alerts on pipeline success and failure with build details, registry image references, and direct links.

### ✅ Artefact Management
- Build output (`dist/`) archived in Jenkins
- Test reports (JUnit XML) published with trend graphs
- Coverage reports accessible as HTML
- Security reports archived and published (npm audit, OWASP, Trivy)
- Docker images pushed to Docker Hub with 4 tags per build

### ✅ Container Security
- Trivy scans the Docker image for OS and library vulnerabilities
- Produces both JSON (machine) and table (human) reports
- Configurable fail threshold (default: CRITICAL only)
- Runs in parallel with npm audit and OWASP Dependency-Check

---

## 5. Tips to Achieve Top HD (96–100%)

1. **Run the pipeline live** in your demo video — show real console output, not screenshots
2. **Show failing tests** then fixing them to demonstrate the pipeline catches issues
3. **Trigger an alert** in monitoring — stop the app container and show the Grafana dashboard change
4. **Explain WHY** each tool was chosen, not just what it does
5. **Show the rollback** in action — deliberately fail a deployment and show recovery
6. **Point out parallel stages** in the Jenkins Blue Ocean view
7. **Show SonarQube quality gate** results with specific metrics
8. **Walk through security findings** and explain the severity and mitigation
9. **Keep the demo under 10 minutes** — rehearse beforehand
10. **Include this report** in your PDF submission as supporting documentation

---

## 6. File Structure

```
HD Project/
├── Jenkinsfile                          # Complete 7-stage pipeline
├── Dockerfile                           # Multi-stage Docker build
├── .dockerignore                        # Docker build exclusions
├── docker-compose.staging.yml           # Staging deployment
├── docker-compose.production.yml        # Production deployment
├── docker-compose.monitoring.yml        # Prometheus + Grafana stack
├── nginx.conf                           # Nginx with health + metrics
├── package.json                         # Dependencies + test scripts
├── vite.config.js                       # Vite build config
├── vitest.config.js                     # Test runner config
├── eslint.config.js                     # Linting rules
├── sonar-project.properties             # SonarQube config
├── index.html                           # App entry point
├── src/
│   ├── main.jsx                         # React bootstrap
│   ├── App.jsx                          # Router + layout
│   ├── index.css                        # Global styles
│   ├── utils/
│   │   ├── helpers.js                   # Utility functions
│   │   └── helpers.test.js              # 30+ test cases
│   └── test/
│       └── setup.js                     # Test environment setup
├── monitoring/
│   ├── prometheus.yml                   # Scrape configuration
│   ├── alert-rules.yml                  # 6 alert rules
│   └── grafana/
│       ├── dashboards/
│       │   └── deakin-app-dashboard.json # Pre-built dashboard
│       └── provisioning/
│           ├── datasources/
│           │   └── datasource.yml       # Prometheus datasource
│           └── dashboards/
│               └── dashboard.yml        # Dashboard provider
└── PIPELINE_REPORT.md                   # This report
```
