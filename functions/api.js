// functions/api.js
const { google } = require("googleapis");

exports.handler = async (event, context) => {
  // 1. Cấu hình CORS (Để Frontend gọi được)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // Xử lý request thăm dò (Preflight)
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // 2. Lấy và Xử lý biến môi trường
    const clientEmail = process.env.CLIENT_EMAIL;
    const folderId = process.env.DRIVE_FOLDER_ID;
    let privateKey = process.env.PRIVATE_KEY;

    if (!clientEmail || !folderId || !privateKey) {
      throw new Error("Thiếu biến môi trường trên Netlify.");
    }

    // Xử lý Private Key để đảm bảo đúng định dạng
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, "\n");

    // 3. Khởi tạo Xác thực (QUAN TRỌNG NHẤT)
    const auth = new google.auth.JWT(clientEmail, null, privateKey, [
      "https://www.googleapis.com/auth/drive",
    ]);

    // --- FIX LỖI "Unregistered callers" ---
    // Bắt buộc code phải đợi xác thực xong mới được đi tiếp
    await auth.authorize();

    // Gán auth vào cấu hình toàn cục để chắc chắn mọi request đều mang theo thẻ ID
    google.options({ auth });

    const drive = google.drive({ version: "v3" });

    // --- CHỨC NĂNG 1: LẤY DANH SÁCH FILE (GET) ---
    if (event.httpMethod === "GET") {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "files(id, name, webViewLink, webContentLink, mimeType)",
        pageSize: 20, // Giới hạn 20 file cho nhanh
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data.files),
      };
    }

    // --- CHỨC NĂNG 2: UPLOAD FILE (POST) ---
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body);

      // Chuyển đổi dữ liệu file
      const fileContent = Buffer.from(data.content, "base64");
      const { Readable } = require("stream");
      const stream = Readable.from(fileContent);

      const fileMetadata = {
        name: data.name,
        parents: [folderId],
      };

      const media = {
        mimeType: data.type,
        body: stream,
      };

      const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id, name, webViewLink, webContentLink",
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(file.data),
      };
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };
  } catch (error) {
    console.error("LỖI BACKEND:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Lỗi Server (500)",
        details: error.message, // Trả về chi tiết lỗi để dễ debug
      }),
    };
  }
};
