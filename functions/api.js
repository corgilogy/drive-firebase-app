// functions/api.js
const { google } = require("googleapis");

// ============================================================
// VÙNG CHỈNH SỬA - HÃY DÁN TRỰC TIẾP THÔNG TIN CỦA BẠN VÀO ĐÂY
// ============================================================

// 1. Email của Robot (trong file json)
const CLIENT_EMAIL =
  "uploader-bot@web-app-drive-478705.iam.gserviceaccount.com";

// 2. ID thư mục Google Drive (ID lấy trên thanh địa chỉ)
const FOLDER_ID = "1i__DIWWEX7HYemtyZ5wqwaYcYfnW50a3";

// 3. Khóa bí mật (Copy nguyên văn trong file json, dùng dấu huyền ` ở đầu và cuối)
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCKuXiG+hLIKHRR\nkzi5IJg7hHS4NpdV/bVnpdVJ67YWLodUtsCTJvqf+j6OI/zwz1IIVAop4/18rYpJ\nNmcAzvXJ+PLkBm1PZ+nmn3p9dvxfub79ayP1YDlSe8SGEFMM/QbMO2dA0hOrBypN\nn3zv1bxQM8Lp1E85XxZyxdC9IWl9T15v9boL0N8uS99gHIzGOIOORlCixRsciDoc\nWFmDMYVhn2PKKWbPXB/v0qiHxOl9NsEKKV6US7mPiAi6+Co+XXJUnzscqNetR4dU\ng+OVf4Fi7VktjqEvzmh6EunEqX/ioXvlt2EbGq8vmowXrtg5MCxwrNNjikd6faYK\n+SNceCkdAgMBAAECggEAAnQLPJ/Ziy6j9/lZjHSWHJ9YDRXyETQ+bAnTvs3rV3MV\nM5tTxoZu8jtTteHPDFcuRTVvRJRinDzZcDgFFE+UqzC64ut2LWxSB6EUYnmjNvIq\n/YJSjXlZKitEK3bIcTdcUmpOhifw7xpeVicW54rpHKX9sXLuv739wKPc8CtSGUQy\nZZOe+DqotYLzap0ZSugTQW0bH50YT36XTtRRhu/hqi14YA5EJMr/NnjsUIzuJtLo\n0IKFe5tfIZnrI9GatMqjL07BOIcoKegEaBcBw7klb4wL6GAprWhb43xJ8r6qU/oT\nVaarLW7v3L7h0+Drr+8CwW+zWdPzpL/X9lgqSd1vxQKBgQDArKxV4OCZrg5jQG7m\n+ULnJoMtkONNxbXhrY156Om9KKo8P0Ihkt99BTIBe6mb73tLCEJq3BfG2DqO35bB\nSUO0/bpKwHfCw4adjsgGb0hqDEsLqgBSDqsi776JVGDXUlFr9yl2ZaJMujSR3crb\nuGEkqqFqx3x8Tm04BrmButebqwKBgQC4UYePDTOnUCnXqg5p8OGyKWTrsN4QW0LR\nKUw6/ZYPxkqDUAHz8HkZ3gHjBaWjwEzhQzVdtrBchgkPc2cJcyWsH3d8jngNY6Ow\nGVsmioOzkYCg6c7LW+JEeGYsFSVNMsqU9kjRuhVdcs3ipRKwHF//D38yYJH/JRv6\nrPkH5GTGVwKBgBXUOl4scSXYK3chOK9gdCz+FwSVkrsf+EBOSmYSdlDhB5B11kc5\nfaqLaSPz375z/nL8x5GVx/fWTaQcPtc9NreNu4p2jdr6DglRwOXBu+GP7PywUQL6\n+Han1N14OtSKVgE2anMohp/MxOH1z+Le29qsnkcbvMXUmNktId1Jzt2rAoGANslF\nGeg6qkjRpyENF8BZ1bMoJEZ2OzZlLfawifhGWnn+O/nUGsYnuOCcfvZ2va2zLGHl\nwu1Cjr3og4cx4UUwtXDE+2j9lj0/smBXD6Wsb/uX2DynExtErkV7WS8P31pxjMWH\n7474OsadG/klDOPiRNY+YKMDwmstXd18SDRDIBECgYAjyfqsVc340lA+saraO3P+\nz5X1oMT1wAFpmsRJZiLaoTTTIcY5JMalvFrIMkS96y5bn3e2Xt+JPWDdXNAv2REo\npXg0awTvRXIYeI1z3e+We4BiGHcDGJHvgGZB6MiS+eMPIGy2rKkPx0UYi8utxkpJ\nlt+zjbwh33LNVf+zyrWRKw==\n-----END PRIVATE KEY-----\n`;

// ============================================================

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    console.log("Đang kết nối Google Drive..."); // Dòng này để xem log

    const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
      "https://www.googleapis.com/auth/drive",
    ]);

    // Xác thực
    await auth.authorize();
    google.options({ auth });

    const drive = google.drive({ version: "v3" });

    // --- GET: LẤY DANH SÁCH ---
    if (event.httpMethod === "GET") {
      const response = await drive.files.list({
        q: `'${FOLDER_ID}' in parents and trashed = false`,
        fields: "files(id, name, webViewLink, webContentLink, mimeType)",
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data.files),
      };
    }

    // --- POST: UPLOAD ---
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body);
      const buffer = Buffer.from(data.content, "base64");
      const { Readable } = require("stream");
      const stream = Readable.from(buffer);

      const file = await drive.files.create({
        resource: { name: data.name, parents: [FOLDER_ID] },
        media: { mimeType: data.type, body: stream },
        fields: "id, name, webViewLink",
      });

      return { statusCode: 200, headers, body: JSON.stringify(file.data) };
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };
  } catch (error) {
    console.error("LỖI CHI TIẾT:", error); // Xem kỹ dòng này trong Log
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Lỗi Server (500)",
        message: error.message, // Hiện lỗi ra màn hình cho dễ đọc
        stack: error.stack, // Hiện vị trí lỗi
      }),
    };
  }
};
