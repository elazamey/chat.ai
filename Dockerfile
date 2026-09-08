# Celia — Agent Operating Kernel (AOK) · M5 Free Deployment
#
# Single $0 image: builds from a clean checkout and runs with NO external
# services (smoke-tested in CI with --network none).
# Contract: ZERO_COST_ECONOMIC_CONTRACT §17/§18 (zero cost until first revenue).

FROM node:22-alpine

RUN corepack enable

WORKDIR /app

# .dockerignore excludes node_modules/.git — everything else is part of the
# image on purpose: architecture tests read the docs/contracts at runtime.
COPY . .

# Deterministic install — the lockfile is the source of truth.
RUN pnpm install --frozen-lockfile

# Local-first economics: CELIA_MODE=local is the default; models are BYOK
# or the $0 deterministic MockProvider. Secrets enter at runtime — never here.
ENV CELIA_MODE=local

# celia CLI (ADR-0014). Examples:
#   docker run --rm --network none celia-aok health
#   docker run --rm --network none celia-aok run "demo task"
#   docker run --rm --network none celia-aok ledger
ENTRYPOINT ["pnpm", "exec", "tsx", "apps/cli/src/cli.ts"]
CMD ["health"]
