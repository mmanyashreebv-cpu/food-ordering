import { dishMeta, money } from "./api";

// Sample restaurants: the backend has no restaurant data.
// A dish is shown in the restaurant whose categories include it.
export const RESTAURANTS = [
  { id: "kube-express", name: "Kube Kitchen Express", cuisine: "Everything on the menu", cats: ["*"], rating: 4.8, eta: [20, 30], cover: ["#ee6c2b", "#f7a35c"], emoji: "🍲" },
  { id: "pizza-palace", name: "Pizza Palace", cuisine: "Pizza, Italian", cats: ["Pizza"], rating: 4.4, eta: [25, 35], cover: ["#d6382b", "#f08a5d"], emoji: "🍕" },
  { id: "burger-house", name: "Burger House", cuisine: "Burgers, Fast food", cats: ["Burgers"], rating: 4.6, eta: [30, 40], cover: ["#8a4b1f", "#d98e4a"], emoji: "🍔" },
  { id: "dosa-corner", name: "Dosa Corner", cuisine: "South Indian, Breakfast", cats: ["South Indian"], rating: 4.7, eta: [20, 30], cover: ["#c58b00", "#f2c94c"], emoji: "🥞" },
  { id: "brew-bean", name: "Brew and Bean", cuisine: "Coffee, Drinks", cats: ["Drinks"], rating: 4.5, eta: [15, 25], cover: ["#5b3a29", "#a9745b"], emoji: "☕" },
  { id: "spice-route", name: "Spice Route", cuisine: "Biryani, Curries", cats: ["Mains"], rating: 4.3, eta: [35, 45], cover: ["#b5651d", "#e9a23b"], emoji: "🍛" },
  { id: "daily-plate", name: "The Daily Plate", cuisine: "Chef's specials", cats: ["Other"], rating: 4.2, eta: [25, 35], cover: ["#0f9d8a", "#58c4b5"], emoji: "🍽️" },
];

export const PROMOS = [
  { code: "FIRST50", title: "50% off your first order", note: "Up to ₹150 off. First order only.", type: "pct", value: 50, cap: 150, firstOnly: true },
  { code: "KUBE10", title: "10% off any order", note: "On orders above ₹199. Up to ₹100 off.", type: "pct", value: 10, cap: 100, min: 199 },
  { code: "FREEDEL", title: "Free delivery", note: "On orders above ₹299.", type: "delivery", min: 299 },
];

export const DELIVERY_FEE = 30;
export const FREE_DELIVERY_ABOVE = 399;

export function dishesFor(r, items) {
  return r.cats.includes("*") ? items : items.filter((i) => r.cats.includes(dishMeta(i.name).cat));
}

export function categoriesOf(items) {
  const map = {};
  items.forEach((i) => {
    const m = dishMeta(i.name);
    map[m.cat] = map[m.cat] || { name: m.cat, e: m.e, c: m.c, count: 0 };
    map[m.cat].count += 1;
  });
  return Object.values(map);
}

// Display-only pricing: the order service stores dish and quantity, not totals
export function priceCart(subtotal, promo, isFirstOrder) {
  let discount = 0;
  let delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  let promoError = "";
  if (promo) {
    if (promo.firstOnly && !isFirstOrder) promoError = "This code is only valid on your first order.";
    else if (promo.min && subtotal < promo.min) promoError = `Add ${money(promo.min - subtotal)} more to use ${promo.code}.`;
    else if (promo.type === "pct") discount = Math.min(Math.round((subtotal * promo.value) / 100), promo.cap);
    else if (promo.type === "delivery") delivery = 0;
  }
  return { delivery, discount, promoError, total: subtotal - discount + delivery };
}