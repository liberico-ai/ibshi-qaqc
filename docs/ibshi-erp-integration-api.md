# IBS ERP ↔ QAQC Platform – Integration API Contract

**Version:** 1.0  
**Date:** 2026-04-20  
**Author:** QAQC Platform Team  
**Status:** Ready for ibshi ERP team review

---

## Tổng quan

QAQC Platform (Port 8767) tích hợp với IBS ERP theo nguyên tắc **Light Integration**:  
- QAQC **gọi vào** ERP để xác thực người dùng và lấy dữ liệu tham chiếu (read-only).  
- QAQC **gọi ra** ERP qua webhook khi trạng thái chất lượng thay đổi.  
- ERP **không gọi vào** QAQC trực tiếp; không chia sẻ DB.

Có 8 điểm tích hợp (INT-01 → INT-08). Tài liệu này mô tả **INT-01, INT-02, INT-03, INT-05** cần ERP team implement trước Phase 1.

---

## A. Endpoints ERP cần expose (QAQC gọi vào)

Base URL: `https://erp.ibs.vn` (Production) / `https://erp-staging.ibs.vn` (Staging)

### A.1 INT-01 – SSO: Exchange Token

QAQC dùng endpoint này để chuyển đổi ERP JWT thành QAQC session sau khi người dùng đăng nhập ERP.

**`POST /api/v1/auth/exchange`**

Request:
```json
{
  "erp_token": "<JWT từ IBS ERP>"
}
```

Response `200 OK`:
```json
{
  "user": {
    "id": "uuid",
    "username": "tran.van.dung",
    "full_name": "Trần Văn Dũng",
    "email": "dung@ibs.vn",
    "erp_roles": ["R09"],
    "is_active": true
  },
  "token_valid_until": "2026-04-20T18:00:00Z"
}
```

Response `401 Unauthorized`:
```json
{ "error": "invalid_token", "message": "ERP token expired or invalid" }
```

Response `403 Forbidden`:
```json
{ "error": "user_inactive", "message": "User account is disabled" }
```

**Auth:** Request không cần Bearer token. ERP validate chữ ký JWT nội bộ.  
**Rate limit:** 100 req/min per IP.

---

### A.2 INT-01 – SSO: Get User Profile

QAQC gọi khi cần refresh thông tin user (nightly sync hoặc on-demand).

**`GET /api/v1/auth/me`**

Request Header:
```
Authorization: Bearer <erp_jwt>
```

Response `200 OK`:
```json
{
  "id": "uuid",
  "username": "tran.van.dung",
  "full_name": "Trần Văn Dũng",
  "email": "dung@ibs.vn",
  "erp_roles": ["R09"],
  "department": "QA/QC",
  "is_active": true,
  "last_updated": "2026-04-18T08:00:00Z"
}
```

---

### A.3 INT-01 – SSO: List Users (Nightly Sync)

QAQC gọi nightly để đồng bộ danh sách user mới và thay đổi role.

**`GET /api/v1/users`**

Query params:
| Param | Type | Mô tả |
|-------|------|-------|
| `cursor` | string | Cursor-based pagination token |
| `limit` | int | Số bản ghi trả về (default 100, max 500) |
| `role` | string | Filter theo ERP role code (R05, R06, R09...) |
| `updated_since` | ISO8601 | Chỉ lấy user thay đổi sau thời điểm này |

Request Header:
```
Authorization: Bearer <service_account_jwt>
X-QAQC-Service-Key: <shared_secret>
```

Response `200 OK`:
```json
{
  "data": [
    {
      "id": "uuid",
      "username": "nguyen.van.a",
      "full_name": "Nguyễn Văn A",
      "email": "a@ibs.vn",
      "erp_roles": ["R09", "R06"],
      "is_active": true,
      "updated_at": "2026-04-19T10:00:00Z"
    }
  ],
  "cursor": "eyJpZCI6Ii4uLiJ9",
  "has_more": true,
  "total": 87
}
```

**Auth:** Service account JWT + shared secret header (không phải user JWT).

---

### A.4 INT-02 – File Attachment: Get Signed URL

QAQC gọi để lấy signed URL đọc file (PO PDF, attachment) từ ERP object storage.

**`GET /api/v1/files/:file_id/signed-url`**

Request Header:
```
Authorization: Bearer <user_jwt hoặc service_jwt>
```

Response `200 OK`:
```json
{
  "url": "https://storage.ibs.vn/erp-files/po/PO0123.pdf?X-Signature=...&Expires=1714000000",
  "expires_at": "2026-04-20T12:10:00Z",
  "file_name": "PO0123.pdf",
  "content_type": "application/pdf",
  "size_bytes": 245120
}
```

Response `404 Not Found`:
```json
{ "error": "file_not_found", "file_id": "abc123" }
```

**Lưu ý:** URL có hiệu lực 10 phút. QAQC sẽ clone file vào storage riêng khi dùng làm evidence.

---

### A.5 INT-03 – Project Snapshot

QAQC gọi nightly để đồng bộ danh sách dự án.

**`GET /api/v1/projects`**

Query params:
| Param | Type | Mô tả |
|-------|------|-------|
| `cursor` | string | Pagination token |
| `limit` | int | Default 50, max 200 |
| `status` | string | `active` \| `closed` \| `all` |
| `updated_since` | ISO8601 | Incremental sync |

Request Header:
```
Authorization: Bearer <service_jwt>
X-QAQC-Service-Key: <shared_secret>
```

Response `200 OK`:
```json
{
  "data": [
    {
      "id": "erp-proj-uuid",
      "code": "IP080",
      "name": "Whyalla Project – Braden/GE Vernova",
      "customer": "Braden Energy",
      "status": "active",
      "start_date": "2026-01-15",
      "product_type": "duct",
      "updated_at": "2026-04-18T00:00:00Z"
    }
  ],
  "cursor": "eyJpZCI6Ii4uLiJ9",
  "has_more": false,
  "total": 14
}
```

---

## B. Webhook endpoint ERP cần implement (QAQC gọi ra)

QAQC gửi HTTP POST tới ERP khi trạng thái chất lượng thay đổi. ERP tự xử lý theo nghiệp vụ của mình.

**`POST /api/v1/qaqc/webhook`**

### B.1 Request format

Headers:
```
Content-Type: application/json
X-QAQC-Signature: <HMAC-SHA256 của raw body với shared secret>
X-Event-Id: <UUID v4 duy nhất cho mỗi event>
X-Event-Type: <tên event>
X-QAQC-Source: qaqc-platform
```

Body (Event Envelope chuẩn):
```json
{
  "event_type": "mir.decided",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-20T09:30:00Z",
  "source": "qaqc",
  "version": "v1",
  "payload": { ... }
}
```

### B.2 Response yêu cầu

ERP phải trả về `200 OK` (hoặc `202 Accepted`) khi đã nhận event. Nội dung body không quan trọng.

QAQC retry khi nhận `5xx` hoặc timeout. Retry policy:
| Lần | Delay |
|-----|-------|
| 1 | 30 giây |
| 2 | 2 phút |
| 3 | 10 phút |
| 4 | 30 phút |
| 5 | 2 giờ |

Sau 5 lần thất bại: event vào dead-letter queue, cảnh báo OpsGenie/Telegram.

**Idempotency:** ERP dedupe theo `event_id` (UUID). Cùng `event_id` nhận 2 lần → bỏ qua lần 2.

### B.3 Danh sách events

#### `mir.decided` – MIR đã có quyết định ACCEPT/CONDITIONAL/REJECT

Payload:
```json
{
  "mir_id": "uuid",
  "project_code": "IP080",
  "po_lines": ["PO0123-L1", "PO0123-L2"],
  "decision": "ACCEPT",
  "decided_by": "nguyen.qc.manager",
  "decided_at": "2026-04-20T09:30:00Z",
  "waiver_note": null
}
```
Mục đích ERP: cập nhật flag quarantine/stock, ghi audit.

---

#### `mir.rejected` – MIR bị REJECT

Payload:
```json
{
  "mir_id": "uuid",
  "project_code": "IP080",
  "po_lines": ["PO0123-L1"],
  "reject_reason": "Chemical composition Fe < standard minimum",
  "related_ncr_id": "uuid-or-null",
  "rejected_by": "nguyen.qc.manager",
  "rejected_at": "2026-04-20T09:45:00Z"
}
```
Mục đích ERP: khoá PO line, trigger NCR phía ERP nếu cần.

---

#### `ncr.critical.created` – NCR Critical mới phát sinh

Payload:
```json
{
  "ncr_id": "uuid",
  "project_code": "IP080",
  "severity": "critical",
  "title": "Weld crack found at unit 3B – IP04",
  "ip_code": "IP04",
  "created_by": "tran.qc.inspector",
  "created_at": "2026-04-20T11:00:00Z"
}
```
Mục đích ERP: hiển thị banner cảnh báo trên PM dashboard.

---

#### `ncr.closed` – NCR đã đóng

Payload:
```json
{
  "ncr_id": "uuid",
  "project_code": "IP080",
  "closed_by": "toan.qc.director",
  "closed_at": "2026-04-25T16:00:00Z"
}
```

---

#### `mdr.signed` – MDR đã ký và hoàn tất

Payload:
```json
{
  "project_code": "IP080",
  "mdr_version": "v2.0",
  "signed_by": "toan.qc.director",
  "signed_at": "2026-05-10T14:00:00Z",
  "download_url": "https://qaqc.ibs.vn/api/qaqc/mdr/uuid/download"
}
```

---

#### `hold.opened` – Hold Point được kích hoạt

Payload:
```json
{
  "project_code": "IP080",
  "ip_code": "IP04",
  "unit_id": "UNIT-3B",
  "hold_reason": "Awaiting customer witness – Braden",
  "opened_by": "tran.qc.inspector",
  "opened_at": "2026-04-20T13:00:00Z"
}
```
Mục đích ERP: thông báo PM/Production để điều phối tiến độ.

---

#### `hold.closed` – Hold Point được giải phóng

Payload:
```json
{
  "project_code": "IP080",
  "ip_code": "IP04",
  "unit_id": "UNIT-3B",
  "closed_by": "toan.qc.director",
  "closed_at": "2026-04-21T09:00:00Z"
}
```

---

## C. SSO Flow

```
User                   IBS ERP                 QAQC Platform
 │                        │                         │
 │── Login (user/pass) ──►│                         │
 │◄── ERP JWT ────────────│                         │
 │                        │                         │
 │── Open qaqc.ibs.vn ────────────────────────────►│
 │                        │                         │
 │                        │◄─ POST /auth/exchange ──│  (gửi erp_jwt)
 │                        │── user profile + valid ►│
 │                        │                         │
 │                        │                    QAQC tạo session
 │◄── QAQC Session JWT ───────────────────────────│
 │                        │                         │
 │ (Dùng QAQC bình thường)│                         │
```

**JWT Claims của ERP token cần chứa:**
```json
{
  "sub": "<user_id>",
  "username": "tran.van.dung",
  "erp_roles": ["R09"],
  "exp": 1714000000,
  "iss": "ibs-erp"
}
```

**Fallback khi ERP down:** QAQC cache JWT hợp lệ tối đa 8 giờ. Sau 8 giờ, yêu cầu đăng nhập lại qua ERP.

---

## D. Authentication cho Service Calls

Các API QAQC gọi vào ERP (nightly sync, file URL) dùng **Service Account JWT**:

1. ERP cấp 1 service account JWT có scope `qaqc-service` cho QAQC Platform.
2. JWT có thời hạn 24 giờ, QAQC tự refresh.
3. Header bổ sung: `X-QAQC-Service-Key: <shared_secret>` để phòng JWT bị leak.

Shared secret được trao đổi ngoài băng tần (out-of-band) và lưu trong `sys_providers.config` (encrypted).

---

## E. Xác thực Webhook (HMAC-SHA256)

QAQC ký mỗi request webhook:

```
signature = HMAC-SHA256(shared_secret, raw_request_body)
header: X-QAQC-Signature: sha256=<hex_signature>
```

ERP **phải verify** signature trước khi xử lý:
```js
// Node.js example
const crypto = require('crypto')
const expected = 'sha256=' + crypto
  .createHmac('sha256', SHARED_SECRET)
  .update(rawBody)
  .digest('hex')
if (req.headers['x-qaqc-signature'] !== expected) {
  return res.status(401).json({ error: 'invalid_signature' })
}
```

---

## F. Error Codes

| Code | HTTP | Mô tả |
|------|------|-------|
| `invalid_token` | 401 | ERP JWT không hợp lệ hoặc hết hạn |
| `user_inactive` | 403 | Tài khoản bị vô hiệu hoá |
| `file_not_found` | 404 | File ID không tồn tại trong ERP storage |
| `project_not_found` | 404 | Project code không tồn tại |
| `rate_limit_exceeded` | 429 | Vượt giới hạn request |
| `service_unavailable` | 503 | ERP đang bảo trì |

---

## G. SLA & Môi trường

| Endpoint | SLA Phase 1 |
|----------|-------------|
| `POST /auth/exchange` | P95 < 500ms; uptime 99.5% giờ hành chính |
| `GET /auth/me` | P95 < 300ms |
| `GET /users` | P95 < 2s |
| `GET /projects` | P95 < 2s |
| `GET /files/:id/signed-url` | P95 < 1s |
| Webhook receiver | Nhận và trả 200 trong P95 < 1s |

**Môi trường:**
- Production: `https://erp.ibs.vn`
- Staging: `https://erp-staging.ibs.vn`
- QAQC sẽ dùng staging để test trước khi go-live.

---

## H. Mock Server (cho ERP team test QAQC)

Khi QAQC team chưa deploy lên staging, ERP team có thể dùng mock server để test webhook receiver.

QAQC cung cấp file `docs/qaqc-mock-server.json` (Postman Collection) bao gồm:
- Tất cả event examples với payload đầy đủ
- HMAC signature pre-computed cho `secret = "test-secret"`
- Sequence test: MIR full flow (EXPECTED → INSTOCK + webhook events)

---

*Mọi thay đổi API contract phải đi qua Change Request, đánh phiên bản (v1.1, v1.2...) và notify cả 2 team trước 2 sprint.*
