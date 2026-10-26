const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { app } = require("./server");

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("document API rejects requests without a bearer token", async () => {
  const response = await fetch(`${baseUrl}/api/documents`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "Authentication required",
  });
});

test("registration validates email before accessing the database", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "long-enough-password" }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "Enter a valid email address",
  });
});
