import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { api } from "./api";
vi.mock("./api", () => ({
  api: {
    me: vi.fn(),
    orders: vi.fn(),
    products: vi.fn(),
    order: vi.fn(),
    createOrder: vi.fn(),
    cancel: vi.fn(),
    transition: vi.fn(),
  },
  hasSession: () => true,
  onLogout: () => () => {},
  login: vi.fn(),
  logout: vi.fn(),
}));
const order = {
  id: 1,
  customer: 3,
  status: "pending",
  created_at: "2026-09-13T12:00:00Z",
  order_items: [{ id: 1, product: 8, price: "25.50", quantity: 2 }],
};
beforeEach(() => {
  vi.resetAllMocks();
  api.me.mockResolvedValue({
    id: 3,
    username: "test-customer",
    role: "customer",
  });
  api.orders.mockResolvedValue([order]);
  api.order.mockResolvedValue(order);
  api.products.mockResolvedValue([
    {
      id: 8,
      name: "Travel dock",
      price: "25.50",
      quantity: 4,
      is_active: true,
    },
  ]);
});
afterEach(cleanup);
function mount(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
it("gives customers their own history and a create-order action", async () => {
  mount("/orders");
  expect(await screen.findByRole("link", { name: /New order/ })).toBeVisible();
  expect(screen.getByRole("link", { name: "My orders" })).toBeVisible();
  await waitFor(() => expect(api.orders).toHaveBeenCalledWith(false));
  expect(
    screen.queryByRole("link", { name: "Order Queue" }),
  ).not.toBeInTheDocument();
});
it.each(["staff", "manager"])(
  "routes %s to management APIs with no customer create action",
  async (role) => {
    api.me.mockResolvedValue({ id: 2, username: "operator", role });
    mount("/orders");
    expect(
      await screen.findByRole("heading", { name: "Order Queue" }),
    ).toBeVisible();
    await waitFor(() => expect(api.orders).toHaveBeenCalledWith(true));
    expect(
      screen.queryByRole("link", { name: /New order/ }),
    ).not.toBeInTheDocument();
  },
);
it("guards the new-order URL from staff", async () => {
  api.me.mockResolvedValue({ id: 2, username: "operator", role: "staff" });
  mount("/orders/new");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Only customers can place orders",
  );
  expect(api.products).not.toHaveBeenCalled();
});
it("requires explicit cancellation confirmation", async () => {
  mount("/orders/1");
  fireEvent.click(await screen.findByRole("button", { name: "Cancel order" }));
  expect(api.cancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Yes, cancel order" }));
  await waitFor(() => expect(api.cancel).toHaveBeenCalledWith("1"));
});
it("hides cancellation after confirmation", async () => {
  api.order.mockResolvedValue({ ...order, status: "confirmed" });
  mount("/orders/1");
  await screen.findByRole("heading", { name: "Order journey" });
  expect(
    screen.queryByRole("button", { name: "Cancel order" }),
  ).not.toBeInTheDocument();
});
it("offers only the next fulfillment transition to staff", async () => {
  api.me.mockResolvedValue({ id: 2, username: "operator", role: "staff" });
  mount("/orders/1");
  fireEvent.click(
    await screen.findByRole("button", { name: "Mark confirmed" }),
  );
  await waitFor(() =>
    expect(api.transition).toHaveBeenCalledWith("1", "confirmed"),
  );
  expect(
    screen.queryByRole("button", { name: "Mark shipped" }),
  ).not.toBeInTheDocument();
});
it("creates an order from the cart and navigates to its detail", async () => {
  api.createOrder.mockResolvedValue(order);
  mount("/orders/new");
  fireEvent.click(await screen.findByRole("button", { name: "Add to order" }));
  fireEvent.click(screen.getByRole("button", { name: "Place order" }));
  await waitFor(() =>
    expect(api.createOrder).toHaveBeenCalledWith([{ product: 8, quantity: 1 }]),
  );
  expect(
    await screen.findByRole("heading", { name: "ORD-0001" }),
  ).toBeVisible();
});
it("retains the quantity field when its value is cleared", async () => {
  mount("/orders/new");
  fireEvent.click(await screen.findByRole("button", { name: "Add to order" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity" }), {
    target: { value: "" },
  });
  expect(screen.getByRole("spinbutton", { name: "Quantity" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Place order" })).toBeDisabled();
});
it("shows backend permission errors instead of an empty list", async () => {
  api.orders.mockRejectedValue({
    status: 403,
    message: "You do not have permission.",
  });
  mount("/orders");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Access restricted",
  );
  expect(screen.queryByText("A fresh start")).not.toBeInTheDocument();
});
it("separates customer order cards from the operational table", async () => {
  mount("/orders");
  expect(
    await screen.findByRole("heading", { name: "My Orders" }),
  ).toBeVisible();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(
    await screen.findByRole("link", { name: "View order details" }),
  ).toBeVisible();
});
it("filters open work and completed work independently", async () => {
  api.me.mockResolvedValue({ id: 2, username: "operator", role: "manager" });
  api.orders.mockResolvedValue([
    order,
    { ...order, id: 2, status: "delivered" },
    { ...order, id: 3, status: "cancelled" },
  ]);
  mount("/orders");
  await screen.findByRole("table");
  fireEvent.click(screen.getByRole("button", { name: /Needs fulfillment/ }));
  expect(screen.getByRole("link", { name: "ORD-0001" })).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "ORD-0002" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Delivered/ }));
  expect(screen.getByRole("link", { name: "ORD-0002" })).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "ORD-0001" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /View details/ })).toBeVisible();
});
it("applies a stage deep link and supports mobile menu dismissal", async () => {
  api.me.mockResolvedValue({ id: 2, username: "operator", role: "staff" });
  api.orders.mockResolvedValue([order, { ...order, id: 2, status: "shipped" }]);
  mount("/orders?status=shipped");
  await screen.findByRole("table");
  expect(screen.getByRole("link", { name: "ORD-0002" })).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "ORD-0001" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
  expect(
    screen.getByRole("button", { name: "Close navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
  fireEvent.keyDown(screen.getByRole("navigation"), { key: "Escape" });
  expect(
    screen.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", { name: "Open navigation" })).toHaveFocus();
});
it.each(["delivered", "cancelled"])(
  "does not expose a fulfillment mutation for %s orders",
  async (status) => {
    api.me.mockResolvedValue({ id: 2, username: "operator", role: "staff" });
    api.order.mockResolvedValue({ ...order, status });
    mount("/orders/1");
    await screen.findByRole("heading", { name: "Fulfillment timeline" });
    expect(
      screen.queryByRole("button", { name: /^Mark / }),
    ).not.toBeInTheDocument();
  },
);
it("uses a table-only inventory for operators", async () => {
  api.me.mockResolvedValue({ id: 2, username: "operator", role: "staff" });
  mount("/products");
  expect(
    await screen.findByRole("table", { name: "Inventory catalog" }),
  ).toBeVisible();
  expect(
    screen.getByRole("columnheader", { name: "Available stock" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Add to order" }),
  ).not.toBeInTheDocument();
});
it("keeps customer product browsing separate from the inventory table", async () => {
  mount("/products");
  expect(
    await screen.findByRole("button", { name: "Add to order" }),
  ).toBeVisible();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Inventory" }),
  ).not.toBeInTheDocument();
});
it("opens a dedicated processing workspace with item table and action region", async () => {
  api.me.mockResolvedValue({ id: 2, username: "operator", role: "manager" });
  mount("/orders/1");
  expect(
    await screen.findByRole("table", {
      name: "Order items and reserved quantities",
    }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Customer & order information" }),
  ).toBeVisible();
  expect(
    screen.getByRole("complementary", { name: "Fulfillment actions" }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Fulfillment timeline" }),
  ).toBeVisible();
  expect(screen.getByText("Current stage")).toBeVisible();
  expect(screen.getAllByText("Upcoming")).toHaveLength(4);
});
it("lands operators on active orders rather than completed orders", async () => {
  api.me.mockResolvedValue({ id: 2, username: "operator", role: "staff" });
  api.orders.mockResolvedValue([
    order,
    { ...order, id: 2, status: "delivered" },
  ]);
  mount("/");
  expect(await screen.findByRole("link", { name: "ORD-0001" })).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "ORD-0002" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Needs fulfillment/ }),
  ).toHaveAttribute("aria-pressed", "true");
});
it("lands customers on products", async () => {
  mount("/");
  expect(
    await screen.findByRole("button", { name: "Add to order" }),
  ).toBeVisible();
  expect(api.orders).not.toHaveBeenCalled();
});
it("provides all seven queue status filters with counts", async () => {
  api.me.mockResolvedValue({ id: 2, username: "operator", role: "staff" });
  mount("/orders");
  await screen.findByRole("table");
  for (const name of [
    "All 1",
    "Pending 1",
    "Confirmed 0",
    "Processing 0",
    "Shipped 0",
    "Delivered 0",
    "Cancelled 0",
  ])
    expect(screen.getByRole("button", { name })).toBeVisible();
  expect(screen.getByRole("columnheader", { name: "Updated" })).toBeVisible();
});
