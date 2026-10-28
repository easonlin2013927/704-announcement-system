import { test } from "node:test";
import assert from "node:assert/strict";
import { hash, verify, digest } from "./password.mjs";
test("password hashes use separate salts and reject wrong passwords", async () => {
  const first = await hash("a-long-example-password");
  const second = await hash("a-long-example-password");
  assert.notEqual(first, second);
  assert.equal(await verify("a-long-example-password", first), true);
  assert.equal(await verify("wrong-password", first), false);
  assert.notEqual(digest("token-one"), digest("token-two"));
});
