function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ success: false, error: "Invalid request data" });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, error: "An account with that email already exists" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ success: false, error: "Request body is too large" });
  }
  if (error.type === "entity.parse.failed" || error instanceof SyntaxError) {
    return res.status(400).json({ success: false, error: "Request body must contain valid JSON" });
  }
  if (error.message === "Origin is not allowed by CORS") {
    return res.status(403).json({ success: false, error: error.message });
  }

  console.error(error);
  return res.status(500).json({ success: false, error: "Internal server error" });
}

module.exports = { errorHandler };
