/** 同時寫好幾筆追蹤紀錄時，時間錯開 1 毫秒，列表順序才固定 */
export function logRows(agentId: string, clientId: string, texts: string[]) {
  const base = Date.now();
  return texts.map((text, i) => ({ agent_id: agentId, client_id: clientId, text, created_at: new Date(base + i).toISOString() }));
}
