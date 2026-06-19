Failure 1: GitHub Actions CI workflow failed during dependency installation because the runner was using Node.js v20 while the project's pnpm version required Node.js v22+.

Fix: Updated the GitHub Actions workflow to use Node.js v22, aligning the CI environment with the local development environment and resolving the dependency installation failure.

Failure 2: Pull requests could still be merged even when CI checks failed because branch protection rules were not configured.

Fix: Created and configured a GitHub Ruleset for the main branch, enabling required status checks and pull request validation so that failed CI checks automatically block merges.
