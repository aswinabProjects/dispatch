import { Link } from "react-router-dom";
import { ArrowRight, Plus, RefreshCw, Search, Package } from "lucide-react";
import { amount, date, label, stages, total } from "./domain";
export default function CustomerHistory({
  orders,
  shown,
  filter,
  setFilter,
  search,
  setSearch,
  loading,
  error,
  reload,
}) {
  const matches = (o, f) =>
    f === "all" ||
    (f === "open"
      ? !["delivered", "cancelled"].includes(o.status)
      : o.status === f);
  return (
    <>
      <div className="account-page-heading">
        <div>
          <span className="eyebrow">YOUR ACCOUNT</span>
          <h1 tabIndex={-1}>My Orders</h1>
          <p>Order details and delivery progress, in one place.</p>
        </div>
        <Link className="primary" to="/orders/new">
          <Plus size={16} />
          New order
        </Link>
      </div>
      <div className="account-order-tools">
        <div className="work-views" aria-label="Order work views">
          {[
            ["all", "All orders"],
            ["open", "In progress"],
            ["delivered", "Completed"],
            ["cancelled", "Cancelled"],
          ].map(([value, text]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {text}
              <span>
                {loading ? "—" : orders.filter((o) => matches(o, value)).length}
              </span>
            </button>
          ))}
        </div>
        <div className="toolbar-controls">
          <div className="search">
            <Search size={16} />
            <input
              aria-label="Search by order number"
              placeholder="Find an order"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="icon-button"
            aria-label="Refresh orders"
            onClick={reload}
            disabled={loading}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      {error ? (
        <div className="notice error" role="alert">
          <strong>
            {error.status === 403
              ? "Access restricted"
              : "Unable to load orders"}
          </strong>
          {error.message}
          <button className="text-button" onClick={reload}>
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="loading" role="status">
          Loading your orders…
        </div>
      ) : shown.length ? (
        <div className="account-order-list">
          {shown.map((order) => (
            <article className="account-order" key={order.id}>
              <div className="account-order-meta">
                <Link className="order-id" to={`/orders/${order.id}`}>
                  ORD-{String(order.id).padStart(4, "0")}
                </Link>
                <span>Placed {date(order.created_at)}</span>
                <span className={`badge ${order.status}`}>
                  {label(order.status)}
                </span>
              </div>
              <div className="account-order-content">
                <Package size={26} />
                <div>
                  <strong>
                    {order.order_items.reduce((n, i) => n + i.quantity, 0)}{" "}
                    items
                  </strong>
                  <span>
                    {order.status === "delivered"
                      ? "Delivered to you"
                      : order.status === "cancelled"
                        ? "Order cancelled"
                        : "Your order is on its way through fulfillment"}
                  </span>
                </div>
                <strong className="money">
                  {amount(total(order.order_items))}
                </strong>
              </div>
              {order.status !== "cancelled" && (
                <div
                  className="account-progress"
                  aria-label={`Order progress: ${label(order.status)}`}
                >
                  {stages.map((stage, index) => (
                    <span
                      key={stage}
                      className={
                        index <= stages.indexOf(order.status) ? "done" : ""
                      }
                    />
                  ))}
                </div>
              )}
              <Link className="account-detail-link" to={`/orders/${order.id}`}>
                View order details
                <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Package size={28} />
          <h2>{orders.length ? "No matching orders" : "No orders yet"}</h2>
          <p>
            {orders.length
              ? "Try another status or order number."
              : "Browse the catalog to start your first order."}
          </p>
          <Link className="secondary" to="/products">
            Browse products
          </Link>
        </div>
      )}
    </>
  );
}
