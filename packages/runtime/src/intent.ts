/**
 * runtime · 意图路由（F3.2）：提交后自动路由 Ask / Agent / Quest
 * 口径：
 *  - LLM 分类 + 规则兜底（D4 Mock 时规则直译）；路由结果在任务卡上可见可改
 *  - 含糊指令（如「帮我看看」）→ clarify 反问澄清，不盲目建任务
 *  - 误路由 → 一键终止并回滚（E3.2：回滚=逆向补偿事件，L1.1）
 *  - 超时降级：意图分类 >3s 显「识别中…」可取消（constants.INTENT_ROUTE_TIMEOUT_MS）
 */
import { INTENT_ROUTE_TIMEOUT_MS } from "@workloom/shared";

export type ThreadMode = "ask" | "agent" | "quest";

export interface IntentResult {
  kind: "routed" | "clarify";
  mode?: ThreadMode;
  /** 反问话术（含糊指令时） */
  clarifyQuestion?: string;
  /** 路由依据（任务卡可见） */
  rationale: string;
  /** 路由来源：llm / rule（兜底）/ timeout_fallback */
  via: "llm" | "rule" | "timeout_fallback";
}

/** 含糊指令模式（不盲目建任务的判定表，试点期可扩充） */
const VAGUE_PATTERNS = [
  /^帮我看看[。！!]?$/,
  /^看看[。！!]?$/,
  /^在吗[？?]?$/,
  /^你好[。！!]?$/,
  /^怎么处理[？?]?$/,
  /^怎么样[了]?[？?]?$/,
];

/** 规则兜底直译（确定性；LLM 不可用时的安全带） */
export function ruleBasedRoute(text: string): IntentResult {
  const t = text.trim();
  if (VAGUE_PATTERNS.some((p) => p.test(t)) || t.length < 4) {
    return {
      kind: "clarify",
      clarifyQuestion: "想让我做什么？比如：「把周五雅致大床房调价 5%」「回复携程那条 2 分差评」「今晚夜班跑一遍对账」——说一句具体的，我立即开工。",
      rationale: "指令过于含糊，缺少对象与动作",
      via: "rule",
    };
  }
  // Ask：查询/问答类（不产生执行任务，F3.3）
  if (/^(问|请问|查|统计|多少|哪家|什么是|为什么)/.test(t) || /吗[？?]$/.test(t)) {
    return { kind: "routed", mode: "ask", rationale: "查询/问答句式，不产生执行任务", via: "rule" };
  }
  // Agent：逐步商量类
  if (/逐步|一步步|商量|先.*再|草稿给我看|每一步/.test(t)) {
    return { kind: "routed", mode: "agent", rationale: "含逐步确认诉求，每步操作前挂起审查", via: "rule" };
  }
  // 默认 Quest（三 tab 互斥，默认 Quest，F3.3）
  return { kind: "routed", mode: "quest", rationale: "交付型指令，规格驱动自主执行（默认 Quest）", via: "rule" };
}

export interface IntentClassifier {
  classify(text: string): Promise<IntentResult>;
}

/** LLM 分类器（经 model-router；输出受白名单约束） */
export class LlmIntentClassifier implements IntentClassifier {
  constructor(
    private readonly call: (prompt: string) => Promise<string>,
  ) {}
  async classify(text: string): Promise<IntentResult> {
    const raw = await this.call(
      `把用户指令分类为 ask|agent|quest 之一；含糊无法归类输出 clarify。只输出 JSON {"mode":"ask|agent|quest|clarify","rationale":"一句话"}。指令：${text}`,
    );
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (parsed.mode === "clarify") {
        return { kind: "clarify", clarifyQuestion: parsed.rationale ?? "能再说具体一点吗？", rationale: "LLM 判定含糊", via: "llm" };
      }
      if (["ask", "agent", "quest"].includes(parsed.mode)) {
        return { kind: "routed", mode: parsed.mode, rationale: String(parsed.rationale ?? ""), via: "llm" };
      }
    } catch { /* fallthrough */ }
    // LLM 输出不可信 → 规则兜底
    return { ...ruleBasedRoute(text), via: "rule" };
  }
}

/**
 * 路由主入口：LLM（带 3s 超时）→ 超时/异常规则兜底 → 含糊反问
 */
export async function routeIntent(
  text: string,
  classifier?: IntentClassifier,
  timeoutMs = INTENT_ROUTE_TIMEOUT_MS,
): Promise<IntentResult> {
  if (!classifier) return ruleBasedRoute(text);
  try {
    return await Promise.race([
      classifier.classify(text),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("意图路由超时")), timeoutMs)),
    ]);
  } catch {
    // 超时降级（E1.6 同机制）：规则兜底并标记来源
    return { ...ruleBasedRoute(text), via: "timeout_fallback" };
  }
}
