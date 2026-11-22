import crypto from "crypto";
import axios from "axios";

export const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (
    !cloudName ||
    !apiKey ||
    !apiSecret ||
    cloudName === "your_cloudinary_cloud_name" ||
    apiKey === "your_cloudinary_api_key" ||
    apiSecret === "your_cloudinary_api_secret"
  ) {
    return false;
  }
  return true;
};

/**
 * Uploads an image (Base64 data URI or URL) to Cloudinary.
 * Uses Cloudinary's signed REST API with SHA-1 hashing.
 */
export const uploadToCloudinary = async (fileDataUri, options = {}) => {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary credentials are not configured. Please set valid CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env",
    );
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET.trim();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options.folder || "primer_avatars";

  // Cloudinary signature generation:
  // Sort parameters alphabetically, join with '=', '&', append apiSecret, then SHA-1
  const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto
    .createHash("sha1")
    .update(stringToSign)
    .digest("hex");

  const formData = {
    file: fileDataUri,
    api_key: apiKey,
    timestamp,
    folder,
    signature,
  };

  try {
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        maxContentLength: 10 * 1024 * 1024, // 10MB
        maxBodyLength: 10 * 1024 * 1024,
      },
    );

    return {
      success: true,
      url: response.data.secure_url,
      publicId: response.data.public_id,
      format: response.data.format,
      width: response.data.width,
      height: response.data.height,
    };
  } catch (error) {
    const errorMsg =
      error.response?.data?.error?.message ||
      error.message ||
      "Cloudinary upload failed";
    console.error("Cloudinary upload error:", errorMsg);
    throw new Error(errorMsg);
  }
};
