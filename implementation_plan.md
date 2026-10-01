# Implementation Plan: GitHub Actions Continuous Integration (CI) Pipeline

## Overview
Establish an automated GitHub Actions CI workflow in `.github/workflows/ci.yml`. The pipeline executes on every push and pull request targeting `staging` and `main`, running three parallel jobs across Frontend (React/Vite/TS), Backend (Node/Express/Prisma/TS), and Mobile POS (Flutter/Dart). This ensures zero broken builds or undetected regressions can ever land in the shared branches.

![GitHub Actions CI Pipeline Diagram](file:///C:/Users/damie/.gemini/antigravity-ide/brain/999581c9-5c30-4195-933d-3667425ed95a/github_actions_ci_pipeline_1790848249517.jpg)

---

## Pipeline Architecture & Execution Flow

```
Trigger: Push or PR to [ staging, main ]
   |
   +---> Job 1: Frontend Tests & Typecheck (Ubuntu Latest, Node 20)
   |     - Setup Node & cache npm
   |     - npm ci in "./Frontend Money Card"
   |     - npx tsc --noEmit
   |     - npm test -- --run (285 Vitest tests)
   |
   +---> Job 2: Backend Tests & Typecheck (Ubuntu Latest, Node 20)
   |     - Setup Node & cache npm
   |     - npm ci in "./Backend Money Card"
   |     - npx prisma generate
   |     - npx tsc --noEmit
   |     - npm test (104 Vitest API tests)
   |
   +---> Job 3: Mobile POS Tests & Analysis (Ubuntu Latest, Flutter Stable)
         - Setup Flutter (3.47.0 stable) & cache pub
         - flutter pub get in "./Flutter Money card"
         - flutter analyze --no-pub
         - flutter test (171 tests)
```

---

## Worktree Changes

### 1. New Workflow File (`.github/workflows/ci.yml`)
- Trigger configuration:
  - `push` on branches `[staging, main]`
  - `pull_request` on branches `[staging, main]`
- Jobs defined:
  - `frontend`: runs on `ubuntu-latest`, working directory `./Frontend Money Card`, steps: checkout, setup-node, npm ci, npx tsc --noEmit, npm test -- --run.
  - `backend`: runs on `ubuntu-latest`, working directory `./Backend Money Card`, steps: checkout, setup-node, npm ci, npx prisma generate, npx tsc --noEmit, npm test.
  - `mobile`: runs on `ubuntu-latest`, working directory `./Flutter Money card`, steps: checkout, setup Java (actions/setup-java@v4), setup Flutter (subosito/flutter-action@v2 with channel stable), flutter pub get, flutter analyze --no-pub, flutter test.

---

## Verification Plan

### Automated Local Verification
- Validate YAML syntax and action versions.
- Ensure all 3 test suites pass locally prior to pushing:
  - Frontend: `npm test -- --run` (285 passed)
  - Backend: `npm test` (104 passed)
  - Flutter: `flutter test` (171 passed)
- Local Git: Commit `.github/workflows/ci.yml` to staging branch.

### GitHub Actions Verification
- Once pushed to `origin staging`, navigate to `https://github.com/AmigosiaMoneyCard/Money-Card/actions`.
- Confirm the `CI Pipeline` workflow triggers automatically.
- Verify all 3 jobs (`frontend`, `backend`, `mobile`) run in parallel and turn green.
