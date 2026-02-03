# CHANGELOG

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.13.1] - 2026-02-03

### Changed
- **Node.js Support**: Introduced support for Node.js 24. This is the version that will be supported going forward.
- Release updates for internal pipeline configuration.

## [0.13.0] - 2026-02-03

### Security
- Conducted a comprehensive security audit using `jf audit` and resolved all identified High, Medium, and Low severity vulnerabilities.
- Added `overrides` configuration to `package.json` to force secure versions of transitive dependencies:
  - `semver` (^7.6.0)
  - `debug` (^4.3.4)
  - `diff` (^8.0.3)
- Upgraded `mocha`, `rimraf`, and `supertest` to their latest secure versions.

### Breaking Changes
- **Node.js Support**: Dropped support for Node.js < 20.x. The project now strictly requires Node.js 20.x environment.
- **Express v5**: Upgraded `express` dependency from v4 to v5 (^5.2.1). Middleware signatures remain compatible but users should verify their Express app compatibility.

### Changed
- **Dependency Overhaul**: Updated all dependencies to their latest major versions:
  - `sinon` updated to v21.x (from v18.x).
  - `chai` updated to v6.x.
  - `typescript` updated to v5.9.x.
  - `eslint` updated to v9.x.
  - `prettier` updated to v3.x.
- **Type Definitions**: Pinned `@types/node` to `^20.0.0` to ensure type compatibility with the target runtime environment.
- **Documentation**: Updated `README.md` to reflect new system requirements (Node.js >= 20.x).

### CI/CD & Infrastructure
- **Unified Pipeline**: Consolidated multiple GitHub Actions workflows into a single, streamlined `ci-cd.yml` workflow for both Pull Requests and Main branch commits.
- **Automated Releases**: Implemented a fully automated release process. Pushing to `main` with a new version in `CHANGELOG.md` triggers:
  - Version verification.
  - NPM package publishing.
  - GitHub Release creation with auto-generated release notes extracted from changelog.
- **Release Scripting**: Added TypeScript-based release extraction script (`scripts/extract-release.ts`) executed via `tsx` for robust release note generation.
- **Build Optimization**: Introduced `tsconfig.build.json` to ensure clean distribution builds, excluding test files and scripts from the final NPM package.

### Fixed
- Fixed unit test regressions caused by `sinon` v21 update regarding fake timers. Adjusted `sinon.useFakeTimers` configuration in `awsVerify.spec.ts` to strictly mock the `Date` object, resolving timeout issues during test execution.
