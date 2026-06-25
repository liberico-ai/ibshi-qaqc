# Nạp dữ liệu Tiêu chuẩn (Standards Knowledge Base)

Tài liệu này hướng dẫn nạp dữ liệu **tiêu chuẩn vật liệu / vật tư hàn** vào các bảng
có cấu trúc của module QA/QC:

- `qaqc_standards` — danh mục tiêu chuẩn (UNIQUE theo `code`)
- `qaqc_chemical_specs` — thành phần hoá học theo grade (C, Mn, P, S, Si, CEV…)
- `qaqc_mechanical_specs` — cơ tính theo grade (Yield, Tensile, Elongation, Impact…)
- `qaqc_standard_requirements` — yêu cầu dạng văn bản (tuỳ chọn)

> Yêu cầu trước: đã chạy migrate để có bảng (`npm run db:migrate`) và có file `.env`
> chứa `DATABASE_URL`.

---

## 1) Seed bộ "starter" (nhanh, không cần file)

Nạp một bộ tiêu chuẩn **thật, nhỏ, đại diện** để Knowledge Base không rỗng:

```bash
npm run db:seed-standards
# hoặc: node --env-file=.env scripts/seed-standards.js
```

Bộ starter gồm:

- **ASTM A36** — thép kết cấu carbon (grade A36)
- **ASTM A516-70** — thép tấm bình áp lực (grade 70)
- **AWS D1.1** — vật tư hàn: **E7018** (que hàn SMAW) và **ER70S-6** (dây hàn GMAW)

Script **idempotent**: UPSERT theo `code`, xoá–chèn lại chemical/mechanical theo
`(standard_id, grade)`, chạy nhiều lần không nhân bản.

---

## 2) Import từ file xlsx (bộ dữ liệu đầy đủ)

```bash
# Có file:
npm run db:import-standards -- IBS_HI_Standards_Knowledge_Base_Phase1.xlsx
# hoặc: node --env-file=.env scripts/import-standards-data.js <đường_dẫn.xlsx>

# Không có file → DRY-RUN (chỉ in mapping, KHÔNG ghi DB):
npm run db:import-standards
```

### Chế độ DRY-RUN

Nếu **không truyền đường dẫn** hoặc **file không tồn tại**, script chỉ in ra
mapping cột → bảng dự kiến rồi **thoát với mã 0**, hoàn toàn không động vào DB.
Dùng để kiểm tra cấu hình trước khi chạy thật.

### Mapping cột → bảng

| Sheet xlsx     | Bảng đích                     | Cột chính                                                        |
|----------------|-------------------------------|-----------------------------------------------------------------|
| `Standards`    | `qaqc_standards`              | code, title, grp, tier, version, issued_date, status, full_text |
| `Chemical`     | `qaqc_chemical_specs`         | standard_code→standard_id, grade, element, min_val, max_val, unit |
| `Mechanical`   | `qaqc_mechanical_specs`       | standard_code→standard_id, grade, property, min_val, max_val, unit |
| `Requirements` | `qaqc_standard_requirements`  | standard_code→standard_id, req_type, property, condition, notes |

- `min_val` / `max_val` được tách tự động từ chuỗi như `≤0.26`, `≥0.10`,
  `0.15-0.40`, `400 to 550`, hoặc giá trị đơn `250` (coi là ngưỡng tối thiểu).
- Tên sheet / tên cột được dò theo nhiều **alias** (không phân biệt hoa thường /
  khoảng trắng). Các điểm cần đối chiếu với header thật được đánh dấu
  `TODO(map)` trong `scripts/import-standards-data.js`.

Script **idempotent**: `qaqc_standards` UPSERT theo `code`; chemical/mechanical
xoá theo `(standard_id, grade)` rồi insert lại; requirements xoá theo
`standard_id` rồi insert lại.

---

## 3) Bộ dữ liệu đầy đủ (Phase 1)

Bộ dữ liệu đầy đủ — **39 grades / 242 dòng chemical / 181 dòng mechanical limits**
— **chưa kèm trong repo**. Cần lấy bản export thật từ **Supabase** hoặc file
**`IBS_HI_Standards_Knowledge_Base_Phase1.xlsx`** rồi chạy lệnh ở mục (2).

Trước khi import bản đầy đủ lần đầu, hãy:

1. Mở file xlsx, đối chiếu **tên sheet** và **header cột** với các `TODO(map)`
   trong `scripts/import-standards-data.js`; chỉnh `SHEET_NAMES` / `COLS` nếu khác.
2. Chạy DRY-RUN để xác nhận mapping.
3. Chạy import thật.

> Lưu ý: script import nạp vào các bảng **có cấu trúc** (`qaqc_chemical_specs` /
> `qaqc_mechanical_specs`). Bảng tra cứu nhanh dạng JSONB (`qaqc_std_lookup`) do
> script riêng `scripts/import-standards-lookup.js` phụ trách — hai nguồn độc lập.
