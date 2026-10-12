# Fire Executive Actions Public

Public repository used only for safe GitHub Actions workloads that do not contain production secrets, customer data, database backups, or deployment credentials.

## Current migration status

- Public Actions smoke test: PASS
- Public product-details QA: PASS
- Public live regression QA for Production + Staging: PASS
- Heavy private shop QA workflows: changed to manual-only on shop-deploy-v1 and shop-backend-v1
- Redundant one-off production deploy workflows: changed to manual-only
- Scheduled private artifact cleanup: changed to manual-only on main

## Safety boundary

This public repository must NOT contain:

- Cloudflare API tokens or account credentials
- D1 database exports or backups
- Android production signing keys
- private customer/order data
- .env files
- private-repository access tokens

The private repository remains the source of truth for production deployment and D1 backup until a secure credential boundary is completed.

## Public QA workflows

- Public Actions Smoke Test
- QA Soroush Shop Product Details (Public Runner)
- Soroush Shop Live Regression QA

The live regression workflow checks public Production and Staging endpoints without changing data.

## Why the original repository remains private

A successful production D1 backup artifact is still retained in the private repository. Making that repository public before handling sensitive artifacts would create unnecessary data-exposure risk.
