---
description: Tự động làm hết task trong 1 file
---

## Cách dùng

Nói: `/do-tasks file=module1.md` hoặc `/do-tasks file=backend.md tasks_dir=/workspace/projects/project-a/tasks`

## Quy trình

1. Gọi MCP tool `get_next_task` với param `file` (và `tasks_dir` nếu có) để lấy task pending tiếp theo.

2. Đọc lại rules

3. Đọc kỹ **Steps** và **Notes** của task trước khi bắt đầu.

4. Thực hiện task theo **đúng thứ tự Steps** đã liệt kê. Tuân thủ mọi yêu cầu trong **Notes**.

5. Sau khi hoàn thành tất cả Steps, gọi MCP tool `complete_task` với `file` và `task_number` tương ứng.

6. tạo git commit với message ngắn gọn.

7. Cập nhật AGENTS.md nếu cần

8. Nếu `complete_task` trả về task tiếp theo → **tự động tiếp tục** từ bước 2.

9. Nếu không còn task pending → báo cho user biết đã hoàn thành tất cả task.

## Lưu ý quan trọng

- **KHÔNG được bỏ qua** bất kỳ Step hay Note nào.
- Nếu gặp lỗi hoặc không chắc chắn → **dừng lại và hỏi user** thay vì đoán.
- Nếu task quá lớn và context sắp hết → hoàn thành task hiện tại, gọi `complete_task`, rồi **dừng lại** và thông báo cho user mở conversation mới để tiếp tục.
