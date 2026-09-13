export const stages = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];
export const managedRole = (role) => ["staff", "manager"].includes(role);
export const nextStatus = (status) =>
  stages[stages.indexOf(status) + 1] && stages.includes(status)
    ? stages[stages.indexOf(status) + 1]
    : null;
export const canCancel = (user, order) =>
  user.role === "customer" &&
  user.id === order.customer &&
  order.status === "pending";
export const label = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
export const amount = (value) =>
  new Intl.NumberFormat(
    undefined,
    import.meta.env.VITE_CURRENCY
      ? { style: "currency", currency: import.meta.env.VITE_CURRENCY }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  ).format(value);
export const total = (items) =>
  items.reduce(
    (sum, item) => sum + Math.round(Number(item.price) * 100) * item.quantity,
    0,
  ) / 100;
export const date = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
