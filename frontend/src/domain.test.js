import { describe, expect, it } from "vitest";
import { canCancel, managedRole, nextStatus, total } from "./domain";
describe("backend role and workflow contract", () => {
  it("allows only adjacent forward fulfillment transitions", () => {
    expect(
      [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "unknown",
      ].map(nextStatus),
    ).toEqual([
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      null,
      null,
      null,
    ]);
  });
  it("limits cancellation to the customer owning a pending order", () => {
    const order = { customer: 1, status: "pending" };
    expect(canCancel({ id: 1, role: "customer" }, order)).toBe(true);
    expect(canCancel({ id: 2, role: "customer" }, order)).toBe(false);
    expect(canCancel({ id: 1, role: "staff" }, order)).toBe(false);
    expect(
      canCancel({ id: 1, role: "customer" }, { ...order, status: "confirmed" }),
    ).toBe(false);
  });
  it("gives staff and manager the same fulfillment access", () => {
    expect(["customer", "staff", "manager", "admin"].map(managedRole)).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
  it("totals stored decimal prices in integer cents", () => {
    expect(
      total([
        { price: "0.10", quantity: 3 },
        { price: "0.20", quantity: 1 },
      ]),
    ).toBe(0.5);
  });
});
