// --- CẤU HÌNH ---

// 1. Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDOUCC56svyZ5pGZV7z160PW4Z8rJ01jdw",
  authDomain: "dnduc-drive.firebaseapp.com",
  databaseURL:
    "https://dnduc-drive-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dnduc-drive",
  storageBucket: "dnduc-drive.firebasestorage.app",
  messagingSenderId: "875885392954",
  appId: "1:875885392954:web:14fbd18df62155bf6b7103",
  measurementId: "G-455HFS41MH",
};

// =======================================================================
// 2. CẤU HÌNH BACKEND (ĐÃ SỬA LẠI CHÍNH XÁC)
// =======================================================================
// Tôi đã sửa đường dẫn này cho bạn. Đảm bảo chỉ có một đuôi .netlify.app
const API_URL = "https://dnduc.netlify.app/.netlify/functions/api";
// =======================================================================

// Khởi tạo Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- CHỨC NĂNG ---

// 1. Lấy danh sách file từ Drive
async function loadFiles() {
  const list = document.getElementById("fileList");
  if (!list) return;

  list.innerHTML = "Đang tải dữ liệu từ Netlify...";

  try {
    const res = await fetch(API_URL);

    if (!res.ok) {
      throw new Error(
        `Lỗi kết nối (${res.status}). Vui lòng kiểm tra Netlify Function.`
      );
    }

    const files = await res.json();

    list.innerHTML = "";
    if (!files || files.length === 0) {
      list.innerHTML = "Thư mục trống.";
      return;
    }

    files.forEach((file) => {
      const li = document.createElement("li");
      li.innerHTML = `
                <span>${file.name}</span>
                <div style="margin-left: auto;">
                    <a href="${file.webViewLink}" target="_blank" style="margin-right: 10px;">Mở</a>
                    <a href="${file.webContentLink}" target="_blank">Tải xuống</a>
                </div>
            `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = `<span style="color: red;">Lỗi: ${err.message}</span>`;
  }
}

// 2. Upload file
async function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  const status = document.getElementById("status");
  const btn = document.getElementById("uploadBtn");

  if (!file) {
    alert("Vui lòng chọn file trước!");
    return;
  }

  status.innerText = "Đang mã hóa file...";
  status.style.color = "blue";
  btn.disabled = true;

  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async () => {
    const base64Content = reader.result.split(",")[1];
    status.innerText = "Đang gửi sang Netlify (có thể mất vài giây)...";

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: file.name,
          type: file.type,
          content: base64Content,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        status.innerText = "Upload thành công!";
        status.style.color = "green";

        // --- LƯU VÀO DATABASE FIREBASE ---
        try {
          await db.collection("uploads").add({
            fileName: data.name,
            fileId: data.id,
            viewLink: data.webViewLink,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          });
        } catch (dbError) {
          console.error("Lỗi lưu DB:", dbError);
        }

        // Reset giao diện
        loadFiles();
        loadHistory();
        fileInput.value = "";
      } else {
        status.innerText =
          "Lỗi Server: " + (data.error || JSON.stringify(data));
        status.style.color = "red";
      }
    } catch (err) {
      status.innerText = "Lỗi kết nối: Không gọi được Netlify.";
      status.style.color = "red";
      console.error(err);
    }
    btn.disabled = false;
  };
}

// 3. Lấy lịch sử từ Firebase Database
function loadHistory() {
  const list = document.getElementById("dbHistory");
  if (!list) return;

  // Sử dụng onSnapshot để tự động cập nhật khi có dữ liệu mới
  db.collection("uploads")
    .orderBy("timestamp", "desc")
    .limit(10)
    .onSnapshot(
      (snapshot) => {
        list.innerHTML = "";
        snapshot.forEach((doc) => {
          const data = doc.data();
          const time = data.timestamp
            ? new Date(data.timestamp.toDate()).toLocaleString()
            : "Vừa xong";

          const li = document.createElement("li");
          li.innerHTML = `
            <div>
                <strong>${data.fileName}</strong><br>
                <small>${time}</small>
            </div>
            <a href="${data.viewLink}" target="_blank">Xem</a>
        `;
          list.appendChild(li);
        });
      },
      (error) => {
        console.error("Lỗi tải lịch sử:", error);
        list.innerHTML = "Không tải được lịch sử (Kiểm tra Firestore Rules).";
      }
    );
}

// Chạy khi mở web
document.addEventListener("DOMContentLoaded", () => {
  // Vì trong HTML bạn đã để onclick="uploadFile()" nên không cần addEventListener cho nút nữa
  // để tránh bị upload 2 lần.

  loadFiles();
  loadHistory();
});
