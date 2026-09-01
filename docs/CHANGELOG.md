# Changelog

All notable changes to MentorOS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-09-01

### Added

- GitHub-standard repository packaging (`LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, issue/PR templates, CI).
- English asset layout: `assets/desktop-pet/`.
- Review module: local manuscript upload (PDF/DOCX/MD/TXT) without auto-rewriting the writing session.
- Reference classification, third-party notices, and per-skill attribution.

### Changed

- Documentation filenames under `docs/` use English kebab-case; Chinese content is kept (`.zh.md`).
- License is **PolyForm Noncommercial 1.0.0** (no commercial use). MIT is withdrawn.
- PolyForm now explicitly covers original MentorOS contributions only;
  third-party and adapted components retain their upstream licenses.
- Root `.gitignore` now excludes `node_modules`, `.next`, `_vendor`, `release/`, archives, and presentation/reporting files.

### Removed

- Local dump archives (`MentorOS.zip`, duplicate mascot zip, `release/` source snapshot) from the working tree.
- Unused Clawd artwork downloader and bridge code; the upstream artwork is
  All Rights Reserved and is not part of MentorOS.

[2.0.0]: https://github.com/LostSirius/MentorOS/releases/tag/v2.0.0
