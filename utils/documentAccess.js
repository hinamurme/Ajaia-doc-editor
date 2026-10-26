function idOf(value) {
  return String(value?._id ?? value);
}

function isOwner(document, userId) {
  return idOf(document.ownerId) === idOf(userId);
}

function canView(document, userId) {
  return (
    isOwner(document, userId) ||
    document.sharedWith.some((sharedUserId) => idOf(sharedUserId) === idOf(userId))
  );
}

module.exports = { canView, isOwner };
