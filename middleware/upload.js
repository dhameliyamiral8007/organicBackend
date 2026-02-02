import express from "express";
import fs from "fs";

const ensureUploadsDir = (req, res, next) => {
  const uploadsDir = "uploads";
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  next();
};

export default ensureUploadsDir;
