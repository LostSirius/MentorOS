# Changelog

All notable changes to MentorOS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-09-01

### Added

- GitHub-standard repository packaging (`LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, issue/PR templates, CI).
- English asset layout: `assets/desktop-pet/`.
- Review module: local manuscript upload (PDF/DOCX/MD/TXT) without auto-rewriting the writing session.

### Changed

- Documentation filenames under `docs/` use English kebab-case; Chinese content is kept (`.zh.md`).
- License is **PolyForm Noncommercial 1.0.0** (no commercial use). MIT is withdrawn.
- Root `.gitignore` now excludes `node_modules`, `.next`, `_vendor`, `release/`, archives, and presentation/reporting files.

### Removed

- Local dump archives (`MentorOS.zip`, duplicate mascot zip, `release/` source snapshot) from the working tree.

[2.0.0]: https://github.com/LostSirius/MentorOS/releases/tag/v2.0.0
