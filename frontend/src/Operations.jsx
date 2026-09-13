import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  Search,
  Package,
  LockKeyhole,
} from "lucide-react";
import { amount, date, label, nextStatus, stages, total } from "./domain";

const stepCopy = {
  pending: [
    "Order received",
    "Review the order and confirm it is ready for fulfillment.",
  ],
  confirmed: ["Order confirmed", "Prepare the items for processing."],
  processing: [
    "Items in preparation",
    "Pack the order and move it to shipped when dispatched.",
  ],
  shipped: ["Order dispatched", "Mark delivered after delivery is complete."],
  delivered: [
    "Delivery complete",
    "No further fulfillment action is available.",
  ],
};
const actionCopy = {
  confirmed: "Confirm order",
  processing: "Start processing",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
};
const stamp = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unavailable";
function Status({ value }) {
  return <span className={`badge ${value}`}>{label(value)}</span>;
}
function Feedback({ error, loading, retry }) {
  if (loading)
    return (
      <div className="loading" role="status">
        <RefreshCw className="spin" size={18} />
        Loading records…
      </div>
    );
  if (error)
    return (
      <div className="notice error" role="alert">
        <strong>
          {error.status === 403
            ? "Access restricted"
            : error.status === 404
              ? "Not found"
              : "Unable to load records"}
        </strong>
        {error.message}
        <button className="text-button" onClick={retry}>
          Try again
        </button>
      </div>
    );
  return null;
}
export function OrderQueue({
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
  const filters = ["all", ...stages, "cancelled"];
  return (
    <div className="queue-workspace">
      <header className="queue-title">
        <div>
          <span className="section-kicker">FULFILLMENT</span>
          <h1 tabIndex={-1}>Order Queue</h1>
        </div>
        <button className="secondary" disabled={loading} onClick={reload}>
          <RefreshCw size={16} />
          Refresh queue
        </button>
      </header>
      <div className="queue-status-bar" aria-label="Order status filters">
        {filters.map((status) => (
          <button
            key={status}
            className={filter === status ? "active" : ""}
            aria-pressed={filter === status}
            onClick={() => setFilter(status)}
          >
            {status === "all" ? "All" : label(status)}
            <span>
              {loading
                ? "—"
                : orders.filter((o) => status === "all" || o.status === status)
                    .length}
            </span>
          </button>
        ))}
      </div>
      <div className="queue-tools">
        <div className="search">
          <Search size={16} />
          <input
            aria-label="Search by order number"
            placeholder="Find order by number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className={`queue-active-filter ${filter === "open" ? "active" : ""}`}
          aria-pressed={filter === "open"}
          onClick={() => setFilter(filter === "open" ? "all" : "open")}
        >
          Needs fulfillment
          <span>
            {loading
              ? "—"
              : orders.filter(
                  (o) => !["delivered", "cancelled"].includes(o.status),
                ).length}
          </span>
        </button>
        <span className="result-count">
          {loading
            ? "Loading…"
            : `${shown.length} ${shown.length === 1 ? "order" : "orders"}`}
        </span>
        <span className="sort-note">Newest first</span>
      </div>
      <Feedback error={error} loading={loading} retry={reload} />
      {!loading &&
        !error &&
        (shown.length ? (
          <table className="ops-table queue-table">
            <caption className="sr-only">
              Order queue with fulfillment status, timestamps and next actions
            </caption>
            <thead>
              <tr>
                <th scope="col">Order ID</th>
                <th scope="col">Customer</th>
                <th scope="col">Items</th>
                <th scope="col">Current status</th>
                <th scope="col" className="created-column">
                  Created
                </th>
                <th scope="col">Updated</th>
                <th scope="col">Next action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((order) => (
                <tr key={order.id}>
                  <td data-label="Order ID">
                    <Link className="order-id" to={`/orders/${order.id}`}>
                      ORD-{String(order.id).padStart(4, "0")}
                    </Link>
                  </td>
                  <td data-label="Customer">#{order.customer}</td>
                  <td data-label="Items">
                    {order.order_items.reduce((n, i) => n + i.quantity, 0)}{" "}
                    units
                  </td>
                  <td data-label="Current status">
                    <Status value={order.status} />
                  </td>
                  <td data-label="Created" className="created-column">
                    <time dateTime={order.created_at}>
                      {stamp(order.created_at)}
                    </time>
                  </td>
                  <td data-label="Updated">
                    <time dateTime={order.updated_at}>
                      {stamp(order.updated_at)}
                    </time>
                  </td>
                  <td data-label="Next action">
                    <Link
                      className="queue-row-action"
                      to={`/orders/${order.id}`}
                    >
                      {nextStatus(order.status)
                        ? actionCopy[nextStatus(order.status)]
                        : "View details"}
                      <ChevronRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="record-empty">
            <ClipboardList size={28} />
            <h2>No orders in this view</h2>
            <p>Choose another status or clear your search.</p>
            <button
              className="secondary"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Show all orders
            </button>
          </div>
        ))}
    </div>
  );
}
export function Inventory({
  products,
  loading,
  error,
  reload,
  search,
  setSearch,
}) {
  const visible = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="inventory-workspace">
      <header className="queue-title">
        <div>
          <span className="section-kicker">CATALOG</span>
          <h1 tabIndex={-1}>Inventory</h1>
        </div>
        <button className="secondary" disabled={loading} onClick={reload}>
          <RefreshCw size={16} />
          Refresh inventory
        </button>
      </header>
      <div className="queue-tools">
        <div className="search">
          <Search size={16} />
          <input
            aria-label="Search products"
            placeholder="Search product name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="result-count">
          {loading ? "Loading…" : `${visible.length} products`}
        </span>
        <span className="sort-note">Catalog & availability</span>
      </div>
      <Feedback error={error} loading={loading} retry={reload} />
      {!loading &&
        !error &&
        (visible.length ? (
          <table className="ops-table inventory-table">
            <caption className="sr-only">Inventory catalog</caption>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Product ID</th>
                <th scope="col">Unit price</th>
                <th scope="col">Available stock</th>
                <th scope="col">Availability</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td data-label="Product">
                    <strong>{p.name}</strong>
                  </td>
                  <td data-label="Product ID">#{p.id}</td>
                  <td data-label="Unit price" className="money">
                    {amount(p.price)}
                  </td>
                  <td data-label="Available stock" className="stock-count">
                    {p.quantity}
                    <span> units</span>
                  </td>
                  <td data-label="Availability">
                    <span
                      className={`badge ${!p.is_active ? "cancelled" : p.quantity ? "delivered" : "pending"}`}
                    >
                      {!p.is_active
                        ? "Inactive"
                        : p.quantity
                          ? "Available"
                          : "Out of stock"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="record-empty">
            <Package size={28} />
            <h2>No matching products</h2>
            <p>Try another product name.</p>
          </div>
        ))}
    </div>
  );
}
export function FulfillmentTimeline({ order }) {
  return (
    <section className="processing-section">
      <div className="processing-section-title">
        <h2>Fulfillment timeline</h2>
        <span>Stage progression</span>
      </div>
      {order.status === "cancelled" ? (
        <p className="closed-timeline">
          Cancelled orders do not continue through fulfillment.
        </p>
      ) : (
        <ol className="fulfillment-ledger">
          {stages.map((stage, index) => {
            const current = stages.indexOf(order.status);
            const state =
              index < current
                ? "complete"
                : index === current
                  ? "current"
                  : "future";
            return (
              <li
                key={stage}
                className={state}
                aria-current={state === "current" ? "step" : undefined}
              >
                <span className="ledger-marker">
                  {state === "complete" ? <Check size={14} /> : index + 1}
                </span>
                <div>
                  <strong>{label(stage)}</strong>
                  <p>{stepCopy[stage][0]}</p>
                </div>
                <span className="ledger-state">
                  {state === "complete"
                    ? "Complete"
                    : state === "current"
                      ? "Current stage"
                      : "Upcoming"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
export function OrderProcessing({
  order,
  catalog,
  busy,
  onAdvance,
  success,
  error,
}) {
  const next = nextStatus(order.status);
  return (
    <div className="processing-workspace">
      <div className="processing-breadcrumb">
        <Link to="/orders">
          <ArrowLeft size={15} />
          Order Queue
        </Link>
        <ChevronRight size={13} />
        <span>ORD-{String(order.id).padStart(4, "0")}</span>
      </div>
      <div className="processing-columns">
        <div className="processing-main">
          <header className="processing-header">
            <div>
              <span className="section-kicker">ORDER PROCESSING</span>
              <h1 tabIndex={-1}>ORD-{String(order.id).padStart(4, "0")}</h1>
              <p>
                Placed {date(order.created_at)} · Customer #{order.customer}
              </p>
            </div>
            <Status value={order.status} />
          </header>
          {success && (
            <div className="notice success" role="status">
              <Check size={17} />
              {success}
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              <strong>
                {error.status === 403
                  ? "Access restricted"
                  : "Action could not be completed"}
              </strong>
              {error.message}
            </div>
          )}
          <section className="processing-section">
            <div className="processing-section-title">
              <h2>Items to fulfill</h2>
              <span>{order.order_items.length} line items</span>
            </div>
            <table className="ops-table items-table">
              <caption className="sr-only">
                Order items and reserved quantities
              </caption>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Unit price</th>
                  <th scope="col">Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.order_items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Product">
                      <strong>
                        {catalog.find((p) => p.id === item.product)?.name ||
                          `Product #${item.product}`}
                      </strong>
                      <small>Product #{item.product}</small>
                    </td>
                    <td data-label="Quantity">{item.quantity}</td>
                    <td data-label="Unit price" className="money">
                      {amount(item.price)}
                    </td>
                    <td data-label="Line total" className="money">
                      {amount(total([item]))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="processing-total">
              <span>Order total</span>
              <strong>{amount(total(order.order_items))}</strong>
            </div>
          </section>
          <section className="processing-section">
            <div className="processing-section-title">
              <h2>Customer & order information</h2>
            </div>
            <dl className="order-facts">
              <div>
                <dt>Customer account</dt>
                <dd>#{order.customer}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>
                  <time dateTime={order.created_at}>
                    {stamp(order.created_at)}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>
                  <time dateTime={order.updated_at}>
                    {stamp(order.updated_at)}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Total units</dt>
                <dd>{order.order_items.reduce((n, i) => n + i.quantity, 0)}</dd>
              </div>
            </dl>
          </section>
          <FulfillmentTimeline order={order} />
        </div>
        <aside className="processing-actions" aria-label="Fulfillment actions">
          <div className="action-rail-heading">PROCESS ORDER</div>
          <div className="action-status">
            <span>Current status</span>
            <Status value={order.status} />
          </div>
          {next ? (
            <>
              <span className="section-kicker">NEXT PERMITTED ACTION</span>
              <h2>{actionCopy[next]}</h2>
              <p>{stepCopy[order.status][1]}</p>
              <div className="action-transition">
                <Status value={order.status} />
                <ArrowRight size={15} />
                <Status value={next} />
              </div>
              <button
                className="primary wide"
                disabled={busy}
                onClick={onAdvance}
                aria-label={`Mark ${next}`}
              >
                {busy ? "Updating order…" : actionCopy[next]}
                <ArrowRight size={16} />
              </button>
              <small>The order advances one stage at a time.</small>
            </>
          ) : (
            <div className="processing-terminal">
              <LockKeyhole size={22} />
              <h2>
                {order.status === "delivered"
                  ? "Fulfillment complete"
                  : "Order cancelled"}
              </h2>
              <p>
                {order.status === "delivered"
                  ? "This order has been delivered. No further action remains."
                  : "This order is closed. No fulfillment action remains."}
              </p>
            </div>
          )}
          <Link className="return-queue" to="/orders">
            Back to order queue
            <ChevronRight size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
