import { beforeEach, describe, expect, it, vi } from "vitest";
const response = (status, data) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
let client;
beforeEach(async () => {
  vi.resetModules();
  sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
  client = await import("./api");
});
async function signIn() {
  fetch.mockResolvedValueOnce(
    response(200, { access: "old-access", refresh: "refresh-token" }),
  );
  await client.login("customer", "password");
}
describe("centralized authentication", () => {
  it("attaches JWT and obtains current identity from /api/me/", async () => {
    await signIn();
    fetch.mockResolvedValueOnce(
      response(200, { id: 1, username: "customer", role: "customer" }),
    );
    expect((await client.api.me()).role).toBe("customer");
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/me/",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer old-access",
        }),
      }),
    );
  });
  it("refreshes once for concurrent 401s and retries both requests", async () => {
    await signIn();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    fetch.mockImplementation(async (url, options) => {
      if (url.endsWith("refresh/")) {
        await gate;
        return response(200, { access: "new-access" });
      }
      return options.headers.Authorization === "Bearer old-access"
        ? response(401, { detail: "Expired" })
        : response(200, []);
    });
    const a = client.api.products(),
      b = client.api.orders(false);
    await vi.waitFor(() =>
      expect(
        fetch.mock.calls.filter(([url]) => url.endsWith("refresh/")),
      ).toHaveLength(1),
    );
    release();
    await Promise.all([a, b]);
    expect(
      fetch.mock.calls.filter(([url]) => url.endsWith("refresh/")),
    ).toHaveLength(1);
  });
  it("clears rejected refresh credentials and notifies auth state", async () => {
    await signIn();
    const listener = vi.fn();
    client.onLogout(listener);
    fetch
      .mockResolvedValueOnce(response(401, {}))
      .mockResolvedValueOnce(
        response(401, { detail: "Token is invalid or expired" }),
      );
    await expect(client.api.me()).rejects.toMatchObject({ status: 401 });
    expect(client.hasSession()).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
  });
  it("does not refresh a forbidden request", async () => {
    await signIn();
    fetch.mockResolvedValueOnce(
      response(403, { detail: "You do not have permission." }),
    );
    await expect(client.api.orders(true)).rejects.toMatchObject({
      status: 403,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("preserves the session on a temporary refresh network failure", async () => {
    await signIn();
    fetch
      .mockResolvedValueOnce(response(401, {}))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(client.api.me()).rejects.toMatchObject({ status: 0 });
    expect(client.hasSession()).toBe(true);
  });
  it("prevents an in-flight refresh from restoring a logged-out session", async () => {
    await signIn();
    let release;
    fetch.mockResolvedValueOnce(response(401, {})).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = client.api.me();
    const assertion = expect(pending).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    client.logout();
    release(response(200, { access: "late" }));
    await assertion;
    expect(client.hasSession()).toBe(false);
  });
  it("sends only product IDs and quantities for order creation", async () => {
    await signIn();
    fetch.mockResolvedValueOnce(response(201, { id: 4 }));
    await client.api.createOrder([{ product: 3, quantity: 2 }]);
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/orders/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ order_items: [{ product: 3, quantity: 2 }] }),
      }),
    );
  });
  it("formats nested DRF validation errors", () => {
    expect(
      client.formatError({
        order_items: [{ quantity: ["It should be greater than zero"] }],
      }),
    ).toContain("order items item 1 quantity: It should be greater than zero");
  });
});
