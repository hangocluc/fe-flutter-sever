# Biểu đồ tuần tự UML — Flutter Server

Bộ file PlantUML phục vụ **báo cáo / luận văn**, bám sát mã nguồn trong `src/`.

## Cấu trúc thư mục

```
docs/uml/
├── _style.puml              # Skinparam sequence diagram
├── all-diagrams.puml        # Gộp sequence + use case (preview / export batch)
├── README.md
├── erd/
│   ├── _erd-style.puml      # Style bảng xám (giống mẫu luận văn)
│   └── database-erd.puml    # Lược đồ CSDL quan hệ
├── usecase/
│   ├── _usecase-style.puml      # Style use case đen trắng
│   ├── _feature-layout.puml     # Layout actor trái — đăng nhập phải
│   ├── system-use-case.puml     # Tổng quan 2 actor
│   └── features/
│       ├── all-features.puml    # Gộp tất cả use case theo tính năng
│       ├── admin/               # 7 use case Quản trị viên
│       └── hoc-vien/            # 12 use case Học viên
└── sequence/
    ├── 01-server-bootstrap.puml
    ├── 02-mobile-register-user.puml
    ├── ...
    └── 19-admin-feedback-reply.puml
```

## Style (đen trắng — giống mẫu luận văn)

File `_style.puml` cấu hình:

- **Đen trắng** (`monochrome`), nền trắng, không bo góc
- **Font Arial** 11pt
- **Icon UML** (`strictuml`): Actor, Boundary (Giao diện hệ thống), Control (Hệ thống xử lý), Entity (CSDL)
- Hệ thống ngoài (FCM, email): ô chữ nhật `participant` (như Cổng thanh toán trong mẫu)
- **Cỡ chữ đồng bộ:** mọi nhãn / title / message dùng **14pt bold** trong `_style.puml` (sửa `defaultFontSize` và các `FontSize 14` cùng lúc nếu đổi cỡ)
- **Actor:** icon stickman mặc định
- Message: `autonumber`, mũi tên nét đứt cho phản hồi (`-->`)
- Nhánh điều kiện: `alt [Điều kiện]` / `else [Điều kiện khác]`

Mở `sequence/06-mobile-update-learning-process.puml` để xem diagram mẫu đã rút gọn message tiếng Việt.

## Lược đồ CSDL quan hệ (ERD)

Giống mẫu cinema/luận văn: **header xám, icon khóa PK vàng, đường ortho + crow's foot**.

- **1 — N:** `||--o{` (một — nhiều), `||--o|` (một — không hoặc một, ví dụ `lessons` → `quizzes`).
- **M — N:** qua bảng trung gian **`processes`** (users ↔ lessons), giống `movie_genre` trong mẫu cinema — hai nhánh `||--o{` vào `processes`.

| File | Mô tả | Cần Graphviz? |
|------|--------|----------------|
| [`erd/database-erd.puml`](erd/database-erd.puml) | Đầy đủ bảng + quan hệ (PlantUML) | **Có** |
| [`erd/database-erd.mmd`](erd/database-erd.mmd) | Cùng nội dung (Mermaid) | **Không** — khuyên dùng nếu lỗi `dot` |
| [`erd/database-erd-relations.puml`](erd/database-erd-relations.puml) | Chỉ tên bảng + đường nối | **Có** |

**10 bảng:** users, lessons, topics, quizzes, questions, programs, program_details, processes, qas, chats — bám `src/app/model/*Model.js`.

### Cách 1 — Mermaid (không cần cài Graphviz)

1. Mở [`database-erd.mmd`](erd/database-erd.mmd)
2. Copy nội dung → [mermaid.live](https://mermaid.live) → Export PNG/SVG  
   hoặc cài extension **Markdown Preview Mermaid Support** trong Cursor.

### Cách 2 — PlantUML (giống ảnh mẫu nhất)

1. Cài Graphviz:
   ```bash
   brew install graphviz
   ```
2. Mở `database-erd.puml` → PlantUML Preview (`Alt+D`).

Nếu vẫn báo `/opt/local/bin/dot`: **Settings → PlantUML: Graphviz Dot** → đặt đường dẫn `dot` (sau brew thường là `/opt/homebrew/bin/dot` hoặc `/usr/local/bin/dot`).

### Quan hệ chính

**M-N (bảng trung gian):**

- `users` ↔ `lessons` qua **`processes`** (tiến độ học: completed, status, quizMarked…)

**1-N:**

- `lessons` → topics, quizzes (0..1), questions, qas, processes  
- `users` → processes, qas, chats  
- `quizzes` → questions, chats  
- `programs` → program_details  
- `questions` → qas, chats  

(Một số FK kiểu `String` tham chiếu logic `_id` — MongoDB NoSQL.)

## Cách import / render

### PlantUML extension (VS Code / Cursor)

1. Cài extension **PlantUML** (jebbs.plantuml).
2. Mở file `.puml` trong `sequence/`.
3. `Alt+D` (hoặc lệnh *PlantUML: Preview Current Diagram*).

### PlantUML Online

1. Mở https://www.plantuml.com/plantuml/uml/
2. Copy nội dung một file `.puml` (đã gồm `!include` — cần upload cả `_style.puml` hoặc paste cả hai).
3. Hoặc dùng file `all-diagrams.puml` từ thư mục gốc `docs/uml/`.

### draw.io (diagrams.net)

1. **Arrange → Insert → Advanced → PlantUML…**
2. Dán nội dung file (một diagram mỗi lần; file `all-diagrams.puml` tách từng `@startuml` nếu cần).

### IntelliJ / StarUML / Visual Paradigm

- Import as PlantUML source; giữ nguyên cấu trúc thư mục để `!include` resolve đúng.

### Export PNG/SVG (CLI)

```bash
cd docs/uml
plantuml -tsvg sequence/*.puml
plantuml -tpng sequence/*.puml
```

(Cần cài [PlantUML](https://plantuml.com/) + Java.)

## Sơ đồ Use Case

### 1. Tổng quan

[`usecase/system-use-case.puml`](usecase/system-use-case.puml) — 2 actor, danh sách use case trong khung hệ thống (mẫu luận văn chương 1).

### 2. Theo từng tính năng (mẫu *Quản lý lịch chiếu*)

**Khuyên dùng file `.drawio`** — layout cố định, mũi tên thẳng, giống mẫu luận văn.

| Cách mở | Thao tác |
|---------|----------|
| **draw.io / diagrams.net** | Mở `features/admin/ad-04-quan-ly-chuong-trinh.drawio` (kéo thả vào [diagrams.net](https://app.diagrams.net)) |
| **VS Code / Cursor** | Cài extension **Draw.io Integration** → mở file `.drawio` |
| **PlantUML** | File `.puml` cùng tên — **tự bố cục kém**, chỉ dùng khi bắt buộc |

Tạo lại toàn bộ `.drawio`:

```bash
python3 docs/uml/usecase/features/generate-drawio.py
```

Bố cục: Actor → Use case chính → chức năng con (cột dọc) → Đăng nhập; `<<extend>>` / `<<include>>` như mẫu.

| File | Tính năng |
|------|-----------|
| `features/admin/ad-01-dang-nhap.puml` | Đăng nhập (Admin) |
| `features/admin/ad-02-dang-xuat.puml` | Đăng xuất (Admin) |
| `features/admin/ad-03-quan-ly-chu-de.puml` | Thêm, sửa, xoá chủ đề |
| `features/admin/ad-04-quan-ly-chuong-trinh.puml` | Thêm, sửa, xoá chương trình |
| `features/admin/ad-05-thong-ke.puml` | Thống kê |
| `features/admin/ad-06-quan-ly-user.puml` | Quản lý user |
| `features/admin/ad-07-thong-bao.puml` | Thông báo |
| `features/hoc-vien/hv-01-dang-nhap.puml` | Đăng nhập (Học viên) |
| `features/hoc-vien/hv-02-dang-xuat.puml` | Đăng xuất (Học viên) |
| `features/hoc-vien/hv-03-chu-de.puml` | Chủ đề |
| `features/hoc-vien/hv-04-chi-tiet-chu-de.puml` | Chi tiết chủ đề |
| `features/hoc-vien/hv-05-hoc-bai.puml` | Học bài |
| `features/hoc-vien/hv-06-lam-quiz.puml` | Làm quiz |
| `features/hoc-vien/hv-07-thao-luan.puml` | Thảo luận |
| `features/hoc-vien/hv-08-thong-tin-ca-nhan.puml` | Thông tin cá nhân |
| `features/hoc-vien/hv-09-bao-cao-cau-hoi.puml` | Báo cáo câu hỏi |
| `features/hoc-vien/hv-10-hien-thi-ket-qua.puml` | Hiển thị kết quả |
| `features/hoc-vien/hv-11-thong-ke.puml` | Thống kê |
| `features/hoc-vien/hv-12-xep-hang.puml` | Xếp hạng |

**Ví dụ có extend** (`ad-03-quan-ly-chu-de.puml`): Import / Cập nhật / Xóa `<<extend>>` Quản lý chủ đề, mỗi nhánh `<<include>>` Đăng nhập — giống mẫu *Quản lý lịch chiếu*.

**Ví dụ đơn giản** (`hv-08-thong-tin-ca-nhan.puml`): Học viên → Thông tin cá nhân `<<include>>` Đăng nhập.

Mở từng file trong `features/` → `Alt+D`. Gộp batch: `features/all-features.puml`.

## Danh mục diagram

| File | Use case | Actor chính |
|------|----------|-------------|
| 01 | Khởi động server | Hệ thống |
| 02 | Đăng ký / cập nhật user + FCM token | Flutter App |
| 03 | Đăng nhập API | Flutter App |
| 04 | Lấy nội dung bài học (lesson/topic/quiz) | Flutter App |
| 05 | Lấy chương trình học | Flutter App |
| 06 | Cập nhật tiến độ học | Flutter App |
| 07 | Cập nhật điểm / xếp hạng | Flutter App |
| 08 | Gửi feedback bài học / hệ thống | Flutter App |
| 09 | Bình luận REST | Flutter App |
| 10 | Chat realtime (Socket.io) | Flutter App |
| 11 | Like bình luận realtime | Flutter App |
| 12 | Push notification theo token/gmail | Flutter App / Admin |
| 13 | Nhắc học định kỳ (Cron + FCM) | Cron Scheduler |
| 14 | Đăng nhập Admin Web | Admin |
| 20 | Đăng xuất Admin Web | Admin |
| 15 | Import bài học từ Excel | Admin |
| 16 | Import chương trình từ Excel | Admin |
| 17 | Duyệt Q&A pending | Admin |
| 18 | Gửi thông báo toàn hệ thống (topic) | Admin |
| 19 | Phản hồi feedback (email + FCM) | Admin |

**Đăng xuất:** không có `POST /logout` — navbar link tới `/` hoặc `login.html` (xem `20-admin-logout.puml`).

## Ghi chú luận văn

- **Lifeline** `<<boundary>>` / `<<control>>` / `<<entity>>` tuân theo phân lớp 3 lớp đơn giản.
- Số thứ tự message: `autonumber` trong từng diagram.
- Nhánh `alt` / `opt` / `loop` phản ánh đúng `if/else` trong Controller.
- Endpoint HTTP ghi trong `note` để liên kết với thiết kế API.
