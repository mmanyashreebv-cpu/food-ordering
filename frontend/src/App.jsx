import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import CartDrawer from "./Cart";
import {
  HomePage, RestaurantsPage, RestaurantPage, CategoriesPage, OrdersPage,
  FavoritesPage, OffersPage, HelpPage, ProfilePage, SearchResults,
} from "./Pages";
import "./Store.css";

const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
};

const NAV = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "restaurants", label: "Restaurants", icon: "🏪" },
  { id: "categories", label: "Categories", icon: "🗂️" },
  { id: "orders", label: "Orders", icon: "🧾" },
  { id: "favorites", label: "Favourites", icon: "♡" },
  { id: "offers", label: "Offers", icon: "🏷️" },
  { id: "help", label: "Help centre", icon: "❓" },
];
const MOBILE_NAV = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "restaurants", label: "Restaurants", icon: "🏪" },
  { id: "orders", label: "Orders", icon: "🧾" },
  { id: "favorites", label: "Favourites", icon: "♡" },
  { id: "profile", label: "Profile", icon: "👤" },
];
const PAGES = {
  home: HomePage, restaurants: RestaurantsPage, restaurant: RestaurantPage, categories: CategoriesPage,
  orders: OrdersPage, favorites: FavoritesPage, offers: OffersPage, help: HelpPage, profile: ProfilePage,
};

/* ---------- Login / register ---------- */
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      if (mode === "register") {
        await api("/api/users/register", { method: "POST", body: JSON.stringify(form) });
      }
      const user = await api("/api/users/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      onLogin(user);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="sf sf-auth">
      <section className="sf-auth-art">
        <div className="sf-brand">🍲 Kube Kitchen</div>
        <h1>Good food, <span>on its way.</span></h1>
        <p>Browse kitchens, fill your cart and track your delivery.</p>
      </section>
      <section className="sf-auth-form">
        <form onSubmit={submit}>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          {mode === "register" && <label className="sf-field">Name<input name="name" value={form.name} onChange={change} required /></label>}
          <label className="sf-field">Email<input name="email" type="email" value={form.email} onChange={change} required /></label>
          <label className="sf-field">Password<input name="password" type="password" value={form.password} onChange={change} required minLength={6} /></label>
          {error && <p className="sf-error">{error}</p>}
          <button className="sf-btn full" disabled={busy}>{busy ? "Please wait" : mode === "login" ? "Log in" : "Create account"}</button>
          <p className="sf-muted center">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button type="button" className="sf-link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}

/* ---------- App ---------- */
export default function App({ user, onLogout }) {
  const [view, setView] = useState({ name: "home", param: null });
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [problems, setProblems] = useState([]);
  const [fav, setFav] = useState({ dishes: [], rests: [] });
  const [address, setAddressState] = useState(() => read("kk-address", ""));
  const [promo, setPromo] = useState(null);
  const [tracks, setTracks] = useState(() => read("kk-track", {}));
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    const [it, od] = await Promise.allSettled([api("/api/inventory/items"), api("/api/orders/orders")]);
    if (it.status === "fulfilled") setItems(it.value);
    if (od.status === "fulfilled") setOrders(od.value);
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    refresh();
    setFav(read(`kk-fav-${user.id}`, { dishes: [], rests: [] }));
    const timer = setInterval(refresh, 6000);
    return () => clearInterval(timer);
  }, [user, refresh]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(tick);
  }, []);

  // Orders only store the dish name, so look the price up from the menu
  const enriched = useMemo(() => {
    const price = Object.fromEntries(items.map((i) => [i.name, i.price]));
    return orders.map((o) => ({ ...o, amount: (price[o.item] || 0) * o.quantity }));
  }, [orders, items]);

  const setAddress = (v) => { setAddressState(v); write("kk-address", v); };
  const toggleFav = (kind, id) => {
    const list = fav[kind];
    const next = { ...fav, [kind]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
    setFav(next);
    write(`kk-fav-${user.id}`, next);
  };
  const nav = (name, param = null) => {
    setView({ name, param }); setSearch(""); setCartOpen(false); window.scrollTo(0, 0);
  };

    const logout = onLogout;

  const setQty = (item, q) =>
    setCart((c) => {
      const next = { ...c };
      const qty = Math.max(0, Math.min(q, item.stock));
      if (qty === 0) delete next[item.id]; else next[item.id] = qty;
      return next;
    });

  const lines = items.filter((i) => cart[i.id]).map((i) => ({ item: i, qty: cart[i.id] }));
  const subtotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const isFirst = !orders.some((o) => o.user_id === user?.id);

  const checkout = async () => {
    setPlacing(true); setProblems([]); setReceipt(null);
    const done = [], failed = [], nextCart = { ...cart };
    for (const { item, qty } of lines) {
      try {
        const r = await api("/api/orders/orders", {
          method: "POST",
          body: JSON.stringify({ user_id: user.id, item_id: item.id, quantity: qty }),
        });
        done.push(r);
        delete nextCart[item.id];
      } catch (e) {
        failed.push(`${item.name}: ${e.message}`);
      }
    }
    setCart(nextCart); setProblems(failed);
    if (done.length) {
      setReceipt(done);
      const nextTracks = { ...tracks };
      done.forEach((r) => { nextTracks[r.order_id] = Date.now(); });
      setTracks(nextTracks); write("kk-track", nextTracks);
      setPromo(null);
    }
    await refresh();
    setPlacing(false);
  };

  

  const ctx = {
    user, items, orders, enriched, cart, setQty, fav, toggleFav, view, nav, address, setAddress,
    tracks, now, logout, search, lines, subtotal, promo, setPromo, isFirst, checkout, placing,
    problems, receipt, dismissReceipt: () => setReceipt(null),
    applyPromo: (p) => { setPromo(p); setCartOpen(true); },
  };

  const Page = search.trim() ? SearchResults : PAGES[view.name];
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const activeId = view.name === "restaurant" ? "restaurants" : view.name;

  return (
    <div className="sf">
      <aside className="sf-side">
        <div className="sf-brand">🍲 Kube Kitchen</div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={activeId === n.id ? "sf-nav on" : "sf-nav"} onClick={() => nav(n.id)}>
              <span aria-hidden="true">{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div className="sf-promo">
          <strong>Get 50% off your first order</strong>
          <span>Use code FIRST50</span>
          <button className="sf-btn small" onClick={() => nav("restaurants")}>Order now</button>
        </div>
        
      </aside>

      <div className="sf-main">
        <header className="sf-top">
          <button className="sf-loc" onClick={() => nav("profile")}>📍 <span>{address || "Add delivery address"}</span></button>
          <input className="sf-search" placeholder="Search for dishes and restaurants" value={search}
            onChange={(e) => setSearch(e.target.value)} aria-label="Search for dishes and restaurants" />
          <button className="sf-cart-btn" onClick={() => setCartOpen(true)} aria-label="Open cart">
            🛒 <span className="sf-count">{count}</span>
          </button>
          <button className="sf-me" onClick={() => nav("profile")}>
            <span className="sf-avatar">{initials}<i className="sf-online" /></span>
            <span className="sf-me-text"><strong>{user.name.split(" ")[0]}</strong><small>Active</small></span>
          </button>
        </header>
        <main className="sf-content"><Page ctx={ctx} /></main>
      </div>

      <nav className="sf-bottom">
        {MOBILE_NAV.map((n) => (
          <button key={n.id} className={activeId === n.id ? "on" : ""} onClick={() => nav(n.id)}>
            <span aria-hidden="true">{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>

      {cartOpen && <CartDrawer ctx={ctx} onClose={() => setCartOpen(false)} />}
    </div>
  );
}