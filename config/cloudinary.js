import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dwucsrtny",
  api_key: process.env.CLOUDINARY_API_KEY || "334431934949167",
  api_secret: process.env.CLOUDINARY_API_SECRET || "wU-MCrFuLOZjcK0S3N1xmyyLagc",
});

export const uploadImage = async (filePath, folder = "products") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto",
      quality: "auto",
      fetch_format: "auto",
    });
    return result;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image to Cloudinary");
  }
};

export const uploadMultipleImages = async (files, folder = "products") => {
  try {
    const uploadPromises = files.map((file) => uploadImage(file, folder));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Cloudinary multiple upload error:", error);
    throw new Error("Failed to upload images to Cloudinary");
  }
};

export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error("Failed to delete image from Cloudinary");
  }
};

export const getOptimizedUrl = (publicId, options = {}) => {
  const defaultOptions = {
    fetch_format: "auto",
    quality: "auto",
    secure: true,
  };
  
  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

export const getTransformedUrl = (publicId, width, height, options = {}) => {
  const defaultOptions = {
    width,
    height,
    crop: "fill",
    gravity: "auto",
    fetch_format: "auto",
    quality: "auto",
    secure: true,
  };
  
  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

export default cloudinary;
