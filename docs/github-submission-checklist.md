# GitHub 提交清单 · MentorOS

远程仓库：**`LostSirius/MentorOS`**。MentorOS 原创部分采用
**PolyForm Noncommercial 1.0.0（禁止商业使用）**；第三方组件保留各自许可证。

## 0. 不要提交

| 路径 | 原因 |
| --- | --- |
| `src/frontend/.env.local` | API Key |
| `src/frontend/node_modules/`、`.next/` | 依赖与缓存 |
| `_vendor/` | 上游整库克隆 |
| `release/`、`*.zip` | 打包快照 |
| `src/frontend/data/` | 本地库与上传 |
| **`docs/presentation/`** | 演示讲稿、幻灯片、PDF（汇报） |
| **`docs/product-overview.zh.md`** | PPT / 汇报用产品介绍 |
| **`assets/branding/`** | 团队海报等汇报图 |

以上已写入根目录 `.gitignore`，本地文件仍保留，只是不会进 Git。

## 1. 应当提交（项目本体）

**治理**

- [ ] `README.md` · `LICENSE`（PolyForm Noncommercial，非 MIT）
- [ ] `.github/CONTRIBUTING.md` · `.github/CODE_OF_CONDUCT.md` · `.github/SECURITY.md`
- [ ] `CITATION.cff` · `docs/CHANGELOG.md` · `AGENTS.md`
- [ ] `docs/REFERENCES.md` · `docs/THIRD_PARTY_NOTICES.md`
- [ ] `.editorconfig` · `.gitattributes` · `.gitignore` · `.nvmrc`
- [ ] `.github/` · `.cursor/rules/mentoros-modules.mdc`

**运行时**

- [ ] `src/frontend/`（含 `package-lock.json`、`.env.local.example`、`public/pets/qpack/`）
- [ ] `src/backend/`（`main.py`、`requirements.txt`、skills）

**项目文档与设计源（非汇报）**

- [ ] `docs/distill/` · `docs/research-skills-distillation.md` · `docs/README.md`
- [ ] `assets/desktop-pet/`
- [ ] `scripts/`（`dev.ps1`、`sync-qpack.ps1` 等）· `Makefile` · `docs/INTEGRATIONS.md`
- [ ] `src/backend/plugins/phd-research/skills/ATTRIBUTION.md` 及组件级许可证

## 2. 首次推送

```powershell
git add -A
git status    # 确认没有讲稿、PPT、.env.local、node_modules、.next
git commit -m "chore: package MentorOS for GitHub (noncommercial license)"
git branch -M main
git remote add origin https://github.com/<your-org>/mentoros.git
git push -u origin main
```

GitHub Settings：Description / Topics。
