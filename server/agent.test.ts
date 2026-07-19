import assert from "node:assert/strict";
import test from "node:test";
import { repositorySnapshot } from "./agent";

test("coding-agent snapshot excludes secrets and generated directories", async () => {
  const snapshot = await repositorySnapshot();
  assert.ok(snapshot.files.length > 0);
  assert.equal(snapshot.files.some((file) => file.startsWith(".env")), false);
  assert.equal(snapshot.files.some((file) => file.includes("node_modules")), false);
  assert.equal(snapshot.files.some((file) => file.startsWith("dist/")), false);
});
