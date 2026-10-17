# V1b 续作验收 — 2026-10-14（续至 10-15）

**未完成；游戏测试源 `508fb2b`，已推送 main。** D/E、A–C 遗留修复及照片工作线程优化已经实现；最后一项的新源完整浏览器回归正在串行执行。Firefox 无头软件合成限制已有明确诊断，WebKit 慢帧及部分 Chromium 4× 长帧仍未达到流畅度验收；不开始 phase 3/V2。

## 本次进展与来源

- 10 月 14 日只读核对：本机与远端均为 `508fb2b`，无其他代理介入提交；未拉取、重置或覆盖工作。上次渲染诊断因自动权限审查额度不足而根本没有执行，这次恢复运行。
- D 的实际阶段边界、UID 去重、真实抽牌/消息及 D7，E 的历史牌堆、减弱/关闭动效和偏好切换均保持不变。实现与必要偏离详见 [10 月 4 日](2026-10-04-v1b-de.md)、[10 月 5 日](2026-10-05-v1b-acceptance.md)及 [10 月 13 日报告](2026-10-13-v1b-acceptance.md)；A–C 原报告保持原样。
- 新修复将相同照片的预生成与 PNG 编码移至原生工作线程，解决空闲预热未赶上发布时的同步成本。34 张照片在 Chromium/Firefox 逐像素一致；WebKit 缺少 OffscreenCanvas，保留原路径并通过回退检查。无新增依赖、文案、规则、事件、数值或人格参数。
- 构建/类型检查、validate 0 错误/27 既定警告、queue 的 690 动作及 13,976 跳过点已通过。Node 24.16.0 未变。300-run preview、601/152 冷却、18 文件相同/14 栏全过/零崩溃及软锁属于本次完成轮前段已复跑证据，没有冒称今日再跑，也没有替换模拟或 press 基线。
- 修复前游戏源 `2e6a3f8` 的三引擎×三尺寸完整正确性矩阵已完成。`508fb2b` 的 Chromium 三尺寸五类检查现已全部通过，Firefox 五类检查三尺寸也已全部通过（交互每尺寸 22/22，无头焦点/OS 媒体能力跳过单列）；WebKit 正在串行执行；日志 `.npm-cache/v1b-508fb2b-<browser>-<check>.log`。固定 50 回放/42 卡与已打开预览的计数要求不变。

## D/E 的解释、偏离与回归要求

- 一次动作只用一次 reducer 结果；月末、选择门、最后一次选牌分别暂停在真实边界。手牌只按实际 draw 事件发出，冬季门仍进入原结局和经理最后一句。
- 新增丑闻按事件/UID 去重，覆盖 onEndOfTurn Copycat；可见报纸槽位不足时用该实例已解析的原新闻句做临时展示，不发明第二张丑闻。尚未抽到的新丑闻展示面使用隔离的文案计数器副本，不增加真实抽牌或 RNG 调用。
- v18 的 1,050ms 头条停留、2,250ms 搬运起点、620ms 落牌和 650ms 错峰保留；真实资源事件按留手惩罚、排热、经理减压顺序展示，因此总时长不能机械等于 mockup。只移除普通选择暗层的背景模糊以降低重绘成本，暗层和实际选择保留。
- 经理模型在 draftOffer 或 turnStart 开启月份，因此选牌月先显示实际消息再暂停，最后选牌只发牌、不重复消息；一条消息的两个气泡只计一次通知，反应仍按消息/气泡身份保存。
- PRINTED 是任务正文直接批准的文字，新增的是 i18n 字段。其余继续用已批准键，未复制 mockup 示例文案。牌堆按出牌事件而非 UID 重建，允许同一张卡本月重新抽到再打出；已耗尽机会牌保留展示到扫牌。
- Chromium 新源真输入已通过静止鼠标、忙碌时移至另一张牌/END TURN、键盘及受支持触摸的预览抑制/空闲恢复；D7 保留到视觉尾部。五类牌堆场景包括抽牌、两行动、机会、多次出牌和大手牌，正常/早晚跳过/减弱/关闭/历史重放的最终信息及命中一致。
- 阶段检查覆盖零/一/多丑闻、Copycat、Mags 减压、门/选牌、换季、冬季；click/Enter/Space 在真实边界只结清展示，无额外选择或迟到回调。减弱原地淡变最多 150ms，中途偏好变化正常结清。Firefox 新源三尺寸同样通过全部可执行动效项目，键盘焦点/OS 媒体能力缺口明确跳过；WebKit 新源结果待完成，不能从其他引擎推断。

## 实际性能结果

10 月 13 日新源完整生产测量含 40 场景；Chromium 正常/4× 各 10 场景。后半段曾执行一次短类型检查，因此另用完全独立的 20 场景重测 Firefox/WebKit，原数据照留。两份电源记录均无待机事件，未启用保持唤醒或改电源设置。

| 环境 | 各场景活动 p95 范围 | 最大活动帧 | 判断 |
|---|---:|---:|---|
| Chromium 正常 | 8.50–8.60ms | 33.70ms | 整体稳定，保留个别长帧 |
| Chromium 4× | 8.50–8.60ms | 91.60ms | 低于修复前 108.30ms，仍不是无卡顿 |
| Firefox 正常，独立重测 | 25.00–58.32ms | 91.66ms | 软件合成下持续慢帧 |
| WebKit 正常，独立重测 | 81.00–111.00ms | 187.00ms | 未解决，不能称流畅 |
| Firefox 4× | — | — | 驱动不支持，明确跳过 |

活动窗口与之后 1,500ms 空闲窗口始终分开。落桌与总 busy 时间分别记录，未缩短阅读或改动跳过合同。完整数据：[新源生产测量](https://github.com/zsh56609/overexposed/blob/92d97c98375e746c415edacdb36006779df7ed56/docs/handoff/v1b-compare/de-worker-final-508fb2b.json)、[Firefox/WebKit 独立重测](https://github.com/zsh56609/overexposed/blob/92d97c98375e746c415edacdb36006779df7ed56/docs/handoff/v1b-compare/de-worker-ff-wk-isolated-508fb2b.json)。

Chromium 正常：响亮落桌/总 busy 为 938/2,113ms，安静 934/3,276ms，固定回放最长安静文案 946/4,029ms；平静月末 busy 3,514ms，多丑闻 10,665ms，Copycat 11,298ms，换季 8,045ms，冬季结局 1,830ms。约 0.95 秒仍只是卡牌落桌，不能用作解锁时刻。

定向试跑未观察到的长任务在完整运行中仍有出现：Chromium 4× frenzy/Copycat 初始动作约 54/56ms，reviewed-frenzy 发布约 53ms。修复确实移走了照片生成成本，但没有把全部剩余工作归因于照片，也没有把定向通过写成全通过。

10 月 14 日只读诊断确认 Firefox `Compositing: WebRender (Software)`，原因代码 `FEATURE_FAILURE_COMP_HEADLESSMODE`。同桌面关闭动效 p95 8.34ms、完整环境动效 33.34ms；通过已有控制停下节拍器后回到 8.34ms。此对照定位软件重绘成本，**不是关闭动画后的验收成绩**。WebKit 停节拍器后仍慢；其 WebGL 返回“Apple GPU”也不能证明这台 Windows 机器的页面合成后端。详见 [渲染诊断](https://github.com/zsh56609/overexposed/blob/92d97c98375e746c415edacdb36006779df7ed56/docs/handoff/v1b-compare/render-environment-detail-20261014.json)。

进一步读取已安装 Playwright 1.63.0 的启动代码，确认原生 Windows WebKit 默认加上 `--disable-accelerated-compositing`，与是否无头无关。本项目使用这条默认路径。该 [启动证据](https://github.com/zsh56609/overexposed/blob/92d97c98375e746c415edacdb36006779df7ed56/docs/handoff/v1b-compare/webkit-windows-launch-20261014.json) 说明它不能替代真实 Safari 的硬件合成验收；不等于所有慢帧都已排除游戏成本。没有移除驱动默认参数来制造更好数字。下一项有意义的性能证据是有界面、确认硬件合成的 Firefox，以及真实 Safari/iPad，而非继续把这两个软件路径当作硬件目标调优。

## 打包、证据与限制

- 生产包在 `/itch-preview/` 子目录于三引擎加载；照片全部解码，无游戏资源越出子目录。Chromium/Firefox 的实际照片缓存使用 worker blob；WebKit 使用原路径。首次诊断被 Firefox 自动请求的可选 `/favicon.ico` 触发，保留失败，后续明确单列它，没有放宽游戏资源检查。
- 主 JS 474.69 kB / gzip 145.62，worker 15.137 kB / gzip 5.083；CSS 52.46 / gzip 11.74；字体不变。修复前主 JS 473.61 / 145.14，无 worker。
- 新候选 ZIP：`C:\Users\91205\Documents\overexposed\.npm-cache\overexposed-v1b-508fb2b.zip`，466,173 字节，根目录 `index.html`、相对 JS/CSS/字体及 worker 均在包内。SHA-256：`57A4A02EF1EBB2B5FEC19045A1C0EFB25399375636366905233AA22D94F5DB15`。未提交 Git、未上传 itch。
- 已有连续游戏/v18 对照和 160 有序帧：[gallery](https://github.com/zsh56609/overexposed/blob/92d97c98375e746c415edacdb36006779df7ed56/docs/handoff/v1b-compare/continuous/index.html)，源 `2e6a3f8`；大录像位于 `.npm-cache/v1b-recordings-2e6a3f8-1791115338409/`。它们仍是此前动效证据，不冒称新源录像。新源追加实际指针录像待完成。
- 仍需完成新源回归/追加录像、解决或验证实际硬件上的慢帧。Firefox 无头焦点/OS 媒体模拟/4×、WebKit 可信长按缺口明确列出；headless WebKit 不等于 Safari/iPad。旧 1200s overflow 超时及 895.3ms 异常的单次原因仍未确定，保留原证据。

审计提交 `a47a21c` 首次推送连接 GitHub 300 秒超时，正常重试已成功，未强推。状态与交接已整理为当前验收清单，历史报告保留。

本次进度会同步到 status/handoff；V1b 未完整验收前，phase 3 不是下一步。
