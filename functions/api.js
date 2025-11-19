const { google } = require('googleapis');
// const multiparty = require('multiparty'); // Netlify function xử lý body khác node thường một chút

exports.handler = async (event, context) => {
  // 1. Cấu hình CORS (Để trang web gọi được function này)
  const headers = {
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Xử lý request thăm dò (Preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 2. Lấy thông tin bảo mật từ Biến môi trường (Sẽ cài trên Netlify)
    // Tuyệt đối không để file JSON key trong code public
    const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    const clientEmail = process.env.CLIENT_EMAIL;
    const folderId = process.env.DRIVE_FOLDER_ID;

    if (!privateKey || !clientEmail || !folderId) {
      throw new Error("Thiếu biến môi trường (Env Vars)");
    }

    // 3. Kết nối Google Drive
    const auth = new google.auth.JWT(
      clientEmail,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/drive']
    );
    const drive = google.drive({ version: 'v3', auth });

    // --- CHỨC NĂNG: LẤY DANH SÁCH FILE ---
    if (event.httpMethod === 'GET') {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, webViewLink, webContentLink, mimeType)',
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data.files),
      };
    }

    // --- CHỨC NĂNG: UPLOAD FILE ---
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body); // Nhận dữ liệu JSON từ Frontend
      
      // Chuyển Base64 thành Stream để upload
      const fileContent = Buffer.from(data.content, 'base64');
      const { Readable } = require('stream');
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
        fields: 'id, name, webViewLink, webContentLink',
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(file.data),
      };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };

  } catch (error) {
    console.error("Lỗi:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};