type Store = Pick<Storage, "length" | "key" | "removeItem">;
export function isArivvioKey(key: string) { return key.startsWith("arivvio:") || key.startsWith("arivvio.") || key === "arivvio-demo-entered"; }
export function clearArivvioData(stores: Store[]) {
 let removed = 0;
 for (const store of stores) {
  const keys = Array.from({length: store.length}, (_, i) => store.key(i)).filter((key): key is string => key !== null && isArivvioKey(key));
  for (const key of keys) { store.removeItem(key); removed++; }
 }
 return removed;
}
