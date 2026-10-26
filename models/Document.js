const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: { type: "doc", content: [{ type: "paragraph" }] },
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

documentSchema.index({ sharedWith: 1 });

module.exports = mongoose.model("Document", documentSchema);
