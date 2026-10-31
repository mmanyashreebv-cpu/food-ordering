import { dishMeta, money } from "./api";

export function Stepper({ item, qty, setQty }) {
  if (item.stock === 0) return <span className="sf-soldout">Sold out</span>;
  if (qty === 0) return <button className="sf-add" onClick={() => setQty(item, 1)}>Add</button>;
  return (
    <div className="sf-stepper">
      <button aria-label={`Remove one ${item.name}`} onClick={() => setQty(item, qty - 1)}>−</button>
      <span>{qty}</span>
      <button aria-label={`Add one ${item.name}`} onClick={() => setQty(item, qty + 1)} disabled={qty >= item.stock}>+</button>
    </div>
  );
}

export function Heart({ on, onClick, label }) {
  return (
    <button
      className={on ? "sf-heart on" : "sf-heart"}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      aria-pressed={on}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}

export function DishRow({ item, qty, setQty, fav, toggleFav }) {
  const m = dishMeta(item.name);
  return (
    <li className="sf-dish">
      <div className="sf-dish-icon" style={{ background: m.c }}>{m.e}</div>
      <div className="sf-dish-info">
        <h3>{item.name}</h3>
        <p className="sf-price">{money(item.price)}</p>
        <p className={item.stock <= 10 ? "sf-stock low" : "sf-stock"}>
          {item.stock === 0 ? "Sold out" : item.stock <= 10 ? `Only ${item.stock} left` : m.cat}
        </p>
      </div>
      <Heart on={fav} onClick={toggleFav} label={`Favourite ${item.name}`} />
      <Stepper item={item} qty={qty} setQty={setQty} />
    </li>
  );
}

export function RestaurantCard({ r, fav, toggleFav, onOpen }) {
  return (
    <div className="sf-rcard" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <div className="sf-cover" style={{ background: `linear-gradient(135deg, ${r.cover[0]}, ${r.cover[1]})` }}>
        <span>{r.emoji}</span>
        <Heart on={fav} onClick={toggleFav} label={`Favourite ${r.name}`} />
      </div>
      <div className="sf-rcard-body">
        <div className="sf-rcard-top"><h3>{r.name}</h3><span className="sf-rating">★ {r.rating}</span></div>
        <p className="sf-muted">{r.cuisine}</p>
        <p className="sf-meta"><span>🕒 {r.eta[0]} to {r.eta[1]} min</span><span>Free delivery over ₹399</span></p>
      </div>
    </div>
  );
}