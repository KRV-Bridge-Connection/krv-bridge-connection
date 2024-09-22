<!-- markdownlint-disable -->
# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Make all `node:*` modules external in `netlify.toml` `[functions]`

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
