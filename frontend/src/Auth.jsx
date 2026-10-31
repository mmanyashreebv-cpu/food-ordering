import { useState } from "react";
import { api } from "./api";
import "./Auth.css";

const ROLES = [
  { id: "customer", label: "Customer" },
  { id: "owner", label: "Restaurant owner" },
];

const COPY = {
  customer: { title: "Good food, on its way.", text: "Browse kitchens, fill your cart and track your delivery live." },
  owner: { title: "Run your kitchen with confidence.", text: "Manage orders, watch stock and keep an eye on every service." },
};

export default function Auth({ onLogin }) {
  const [role, setRole] = useState("customer");
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", owner_code: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const pickRole = (r) => { setRole(r); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        await api("/api/users/register", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            role,
            owner_code: role === "owner" ? form.owner_code : "",
          }),
        });
      }
      const user = await api("/api/users/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password, role }),
      });
      onLogin(user);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const heading = mode === "login" ? "Welcome back" : "Create your account";
  const who = role === "owner" ? "restaurant owner" : "customer";

  return (
    <div className="au">
      <section className={`au-art ${role}`}>
        <div className="au-brand">🍲 Kube Kitchen</div>
        <h1>{COPY[role].title}</h1>
        <p>{COPY[role].text}</p>
      </section>

      <section className="au-side">
        <form onSubmit={submit}>
          <div className="au-roles" role="group" aria-label="Choose how to log in">
            {ROLES.map((r) => (
              <button type="button" key={r.id} className={role === r.id ? "on" : ""} aria-pressed={role === r.id} onClick={() => pickRole(r.id)}>
                {r.label}
              </button>
            ))}
          </div>

          <h2>{heading}</h2>
          <p className="au-sub">{mode === "login" ? `Log in as a ${who}.` : `Register as a ${who}.`}</p>

          {mode === "register" && (
            <label>Name<input name="name" value={form.name} onChange={change} required /></label>
          )}
          <label>Email<input name="email" type="email" value={form.email} onChange={change} required /></label>
          <label>Password<input name="password" type="password" value={form.password} onChange={change} required minLength={6} /></label>
          {mode === "register" && role === "owner" && (
            <label>
              Owner access code
              <input name="owner_code" type="password" value={form.owner_code} onChange={change} required />
              <span className="au-hint">The code set up by the platform administrator.</span>
            </label>
          )}

          {error && <p className="au-error">{error}</p>}
          <button className="au-btn" disabled={busy}>
            {busy ? "Please wait" : mode === "login" ? "Log in" : "Create account"}
          </button>
          <p className="au-switch">
            {mode === "login" ? "No account yet?" : "Already registered?"}{" "}
            <button type="button" className="au-link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Register" : "Log in"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}