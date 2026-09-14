import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";
import { amount, managedRole } from "./domain";
import "./products.css";

export default function ProductPage({ user, create = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const editable = managedRole(user.role);
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", quantity: 0, is_active: true });
  const [loading, setLoading] = useState(!create);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (create) return;
    let live = true;
    setLoading(true);
    setError(null);
    api.product(id).then((value) => {
      if (live) {
        setProduct(value);
        setForm(value);
      }
    }).catch((e) => {
      if (live) setError(e);
    }).finally(() => {
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [create, id, revision]);

  function change(event) {
    const { name, value, checked, type } = event.target;
    setForm((previous) => ({ ...previous, [name]: type === "checkbox" ? checked : value }));
  }

  async function save(event) {
    event.preventDefault();
    if (!editable || busy) return;
    const payload = { name: form.name.trim(), price: form.price, quantity: Number(form.quantity), is_active: form.is_active };
    // PATCH only edited fields, so changing a name does not overwrite stock
    // reserved by orders since this page was loaded.
    const changes = create ? payload : Object.fromEntries(Object.entries(payload).filter(([key, value]) =>
      key === "price" ? Number(value) !== Number(product[key]) : value !== product[key],
    ));
    if (!create && !Object.keys(changes).length) {
      setSuccess("No changes to save.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess("");
    try {
      const saved = create ? await api.createProduct(payload) : await api.updateProduct(id, changes);
      if (create) navigate(`/products/${saved.id}`, { replace: true });
      else {
        setProduct(saved);
        setForm(saved);
        setSuccess("Product saved.");
      }
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (user.role !== "manager" || !confirmDelete || busy) return;
    setBusy(true);
    setError(null);
    setSuccess("");
    try {
      await api.deleteProduct(id);
      navigate("/products", { replace: true });
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  }

  if (create && !editable) return <div className="notice error" role="alert">Only Staff and Managers can create products.</div>;
  return (
    <div className="product-workspace">
      <Link className="back-link" to="/products">Back to {editable ? "inventory" : "products"}</Link>
      <div className="page-heading"><h1 tabIndex={-1}>{create ? "New product" : "Product details"}</h1></div>
      {error && <div className="notice error" role="alert"><strong>{error.status === 403 ? "Access restricted" : error.status === 404 ? "Product not found" : "Unable to complete request"}</strong><span>{error.message}</span></div>}
      {success && <p className="notice success" role="status">{success}</p>}
      {loading ? <p role="status">Loading product…</p> : !create && !product ? (
        <button className="secondary" onClick={() => setRevision((v) => v + 1)}>Try again</button>
      ) : editable ? (
        <section className="panel product-editor">
          <h2>{create ? "Product information" : `Edit ${product.name}`}</h2>
          <form onSubmit={save}>
            <fieldset disabled={busy}>
              <label>Name<input name="name" value={form.name} onChange={change} maxLength={100} required pattern=".*\S.*" /></label>
              <label>Unit price<input name="price" type="number" step="0.01" min="-99999999.99" max="99999999.99" value={form.price} onChange={change} required /></label>
              <label>Available stock<input name="quantity" type="number" min="0" max="2147483647" step="1" value={form.quantity} onChange={change} required /></label>
              <label className="product-active"><input name="is_active" type="checkbox" checked={form.is_active} onChange={change} />Active</label>
              <p className="muted">Inactive products are hidden from customers and cannot be ordered. Stock is the number of units currently available.</p>
              <button className="primary" type="submit">{busy ? "Saving…" : create ? "Create product" : "Save changes"}</button>
            </fieldset>
          </form>
          {!create && user.role === "manager" && <div className="product-delete">
            {confirmDelete ? <>
              <h2>Delete {product.name}?</h2>
              <p>This permanently deletes the product and its associated order items, including items in existing orders. Deactivate the product instead if you need to preserve order history.</p>
              <div className="product-actions">
                <button className="danger" disabled={busy} onClick={remove}>Yes, delete product</button>
                <button className="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep product</button>
              </div>
            </> : <button className="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete product</button>}
          </div>}
        </section>
      ) : <section className="panel product-editor">
        <h2>{product.name}</h2>
        <dl className="order-facts">
          <div><dt>Product ID</dt><dd>#{product.id}</dd></div>
          <div><dt>Unit price</dt><dd>{amount(product.price)}</dd></div>
          <div><dt>Available stock</dt><dd>{product.quantity}</dd></div>
          <div><dt>Availability</dt><dd>{product.is_active ? "Active" : "Inactive"}</dd></div>
        </dl>
        <Link className="primary" to="/orders/new">Build an order</Link>
      </section>}
    </div>
  );
}
