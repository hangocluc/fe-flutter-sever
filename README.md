# flutter-server

Backend API & admin panel cho app học Flutter.

*** Cần cài nodejs ***

## Cách chạy server

1. Clone project
2. `npm install`
3. Copy `.env.example` thành `.env` và chỉnh `MONGODB_URI` (Mongo local hoặc Atlas)
4. Đặt file Firebase service account (xem mục FCM bên dưới)
5. `npm run start` hoặc `npm run start:dev`
6. Mở trình duyệt: `http://localhost:3001` (port mặc định trong `.env`)

### Firebase Cloud Messaging (BE)

Project Firebase hiện tại: **`applea-e4729`** (phải trùng với app Flutter).

1. [Firebase Console](https://console.firebase.google.com) → **applea-e4729** → **Project settings** → **Service accounts** → **Generate new private key**
2. Lưu file `applea-e4729-firebase-adminsdk-....json` vào thư mục gốc repo (hoặc set `FIREBASE_SERVICE_ACCOUNT_PATH` trong `.env`)
3. Set `FIREBASE_PROJECT_ID=applea-e4729` trong `.env` (đã có trong `.env.example`)
4. Xóa file service account project cũ (`applearnjava-...`) nếu không dùng nữa
5. Chạy server — log: `Firebase Admin initialized (project: applea-e4729)`

> Config `apiKey` / `appId` trên Flutter **khác** với BE: app dùng config client, server dùng **Service Account JSON**.

**Luồng với app mobile**

- App gọi `POST /api/insert-user` với `gmail` + `tokenDevice` (FCM token) → lưu MongoDB
- App subscribe topic `all` nếu dùng broadcast
- Gửi 1 user: `POST /api/send-notifi-by-gmail` body JSON: `{ "gmail", "title", "body" }`
- Hoặc: `POST /api/send-notifi-with-user` với `{ "gmail", "title", "body" }` hoặc `{ "token", "title", "body" }`
- Gửi tất cả (topic): trang admin `/notification` → form sendAll
- **Nhắc học tự động:** cấu hình `STUDY_REMINDER_TIMES` trong `.env` (vd. `08:00,20:00`, timezone `Asia/Ho_Chi_Minh`)

## API mẫu

- `GET /api/get-all-in-lesson` — danh sách lesson kèm quiz, topic
- `GET /api/get-topic?lessonId=` — topic theo lesson
- `GET /api/get-lesson` — toàn bộ lesson
- `GET /api/get-quiz?lessonId=` — quiz theo lesson
