# OWASP Juice Shop Team Setup Guide
## CS467 Vulnerability Remediation Project

This guide explains how to run both project branches using Docker for local validation and collaboration.

> Use the correct project folder for the branch you are testing. The current remediated app lives in `juice-shop-main`, while the intentionally vulnerable version lives in `juice-shop-insecure`.

### Branches

- **insecure** – Intentionally vulnerable version used for pentesting and vulnerability validation.
- **main** – Remediated version used for implementing and testing security fixes.

### Current Docker Workflow

For the main branch, build and run from the project root of `juice-shop-main`:

```powershell
cd juice-shop-main
docker build -t juice-main-dev .
docker compose up -d --force-recreate
```

The app is exposed on:

```text
http://localhost:3001
```

After making a UI or frontend change, rebuild the image and recreate the container so the new version is served. A hard refresh in the browser may be required to load the latest build.

---

# Prerequisites

Install:

- Git
- Docker Desktop
- VS Code (recommended)

Verify Docker is running:

```powershell
docker --version
docker compose version
```

---

# Clone the Repository

```powershell
git clone <REPOSITORY_URL>
cd <REPOSITORY_NAME>
```

---

# Insecure Branch Setup

The `insecure` branch should never be modified. It is used only for:

- Pentesting
- Demonstrating exploits
- Validating vulnerabilities before fixes

## Switch to the Insecure Branch

```powershell
git checkout insecure
git pull
```

Verify:

```powershell
git branch
```

Expected:

```text
* insecure
```

## Build the Insecure Branch

```powershell
docker build -t juice-insecure .
```

## Run the Insecure Branch

```powershell
docker run -d --name juice-insecure -p 3000:3000 juice-insecure
```

## Access

Open:

```text
http://localhost:3000
```

---

# Main Branch Setup

The `main` branch is where all remediation work takes place.

## Switch to Main

```powershell
git checkout main
git pull
```

Verify:

```powershell
git branch
```

Expected:

```text
* main
```

## Build the Main Branch

From the root of the `juice-shop-main` project:

```powershell
docker build -t juice-main-dev .
```

## Start the Main Branch

The repository already contains the required `docker-compose.yml`.

Run:

```powershell
docker compose up -d --force-recreate
```

Verify:

```powershell
docker ps
```

Look for:

```text
juice-main
```

## Access

Open:

```text
http://localhost:3001
```

If the page does not reflect a recent frontend change, rebuild the image and recreate the container again, then hard refresh the browser.

---

# Running Both Versions Simultaneously

| Branch | Purpose | URL |
|----------|----------|----------|
| insecure | Pentesting / Vulnerability Validation | http://localhost:3000 |
| main | Security Fixes / Testing | http://localhost:3001 |

This allows vulnerabilities to be tested on the insecure branch and then validated on the remediated branch.

---

# Updating Code and Retesting

After making changes on the `main` branch, rebuild the Docker image from the project root before testing again.

## Rebuild the Image

```powershell
docker build -t juice-main-dev .
```

## Recreate the Container

```powershell
docker compose up -d --force-recreate
```

## Review Logs (Optional)

```powershell
docker logs juice-main
```

Look for startup messages ending with:

```text
(SUCCESS)
```

## Retest

Open:

```text
http://localhost:3001
```

and verify the fix. If the expected UI change is not visible, stop and restart the container, then hard refresh the page.

---

# Typical Development Workflow

## Create a Feature Branch

```powershell
git checkout main
git pull

git checkout -b fix-vulnerability-name
```

Examples:

```powershell
git checkout -b fix-sqli
git checkout -b fix-xss
git checkout -b fix-idor
git checkout -b fix-xxe
```

## Make Changes

Edit the code in VS Code.

## Test Changes

```powershell
docker build -t juice-main-dev .
docker compose up -d --force-recreate
```

Verify the application at:

```text
http://localhost:3001
```

## Commit Changes

```powershell
git add .
git commit -m "Fix vulnerability"
```

## Push Changes

```powershell
git push origin fix-vulnerability-name
```

## Create a Pull Request

Submit a Pull Request:

```text
feature branch → main
```

Do not merge directly into `main`.

---

# Useful Docker Commands

## View Running Containers

```powershell
docker ps
```

## View Main Branch Logs

```powershell
docker logs juice-main
```

## View Insecure Branch Logs

```powershell
docker logs juice-insecure
```

## Stop Main Branch

```powershell
docker compose down
```

## Start Main Branch

```powershell
docker compose up -d
```

## Stop Insecure Branch

```powershell
docker stop juice-insecure
```

## Start Insecure Branch

```powershell
docker start juice-insecure
```

## Remove Insecure Branch Container

```powershell
docker rm -f juice-insecure
```

---

# Project Rules

✅ Use `insecure` only for pentesting and vulnerability validation.

✅ Use feature branches for all vulnerability fixes.

✅ Submit Pull Requests into `main`.

✅ Test all fixes in Docker before submitting a Pull Request.

✅ Verify exploits succeed on `insecure` and fail on `main`.

❌ Do not modify the `insecure` branch.

❌ Do not commit directly to `main`.

❌ Do not merge untested code.

---

# Quick Reference

## Start Main

```powershell
docker compose up -d
```

## Rebuild and Retest Main

```powershell
docker build -t juice-main-dev .
docker compose up -d --force-recreate
```

## Run Insecure

```powershell
docker run -d --name juice-insecure -p 3000:3000 juice-insecure
```

## URLs

Main:
```text
http://localhost:3001
```

Insecure:
```text
http://localhost:3000
```