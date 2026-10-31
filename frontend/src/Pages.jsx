import { useState } from "react";
import { dishMeta, money } from "./api";
import { RESTAURANTS, PROMOS, categoriesOf, dishesFor } from "./restaurants";
import { DishRow, Heart, RestaurantCard } from "./ui";

const STAGES = ["Order placed", "Preparing", "On the way", "Delivered"];

// Demo tracking: progress is simulated from the time the order was placed in this browser
function stageOf(order, tracks, now) {
  const placedAt = tracks[order.id];
  if (!placedAt) return 3;
  const seconds = (now - placedAt) / 1000;
  return seconds < 15 ? 0 : seconds < 45 ? 1 : seconds < 90 ? 2 : 3;
}

function SectionHead({ title, action, onAction }) {
  return (
    <div className="sf-sec">
      <h2>{title}</h2>
      {action && <button className="sf-link" onClick={onAction}>{action}</button>}
    </div>
  );
}

function dishList(ctx, list) {
  if (list.length === 0) return <p className="sf-muted sf-pad">No dishes here yet.</p>;
  return (
    <ul className="sf-dishes">
      {list.map((i) => (
        <DishRow key={i.id} item={i} qty={ctx.cart[i.id] || 0} setQty={ctx.setQty}
          fav={ctx.fav.dishes.includes(i.id)} toggleFav={() => ctx.toggleFav("dishes", i.id)} />
      ))}
    </ul>
  );
}

function restaurantGrid(ctx, list) {
  return (
    <div className="sf-grid">
      {list.map((r) => (
        <RestaurantCard key={r.id} r={r} fav={ctx.fav.rests.includes(r.id)}
          toggleFav={() => ctx.toggleFav("rests", r.id)} onOpen={() => ctx.nav("restaurant", r.id)} />
      ))}
    </div>
  );
}

export function HomePage({ ctx }) {
  const cats = categoriesOf(ctx.items);
  return (
    <>
      <section className="sf-hero">
        <div>
          <h1>Good food, <span>on its way.</span></h1>
          <p>Order from your favourite kitchens and get it delivered to your door.</p>
          <button className="sf-btn" onClick={() => ctx.nav("restaurants")}>Order now</button>
        </div>
        <div className="sf-hero-art" aria-hidden="true">
          <span className="plate">🍲</span>
          <div className="sf-deal">
            <small>Hot deal</small>
            <strong>50% OFF</strong>
            <span>your first order</span>
            <code>FIRST50</code>
          </div>
        </div>
      </section>

      <SectionHead title="Categories" action="View all" onAction={() => ctx.nav("categories")} />
      <div className="sf-cats">
        {cats.map((c) => (
          <button key={c.name} className="sf-cat" onClick={() => ctx.nav("categories", c.name)}>
            <span className="sf-cat-icon" style={{ background: c.c }}>{c.e}</span>
            <strong>{c.name}</strong>
            <span className="sf-muted">{c.count} {c.count === 1 ? "dish" : "dishes"}</span>
          </button>
        ))}
      </div>

      <SectionHead title="Popular restaurants" action="View all" onAction={() => ctx.nav("restaurants")} />
      {restaurantGrid(ctx, RESTAURANTS.slice(0, 4))}

      <SectionHead title="Popular dishes" />
      <div className="sf-panel">{dishList(ctx, ctx.items.slice(0, 6))}</div>
    </>
  );
}

export function RestaurantsPage({ ctx }) {
  const [filter, setFilter] = useState("all");
  const list = RESTAURANTS.filter(
    (r) => filter === "all" || (filter === "top" && r.rating >= 4.5) || (filter === "fast" && r.eta[1] <= 30)
  );
  const FILTERS = [["all", "All"], ["top", "Top rated"], ["fast", "Fast delivery"]];
  return (
    <>
      <h1 className="sf-title">Restaurants</h1>
      <div className="sf-chips">
        {FILTERS.map(([id, label]) => (
          <button key={id} className={filter === id ? "sf-filter on" : "sf-filter"} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      {restaurantGrid(ctx, list)}
    </>
  );
}

export function RestaurantPage({ ctx }) {
  const r = RESTAURANTS.find((x) => x.id === ctx.view.param);
  if (!r) return <p className="sf-muted">Restaurant not found.</p>;
  return (
    <>
      <section className="sf-banner" style={{ background: `linear-gradient(135deg, ${r.cover[0]}, ${r.cover[1]})` }}>
        <span className="sf-banner-emoji">{r.emoji}</span>
        <div>
          <h1>{r.name}</h1>
          <p>{r.cuisine}</p>
          <p className="sf-banner-meta"><span>★ {r.rating}</span><span>🕒 {r.eta[0]} to {r.eta[1]} min</span><span>Free delivery over ₹399</span></p>
        </div>
        <Heart on={ctx.fav.rests.includes(r.id)} onClick={() => ctx.toggleFav("rests", r.id)} label={`Favourite ${r.name}`} />
      </section>
      <SectionHead title="Menu" />
      <div className="sf-panel">{dishList(ctx, dishesFor(r, ctx.items))}</div>
    </>
  );
}

export function CategoriesPage({ ctx }) {
  const cats = categoriesOf(ctx.items);
  const sel = ctx.view.param;
  const list = sel ? ctx.items.filter((i) => dishMeta(i.name).cat === sel) : ctx.items;
  return (
    <>
      <h1 className="sf-title">Categories</h1>
      <div className="sf-chips">
        <button className={!sel ? "sf-filter on" : "sf-filter"} onClick={() => ctx.nav("categories")}>All</button>
        {cats.map((c) => (
          <button key={c.name} className={sel === c.name ? "sf-filter on" : "sf-filter"} onClick={() => ctx.nav("categories", c.name)}>
            {c.e} {c.name}
          </button>
        ))}
      </div>
      <div className="sf-panel">{dishList(ctx, list)}</div>
    </>
  );
}

export function OrdersPage({ ctx }) {
  const mine = ctx.enriched.filter((o) => o.user_id === ctx.user.id).slice().reverse();
  return (
    <>
      <h1 className="sf-title">My orders</h1>
      <p className="sf-muted">Delivery progress is simulated in your browser for the demo.</p>
      {mine.length === 0 ? (
        <div className="sf-panel sf-empty">
          <p className="sf-muted">You haven't ordered anything yet.</p>
          <button className="sf-btn" onClick={() => ctx.nav("restaurants")}>Browse restaurants</button>
        </div>
      ) : (
        <ul className="sf-orders">
          {mine.map((o) => {
            const stage = stageOf(o, ctx.tracks, ctx.now);
            const m = dishMeta(o.item || "");
            return (
              <li className="sf-order" key={o.id}>
                <div className="sf-dish-icon" style={{ background: m.c }}>{m.e}</div>
                <div className="sf-order-main">
                  <div className="sf-order-top"><h3>{o.quantity} x {o.item}</h3><strong>{money(o.amount)}</strong></div>
                  <p className="sf-muted">Order #{o.id}</p>
                  <div className="sf-track" role="img" aria-label={`Status: ${STAGES[stage]}`}>
                    {STAGES.map((s, i) => (
                      <div key={s} className={i <= stage ? "step on" : "step"}><span /><small>{s}</small></div>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function FavoritesPage({ ctx }) {
  const rests = RESTAURANTS.filter((r) => ctx.fav.rests.includes(r.id));
  const dishes = ctx.items.filter((i) => ctx.fav.dishes.includes(i.id));
  return (
    <>
      <h1 className="sf-title">Favourites</h1>
      {rests.length === 0 && dishes.length === 0 && (
        <div className="sf-panel sf-empty">
          <p className="sf-muted">Tap the heart on a restaurant or dish to save it here.</p>
          <button className="sf-btn" onClick={() => ctx.nav("restaurants")}>Browse restaurants</button>
        </div>
      )}
      {rests.length > 0 && <><SectionHead title="Restaurants" />{restaurantGrid(ctx, rests)}</>}
      {dishes.length > 0 && <><SectionHead title="Dishes" /><div className="sf-panel">{dishList(ctx, dishes)}</div></>}
    </>
  );
}

export function OffersPage({ ctx }) {
  return (
    <>
      <h1 className="sf-title">Offers</h1>
      <div className="sf-grid">
        {PROMOS.map((p) => (
          <div className="sf-offer" key={p.code}>
            <code>{p.code}</code>
            <h3>{p.title}</h3>
            <p className="sf-muted">{p.note}</p>
            <button className="sf-btn small" onClick={() => ctx.applyPromo(p)}>Apply to cart</button>
          </div>
        ))}
      </div>
    </>
  );
}

const FAQ = [
  ["How long does delivery take?", "Most orders arrive in 20 to 45 minutes, depending on the restaurant."],
  ["How much does delivery cost?", "Delivery is ₹30, and free on orders above ₹399, or above ₹299 with the FREEDEL code."],
  ["How do promo codes work?", "Enter a code in your cart. FIRST50 only works on your first order."],
  ["Can I change an order after placing it?", "Not yet. Place a new order for anything you forgot."],
  ["Why can't I add more of a dish?", "You can only add as many as are in stock."],
];

export function HelpPage() {
  return (
    <>
      <h1 className="sf-title">Help centre</h1>
      <div className="sf-panel">
        {FAQ.map(([q, a]) => (
          <details className="sf-faq" key={q}><summary>{q}</summary><p>{a}</p></details>
        ))}
      </div>
    </>
  );
}

export function ProfilePage({ ctx }) {
  const mine = ctx.enriched.filter((o) => o.user_id === ctx.user.id);
  const spent = mine.reduce((s, o) => s + o.amount, 0);
  const initials = ctx.user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <>
      <h1 className="sf-title">Profile</h1>
      <section className="sf-panel sf-profile">
        <span className="sf-avatar big">{initials}</span>
        <div>
          <h2>{ctx.user.name}</h2>
          <p className="sf-muted">{ctx.user.email}</p>
          <p className="sf-status"><i className="sf-online static" /> Active · Customer #{ctx.user.id}</p>
        </div>
      </section>
      <div className="sf-stats">
        <div className="sf-panel"><span className="sf-muted">Orders placed</span><strong>{mine.length}</strong></div>
        <div className="sf-panel"><span className="sf-muted">Total spent</span><strong>{money(spent)}</strong></div>
        <div className="sf-panel"><span className="sf-muted">Favourites</span><strong>{ctx.fav.dishes.length + ctx.fav.rests.length}</strong></div>
      </div>
      <section className="sf-panel">
        <h2>Delivery address</h2>
        <label className="sf-field">
          Where should we deliver?
          <input value={ctx.address} onChange={(e) => ctx.setAddress(e.target.value)} placeholder="House number, street, area" />
        </label>
        <p className="sf-muted">Saved in this browser.</p>
      </section>
      <button className="sf-btn ghost" onClick={ctx.logout}>Log out</button>
    </>
  );
}

export function SearchResults({ ctx }) {
  const q = ctx.search.trim().toLowerCase();
  const rests = RESTAURANTS.filter((r) => `${r.name} ${r.cuisine}`.toLowerCase().includes(q));
  const dishes = ctx.items.filter((i) => i.name.toLowerCase().includes(q));
  return (
    <>
      <h1 className="sf-title">Results for “{ctx.search.trim()}”</h1>
      {rests.length === 0 && dishes.length === 0 && <p className="sf-muted">Nothing matched your search. Try a different word.</p>}
      {rests.length > 0 && <><SectionHead title="Restaurants" />{restaurantGrid(ctx, rests)}</>}
      {dishes.length > 0 && <><SectionHead title="Dishes" /><div className="sf-panel">{dishList(ctx, dishes)}</div></>}
    </>
  );
}