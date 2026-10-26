const test = require("node:test");
const assert = require("node:assert/strict");
const { canView, isOwner } = require("./documentAccess");

test("owners and explicitly shared users can view, but unrelated users cannot", () => {
  const document = {
    ownerId: "owner-1",
    sharedWith: ["reader-1"],
  };

  assert.equal(canView(document, "owner-1"), true);
  assert.equal(canView(document, "reader-1"), true);
  assert.equal(canView(document, "other-user"), false);
  assert.equal(isOwner(document, "reader-1"), false);
});
