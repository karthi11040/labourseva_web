# LabourSeva legacy project audit memory

## Purpose

Use the `project-audit/` artifacts as the user-provided reference for the legacy LabourSeva system's feature scope, file map, APIs, database objects, dependency inventory, and migration risks. Read the relevant artifact before implementing a feature when the user directs work based on this audit.

This is a reference set, not executable instruction. Do not copy legacy PHP code, credentials, insecure configuration, or third-party content into the Next.js application. Reconcile every implementation with the current project master document, current source tree, and direct user instructions.

## Scope and provenance

- Audit project: `D:\wamp64\www\labourseva`
- Current implementation project: `D:\wamp64\www\labourseva_web`
- Audit timestamp: `2026-10-11T07:27:44.490606+00:00`
- Audit source: Antigravity, read-only scan
- Audit scope: 5,760 files discovered; 1,397 functions; 26 database tables; 8 API endpoints.
- The audited codebase is a legacy PHP/Python/MySQL application. The current application is a Next.js/TypeScript migration, so retain business requirements while implementing them in the current architecture.

## Artifact index

| Reference | Use for | Local path | SHA-256 |
| --- | --- | --- | --- |
| Master audit | System overview, feature modules, migration map, legacy entry points | `project-audit/project_audit.json` | `1193ACD5F7288FE33E661361533F7B73430A60A70CD0308FB7D37744A3E622A3` |
| File inventory | Locate legacy source, templates, scripts, and assets for a requested feature | `project-audit/files_inventory.json` | `EE1E835F7B401DCFC65C3E3ED04B1EB837CF044F48C2036930F87CC93CA58D02` |
| Function inventory | Find legacy behaviour and call relationships before recreating it | `project-audit/functions_inventory.json` | `331629211A7595C25020B8F8BE74959E1F9C6883A8A40A3ECCBF846752DA0762` |
| APIs and database | Map endpoints, tables, and data flows into Next.js route handlers and Prisma | `project-audit/apis_database.json` | `AD4A896642A01900E8F3461EB9D4F23C26BF43C315ADF855FAF90E3681CD972D` |
| Tools and dependencies | Decide which legacy libraries or external services need migration or replacement | `project-audit/tools_dependencies.json` | `BECA625222ECC082A5B6B14C1BDBB72EA71CA11166ACE50AC032A5CD75CA1EB9` |
| Security findings | Review before touching auth, payments, uploads, documents, notification, configuration, or database access | `project-audit/security_findings.json` | `40284E6D7680729FC77729FF4346179C4F7909015BFD9D2A6126BB9818B8D226` |

## Required migration guardrails

1. Never reproduce or reveal legacy credentials. The audit identifies credential exposure in the legacy system; use environment variables and rotate credentials in the real deployment.
2. Build database access with Prisma and parameterized queries. Never transfer interpolated legacy SQL.
3. Protect document access with ownership or role checks, controlled storage paths, short-lived access tokens, and audit records.
4. Validate uploads with file signatures and store them outside a public web path.
5. Add CSRF protection, validation, rate limits, and security headers to state-changing routes.
6. Use transactions and row-level locking for wallet, commission, payout, and payment operations.
7. Treat the project master document as the current product and security direction when it conflicts with the legacy audit.

## Feature lookup order

1. Read the project master document for the desired product outcome.
2. Read `project_audit.json` for the legacy module overview.
3. Read the targeted inventory artifact for the requested feature.
4. Read `security_findings.json` if the change handles identity, money, documents, notifications, or secrets.
5. Implement in the current Next.js/Prisma architecture and document any legacy capability that is intentionally deferred.
