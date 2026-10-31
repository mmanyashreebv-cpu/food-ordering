import { StrictMode, Suspense, lazy, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Auth from "./Auth.jsx";
import App from "./App.jsx";

// The admin console only loads for restaurant owners
const Admin = lazy(() => import("./Admin.jsx"));

const readUser = () => {
  try { return JSON.parse(sessionStorage.getItem("user")); } catch { return null; }
};

function Root() {
  const [user, setUser] = useState(readUser);

  const login = (u) => {
    try { sessionStorage.setItem("user", JSON.stringify(u)); } catch { /* ignore */ }
    setUser(u);
  };
  const logout = () => {
    try { sessionStorage.removeItem("user"); } catch { /* ignore */ }
    setUser(null);
  };

  if (!user) return <Auth onLogin={login} />;
  if (user.role === "owner") {
    return (
      <Suspense fallback={null}>
        <Admin user={user} onLogout={logout} />
      </Suspense>
    );
  }
  return <App user={user} onLogout={logout} />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);