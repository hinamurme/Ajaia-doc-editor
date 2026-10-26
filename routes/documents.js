const express = require("express");
const mongoose = require("mongoose");
const Document = require("../models/Document");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { canView, isOwner } = require("../utils/documentAccess");

const router = express.Router();
const emptyContent = { type: "doc", content: [{ type: "paragraph" }] };

function validContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content) || content.type !== "doc") {
    return false;
  }
  try {
    return Buffer.byteLength(JSON.stringify(content), "utf8") <= 1_000_000;
  } catch {
    return false;
  }
}

function serializeDocument(document) {
  return {
    id: document.id,
    title: document.title,
    content: document.content,
    ownerId: String(document.ownerId),
    sharedWith: document.sharedWith.map((user) =>
      typeof user === "object" && user.email ? { id: String(user._id), email: user.email } : String(user),
    ),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function findAccessible(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ success: false, error: "Document not found" });
    return null;
  }
  const document = await Document.findById(req.params.id);
  if (!document) {
    res.status(404).json({ success: false, error: "Document not found" });
    return null;
  }
  if (!canView(document, req.user.id)) {
    res.status(403).json({ success: false, error: "You do not have access to this document" });
    return null;
  }
  return document;
}

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const documents = await Document.find({
      $or: [{ ownerId: req.user.id }, { sharedWith: req.user.id }],
    })
      .sort({ updatedAt: -1 })
      .select("title ownerId sharedWith createdAt updatedAt");
    return res.json({ success: true, data: { documents: documents.map(serializeDocument) } });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const content = req.body?.content ?? emptyContent;
    if (!title || title.length > 200) {
      return res.status(400).json({ success: false, error: "Title must be 1–200 characters" });
    }
    if (!validContent(content)) {
      return res.status(400).json({ success: false, error: "Content must be a TipTap document under 1 MB" });
    }
    const document = await Document.create({
      title,
      content,
      ownerId: req.user.id,
      sharedWith: [],
    });
    return res.status(201).json({ success: true, data: { document: serializeDocument(document) } });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const document = await findAccessible(req, res);
    if (!document) return undefined;
    await document.populate("sharedWith", "email");
    return res.json({ success: true, data: { document: serializeDocument(document) } });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const document = await findAccessible(req, res);
    if (!document) return undefined;
    if (!isOwner(document, req.user.id)) {
      return res.status(403).json({ success: false, error: "Only the owner can edit this document" });
    }

    const updates = req.body || {};
    if (Object.hasOwn(updates, "title")) {
      if (typeof updates.title !== "string" || !updates.title.trim() || updates.title.trim().length > 200) {
        return res.status(400).json({ success: false, error: "Title must be 1–200 characters" });
      }
      document.title = updates.title.trim();
    }
    if (Object.hasOwn(updates, "content")) {
      if (!validContent(updates.content)) {
        return res.status(400).json({ success: false, error: "Content must be a TipTap document under 1 MB" });
      }
      document.content = updates.content;
    }
    if (!Object.hasOwn(updates, "title") && !Object.hasOwn(updates, "content")) {
      return res.status(400).json({ success: false, error: "Provide a title or content to update" });
    }
    await document.save();
    return res.json({ success: true, data: { document: serializeDocument(document) } });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const document = await findAccessible(req, res);
    if (!document) return undefined;
    if (!isOwner(document, req.user.id)) {
      return res.status(403).json({ success: false, error: "Only the owner can delete this document" });
    }
    await document.deleteOne();
    return res.json({ success: true, data: { id: document.id } });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/share", async (req, res, next) => {
  try {
    const document = await findAccessible(req, res);
    if (!document) return undefined;
    if (!isOwner(document, req.user.id)) {
      return res.status(403).json({ success: false, error: "Only the owner can share this document" });
    }
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254) {
      return res.status(400).json({ success: false, error: "Enter a valid user email" });
    }
    const user = await User.findOne({ email }).select("_id email");
    if (!user) {
      return res.status(404).json({ success: false, error: "No account exists for that email" });
    }
    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, error: "You already own this document" });
    }
    if (!document.sharedWith.some((sharedUserId) => String(sharedUserId) === user.id)) {
      document.sharedWith.push(user._id);
      await document.save();
    }
    await document.populate("sharedWith", "email");
    return res.json({ success: true, data: { document: serializeDocument(document) } });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id/share/:userId", async (req, res, next) => {
  try {
    const document = await findAccessible(req, res);
    if (!document) return undefined;
    if (!isOwner(document, req.user.id)) {
      return res.status(403).json({ success: false, error: "Only the owner can revoke sharing" });
    }
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ success: false, error: "Invalid user id" });
    }
    document.sharedWith = document.sharedWith.filter(
      (sharedUserId) => String(sharedUserId) !== req.params.userId,
    );
    await document.save();
    await document.populate("sharedWith", "email");
    return res.json({ success: true, data: { document: serializeDocument(document) } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
