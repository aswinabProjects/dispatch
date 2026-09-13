import { OrderQueue, Inventory, OrderProcessing } from "./Operations";
import CustomerHistory from "./CustomerHistory";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  Menu,
  X,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import { api, hasSession, login, logout, onLogout } from "./api";
import {
  amount,
  canCancel,
  date,
  label,
  managedRole,
  nextStatus,
  stages,
  total,
} from "./domain";

const Auth = createContext(null);
function useAuth() {
  return useContext(Auth);
}
export function ErrorNotice({ error, retry }) {
  return error ? (
    <div className="notice error" role="alert">
      <strong>
        {error.status === 403
          ? "Access restricted"
          : error.status === 404
            ? "Not found"
            : "Something needs attention"}
      </strong>
      <span>{error.message}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  ) : null;
}
function Loading() {
  return (
    <div className="loading" role="status">
      <RefreshCw size={22} className="spin" /> Loading your workspace…
    </div>
  );
}
function Empty({ title, children }) {
  return (
    <div className="empty">
      <Box size={36} strokeWidth={1.3} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
function Badge({ status }) {
  return <span className={`badge ${status}`}>{label(status)}</span>;
}
function useResource(fetcher) {
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    fetcher()
      .then((value) => {
        if (live) setData(value);
      })
      .catch((e) => {
        if (live) setError(e);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [fetcher, revision]);
  return { data, error, loading, reload };
}
function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-icon">
        <Package size={23} />
      </span>
      dispatch
    </Link>
  );
}
export default function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(hasSession()),
    [error, setError] = useState(null);
  const identify = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(await api.me());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const off = onLogout(() => {
      setUser(null);
      setError({ message: "Your session has ended. Sign in to continue." });
    });
    if (hasSession()) identify();
    return off;
  }, [identify]);
  return (
    <Auth.Provider value={{ user, identify }}>
      {loading ? <Loading /> : !user ? <Login error={error} /> : <Shell />}
    </Auth.Provider>
  );
}
function Login({ error: sessionError }) {
  const { identify } = useAuth();
  const [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await login(form.get("username"), form.get("password"));
      await identify();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-layout">
      <div className="login-brand">
        <Brand />
        <span>Orders & fulfillment</span>
      </div>
      <section className="login-form">
        <div>
          <span className="eyebrow">ACCOUNT ACCESS</span>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to your order workspace.</p>
          <ErrorNotice error={error || sessionError} />
          <form onSubmit={submit}>
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                required
                autoFocus
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="primary wide" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="login-note">
            Use the account provided by your administrator.
          </p>
        </div>
      </section>
    </main>
  );
}
function Shell() {
  const { user } = useAuth();
  const managed = managedRole(user.role);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    document.querySelector("main h1")?.focus();
  }, [location.pathname]);
  if (!managed && user.role !== "customer")
    return (
      <main className="workspace">
        <ErrorNotice
          error={{
            status: 403,
            message:
              "This account role is not supported. Contact your administrator.",
          }}
        />
        <button onClick={logout}>Sign out</button>
      </main>
    );
  return (
    <div className={`app-shell ${managed ? "operations" : "storefront"}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <button
          className="icon-button menu-toggle"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="app-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <Brand />
        <span className="workspace-label">
          {managed ? "Commerce operations" : "Shop & account"}
        </span>
        <div className="account">
          <span className="avatar">
            {user.username.slice(0, 2).toUpperCase()}
          </span>
          <span className="identity">
            <strong>{user.username}</strong>
            <small>{label(user.role)}</small>
          </span>
          <button
            className="icon-button"
            title="Sign out"
            aria-label="Sign out"
            onClick={logout}
          >
            <LogOut size={19} />
          </button>
        </div>
      </header>
      <nav
        id="app-navigation"
        className={`app-navigation ${menuOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setMenuOpen(false);
            document.querySelector(".menu-toggle")?.focus();
          }
        }}
      >
        <span className="navigation-heading">
          {managed ? "WORKSPACE" : "YOUR ACCOUNT"}
        </span>
        <NavLink to="/orders" onClick={() => setMenuOpen(false)}>
          <ClipboardList size={18} />
          <span className="nav-label">
            {managed ? "Order Queue" : "My orders"}
          </span>
        </NavLink>
        <NavLink to="/products" onClick={() => setMenuOpen(false)}>
          <Box size={18} />
          <span className="nav-label">
            {managed ? "Inventory" : "Products"}
          </span>
        </NavLink>
      </nav>
      <main id="main" className="workspace">
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to={managed ? "/orders?status=open" : "/products"}
                replace
              />
            }
          />
          <Route path="/orders" element={<Orders />} />
          <Route
            path="/orders/new"
            element={managed ? <Forbidden /> : <Catalog checkout />}
          />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/products" element={<Catalog />} />
          <Route
            path="*"
            element={
              <Empty title="Page not found">
                <Link to="/orders">Return to orders</Link>
              </Empty>
            }
          />
        </Routes>
      </main>
      <footer className="footer">
        <span>
          Dispatch ·{" "}
          {managed ? "Fulfillment workspace" : "Your orders, all in one place"}
        </span>
      </footer>
    </div>
  );
}
function Forbidden() {
  return (
    <ErrorNotice
      error={{ status: 403, message: "Only customers can place orders." }}
    />
  );
}
function PageHeading({ eyebrow, title, children }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 tabIndex={-1}>{title}</h1>
      </div>
      {children}
    </div>
  );
}
function Orders() {
  const { user } = useAuth();
  const managed = managedRole(user.role);
  const fetcher = useCallback(() => api.orders(managed), [managed]);
  const { data, loading, error, reload } = useResource(fetcher);
  const [params, setParams] = useSearchParams();
  const requestedFilter = params.get("status") || "all";
  const filter = ["all", "open", ...stages, "cancelled"].includes(
    requestedFilter,
  )
    ? requestedFilter
    : "all";
  const setFilter = (value) =>
    setParams(value === "all" ? {} : { status: value });
  const [search, setSearch] = useState("");
  const orders = Array.isArray(data) ? data : data?.results || [];
  const matches = (order, value) =>
    value === "all" ||
    (value === "open"
      ? !["delivered", "cancelled"].includes(order.status)
      : order.status === value);
  const shown = orders
    .filter((o) => matches(o, filter) && String(o.id).includes(search.trim()))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const props = {
    orders,
    shown,
    filter,
    setFilter,
    search,
    setSearch,
    loading,
    error,
    reload,
  };
  return managed ? <OrderQueue {...props} /> : <CustomerHistory {...props} />;
}
function Catalog({ checkout = false }) {
  const { user } = useAuth();
  const customer = user.role === "customer";
  const { data, error, loading, reload } = useResource(api.products);
  const [cart, setCart] = useState({}),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [submitError, setSubmitError] = useState(null);
  const navigate = useNavigate();
  const products = Array.isArray(data) ? data : data?.results || [];
  const items = products
    .filter((p) => cart[p.id] !== undefined && cart[p.id] !== 0)
    .map((p) => ({ ...p, quantity: Number(cart[p.id]) }));
  const invalid = items.some(
    (p) =>
      !Number.isInteger(p.quantity) ||
      p.quantity < 1 ||
      p.quantity > products.find((v) => v.id === p.id).quantity ||
      !p.is_active,
  );
  function change(id, value) {
    setCart((previous) => ({ ...previous, [id]: value }));
  }
  async function submit(event) {
    event.preventDefault();
    if (!items.length || invalid || busy) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const order = await api.createOrder(
        items.map((p) => ({ product: p.id, quantity: p.quantity })),
      );
      navigate(`/orders/${order.id}`, {
        state: {
          success: "Order placed successfully. Your items are reserved.",
        },
      });
    } catch (e) {
      setSubmitError(e);
      reload();
    } finally {
      setBusy(false);
    }
  }
  if (!customer)
    return (
      <Inventory
        products={products}
        loading={loading}
        error={error}
        reload={reload}
        search={search}
        setSearch={setSearch}
      />
    );
  return (
    <>
      <PageHeading
        eyebrow={
          customer
            ? "CATALOG / BUILD YOUR ORDER"
            : "INVENTORY / PRODUCT CATALOG"
        }
        title={
          checkout
            ? "Create your order"
            : customer
              ? "Browse products"
              : "Product inventory"
        }
      />
      <div className={`catalog-layout ${customer ? "" : "full"}`}>
        <section>
          <div className="catalog-toolbar">
            <span className="muted">{products.length} products available</span>
            <div className="search">
              <Search size={18} />
              <input
                aria-label="Search products"
                placeholder="Find a product"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <ErrorNotice error={error} retry={reload} />
          {loading ? (
            <Loading />
          ) : (
            <div className="product-grid">
              {products
                .filter((p) =>
                  p.name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((p) => (
                  <article className="product-card" key={p.id}>
                    <div className="product-top">
                      <span className="product-icon">
                        <Package size={30} strokeWidth={1.4} />
                      </span>
                      <span
                        className={`stock ${p.quantity && p.is_active ? "" : "unavailable"}`}
                      >
                        {!p.is_active
                          ? "Inactive"
                          : p.quantity
                            ? `${p.quantity} in stock`
                            : "Out of stock"}
                      </span>
                    </div>
                    <span className="eyebrow">
                      PRODUCT / {String(p.id).padStart(4, "0")}
                    </span>
                    <h2>{p.name}</h2>
                    <div className="product-bottom">
                      <strong>{amount(p.price)}</strong>
                      {customer && (
                        <button
                          className="secondary"
                          disabled={
                            busy ||
                            !p.is_active ||
                            !p.quantity ||
                            Number(cart[p.id] || 0) >= p.quantity
                          }
                          onClick={() =>
                            change(p.id, Number(cart[p.id] || 0) + 1)
                          }
                        >
                          <Plus size={16} />
                          {cart[p.id] ? "Add more" : "Add to order"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          )}
          {!loading &&
            !error &&
            !products.filter((p) =>
              p.name.toLowerCase().includes(search.toLowerCase()),
            ).length && (
              <Empty title="No products found">
                <p>Try a different search or check back later.</p>
              </Empty>
            )}
        </section>
        {customer && (
          <aside className="order-draft panel">
            <div className="draft-heading">
              <ShoppingBag size={21} />
              <h2>Your order</h2>
              <span>{items.length}</span>
            </div>
            <form onSubmit={submit}>
              {items.length ? (
                <>
                  <fieldset disabled={busy} className="cart-fields">
                    {items.map((p) => (
                      <div className="cart-item" key={p.id}>
                        <div>
                          <strong>{p.name}</strong>
                          <small>{amount(p.price)} / unit</small>
                        </div>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Remove ${p.name}`}
                          onClick={() => change(p.id, 0)}
                        >
                          <Trash2 size={17} />
                        </button>
                        <label className="quantity">
                          Quantity
                          <input
                            type="number"
                            min="1"
                            max={products.find((v) => v.id === p.id).quantity}
                            step="1"
                            value={cart[p.id]}
                            onChange={(e) => change(p.id, e.target.value)}
                            required
                          />
                        </label>
                        <strong>
                          {amount(
                            Number.isFinite(p.quantity)
                              ? p.price * p.quantity
                              : 0,
                          )}
                        </strong>
                      </div>
                    ))}
                  </fieldset>
                  <div className="draft-total">
                    <span>Order total</span>
                    <strong>{amount(total(items))}</strong>
                  </div>
                  <p className="muted small">
                    Prices and availability are confirmed when you place your
                    order.
                  </p>
                  {invalid && (
                    <p className="notice error" role="alert">
                      Check quantities against available stock.
                    </p>
                  )}
                  <ErrorNotice error={submitError} />
                  <button className="primary wide" disabled={busy || invalid}>
                    {busy ? "Placing order…" : "Place order"}
                    <ArrowRight size={18} />
                  </button>
                </>
              ) : (
                <div className="draft-empty">
                  <Box size={32} strokeWidth={1.3} />
                  <h3>Your draft is empty</h3>
                  <p>Add products from the shelf to start your order.</p>
                </div>
              )}
            </form>
          </aside>
        )}
      </div>
    </>
  );
}
function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const managed = managedRole(user.role);
  const location = useLocation();
  const fetcher = useCallback(() => api.order(id, managed), [id, managed]);
  const { data: order, loading, error, reload } = useResource(fetcher);
  const products = useResource(api.products);
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(null),
    [confirm, setConfirm] = useState(false),
    [success, setSuccess] = useState(location.state?.success || "");
  async function act(cancel) {
    setBusy(true);
    setActionError(null);
    setSuccess("");
    try {
      if (cancel) await api.cancel(id);
      else await api.transition(id, nextStatus(order.status));
      setSuccess(
        cancel
          ? "Order cancelled. Reserved stock has been returned."
          : "Fulfillment status updated.",
      );
      setConfirm(false);
      reload();
    } catch (e) {
      setActionError(e);
      reload();
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <Link className="back-link" to="/orders">
          <ArrowLeft size={16} />
          Back to orders
        </Link>
        <ErrorNotice error={error} retry={reload} />
      </>
    );
  if (!order) return null;
  const catalog = Array.isArray(products.data)
    ? products.data
    : products.data?.results || [];
  if (managed)
    return (
      <OrderProcessing
        order={order}
        catalog={catalog}
        busy={busy}
        onAdvance={() => act(false)}
        success={success}
        error={actionError}
      />
    );
  return (
    <>
      <Link className="back-link" to="/orders">
        <ArrowLeft size={16} />
        Back to orders
      </Link>
      <PageHeading
        eyebrow={`ORDER DETAILS / ${managed ? `CUSTOMER #${order.customer}` : user.username}`}
        title={`ORD-${String(order.id).padStart(4, "0")}`}
      >
        <Badge status={order.status} />
      </PageHeading>
      {success && (
        <div className="notice success" role="status">
          <Check size={18} />
          {success}
        </div>
      )}
      <ErrorNotice error={actionError} />
      <section className="panel progress-panel">
        <div className="section-title">
          <h2>Order journey</h2>
          <span className="muted">Placed {date(order.created_at)}</span>
        </div>
        {order.status === "cancelled" ? (
          <div className="cancelled-message">
            This order was cancelled. No further fulfillment steps are
            available.
          </div>
        ) : (
          <ol className="progress-track">
            {stages.map((stage, i) => (
              <li
                key={stage}
                className={i <= stages.indexOf(order.status) ? "complete" : ""}
                aria-current={stage === order.status ? "step" : undefined}
              >
                <span>
                  {i < stages.indexOf(order.status) ? (
                    <Check size={18} />
                  ) : (
                    i + 1
                  )}
                </span>
                <strong>{label(stage)}</strong>
                {stage === order.status && <small>Current stage</small>}
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="detail-layout">
        <section className="panel">
          <div className="section-title">
            <h2>Order items</h2>
            <span className="muted">{order.order_items.length} line items</span>
          </div>
          {order.order_items.map((item) => (
            <div className="detail-item" key={item.id}>
              <span className="product-icon">
                <Package size={24} />
              </span>
              <div>
                <strong>
                  {catalog.find((p) => p.id === item.product)?.name ||
                    `Product #${item.product}`}
                </strong>
                <small>
                  {amount(item.price)} × {item.quantity}
                </small>
              </div>
              <strong>{amount(total([item]))}</strong>
            </div>
          ))}
          <div className="detail-total">
            <span>Total</span>
            <strong>{amount(total(order.order_items))}</strong>
          </div>
        </section>
        <aside className="panel action-panel">
          {managed && order.updated_at && (
            <div className="last-update">
              <span>Last updated</span>
              <time dateTime={order.updated_at}>
                {new Date(order.updated_at).toLocaleString()}
              </time>
            </div>
          )}
          <span className="eyebrow">NEXT ACTION</span>
          <h2>
            {managed && nextStatus(order.status)
              ? `Move to ${nextStatus(order.status)}`
              : canCancel(user, order)
                ? "Awaiting confirmation"
                : order.status === "delivered"
                  ? "Delivery complete"
                  : order.status === "cancelled"
                    ? "Order closed"
                    : "We’re moving it along"}
          </h2>
          <p className="muted">
            {managed && nextStatus(order.status)
              ? "Update the order once this step is ready. Each stage moves forward in sequence."
              : canCancel(user, order)
                ? "You can cancel this order until it is confirmed."
                : "The latest fulfillment status is shown in the order journey."}
          </p>
          {managed && nextStatus(order.status) && (
            <button
              className="primary wide"
              disabled={busy}
              onClick={() => act(false)}
            >
              {busy ? "Updating…" : `Mark ${nextStatus(order.status)}`}
              <ArrowRight size={17} />
            </button>
          )}
          {canCancel(user, order) &&
            (confirm ? (
              <div className="cancel-confirm">
                <strong>Cancel this order?</strong>
                <p>Your reserved items will return to stock.</p>
                <button
                  className="danger wide"
                  disabled={busy}
                  onClick={() => act(true)}
                >
                  {busy ? "Cancelling…" : "Yes, cancel order"}
                </button>
                <button
                  className="secondary wide"
                  disabled={busy}
                  onClick={() => setConfirm(false)}
                >
                  Keep order
                </button>
              </div>
            ) : (
              <button
                className="secondary wide"
                onClick={() => setConfirm(true)}
              >
                Cancel order
              </button>
            ))}
        </aside>
      </div>
    </>
  );
}
