/**
 * flydata-core —— 消息总线插件（L2 Base Bundle 六插件之一，纯服务层不碰 HTTP）
 * B1 范围：安全网关三段瀑布 + 事件 append + 哈希链 + 幂等（F1.1/F1.2/L1.4）
 * 后续卡：B2 检索（recall/投影查询）· B3 组织记忆（memory.ts）
 */
export * from "./gateway.js";
export * from "./events.js";
export * from "./pii.js";
