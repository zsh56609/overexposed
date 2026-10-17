# V1b D/E 验收记录（2026-10-05）

**未完成：D/E 已实现，最终浏览器矩阵正在复跑；性能仍有未解决项。** 游戏源提交 `2e6a3f8`。本轮没有开始 phase 3 或 V2；A–C 报告、四项模拟基线和 Part 0 press 基线保持原样。此文接续 [10 月 4 日诊断记录](2026-10-04-v1b-de.md)，不把历史通过当作本轮复跑。

## 已完成的实现与复验

- `e75ea96`：队列及尾动画忙碌时清除、禁止手牌和 END TURN 预览，空闲后恢复；保留真实静止鼠标、移动鼠标、键盘和可用长按回归。
- `4bd2938`：D 的实际事件顺序、出月快照、丑闻 UID 去重、真实 draft/gate 边界、抽牌和经理消息；E 的历史出牌展示堆、减弱/关闭路径及偏好切换。
- `aa2cc8d`：修复 StrictMode 清理误取消第一拍手牌退出；补 OS 偏好和冬季发布后的跳过检查；PRINTED 原样导入作者任务文字。
- `2e6a3f8`：空闲时分批准备原有半色调缓存，忙碌时暂停；去掉普通选择遮罩的背景模糊，保留暗层。未改规则、GameEvents、内容数值、人格参数、文案或阅读速度。
- 本次 build/typecheck、validate（0 错误、27 延后警告）和 queue 通过。queue 覆盖 690 个真实动作、13,976 个阶段前后跳过；包括零/一/多丑闻、Copycat、Mags 减压、换季、draft/gate 与冬季结局。
- 本次 press 1,000 runs × 9 personas 重跑后，除耗时外与 `press-after.txt` 逐字一致，未改动基线。
- 构建包从 reviewed source 的 JS 458.54 kB / gzip 140.45、CSS 49.65 / 11.20，变为 JS 473.61 / 145.14、CSS 52.46 / 11.74；字体未变。与 `ace1c41` 比较，`core/`、`sim/`、`content/` 没有任何差异，英文唯一新增键为作者给定的 PRINTED。
- 完成轮已重跑 300-run 预览：19,238 状态、36,630 出牌、14,034 月末、2,400 gate，零差异；冷却契约 601/152。四项模拟三种子双经理与 reviewed baseline 比较 18 个规范化文件完全相同、14/14 bands、零崩溃/软锁。来源仍是已说明的重建基线，不称为前代理原始输出。

## 生产性能：有改善，但未通过流畅度验收

生产测量单独串行运行，正确性审计停止。十场景覆盖 loud、quiet、固定回放中最长安静台词、calm、frenzy、Copycat、换季、冬季及原审查两场景；Chromium 正常/4×、Firefox 正常、WebKit 正常。活动帧和尾部 1500ms 空闲帧分开。

- 原审查源重新测得 Chromium 4× 最慢帧 126.1ms、Firefox 月末活动 p95 80.06ms，复现原问题量级。早期 D/E 数据最高 495.3ms，原始记录全部保留。
- CPU 采样定位发布时第一次照片绘制/PNG 编码约 28–41ms（4×）。Firefox 去掉背景模糊的单因素实验主要改善选择界面的空闲帧；不是整段动效问题都已解决。
- 优化后 Chromium 正常十场景活动 p95 8.5–8.6ms；普通出牌落地约 940–943ms，loud 总忙碌 2110ms、quiet 3290ms，最长真实安静句 4040ms。calm 3508ms、frenzy 10664ms、换季 8045ms、冬季 1826ms；不将落地误称为解锁。
- Chromium 4× 多数场景最慢帧 33–83ms，但 reviewed-frenzy 出现 **895.3ms** 的搬运阶段停顿，没有对应 Long Task。三次独立重跑最慢帧 41.6/49.9/58.3ms；异常未复现，根因未确定，不删除、不以重跑覆盖。空闲缓存准备仍可产生 67–95ms 长任务。
- Firefox 正常活动 p95 约 17–47ms，原 frenzy 场景 44.1ms、空闲 17.0ms。WebKit 仍持续约 82–111ms 的活动 p95，不能称顺滑。机器刷新节奏随运行时段变化，跨次改善数值不是严格硬件恒定的对照。
- 原始数据：[优化前](https://github.com/zsh56609/overexposed/blob/92d97c98375e746c415edacdb36006779df7ed56/docs/handoff/v1b-compare/de-active.json)、[优化后](https://github.com/zsh56609/overexposed/blob/92d97c98375e746c415edacdb36006779df7ed56/docs/handoff/v1b-compare/de-optimized-final.json)、[原审查源](https://github.com/zsh56609/overexposed/blob/92d97c98375e746c415edacdb36006779df7ed56/docs/handoff/v1b-compare/reviewed-active.json)，异常重跑为同目录 `de-outlier-repeat-1/2/3.json`。CPU profile 在 `.npm-cache/profiles/`，不混作无 profiling 的验收结果。

## 连续录像与视觉检查

[有序帧画廊](https://github.com/zsh56609/overexposed/blob/92d97c98375e746c415edacdb36006779df7ed56/docs/handoff/v1b-compare/continuous/index.html) 与 [清单](https://github.com/zsh56609/overexposed/blob/92d97c98375e746c415edacdb36006779df7ed56/docs/handoff/v1b-compare/continuous/manifest.json) 已生成：10 段连续 WebKit 录像、160 张从录像解码的有序帧；覆盖 game/v18 的 loud、quiet、frenzy、season，另有 game calm/winter。大录像不进 Git，位置：

`C:\Users\91205\Documents\overexposed\.npm-cache\v1b-recordings-2e6a3f8-1791115338409\`

实测输入在卡面本地 (40,120)，点击后鼠标留在原处。烧录时钟来自 pointerdown 和 rAF；录像 PTS 包含输入前准备，不能拿截图请求延迟当时序证据。画面中的 `idle` 是基础队列拍名，出牌尾动画仍可能 busy；准确总锁定时间以生产记录的 `totalBusyMs` 为准。录像工具未改游戏状态以拼动画。

逐帧检查了出牌最终堆面、丑闻翻转/携带/落桌、PRINTED、换季卡、真实 draft 暂停及冬季经理最后一句。v18 与游戏翻转中间均出现同向的短暂倒置面，保持参考轨迹；停留后的牌面方向正确。相对 v18 的必要偏离是实际手牌提前退出、真实资源顺序、实际新增丑闻数、经理按消息身份到达，以及在真实选择点暂停；没有复制示例规则或文字。

捆绑 FFmpeg 不支持 MJPEG 编码及 fps filter；保留失败日志，使用它已有的 PNG 解码，再以浏览器原生 canvas 转 JPEG，未安装依赖。录屏为开发构建的视觉证据，生产帧性能另测；headless WebKit 不是 Safari/iPad 实机验收。

## 尚待完成

当前 Chromium 1280×720 五项完整检查均通过。800×450 clicks、普通/完整 overflow 通过；首次 interactions 为 23/24（节拍器摆动的两个端点角度相同，停止/重启通过）。保留该失败；在同样 300ms 窗口记录中间角度后复跑 24/24，通过样本为 4.63→8.69→12.71→15.30°。周期摆动的两个端点可能同角，原日志未保存角度，因此不声称已证明那次失败的唯一原因。游戏节拍器未改，等待窗口未加长。

复核脚本发现需要把“单个丑闻”和符合条件的 Mags 减压单独列为真实输入场景，已从固定回放和真实 reducer 事件定位，未伪造状态；新增静态历史回放对照、每种结束方式的合法手牌/END TURN 实际 elementFromPoint 命中断言。已跑配置补测新增项，其余配置执行扩展后的完整脚本。原结果不覆盖新断言。

800×450 的扩展动效检查随后通过。桌面交互复查另出现一次长按提示未打开；其带诊断复跑为 24/24，真实 touch pointerdown 后约 471ms 显示，松手后仍显示。初次失败没有事件轨迹，不能认定唯一原因或声称已修复；失败与复跑均保留。只有精确匹配 WebKit 不支持长按的错误才列为能力跳过，其他触摸错误必须失败。

**第二次主机中断（并非已证实的新热事件）：** 10 月 5 日 02:04 Kernel-Power 506/507 记录 `Austerity Battery Drain Budget Exceeded`；03:42 事件 42 为 `Hibernate from Sleep - Standby Battery Budget Exceeded`；08:16 才恢复。原始记录 `.npm-cache/v1b-final-power-events.json`。手机横屏完整溢出在第八条轨迹记录 296,535ms 主机调度间隔，正确判为无效；之后交互触摸命令 120s 无响应，动效仅留下部分结果。08:20 已只终止本轮审计进程树。这些不是布局错误的证明，也不能计作通过。改为一次启动一项，不在中断后自动进入后续配置；不改电源保护。

- 最终三浏览器 × 三尺寸 clicks、overflow、完整 50 回放/42 卡 overflow、interactions、全套真实输入动效回归；历史/中途结果详见 10 月 4 日记录，不能混为当前矩阵已完成。
- Firefox 无焦点键盘、OS 媒体仿真和 CPU 4×，WebKit 可信长按仍为明确能力跳过，不计通过；真实 Safari/iPad 覆盖缺失。
- 895ms 异常、Firefox/WebKit 持续慢帧及缓存空闲长任务尚不支持流畅度验收。
- 最终浏览器验收结果归档及后续文档推送。此前 GitHub 443 连接失败；10 月 5 日已成功正常推送到 `51125f9`，没有强推。未完成验收之前，phase 3 不是下一阶段。

## 待验收 itch 包

已生成 `C:\Users\91205\Documents\overexposed\.npm-cache\overexposed-v1b-2e6a3f8.zip`（460,464 字节），游戏源与生产测量相同。根目录 `index.html`、两个相对入口资源及 CSS 的三个相对字体路径已核对；共 7 个条目，ZIP 不进 Git。SHA-256：`7DF46EF49B8AD5A1CEB292DF3B327A3833BADC328817D1FD9537D13BFB43E06B`。未上传 itch；此包不代表 V1b 已完成验收。
