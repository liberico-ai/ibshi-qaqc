---
description: Tạo thêm một module mới
---

## Cách dùng

Nói `/make-module ten-module`

## Quy trình

1. Đọc lại `.agent/rules.md` để nắm các quy tắc chung.

2. Nghiên cứu tài liệu về module này trong thư mục `docs`.
   Nếu không có → hỏi user để tạo file tài liệu trước.

3. Xác nhận với user các thông tin sau (nếu chưa rõ):
   - Tên module (lowercase)
   - DB table prefix (3-4 ký tự viết tắt, ví dụ: `sys`, `inv`, `hr`)
   - Các entity/resource chính cần CRUD

4. Tạo cấu trúc thư mục:
   ```
   src/modules/{module_name}/
   ├── backend/
   │   ├── index.js
   │   ├── actions.js
   │   ├── routes.js
   │   └── controllers/
   ├── frontend/
   │   ├── index.js
   │   └── {Module}BaseView.vue
   └── migrations/
   ```

5. Tạo migration SQL (`migrations/001_xxx.sql`):
   - Tên bảng luôn prefix theo module (ví dụ: `inv_products`)
   - Bắt buộc có: `id SERIAL PRIMARY KEY`
   - Bắt buộc có audit fields: `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`,
     `created_by INT`, `updated_by INT`
   // turbo
   - Chạy `npm run db:migrate`

6. Làm backend theo thứ tự:
   - `actions.js`: đăng ký permissions vào `actionRegistry`
     (format: `{resource}.read`, `{resource}.write`, module: `{module_name}`)
   - `controllers/`: tạo Controller dùng `Repository` từ `core/db.js`
   - `routes.js`: đăng ký routes `/api/{module_name}/...` với `requireAction` middleware
   - `index.js`: export default function gọi registerActions + registerRoutes

7. Test các API bằng unit test.

8. Làm frontend:
   - `index.js`: đăng ký Vue Router routes (parent path: `/{module_name}`)
   - `{Module}BaseView.vue`: layout wrapper với breadcrumb + `<router-view>`
   - Các `*View.vue`: theo cấu trúc và thư viện UI của module `system`
   - Phải làm đủ các chức năng không được để mockup.

9. Kiểm tra:
   - Server log: `[Backend Loader] Loaded module: {module_name}`
   - API hoạt động đúng (chạy unit test)
   - Frontend navigation hoạt động

10. Tạo git commit với message ngắn gọn.

## Lưu ý quan trọng

- **KHÔNG sửa** `backend-loader.js` hay `frontend-loader.js` — chúng tự động scan `src/modules/*/`.
- Tên file migration phải **unique trên toàn project** (sort theo filename).
- Kiểm tra code base trước khi code — tái sử dụng composables, utils nếu có.
- Nếu gặp lỗi hoặc không chắc chắn → **dừng lại và hỏi user**.