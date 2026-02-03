<!-- markdownlint-disable -->
# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v2.0.12] - 2026-02-03

### Added
- Add route for scanning case IDs for Oasis

## [v2.0.11] - 2026-01-30

### Added
- Add Volunteer list page (requires JWT)

### Removed
- Remove most custom pantry handlers

## [v2.0.10] - 2026-01-25

### Added
- Add basic pantry sign-in on distribution page

### Changed
- Change all pantry QR/JWT handling

### Removed
- Remove online pantry sign-in API (POST gives an HTTP Not Implemented)

## [v2.0.8] - 2026-01-21

### Added
- Add page for digital displays (TVs)
- Add physical scanner support to pantry ditribution

### Changed
- Update pantry forms
- Disable pantry form starting Feb 1, 2026

### Changed
- Up

## [v2.0.7] - 2025-12-10

### Changed
- Update various dependencies
- Add household members to pantry

## [v2.0.6] - 2025-11-24

### Added
- Add pantry Queue
- Add handler for daily pantry stats

### Changed
- Update syncing IDB for pantry & partners

## [v2.0.5] - 2025-11-19

### Added
- Add "Gift and Kind" item support

### Changed
- Update polyfills & sanitizer

## [v2.0.4] - 2025-11-13

### Added
- Add KRV Food Calendar via Google Calendar Embed

## [v2.0.3] - 2025-10-30

### Added
- Add print button for pantry submission
- Add print styles

## [v2.0.2] - 2025-10-29

### Added
- Add Pantry Inventory Management

### Fixed
- Fix setting value for message body on contact page
- Fix redirect for `/.well-known/change-password`

## [v2.0.1] - 2025-10-22

### Added
- Begin implementing Invoker Commands

### Changed
- Switch to installing PWA via a `command` (`--install`)
- Use `@aegisjsproject/router` for contact page

### Removed
- Remove multiple old scripts and pages

## [v2.0.0] - 2025-10-21

### Added
- Add `@aegisjsproject/firebase-account-routes`
- Add corresponding route handlers

### Removed
- Remove all main bundle usage or Firebase

### [v1.1.14] - 2025-10-06

### Changed
- Update `@shgysk8zer0/importmap`

### Fixed
- Fix checking pantry visits

## [v1.1.13] - 2025-09-28

### Changed
- Update dependencies (adds `@aegisjsproject/commands`)

## [v1.1.12] - 2025-09-26

### Changed
- Misc package updates
- Updates to pantry
- Add more helpful links

## [v1.1.11] - 2025-08-29

### Added
- Add "Bridge to Wellbeing" application

### Changed
- Add panry schedule (days/hours/holidays)
- Use pantry schedule for date & time validation
- Update FAQ

### Added
- Add support for more complex pantry schedules (closed days, different hours)

## [v1.1.10] - 20205-07-30

### Changed
- Misc updates to dependencies, pantry system, etc

## [v1.1.9] - 2025-06-18

### Added
- Add basic event sign-in

### Changed
- Various updates to pantry

## [v1.1.8] - 2025-06-06

### Changed
- Update `@aegisjsproject/barcodescanner`

## [v1.1.7] - 2025-06-05

### Changed
- Update dependencies & CSP

## [v1.1.6] - 2025-05-12

### Added
- More fields in pantry
- Support QR codes for all the pantry things (with autofill)
- JWT via QR codes in pantry distribution
- QR code gen for pantry reg

## [v1.1.5] - 2025-05-05

### Changed
- Many updates to pantry

## [v1.1.4] - 2025-04-30

### Changed
- Various dependency updates/importmap changes

## [v1.1.3] - 2025-04-25

### Changed
- Various updates & fixes to routes and handlers

## [v1.1.2] - 2025-04-10

### Changed
- Organization search fixes/enhancements

## [v1.1.1] - 2025-04-08

### Changed
- Dependency updates

## [v1.1.0] - 2025-04-02

### Added
- Implement category search for partners/organizations

### Changed
- Switch from CJS 11ty to ESM 11ty
- Various dependency updates

## [v1.0.21] - 2025-03-14

### Changed
- Multiple misc changes... Too much to list

## [v1.0.20] - 2025-02-26

### Added
- Add POS-like checkout & inventory system for Food Pantry

## [v1.0.19] - 2025-02-21

### Added
- Now supports creating and viewing posts, inclucing markdown support

## [v1.0.18] - 2025-02-19

### Added
- Add Food Pantry page with Firestore endpoint/handler

## [v1.0.17] - 2025-01-30

### Added
- Add `/partners/:partnerID` handler/page/template & DB
- Implement IDB with schema via `@aegisjsproject/idb`
- Add `/docs/` and support for `download` attr on links
- Add Assistance Form as PDF
- Redirects for dynamic pages (does not break 404 page)
- WIP web component to create 211 search form
- Logos for numerous partners

## [v1.0.16] - 2025-01-17

### Added
- Add 211 search page
- Add handlers & endpoints for posts and partner profiles
- Add Google Calendar embed

## [v1.0.15] - 2024-12-25

### Added
- Implement AES encryption
- Generate `jwks.json` using `@shgysk8zer0/jwk-utils`
- Add and use `@shgysk8zer0/geoutils`
- Add `.well-known/openid-configuration` and `.well-known/jwks.json`

### Changed
- Update claims and verification in JWTs
- Use static generated files instead of API for Firebase creds and JWK public key
- Misc dependency updates

## [v1.0.14] - 2024-12-05

### Added
- Add module preloading
- Add missing white version of logo text

### Changed
- Update branding page
- Update volunteer form & handling
- Misc dependency updates

### Fixed
- Fix duplicate scripts and stylesheets

## [v1.0.13]

### Added
- Add `/volunteer/` page via `/js/routes/`

### Changed
- Mark some libraries as external in rollup

### Fixed
- Fix `robots.txt`
- Fix `/reset/` page

## [v1.0.12] - 2024-11-09

### Added
- Implement `@aegisjsproject/router`

## [v1.0.11] - 2024-10-08

### Added
- Add `/api/url` for link management and kinda shortening
- Add endpoint to create JWT with org (`sub_id`) and `entitlements`
- Add client-side function to `fetch` those tokens

### Changed
- Make all `node:*` modules external in `netlify.toml` `[functions]`
- `DELETE /api/orgs` now get JWT from `org-jwt` cookie
- Revert nonprofit status (now 501(c)3)
- Update about page content
- Update screenshots

### Fixed
- Fix bad imports/bundling in Netlify Functions

## [v1.0.10] - 2024-09-19

### Changed
- Update dependencies and config

### Fixed
- Update `external_node_modules` in `netlify.toml`
- Fixed `share_target` / contact form handling

## [v1.0.9] - 2024-09-14

### Changed
- Switch to using JWTs for Slack messages

### Fixed
- Fix error in Slack implementation

## [v1.0.8] - 2024-09-10

### Added
- Add handler for public JWK
- Add same public JWK defined as `const`

### Changed
- Lay groundwork for JWTs for orgs, with permissions
- Switches from `@shgysk8zer0/netlify-func-utils` to `@shgysk8zer0/lambda-http`
- Various package updates

### Removed
- Remove testing API/handlers

## [v1.0.7] - 2024-08-13

### Changed
- Misc content and version updates

## [v1.0.6] - 2024-08-06

### Added
- Add Donorbox to donation page
- Allow via `script-src` & `frame-src`

## [v1.0.5] - 2024-08-04

### Added
- Add IARC Rating and Play Store URL/id
- Enable `share_target`
- Create Privacy Policy Page
- Add `assetlinks.json`

### Changed
- Update importmap
- Misc info updates

## [v1.0.4] - 2023-10-10

### Added
- Add Slack for contact form

### Changed
- Rewrite API to use `@shgysk8zer0/netlify-func-utils`
- Various updates to dependencies

### Fixed
- Misc updates to handle changes in Netlify Functions/AWS Lambda

## [v1.0.3] - 2023-09-13

### Added
- Add shortcuts & icons to PWA

### Fixed
- Fix icon for sign-up on `/accounts/`

## [v1.0.2] - 2023-09-12

### Changed
- Switch to using `<firebase-*>` components for auth
- Switch Firebase accounts
- Use API & `.env` vars to keep API keys out of source
- Use custom importmap
- Update logos

### Added
- Create `/api/orgs` endpoint

## [v1.0.1] - 2023-08-01

### Fixed
- Fix [Client-side URL redirect](https://github.com/KRV-Bridge-Connection/krv-bridge-connection/security/code-scanning/1)
- Fix mobile sizing of org / category cards

## [v1.0.0] - 2023-07-31

Initial Release
