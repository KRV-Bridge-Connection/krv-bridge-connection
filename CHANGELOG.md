# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Add IARC Rating and Play Store URL/id
- Enable `share_target`
- Create Privacy Policy Page
- Add `assetlinks.json`

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
