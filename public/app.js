// --- CẤU HÌNH ---
// 1. Thay thế bằng Firebase Config của bạn (Bước 4.1)
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};

// 2. Thay thế bằng URL của Netlify Function sau khi deploy (Xem hướng dẫn deploy bên dưới)
// Khi chạy local (nếu dùng netlify dev): http://localhost:8888/.netlify/functions/api
// Khi deploy: https://TÊN-SITE-NETLIFY.netlify.app/.netlify/functions/api
const API_URL = "https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/api";

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- CHỨC NĂNG ---

// 1. Lấy danh sách file từ Drive
async function loadFiles() {
  const list = document.getElementById("fileList");
  list.innerHTML = "Đang tải...";

  try {
    const res = await fetch(API_URL);
    const files = await res.json();

    list.innerHTML = "";
    files.forEach((file) => {
      const li = document.createElement("li");
      li.innerHTML = `
                <span>${file.name}</span>
                <div>
                    <a href="${file.webViewLink}" target="_blank">Mở</a>
                    <a href="${file.webContentLink}" target="_blank">Tải xuống</a>
                </div>
            `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = "Lỗi khi tải danh sách.";
  }
}

// 2. Upload file
async function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  const status = document.getElementById("status");
  const btn = document.getElementById("uploadBtn");

  if (!file) {
    alert("Vui lòng chọn file!");
    return;
  }

  status.innerText = "Đang xử lý...";
  btn.disabled = true;

  // Chuyển file sang Base64 để gửi qua JSON (Cách đơn giản nhất)
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async () => {
    const base64Content = reader.result.split(",")[1];

    try {
      // Gửi sang Netlify Function
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          name: file.name,
          type: file.type,
          content: base64Content,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        status.innerText = "Upload thành công!";

        // --- LƯU VÀO DATABASE FIREBASE ---
        await db.collection("uploads").add({
          fileName: data.name,
          fileId: data.id,
          viewLink: data.webViewLink,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // Làm mới danh sách
        loadFiles();
        loadHistory();
      } else {
        status.innerText = "Lỗi: " + JSON.stringify(data);
      }
    } catch (err) {
      status.innerText = "Lỗi kết nối.";
      console.error(err);
    }
    btn.disabled = false;
    fileInput.value = "";
  };
}

// 3. Lấy lịch sử từ Firebase Database
function loadHistory() {
  const list = document.getElementById("dbHistory");
  db.collection("uploads")
    .orderBy("timestamp", "desc")
    .limit(10)
    .onSnapshot((snapshot) => {
      list.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement("li");
        li.innerHTML = `Đã tải lên: ${data.fileName} <br> <small>${new Date(
          data.timestamp?.toDate()
        ).toLocaleString()}</small>`;
        list.appendChild(li);
      });
    });
}

// Chạy khi mở web
loadFiles();
loadHistory();
