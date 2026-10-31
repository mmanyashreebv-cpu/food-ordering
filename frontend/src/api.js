export const money = (n) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Something went wrong. Please try again.");
  return data;
}

// Picks an emoji, tile colour and category from the dish name
export function dishMeta(name) {
  const n = name.toLowerCase();
  if (/pizza/.test(n)) return { e: "🍕", c: "#fde6c4", cat: "Pizza" };
  if (/burger/.test(n)) return { e: "🍔", c: "#fbdcd2", cat: "Burgers" };
  if (/dosa|idli|vada/.test(n)) return { e: "🥞", c: "#f6ecc4", cat: "South Indian" };
  if (/coffee|tea|juice|lassi/.test(n)) return { e: "☕", c: "#ecdfd2", cat: "Drinks" };
  if (/biryani|rice|curry/.test(n)) return { e: "🍛", c: "#fbe9b8", cat: "Mains" };
  return { e: "🍽️", c: "#e6e9ef", cat: "Other" };
}