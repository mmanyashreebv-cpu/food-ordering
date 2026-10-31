import { useCallback, useEffect, useMemo, useState } from "react";
import { api, money, dishMeta } from "./api";
import { LineChart } from "./Charts";
import "./Admin.css";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "menu", label: "Order food", icon: "🍽️" },
  { id: "orders", label: "Orders", icon: "🧾" },
  { id: "inventory", label: "Inventory", icon: "📦" },
];

const SERVICES = [
  { key: "users", label: "User service" },
  { key: "inventory", label: "Inventory service" },
  { key: "orders", label: "Order service" },
];

// Sample data only: the backend has no offers
const OFFERS = [
  { title: "Lunch combo, 15% off", note: "Weekdays, 12 pm to 3 pm" },
  { title: "Free delivery above ₹399", note: "All orders" },
  { title: "Buy 1 get 1 on Margherita Pizza", note: "This weekend" },
];

/* ---------- Login / register ---------- */
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
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
    <div className="auth">
      <section className="auth-brand">
        <div className="brand">🍲 Kube Kitchen</div>
        <h1>Run the kitchen and the orders from one place.</h1>
        <p>Take orders, watch stock, and keep an eye on every service as it runs.</p>
      </section>
      <section className="auth-form">
        <form onSubmit={submit}>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          {mode === "register" && (
            <label>Name<input name="name" value={form.name} onChange={change} required /></label>
          )}
          <label>Email<input name="email" type="email" value={form.email} onChange={change} required /></label>
          <label>Password<input name="password" type="password" value={form.password} onChange={change} required minLength={6} /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn-primary" disabled={busy}>
            {busy ? "Please wait" : mode === "login" ? "Log in" : "Create account"}
          </button>
          <p className="switch">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button type="button" className="text-btn" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}

/* ---------- Shared bits ---------- */
function Stepper({ item, qty, setQty }) {
  if (item.stock === 0) return <span className="soldout">Sold out</span>;
  if (qty === 0) return <button className="btn-add" onClick={() => setQty(item, 1)}>Add</button>;
  return (
    <div className="stepper">
      <button aria-label={`Remove one ${item.name}`} onClick={() => setQty(item, qty - 1)}>−</button>
      <span>{qty}</span>
      <button aria-label={`Add one ${item.name}`} onClick={() => setQty(item, qty + 1)} disabled={qty >= item.stock}>+</button>
    </div>
  );
}

const customerName = (o, user) => (o.user_id === user.id ? `${user.name} (you)` : `Customer #${o.user_id}`);

function OrdersTable({ rows, user }) {
  if (rows.length === 0) return <p className="muted pad">No orders to show yet.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>Order</th><th>Customer</th><th>Dish</th><th>Qty</th><th>Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id}>
              <td>#{o.id}</td>
              <td>{customerName(o, user)}</td>
              <td>{dishMeta(o.item || "").e} {o.item}</td>
              <td>{o.quantity}</td>
              <td>{money(o.amount)}</td>
              <td><span className="chip warn">Placed</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Dashboard ---------- */
function Dashboard({ orders, items, health, pods, alerts, testing, onLoadTest, onResetPods, user, setView }) {
  const [mode, setMode] = useState("cumulative");

  const revenue = orders.reduce((s, o) => s + o.amount, 0);
  const dishesSold = orders.reduce((s, o) => s + o.quantity, 0);
  const customers = new Set(orders.map((o) => o.user_id)).size;
  const lowCount = items.filter((i) => i.stock <= 10).length;
  const up = SERVICES.filter((s) => health[s.key] === "up").length;

  const points = useMemo(() => {
    let run = 0;
    const all = orders.map((o) => {
      run += o.amount;
      return { label: `#${o.id}`, value: mode === "cumulative" ? run : o.amount };
    });
    return all.slice(-15);
  }, [orders, mode]);

  const topDishes = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      map[o.item] = map[o.item] || { name: o.item, qty: 0, revenue: 0 };
      map[o.item].qty += o.quantity;
      map[o.item].revenue += o.amount;
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders]);
  const maxQty = Math.max(...topDishes.map((d) => d.qty), 1);

  const podEntries = Object.entries(pods).sort((a, b) => b[1] - a[1]);
  const podTotal = podEntries.reduce((s, [, c]) => s + c, 0);

  return (
    <>
      <section className="panel kpis">
        <div className="kpi"><span className="kpi-label">Orders placed</span><strong>{orders.length}</strong><span className="kpi-note">{dishesSold} dishes sold</span></div>
        <div className="kpi"><span className="kpi-label">Revenue</span><strong>{money(revenue)}</strong><span className="kpi-note">{orders.length ? `${money(revenue / orders.length)} per order` : "No orders yet"}</span></div>
        <div className="kpi"><span className="kpi-label">Customers</span><strong>{customers}</strong><span className="kpi-note">have placed an order</span></div>
        <div className="kpi"><span className="kpi-label">Low on stock</span><strong>{lowCount}</strong><span className="kpi-note">of {items.length} dishes</span></div>
        <div className="kpi"><span className="kpi-label">Services online</span><strong>{up} of {SERVICES.length}</strong><span className="kpi-note">checked every 5 seconds</span></div>
      </section>

      <div className="grid-main">
        <section className="panel">
          <div className="panel-head">
            <div><h2>Revenue trend</h2><p className="muted">Last 15 orders</p></div>
            <div className="seg">
              <button className={mode === "cumulative" ? "on" : ""} onClick={() => setMode("cumulative")}>Total so far</button>
              <button className={mode === "value" ? "on" : ""} onClick={() => setMode("value")}>Per order</button>
            </div>
          </div>
          <LineChart points={points} />
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Top dishes</h2><p className="muted">By quantity sold</p></div></div>
          {topDishes.length === 0 && <p className="muted pad">Sales will show up here after the first order.</p>}
          {topDishes.map((d) => (
            <div className="rank" key={d.name}>
              <div className="rank-row"><span>{dishMeta(d.name).e} {d.name}</span><strong>{d.qty}</strong></div>
              <div className="bar"><span style={{ width: `${(d.qty / maxQty) * 100}%` }} /></div>
            </div>
          ))}
        </section>
      </div>

      <div className="grid-main">
        <section className="panel">
          <div className="panel-head">
            <div><h2>Recent orders</h2><p className="muted">Latest activity</p></div>
            <button className="btn-ghost" onClick={() => setView("orders")}>View all orders</button>
          </div>
          <OrdersTable rows={orders.slice(-6).reverse()} user={user} />
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Alerts</h2><p className="muted">Needs attention</p></div></div>
          {alerts.length === 0 && <p className="muted pad">All clear. Stock levels and services look healthy.</p>}
          <ul className="alerts">
            {alerts.map((a, i) => <li key={i} className={a.level}>{a.text}</li>)}
          </ul>
        </section>
      </div>

      <div className="grid-main">
        <section className="panel">
          <div className="panel-head">
            <div><h2>Services and load balancing</h2><p className="muted">Scale the order service, then send test requests to see them spread across pods.</p></div>
          </div>
          <ul className="services">
            {SERVICES.map((s) => (
              <li key={s.key}>
                <span className={`dot-status ${health[s.key]}`} />
                <span>{s.label}</span>
                <span className="muted">{health[s.key] === "up" ? "Online" : health[s.key] === "down" ? "Not responding" : "Checking"}</span>
              </li>
            ))}
          </ul>
          <h3 className="sub">Order service pods</h3>
          {podEntries.length === 0 && <p className="muted">No requests recorded yet.</p>}
          {podEntries.map(([name, count]) => (
            <div className="rank" key={name}>
              <div className="rank-row"><span className="pod-name">{name}</span><strong>{count}</strong></div>
              <div className="bar teal"><span style={{ width: `${(count / podTotal) * 100}%` }} /></div>
            </div>
          ))}
          <div className="actions">
            <button className="btn-primary slim" onClick={onLoadTest} disabled={testing}>
              {testing ? "Sending requests" : "Send 20 test requests"}
            </button>
            <button className="btn-ghost" onClick={onResetPods}>Reset counts</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>Active offers</h2><p className="muted">Current promotions</p></div>
            <span className="chip">Sample data</span>
          </div>
          <ul className="offers">
            {OFFERS.map((o) => (
              <li key={o.title}><strong>{o.title}</strong><span className="muted">{o.note}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

/* ---------- Order food ---------- */
function MenuView({ items, cart, setQty, search, error }) {
  const [cat, setCat] = useState("All");
  const cats = ["All", ...new Set(items.map((i) => dishMeta(i.name).cat))];
  const shown = items.filter(
    (i) => (cat === "All" || dishMeta(i.name).cat === cat) && i.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Menu</h2>
        <div className="chips">
          {cats.map((c) => (
            <button key={c} className={c === cat ? "filter on" : "filter"} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      </div>
      {error && <p className="error">Couldn't load the menu: {error}</p>}
      {!error && items.length === 0 && <p className="muted pad">Loading the menu...</p>}
      {!error && items.length > 0 && shown.length === 0 && <p className="muted pad">No dishes match your search.</p>}
      <ul className="dishes">
        {shown.map((item) => {
          const m = dishMeta(item.name);
          return (
            <li className="dish" key={item.id}>
              <div className="dish-icon" style={{ background: m.c }}>{m.e}</div>
              <div className="dish-info">
                <h3>{item.name}</h3>
                <p className="price">{money(item.price)}</p>
                <p className={item.stock <= 10 ? "stock low" : "stock"}>
                  {item.stock === 0 ? "Sold out" : item.stock <= 10 ? `Only ${item.stock} left` : "In stock"}
                </p>
              </div>
              <Stepper item={item} qty={cart[item.id] || 0} setQty={setQty} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Cart({ lines, total, setQty, onCheckout, placing, problems, receipt, onDismiss }) {
  const pods = receipt ? [...new Set(receipt.map((r) => r.handled_by))] : [];
  return (
    <aside className="panel cart">
      <h2>Your order</h2>
      {receipt && (
        <div className="receipt">
          <strong>Order placed</strong>
          <ul>{receipt.map((r) => <li key={r.order_id}>#{r.order_id}: {r.quantity} x {r.item}</li>)}</ul>
          <p className="pod-name">Handled by {pods.join(", ")}</p>
          <button className="text-btn" onClick={onDismiss}>Dismiss</button>
        </div>
      )}
      {problems.length > 0 && (
        <div className="problems">
          <strong>Some items could not be ordered</strong>
          <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          <p>They are still in your cart. Adjust the quantity and try again.</p>
        </div>
      )}
      {lines.length === 0 ? (
        <p className="muted pad">Your cart is empty. Add a dish from the menu to get started.</p>
      ) : (
        <>
          <ul className="cart-lines">
            {lines.map(({ item, qty }) => (
              <li key={item.id}>
                <div>
                  <div className="cart-name">{item.name}</div>
                  <div className="muted">{qty} x {money(item.price)}</div>
                </div>
                <div className="cart-right">
                  <Stepper item={item} qty={qty} setQty={setQty} />
                  <strong>{money(item.price * qty)}</strong>
                </div>
              </li>
            ))}
          </ul>
          <div className="total"><span>Total</span><strong>{money(total)}</strong></div>
          <button className="btn-primary" onClick={onCheckout} disabled={placing}>
            {placing ? "Placing your order" : `Place order for ${money(total)}`}
          </button>
        </>
      )}
    </aside>
  );
}

/* ---------- Orders ---------- */
function OrdersView({ orders, user, search }) {
  const [scope, setScope] = useState("all");
  const rows = orders
    .filter((o) => (scope === "all" || o.user_id === user.id) && `${o.item} ${o.id}`.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .reverse();
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Orders</h2>
        <div className="seg">
          <button className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>All orders</button>
          <button className={scope === "mine" ? "on" : ""} onClick={() => setScope("mine")}>My orders</button>
        </div>
      </div>
      <OrdersTable rows={rows} user={user} />
    </section>
  );
}

/* ---------- Inventory ---------- */
function InventoryView({ items, search, onChanged }) {
  const [form, setForm] = useState({ name: "", price: "", stock: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await api("/api/inventory/items", {
        method: "POST",
        body: JSON.stringify({ name: form.name.trim(), price: Number(form.price), stock: Number(form.stock) }),
      });
      setForm({ name: "", price: "", stock: "" });
      onChanged();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const rows = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="layout">
      <section className="panel">
        <div className="panel-head"><div><h2>Stock levels</h2><p className="muted">{items.length} dishes on the menu</p></div></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Dish</th><th>Price</th><th>Stock</th><th>Level</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td>{dishMeta(i.name).e} {i.name}</td>
                  <td>{money(i.price)}</td>
                  <td>{i.stock}</td>
                  <td><div className="bar thin"><span style={{ width: `${Math.min(100, (i.stock / 50) * 100)}%` }} /></div></td>
                  <td>
                    <span className={i.stock === 0 ? "chip crit" : i.stock <= 10 ? "chip warn" : "chip ok"}>
                      {i.stock === 0 ? "Sold out" : i.stock <= 10 ? "Low" : "In stock"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="panel">
        <h2>Add a dish</h2>
        <form className="stack" onSubmit={add}>
          <label>Dish name<input name="name" value={form.name} onChange={change} required /></label>
          <label>Price in ₹<input name="price" type="number" min="1" value={form.price} onChange={change} required /></label>
          <label>Opening stock<input name="stock" type="number" min="0" value={form.stock} onChange={change} required /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn-primary" disabled={busy}>{busy ? "Adding" : "Add dish"}</button>
        </form>
      </aside>
    </div>
  );
}

/* ---------- Admin shell ---------- */
const TITLES = {
  dashboard: ["Dashboard", "A live view of orders, stock and services. It refreshes every 5 seconds."],
  menu: ["Order food", "Choose dishes and check out in one go."],
  orders: ["Orders", "Every order placed through the system."],
  inventory: ["Inventory", "Track stock and add new dishes to the menu."],
};

 export default function Admin({ user, onLogout }) {
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [health, setHealth] = useState({ users: "checking", inventory: "checking", orders: "checking" });
  const [pods, setPods] = useState({});
  const [testing, setTesting] = useState(false);
  const [updated, setUpdated] = useState(null);
  const [cart, setCart] = useState({});
  const [placing, setPlacing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [problems, setProblems] = useState([]);

  const refresh = useCallback(async () => {
    const [it, od] = await Promise.allSettled([api("/api/inventory/items"), api("/api/orders/orders")]);
    if (it.status === "fulfilled") { setItems(it.value); setLoadError(""); } else setLoadError(it.reason.message);
    if (od.status === "fulfilled") setOrders(od.value);

    const ping = (path) => api(path).then(() => "up", () => "down");
    const [users, inventory, ordersHealth] = await Promise.all([
      ping("/api/users/health"), ping("/api/inventory/health"), ping("/api/orders/health"),
    ]);
    setHealth({ users, inventory, orders: ordersHealth });

    try {
      const w = await api("/api/orders/whoami");
      setPods((p) => ({ ...p, [w.handled_by]: (p[w.handled_by] || 0) + 1 }));
    } catch { /* order service is down */ }
    setUpdated(new Date());
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [user, refresh]);

  // Orders only store the dish name, so look the price up from the menu
  const enriched = useMemo(() => {
    const price = Object.fromEntries(items.map((i) => [i.name, i.price]));
    return orders.map((o) => ({ ...o, amount: (price[o.item] || 0) * o.quantity }));
  }, [orders, items]);

  const alerts = useMemo(() => {
    const list = [];
    [["users", "User service"], ["inventory", "Inventory service"], ["orders", "Order service"]].forEach(([k, label]) => {
      if (health[k] === "down") list.push({ level: "crit", text: `${label} is not responding` });
    });
    items.forEach((i) => {
      if (i.stock === 0) list.push({ level: "crit", text: `${i.name} is sold out` });
      else if (i.stock <= 10) list.push({ level: "warn", text: `Low stock: ${i.stock} ${i.name} left` });
    });
    return list;
  }, [health, items]);

    const logout = onLogout;

  const setQty = (item, q) =>
    setCart((c) => {
      const next = { ...c };
      const qty = Math.max(0, Math.min(q, item.stock));
      if (qty === 0) delete next[item.id]; else next[item.id] = qty;
      return next;
    });

  const lines = items.filter((i) => cart[i.id]).map((i) => ({ item: i, qty: cart[i.id] }));
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

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
    if (done.length) setReceipt(done);
    await refresh();
    setPlacing(false);
  };

  const loadTest = async () => {
    setTesting(true);
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => api("/api/orders/whoami")));
    setPods((p) => {
      const next = { ...p };
      results.forEach((r) => {
        if (r.status === "fulfilled") next[r.value.handled_by] = (next[r.value.handled_by] || 0) + 1;
      });
      return next;
    });
    setTesting(false);
  };

  

  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const [title, subtitle] = TITLES[view];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">🍲 Kube Kitchen</div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={view === n.id ? "nav-btn active" : "nav-btn"} onClick={() => setView(n.id)}>
              <span aria-hidden="true">{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="me">
            <span className="avatar">{initials}</span>
            <div><div className="me-name">{user.name}</div><div className="me-mail">{user.email}</div></div>
          </div>
        
          <button className="text-btn light" onClick={logout}>Log out</button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <input className="search" placeholder="Search dishes and orders" value={search}
            onChange={(e) => setSearch(e.target.value)} aria-label="Search dishes and orders" />
          <span className="updated">{updated ? `Updated ${updated.toLocaleTimeString()}` : "Connecting"}</span>
          <button className="icon-btn" onClick={() => setView("menu")} aria-label="Open cart">
            🛒 <span className="badge teal">{count}</span>
          </button>
          <button className="icon-btn" onClick={() => setView("dashboard")} aria-label="View alerts">
            🔔 {alerts.length > 0 && <span className="badge">{alerts.length}</span>}
          </button>
        </header>

        <main className="content">
          <div className="page-head">
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>

          {view === "dashboard" && (
            <Dashboard
              orders={enriched} items={items} health={health} pods={pods} alerts={alerts}
              testing={testing} onLoadTest={loadTest} onResetPods={() => setPods({})}
              user={user} setView={setView}
            />
          )}
          {view === "menu" && (
            <div className="layout">
              <MenuView items={items} cart={cart} setQty={setQty} search={search} error={loadError} />
              <Cart
                lines={lines} total={total} setQty={setQty} onCheckout={checkout}
                placing={placing} problems={problems} receipt={receipt} onDismiss={() => setReceipt(null)}
              />
            </div>
          )}
          {view === "orders" && <OrdersView orders={enriched} user={user} search={search} />}
          {view === "inventory" && <InventoryView items={items} search={search} onChanged={refresh} />}
        </main>
      </div>
    </div>
  );
}