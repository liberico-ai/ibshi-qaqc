## Chung chung

- Ngôn ngữ giao diện là tiếng Việt.
- Không dùng nodemon, dùng node --watch
- Khi cần migrate database, viết file sql và chạy: npm run db:migrate
- tất cả các bảng phải có created_at và updated_at, updated_by
- các bảng trong database cần được prefix theo module.
- cột thời gian trong database luôn là timestamptz trừ khi có lý do đặc biệt
- Viết git commit message ngắn gọn
- Khi cần test API thì viết unit test
- Trước khi làm một task, hãy kiểm tra lại code base để tái sử dụng các thành phần trước đó nếu có thể.
- Tất cả các script test phải để trong thư mục test
- Sau khi xong mỗi task thì test lại API và syntax code

## Task Management

- Khi gọi MCP tool task-manager, luôn truyền tasks_dir = {project_root}/docs
- {project_root} là thư mục gốc của dự án đang mở trong IDE
- Chỉ dùng tasks_dir khác khi user chỉ định rõ
