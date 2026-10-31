import { useState } from "react";
import { money } from "./api";
import { Stepper } from "./ui";
import { PROMOS, priceCart } from "./restaurants";

export default function CartDrawer({ ctx, onClose }) {
  const { lines, subtotal, setQty, address, setAddress, promo, setPromo, isFirst,
    checkout, placing, problems, receipt, dismissReceipt, nav } = ctx;
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const price = priceCart(subtotal, promo, isFirst);
  const pods = receipt ? [...new Set(receipt.map((r) => r.handled_by))] : [];

  const apply = () => {
    const found = PROMOS.find((p) => p.code === code.trim().toUpperCase());
    if (!found) { setCodeError("That code isn't valid."); return; }
    setCodeError(""); setPromo(found); setCode("");
  };
  const canOrder = lines.length > 0 && address.trim() && !placing && !price.promoError;

  return (
    <div className="sf-overlay" onClick={onClose}>
      <aside className="sf-drawer" role="dialog" aria-label="Your cart" onClick={(e) => e.stopPropagation()}>
        <div className="sf-drawer-head">
          <h2>Your cart</h2>
          <button className="sf-close" onClick={onClose} aria-label="Close cart">✕</button>
        </div>

        {receipt && (
          <div className="sf-receipt">
            <strong>Order placed</strong>
            <p className="sf-muted">Estimated delivery in 30 to 40 minutes</p>
            <ul>{receipt.map((r) => <li key={r.order_id}>#{r.order_id}: {r.quantity} x {r.item}</li>)}</ul>
            <p className="sf-pod">Handled by {pods.join(", ")}</p>
            <div className="sf-row">
              <button className="sf-btn small" onClick={() => nav("orders")}>Track order</button>
              <button className="sf-link" onClick={dismissReceipt}>Dismiss</button>
            </div>
          </div>
        )}

        {problems.length > 0 && (
          <div className="sf-problems">
            <strong>Some items could not be ordered</strong>
            <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            <p>They are still in your cart. Adjust the quantity and try again.</p>
          </div>
        )}

        {lines.length === 0 ? (
          <p className="sf-muted sf-pad">Your cart is empty. Add a dish from any restaurant to get started.</p>
        ) : (
          <>
            <ul className="sf-lines">
              {lines.map(({ item, qty }) => (
                <li key={item.id}>
                  <div><strong>{item.name}</strong><div className="sf-muted">{qty} x {money(item.price)}</div></div>
                  <div className="sf-line-right">
                    <Stepper item={item} qty={qty} setQty={setQty} />
                    <strong>{money(item.price * qty)}</strong>
                  </div>
                </li>
              ))}
            </ul>

            <label className="sf-field">
              Delivery address
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House number, street, area" />
            </label>

            {promo ? (
              <div className="sf-promo-on">
                <span><strong>{promo.code}</strong> applied</span>
                <button className="sf-link" onClick={() => setPromo(null)}>Remove</button>
              </div>
            ) : (
              <div className="sf-row">
                <input className="sf-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Promo code" aria-label="Promo code" />
                <button className="sf-btn small ghost" onClick={apply} disabled={!code.trim()}>Apply</button>
              </div>
            )}
            {codeError && <p className="sf-error">{codeError}</p>}
            {price.promoError && <p className="sf-error">{price.promoError}</p>}

            <dl className="sf-totals">
              <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
              <div><dt>Delivery</dt><dd>{price.delivery === 0 ? "Free" : money(price.delivery)}</dd></div>
              {price.discount > 0 && <div className="save"><dt>Discount</dt><dd>−{money(price.discount)}</dd></div>}
              <div className="grand"><dt>Total</dt><dd>{money(price.total)}</dd></div>
            </dl>
            {!address.trim() && <p className="sf-muted">Enter a delivery address to place your order.</p>}
            <button className="sf-btn full" onClick={checkout} disabled={!canOrder}>
              {placing ? "Placing your order" : `Place order for ${money(price.total)}`}
            </button>
          </>
        )}
      </aside>
    </div>
  );
}