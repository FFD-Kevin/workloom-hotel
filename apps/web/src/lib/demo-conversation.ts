/**
 * demo-conversation.ts · AskRail 演示会话剧本（DEMO-SCRIPT）
 *
 * 目的：全场景运行态——对话框不是空样板间。首开 AskRail 即呈现一段
 * 「店主 ↔ AI 助手」的真实感经营对话（问询/审批/派单/复盘四幕），
 * 台词数字与种子数据集（seed-acquisition）严格同源，不得编造。
 *
 * 纪律：
 *  - 按工作区出剧本（yunqi-hotel=获客酒店 / video-studio=视频工作室）；
 *  - 真实用户发消息后剧本不再占位（msgs 非空时以真实会话为准）；
 *  - receipt 标记 unverified（剧本非执行留痕，口径与模拟态横幅一致）。
 */

export interface DemoRailMsg {
  role: "human" | "agent";
  text: string;
  action?: string;
  linkTo?: string;
}

const HOTEL_SCRIPT: DemoRailMsg[] = [
  { role: "human", text: "早上好，本周获客情况怎么样？" },
  {
    role: "agent", action: "经营简报",
    text: "【今日经营简报】预测 OCC 91%（RevPAR ¥584 / ADR ¥642），新收订 23 间 41 间夜；对账连续 30 天零差错；差评 SLA 100%（2h 内处置）；昨夜语音前台接听 7 通、询盘 11 条全部解决，零升级。",
  },
  { role: "human", text: "有什么需要我拍板的？" },
  {
    role: "agent", action: "审批清单",
    text: "2 件 L4 决策等你拍板：① 周末提价 ¥628→¥688（预测 OCC 91% 超熔断线，RevPAR 预计 +12.4%）② 婚宴 15 桌报价 ¥68,000（含 30 间夜客房+婚房布置）。在经营主页或董事长视图可逐条批。",
    linkTo: "/p21",
  },
  { role: "human", text: "今晚 34 间入住高峰，帮我盯一下前厅调度" },
  {
    role: "agent", action: "任务立项",
    text: "已立项「入退高峰调度」：34 间入住 + 29 间退房 → 智能排房 18 间（亲子同层/安静上楼）→ 前厅 17:00-19:00 高峰加派 2 人 → 异常随时上报。",
    linkTo: "/p1",
  },
  { role: "human", text: "这周口碑怎么样？" },
  {
    role: "agent", action: "内容复盘",
    text: "口碑周报：评分 4.7（+0.1），86 条新评价。「隔音好」「早餐丰富」热度上升，「电梯等待」已整改回落；2 条差评均 2h 内处置并公开回复。",
  },
];

const VIDEO_SCRIPT: DemoRailMsg[] = [
  { role: "human", text: "昨天内容数据怎么样？" },
  {
    role: "agent", action: "经营简报",
    text: "【昨日战报】发布 4 条，播放 5.28w（2h 峰值 1.86w），GMV ¥9,600，高意向线索 17 条。周累计：播放 48.6w、GMV ¥68,400——实测类比口播类转化高 2.3×。",
  },
  { role: "human", text: "有什么要我拍板的？" },
  {
    role: "agent", action: "审批清单",
    text: "2 件 L4 决策：① 家居品牌年度框架 ¥88,000（24 条定制，¥3,666/条 高于均价 22%）② 母婴达人合作 ¥26,000（86w 粉，客群匹配 91%，预估播放 50w+）。",
    linkTo: "/p21",
  },
  { role: "human", text: "把「焖烧实测」那条爆款复制几条出来" },
  {
    role: "agent", action: "任务立项",
    text: "已按爆款复制 SOP 立项：拆解 12.6w 爆款要素（真实场景/分贝仪实测/前后对比）→ 3 条变体（焖粥/焖汤/母婴辅食）→ 脚本→渲染→审片→四平台排期，本周出片。",
    linkTo: "/p1",
  },
];

/** 按工作区取剧本（缺省酒店获客版） */
export function demoRailMessages(wsName: string): DemoRailMsg[] {
  if (/视频|星芒|创作/i.test(wsName)) return VIDEO_SCRIPT;
  return HOTEL_SCRIPT;
}
