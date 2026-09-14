const KEY = "dispatch.session";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
let tokens;
try {
  tokens = JSON.parse(sessionStorage.getItem(KEY)) || null;
} catch {
  tokens = null;
}
let generation = 0;
let refreshing = null;
const listeners = new Set();
export class ApiError extends Error {
  constructor(status, data) {
    super(formatError(data) || `Request failed (${status})`);
    this.status = status;
    this.data = data;
  }
}
export function formatError(value, prefix = "") {
  if (typeof value === "string") return prefix ? `${prefix}: ${value}` : value;
  if (Array.isArray(value))
    return value
      .map((v, i) =>
        formatError(
          v,
          typeof v === "object" ? `${prefix} item ${i + 1}` : prefix,
        ),
      )
      .filter(Boolean)
      .join(" · ");
  if (value && typeof value === "object")
    return Object.entries(value)
      .map(([k, v]) =>
        formatError(
          v,
          ["detail", "non_field_errors"].includes(k)
            ? prefix
            : [prefix, k.replaceAll("_", " ")].filter(Boolean).join(" "),
        ),
      )
      .filter(Boolean)
      .join(" · ");
  return "";
}
function save(value) {
  tokens = value;
  try {
    value
      ? sessionStorage.setItem(KEY, JSON.stringify(value))
      : sessionStorage.removeItem(KEY);
  } catch {
    /* In-memory sessions still work when storage is disabled. */
  }
}
export function logout() {
  generation++;
  refreshing = null;
  save(null);
  listeners.forEach((fn) => fn());
}
export function onLogout(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function hasSession() {
  return Boolean(tokens?.refresh);
}
async function raw(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      0,
      "Cannot reach the server. Check your connection and try again.",
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      data || "The server could not complete this request.",
    );
  return data;
}
export async function login(username, password) {
  const current = ++generation;
  const result = await raw("token/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (current !== generation)
    throw new ApiError(401, "Sign-in was interrupted.");
  save(result);
}
async function refresh() {
  if (!tokens?.refresh)
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  if (!refreshing) {
    const current = generation;
    const refreshToken = tokens.refresh;
    const pending = raw("token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    })
      .then((result) => {
        if (generation !== current)
          throw new ApiError(401, "Your session has ended.");
        save({ ...tokens, ...result });
      })
      .catch((error) => {
        if (generation === current && [400, 401, 403].includes(error.status))
          logout();
        throw error;
      })
      .finally(() => {
        if (refreshing === pending) refreshing = null;
      });
    refreshing = pending;
  }
  return refreshing;
}
export async function request(path, options = {}) {
  const current = generation;
  const access = tokens?.access;
  try {
    return await raw(path, {
      ...options,
      headers: {
        ...options.headers,
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
    });
  } catch (error) {
    if (error.status !== 401 || options.signal?.aborted) throw error;
    if (current !== generation) throw error;
    if (tokens?.access === access) await refresh();
    try {
      return await raw(path, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${tokens?.access}`,
        },
      });
    } catch (retryError) {
      if (retryError.status === 401 && current === generation) logout();
      throw retryError;
    }
  }
}
export const api = {
  me: () => request("me/"),
  products: () => request("products/"),
  orders: (managed) => request(managed ? "orders/manage/" : "orders/"),
  order: (id, managed) => request(`orders/${managed ? "manage/" : ""}${id}/`),
  createOrder: (items) =>
    request("orders/", {
      method: "POST",
      body: JSON.stringify({ order_items: items }),
    }),
  cancel: (id) =>
    request(`orders/${id}/cancel/`, { method: "PATCH", body: "{}" }),
  transition: (id, status) =>
    request(`orders/manage/${id}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
