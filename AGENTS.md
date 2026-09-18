# Workspace Guidelines & Rules

## Git Push & Branching Policy
1. **NEVER Push to `main`**:
   - Do **NOT** push directly to `main` under any circumstances.
   - Direct merges or pushes to `main` are strictly prohibited.

2. **Push to `staging` ONLY When Explicitly Instructed**:
   - Do **NOT** automatically push to `staging`.
   - Push to `origin/staging` **only** if the user specifically instructs: "push to staging" or "add to staging git".

3. **Default Behavior: Feature Branch Only (PR Workflow)**:
   - When completing tasks or pushing changes, push **ONLY** to the active feature branch on remote (`origin/<feature-branch>`).
   - The user will manually review, create Pull Requests (PRs), and check for merge conflicts before merging into staging or main.
