# 网页桌宠 SVG 动画项目协作规则

1. 每次开始任何角色动作任务前，必须先完整读取 `PET_ANIMATION_SPEC.md`，并严格遵守其中全部规范。
2. 必须复用对应角色已有的 `output/<character>/base.svg` 基础 SVG；只有该角色首次制作且 `base.svg` 尚不存在时才可建立，之后不得另起或替换基础角色结构。
3. 一次只能处理一个角色的一个动作，不得在同一任务中同时生成多个角色或多个动作。
4. 外形唯一依据是 `references/<character>/reference.png`。不得覆盖或修改该文件；目录已统一为英文 id（gpt / gemini / grok / deepseek / qwen / claude / copilot）。
