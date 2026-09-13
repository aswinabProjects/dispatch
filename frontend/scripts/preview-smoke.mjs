import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = "http://127.0.0.1:4173";
for (const route of ["/", "/orders", "/orders/new", "/orders/3", "/products"]) {
  const response = await fetch(`${base}${route}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Dispatch/);
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)) {
    assert.equal((await fetch(`${base}${asset}`)).status, 200);
  }
}
const fixtures = JSON.parse(
  await readFile(new URL("../test-results/fixtures.json", import.meta.url)),
);
const { username, password } = fixtures.users[0];
const tokenResponse = await fetch(`${base}/api/token/`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
});
assert.equal(tokenResponse.status, 200);
const { access } = await tokenResponse.json();
const identity = await fetch(`${base}/api/me/`, {
  headers: { Authorization: `Bearer ${access}` },
});
assert.equal(identity.status, 200);
assert.equal((await identity.json()).username, username);
console.log(
  "PASS production preview: five history routes, compiled assets, JWT login, and /api/me through proxy.",
);
