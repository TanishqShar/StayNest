require('dotenv').config();
const cloudinary = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "StayNest",
        allowed_formats: ["png", "jpg", "jpeg"], // ✅ fixed here
    }
});
console.log("Cloudinary setup:", {
  name: process.env.CLOUD_NAME,
  key: process.env.CLOUD_API_KEY,
  secret: process.env.CLOUD_API_SECRET ? "✅ loaded" : "❌ missing",
});
module.exports = {
    cloudinary,
    storage,
};
