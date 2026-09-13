import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const fixtures = JSON.parse(
  await readFile(new URL("../test-results/fixtures.json", import.meta.url)),
);
const base = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const nativeFetch = globalThis.fetch;
const storage = new Map();
globalThis.sessionStorage = {
  getItem: (key) => storage.get(key),
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
globalThis.fetch = (path, options) => nativeFetch(new URL(path, base), options);
const { api, login, logout, request, hasSession } =
  await import("../src/api.js");
const results = [];
async function check(name, fn) {
  await fn();
  results.push(name);
  console.log(`PASS ${name}`);
}
async function signIn(index) {
  logout();
  const u = fixtures.users[index];
  await login(u.username, u.password);
  return api.me();
}
async function rejects(fn, status) {
  await assert.rejects(fn, (error) => error.status === status);
}
const product = fixtures.products[0];
let order, cancelled;
await check("Unauthenticated request rejected (401)", () =>
  rejects(() => api.me(), 401),
);
await check("Customer JWT login and /api/me identity", async () => {
  assert.equal((await signIn(0)).role, "customer");
  product.quantity = (await api.products()).find(
    (p) => p.id === product.id,
  ).quantity;
});
await check("Customer cannot create or modify products (403)", async () => {
  await rejects(
    () =>
      request("products/", {
        method: "POST",
        body: JSON.stringify({
          name: "Denied QA product",
          price: "1.00",
          quantity: 1,
        }),
      }),
    403,
  );
  await rejects(
    () =>
      request(`products/${product.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: 999 }),
      }),
    403,
  );
});
await check(
  "Customer product visibility excludes inactive products",
  async () => {
    const products = await api.products();
    assert(products.some((p) => p.id === product.id));
    assert(!products.some((p) => p.id === fixtures.products[3].id));
  },
);
await check("Customer cannot access management queue (403)", () =>
  rejects(() => api.orders(true), 403),
);
await check("Order creation reserves stock and snapshots prices", async () => {
  order = await api.createOrder([{ product: product.id, quantity: 2 }]);
  assert.equal(order.status, "pending");
  assert.equal(order.order_items[0].price, "89.00");
  assert.equal(
    (await api.products()).find((p) => p.id === product.id).quantity,
    product.quantity - 2,
  );
});
await check("Customer order history and details", async () => {
  assert((await api.orders(false)).some((o) => o.id === order.id));
  assert.equal(
    (await api.order(order.id, false)).customer,
    fixtures.users[0].id,
  );
});
await check(
  "Customer order detail rejects PUT, PATCH and DELETE (405) without mutation",
  async () => {
    const before = await api.order(order.id, false);
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      await rejects(
        () =>
          request(`orders/${order.id}/`, {
            method,
            body: JSON.stringify({ status: "cancelled", order_items: [] }),
          }),
        405,
      );
    }
    assert.deepEqual(await api.order(order.id, false), before);
  },
);
await check(
  "Insufficient-stock and inactive-product validation (400)",
  async () => {
    await rejects(
      () => api.createOrder([{ product: product.id, quantity: 99999 }]),
      400,
    );
    await rejects(
      () =>
        api.createOrder([{ product: fixtures.products[3].id, quantity: 1 }]),
      400,
    );
  },
);
await check("Pending cancellation restores stock", async () => {
  cancelled = await api.createOrder([{ product: product.id, quantity: 1 }]);
  await api.cancel(cancelled.id);
  assert.equal((await api.order(cancelled.id, false)).status, "cancelled");
  assert(
    new Date((await api.order(cancelled.id, false)).updated_at) >
      new Date(cancelled.updated_at),
  );
  assert.equal(
    (await api.products()).find((p) => p.id === product.id).quantity,
    product.quantity - 2,
  );
});
await check(
  "Repeated cancellation is rejected without restoring stock twice",
  async () => {
    await rejects(() => api.cancel(cancelled.id), 400);
    assert.equal(
      (await api.products()).find((p) => p.id === product.id).quantity,
      product.quantity - 2,
    );
  },
);
await check(
  "Another customer cannot view or cancel the order (404)",
  async () => {
    await signIn(3);
    assert(!(await api.orders(false)).some((o) => o.id === order.id));
    await rejects(() => api.order(order.id, false), 404);
    await rejects(() => api.cancel(order.id), 404);
  },
);
await check(
  "Concurrent cancellation restores the same order stock only once",
  async () => {
    await signIn(0);
    const simultaneous = await api.createOrder([
      { product: product.id, quantity: 1 },
    ]);
    const outcomes = await Promise.allSettled([
      api.cancel(simultaneous.id),
      api.cancel(simultaneous.id),
    ]);
    assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      outcomes.find((r) => r.status === "rejected").reason.status,
      400,
    );
    assert.equal(
      (await api.products()).find((p) => p.id === product.id).quantity,
      product.quantity - 2,
    );
  },
);
await check("Staff identity, catalog, management list and detail", async () => {
  assert.equal((await signIn(1)).role, "staff");
  assert((await api.products()).some((p) => p.id === fixtures.products[3].id));
  assert((await api.orders(true)).some((o) => o.id === order.id));
  assert.equal((await api.order(order.id, true)).id, order.id);
});
await check("Staff cannot create customer orders (403)", () =>
  rejects(() => api.createOrder([{ product: product.id, quantity: 1 }]), 403),
);
await check(
  "Skipped transition rejected (400); pending → confirmed accepted",
  async () => {
    await rejects(() => api.transition(order.id, "shipped"), 400);
    await api.transition(order.id, "confirmed");
    assert.equal((await api.order(order.id, true)).status, "confirmed");
    assert(
      new Date((await api.order(order.id, true)).updated_at) >
        new Date(order.updated_at),
    );
  },
);
await check(
  "Customer cannot cancel confirmed order or update fulfillment",
  async () => {
    await signIn(0);
    await rejects(() => api.cancel(order.id), 400);
    await rejects(() => api.transition(order.id, "processing"), 403);
  },
);
await check(
  "Concurrent identical fulfillment transitions allow one success",
  async () => {
    await signIn(1);
    const outcomes = await Promise.allSettled([
      api.transition(order.id, "processing"),
      api.transition(order.id, "processing"),
    ]);
    assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      outcomes.find((r) => r.status === "rejected").reason.status,
      400,
    );
    assert.equal((await api.order(order.id, true)).status, "processing");
  },
);
await check(
  "Manager identity, queue, detail and remaining fulfillment sequence",
  async () => {
    assert.equal((await signIn(2)).role, "manager");
    assert((await api.orders(true)).some((o) => o.id === order.id));
    for (const status of ["shipped", "delivered"]) {
      const before = await api.order(order.id, true);
      await api.transition(order.id, status);
      const after = await api.order(order.id, true);
      assert.equal(after.status, status);
      assert(new Date(after.updated_at) > new Date(before.updated_at));
    }
    await rejects(() => api.transition(order.id, "pending"), 400);
    await rejects(() => api.transition(cancelled.id, "confirmed"), 400);
  },
);
await check("Real JWT refresh and automatic request retry", async () => {
  const cached = JSON.parse(storage.get("dispatch.session"));
  cached.access = "expired-access";
  storage.set("dispatch.session", JSON.stringify(cached));
  const freshClient = await import(`../src/api.js?refresh=${Date.now()}`);
  assert.equal((await freshClient.api.me()).role, "manager");
  assert.notEqual(
    JSON.parse(storage.get("dispatch.session")).access,
    "expired-access",
  );
});
await check("Logout clears session", async () => {
  logout();
  assert.equal(hasSession(), false);
  await rejects(() => request("me/"), 401);
});
await writeFile(
  new URL("../test-results/live-api.json", import.meta.url),
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      base,
      passed: results,
      orders: [order.id, cancelled.id],
    },
    null,
    2,
  ),
);
