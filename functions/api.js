// functions/api.js
const { google } = require("googleapis");

exports.handler = async (event, context) => {
  // 1. Cấu hình CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // 2. Lấy và XỬ LÝ LỖI ĐỊNH DẠNG BIẾN MÔI TRƯỜNG
    // Đây là nguyên nhân chính gây lỗi 500
    const clientEmail = process.env.CLIENT_EMAIL;
    const folderId = process.env.DRIVE_FOLDER_ID;
    let privateKey = process.env.PRIVATE_KEY;

    if (!clientEmail || !folderId || !privateKey) {
      throw new Error(
        "Thiếu biến môi trường trên Netlify (CLIENT_EMAIL, DRIVE_FOLDER_ID hoặc PRIVATE_KEY)."
      );
    }

    // Xử lý Private Key: Nếu copy từ file JSON, nó thường bị bao bởi dấu ngoặc kép hoặc lỗi xuống dòng
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1); // Bỏ dấu ngoặc kép thừa
    }
    // Thay thế ký tự xuống dòng bị mã hóa (\\n) thành xuống dòng thật (\n)
    privateKey = privateKey.replace(/\\n/g, "\n");

    // 3. Kết nối Google Drive
    const auth = new google.auth.JWT(clientEmail, null, privateKey, [
      "https://www.googleapis.com/auth/drive",
    ]);
    const drive = google.drive({ version: "v3", auth });

    // --- CHỨC NĂNG: LẤY DANH SÁCH FILE ---
    if (event.httpMethod === "GET") {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "files(id, name, webViewLink, webContentLink, mimeType)",
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data.files),
      };
    }

    // --- CHỨC NĂNG: UPLOAD FILE ---
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body);

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
    console.error("LỖI BACKEND:", error); // Dòng này sẽ hiện trong log của Netlify
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Lỗi Server Internal (500)",
        details: error.message,
      }),
    };
  }
};
