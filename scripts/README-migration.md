# Hướng dẫn di trú dữ liệu & liên kết file NAS

Tài liệu này mô tả cách chạy các script di trú dữ liệu QA/QC từ Excel/NAS vào hệ thống `ibshi-qaqc`.

> **Lưu ý chung**
> - Mọi script đều nạp biến môi trường qua `--env-file=.env` (giống `scripts/seed.js`, `scripts/migrate.js`).
> - Kết nối DB lấy từ `src/core/db.js` (biến `DATABASE_URL` trong `.env`).
> - Thư viện đọc Excel/CSV: `xlsx` (đã cài trong `package.json`).
> - Khi thiếu file hoặc thiếu tham số, script chạy **DRY-RUN** (chỉ in, không ghi DB).

## 0. Chạy migration tạo bảng

Trước khi chạy script liên kết file, cần migrate để tạo bảng `sys_file_links` (và `sys_signatures`, `sys_user_pins` cho chữ ký số):

```bash
npm run db:migrate
```

Các migration liên quan:
- `src/modules/system/migrations/sys_020_signatures.sql` — bảng chữ ký số (append-only).
- `src/modules/system/migrations/sys_021_file_links.sql` — bảng `sys_file_links`.

## 1. Di trú dự án từ Excel — `migrate-nas-projects.js`

Đọc file **"Project - Procedures status.xlsx"** và upsert vào bảng `qaqc_projects` (theo cột `code`).

```bash
# Ghi dữ liệu thật
node --env-file=.env scripts/migrate-nas-projects.js "/duong/dan/Project - Procedures status.xlsx"

# Chỉ xem trước, không ghi DB
node --env-file=.env scripts/migrate-nas-projects.js "/duong/dan/file.xlsx" --dry-run

# Không truyền đường dẫn → tự động DRY-RUN + in hướng dẫn
node --env-file=.env scripts/migrate-nas-projects.js
```

**Ánh xạ cột** (chấp nhận nhiều biến thể tiêu đề tiếng Anh/Việt):
- `code` ← Code / Project Code / Mã dự án / Job No
- `name` ← Name / Project Name / Tên dự án
- `customer` ← Customer / Client / Khách hàng
- `status` ← Status / Trạng thái (mặc định `ACTIVE`)

Nếu file thực tế dùng tên cột khác, chỉnh trong hằng `COLUMN_ALIASES` của script.

## 2. Nhập bản ghi QA/QC — `import-qaqc-records.js`

Khung (skeleton) nhập chỉ mục **NCR / Inspection / MDR** từ Excel/CSV. Mặc định **DRY-RUN**; phần ghi DB để trống có chủ đích vì lược đồ NCR/MDR do các module mới định nghĩa.

```bash
# Xem trước dữ liệu đã ánh xạ
node --env-file=.env scripts/import-qaqc-records.js ncr "/duong/dan/ncr-index.xlsx"
node --env-file=.env scripts/import-qaqc-records.js inspection "/duong/dan/insp.csv"
node --env-file=.env scripts/import-qaqc-records.js mdr "/duong/dan/mdr-index.xlsx"

# Bật ghi DB (chỉ dùng khi đã hoàn thiện phần INSERT trong script)
node --env-file=.env scripts/import-qaqc-records.js ncr "file.xlsx" --commit
```

Mỗi loại có một hàm ánh xạ riêng (`mapNCR`, `mapInspection`, `mapMDR`). Tìm các chú thích `TODO(mapping)` trong file để biết nơi cần điền cột DB.

## 3. Liên kết file NAS — `link-nas-files.js`

Lưu **metadata + đường dẫn** tới file PDF/DOC trên NAS vào bảng `sys_file_links`. **Không di chuyển/sao chép file.**

```bash
# Liên kết 1 file
node --env-file=.env scripts/link-nas-files.js \
  --entity-type project --entity-id <id> \
  --nas-path "\\\\NAS\\QAQC\\IBS-2024-001\\procedure.pdf" \
  --file-name "procedure.pdf"

# Liên kết hàng loạt từ Excel/CSV
# (cột: entity_type, entity_id, file_name, nas_path, mime_type)
node --env-file=.env scripts/link-nas-files.js --file "links.xlsx"

# Thiếu tham số → DRY-RUN + in hướng dẫn
node --env-file=.env scripts/link-nas-files.js
```

`mime_type` sẽ tự suy ra từ phần mở rộng file nếu không truyền vào.

---

### Thứ tự khuyến nghị

1. `npm run db:migrate` (tạo bảng).
2. `migrate-nas-projects.js` (nạp dự án — vì các bản ghi khác tham chiếu tới dự án).
3. `import-qaqc-records.js` (nạp NCR/Inspection/MDR — sau khi hoàn thiện mapping).
4. `link-nas-files.js` (gắn file NAS vào bản ghi đã có).
