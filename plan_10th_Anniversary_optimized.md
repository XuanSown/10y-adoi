---
project: "10th Anniversary - A Decade Of Inspiration"
document_type: "coding-plan"
version: "3.0"
status: "ready-for-development"
stack: "Next.js + TypeScript + Tailwind + shadcn/ui + Supabase + Vercel"
---

# CODING PLAN — WEBSITE BÌNH CHỌN REALTIME

Tài liệu này là nguồn yêu cầu chính để OpenCode triển khai và cập nhật tiến độ.

## 1. Quy tắc thực thi

1. Làm tuần tự theo phase và task ID.
2. Không tự mở rộng phạm vi.
3. Khi thiếu thông tin, đánh dấu `[!] BLOCKED` và hỏi lại.
4. Không hard-code secret hoặc service role key.
5. Vote phải được kiểm soát ở server/database, không dựa vào frontend.
6. Mọi thay đổi database phải có migration.
7. Chỉ đánh dấu `[x]` khi lint, typecheck, test liên quan và build đều đạt.
8. Sau mỗi phase, cập nhật mục **Progress Log** ở cuối file.

Trạng thái task:

- `[ ]` Chưa làm
- `[-]` Đang làm
- `[x]` Hoàn thành
- `[!]` Bị chặn

---

## 2. Yêu cầu đã chốt

### 2.1 Luồng truy cập

```text
/ → /login
/login + tên thường → /vote
/login + tên "SownAdmin1903" → /admin
/vote?display=true → chế độ trình chiếu, không cần đăng nhập
```

### 2.2 Người tham dự

- Nhập tên từ 2–50 ký tự; cho phép trùng tên.
- Session được lưu trên thiết bị; không có nút đăng xuất.
- Mỗi session chỉ được vote một lần.
- Bấm thẻ thí sinh → mở modal xác nhận → gửi vote.
- Sau khi vote: không được đổi hoặc vote lại; vẫn xem kết quả realtime.
- Người chưa vote và đã vote đều xem được số vote.

### 2.3 Màn hình vote

- Đúng 5 thí sinh.
- Cả 5 thẻ phải nằm trong cùng viewport điện thoại, bố cục `2–2–1`.
- Mỗi thẻ gồm: ảnh, tên, số vote, nút/trạng thái bình chọn.
- Ảnh đầu vào có thể khác tỷ lệ; hiển thị crop về `16:9` bằng `object-fit: cover`.
- Chế độ `display=true` dùng cùng giao diện nhưng ẩn toàn bộ thao tác vote.

### 2.4 Admin

- Đăng nhập bằng tên đặc biệt `SownAdmin1903`, không mật khẩu.
- Xem tổng người đăng nhập, đã vote, chưa vote, tỷ lệ hoàn thành.
- Xem số vote của 5 thí sinh.
- Xem danh sách tên và trạng thái đã/chưa vote; không xem họ chọn ai.
- Bắt đầu vote bằng số phút hoặc thời điểm cụ thể.
- Bắt đầu bằng countdown `3–2–1`.
- Khóa, mở lại, công bố kết quả.
- Reset vote hoặc reset toàn bộ sự kiện.
- Thao tác quan trọng phải có modal xác nhận; reset yêu cầu nhập cụm xác nhận.

### 2.5 Trạng thái sự kiện

```text
DRAFT → COUNTDOWN → VOTING → LOCKED → RESULT
                       ↑        ↓
                       └─ REOPEN
```

- Hết thời gian phải tự từ chối vote ở database/server.
- Khi hết giờ: chuyển `LOCKED`, chờ admin công bố kết quả.
- Nếu hòa điểm: đồng hạng.

### 2.6 Realtime và tải

- Mục tiêu khoảng 300 người.
- Supabase Realtime là cơ chế chính.
- Khi mất realtime: reconnect, lấy snapshot mới nhất, rồi fallback polling.
- Rate limit ban đầu:
  - Login: `5 request/phút/session`, `100 request/phút/IP`.
  - Vote: `3 request/10 giây/session`, `100 request/phút/IP`.
- Database constraint mới là lớp đảm bảo một session chỉ vote một lần.

### 2.7 Hạ tầng

- Frontend: Next.js App Router + TypeScript strict.
- UI: Tailwind CSS + shadcn/ui.
- Database/realtime: Supabase Free.
- Deploy: Vercel Free kết nối GitHub.
- Ảnh và logo đặt trong `public/images`.
- Một sự kiện duy nhất; chỉ tiếng Việt.

> Rủi ro được chấp nhận: đăng nhập chỉ bằng tên không thể ngăn tuyệt đối một người dùng nhiều thiết bị hoặc trình duyệt ẩn danh.

---

## 3. Kiến trúc tối thiểu

```text
Browser
  ├─ /login
  ├─ /vote
  ├─ /vote?display=true
  └─ /admin
       ↓
Next.js Route Handlers / Server Actions
       ↓
Supabase PostgreSQL + Realtime
```

### Nguyên tắc dữ liệu

- Frontend không tự tăng `vote_count`.
- `POST /api/vote` gọi RPC/transaction nguyên tử.
- Realtime chỉ cập nhật UI; snapshot API dùng để đối soát.
- Admin endpoint luôn kiểm tra admin session ở server.

---

## 4. Database schema tối thiểu

### `events`

```text
id uuid pk
name text
status enum(draft,countdown,voting,locked,result)
open_at timestamptz null
end_at timestamptz null
version integer default 1
created_at timestamptz
updated_at timestamptz
```

### `candidates`

```text
id uuid pk
event_id uuid fk
name text
image_path text
display_order integer check 1..5
vote_count integer default 0 check >= 0
created_at timestamptz
unique(event_id, display_order)
```

### `voters`

```text
id uuid pk
event_id uuid fk
display_name text
session_token_hash text unique
has_voted boolean default false
voted_at timestamptz null
event_version integer
created_at timestamptz
```

### `votes`

```text
id uuid pk
event_id uuid fk
voter_id uuid fk
candidate_id uuid fk
idempotency_key uuid
created_at timestamptz
unique(event_id, voter_id)
unique(event_id, idempotency_key)
```

### `admin_audit_logs`

```text
id uuid pk
action text
metadata jsonb
created_at timestamptz
```

### Database bắt buộc

- RLS bật cho toàn bộ bảng.
- Client không được ghi trực tiếp vào `votes`, `candidates.vote_count` hoặc `events.status`.
- RPC vote phải:
  1. Khóa/kiểm tra event.
  2. Kiểm tra session và `event_version`.
  3. Kiểm tra thời gian/trạng thái.
  4. Insert vote.
  5. Tăng `vote_count`.
  6. Đặt `has_voted = true`.
  7. Commit trong một transaction.

---

## 5. API tối thiểu

| Method | Route | Mục đích |
|---|---|---|
| `POST` | `/api/login` | Tạo voter/admin session |
| `GET` | `/api/session` | Lấy trạng thái session hiện tại |
| `GET` | `/api/snapshot` | Event + 5 candidates + trạng thái voter |
| `POST` | `/api/vote` | Vote nguyên tử |
| `GET` | `/api/admin/dashboard` | Dữ liệu admin |
| `POST` | `/api/admin/start` | Bắt đầu countdown/voting |
| `POST` | `/api/admin/lock` | Khóa vote |
| `POST` | `/api/admin/reopen` | Mở lại |
| `POST` | `/api/admin/reveal` | Công bố kết quả |
| `POST` | `/api/admin/reset-votes` | Reset vote |
| `POST` | `/api/admin/reset-event` | Reset toàn bộ |

Mã lỗi chuẩn:

```text
INVALID_INPUT
UNAUTHORIZED
SESSION_EXPIRED
ALREADY_VOTED
VOTING_NOT_OPEN
VOTING_CLOSED
RATE_LIMITED
CONFLICT
INTERNAL_ERROR
```

---

# 6. PHASES VÀ TASKS

## Phase 0 — Foundation

- [ ] **P0-T01** Kiểm tra repo, Node.js, package manager và branch hiện tại.
- [ ] **P0-T02** Xác nhận Next.js App Router, TypeScript strict và Tailwind.
- [ ] **P0-T03** Chuẩn hóa scripts: `dev`, `lint`, `typecheck`, `test`, `build`.
- [ ] **P0-T04** Tạo `.env.example` và cấu trúc thư mục cơ bản.
- [ ] **P0-T05** Chạy baseline install/lint/typecheck/build.

**Done:** Project chạy local và build thành công.

## Phase 1 — Database & Supabase

- [ ] **P1-T01** Tạo schema/migration cho `events`, `candidates`, `voters`, `votes`, `admin_audit_logs`.
- [ ] **P1-T02** Thêm constraint, index và RLS.
- [ ] **P1-T03** Seed một event và đúng 5 thí sinh.
- [ ] **P1-T04** Tạo RPC vote nguyên tử.
- [ ] **P1-T05** Tạo RPC/admin function cho start, lock, reopen, reveal và reset.
- [ ] **P1-T06** Kiểm tra reset database từ đầu bằng migration + seed.

**Done:** Database dựng lại được; vote trùng bị chặn ở DB.

## Phase 2 — Auth đơn giản & Session

- [ ] **P2-T01** Tạo `/login` và validate tên 2–50 ký tự.
- [ ] **P2-T02** Tạo voter session với token ngẫu nhiên; chỉ lưu hash trong DB.
- [ ] **P2-T03** Lưu cookie `HttpOnly`, `Secure`, `SameSite=Lax` ở production.
- [ ] **P2-T04** Tự chuyển session voter hợp lệ sang `/vote`.
- [ ] **P2-T05** Nếu tên đúng `ADMIN_TRIGGER_NAME`, tạo admin session và chuyển `/admin`.
- [ ] **P2-T06** Guard `/admin` và toàn bộ admin API ở server.
- [ ] **P2-T07** Áp dụng rate limit login.

**Done:** Refresh vẫn giữ phiên; voter/admin được điều hướng đúng.

## Phase 3 — Snapshot & Vote API

- [ ] **P3-T01** Tạo `/api/snapshot`.
- [ ] **P3-T02** Tạo `/api/vote` gọi RPC nguyên tử.
- [ ] **P3-T03** Hỗ trợ `idempotency_key`.
- [ ] **P3-T04** Chuẩn hóa response và mã lỗi.
- [ ] **P3-T05** Áp dụng rate limit vote.
- [ ] **P3-T06** Test double-click và request đồng thời cùng session.
- [ ] **P3-T07** Test đối soát `SUM(vote_count) == COUNT(votes)`.

**Done:** Một session chỉ ghi đúng một vote và không lệch bộ đếm.

## Phase 4 — Vote UI & Display Mode

- [ ] **P4-T01** Tạo `CandidateCard`.
- [ ] **P4-T02** Hiển thị 5 card theo bố cục mobile `2–2–1` trong một viewport.
- [ ] **P4-T03** Crop ảnh 16:9 và xử lý lỗi ảnh.
- [ ] **P4-T04** Bấm card mở modal xác nhận.
- [ ] **P4-T05** Gửi vote, khóa nút trong lúc request.
- [ ] **P4-T06** Sau vote, đánh dấu lựa chọn và khóa toàn bộ card.
- [ ] **P4-T07** Tạo `display=true`: không cần login, ẩn thao tác vote, tối ưu HDMI 16:9.
- [ ] **P4-T08** Thêm loading, error, empty và session-expired states.

**Done:** Vote hoàn chỉnh trên điện thoại; display mode không thể gửi vote.

## Phase 5 — Realtime & Resilience

- [ ] **P5-T01** Subscribe Realtime cho `candidates` và `events`.
- [ ] **P5-T02** Cập nhật số vote/trạng thái không cần F5.
- [ ] **P5-T03** Hiển thị trạng thái kết nối.
- [ ] **P5-T04** Reconnect với backoff + jitter.
- [ ] **P5-T05** Sau reconnect gọi snapshot.
- [ ] **P5-T06** Fallback polling khi realtime lỗi.
- [ ] **P5-T07** Test mất mạng, reconnect và polling fallback.

**Done:** Mất realtime không làm dữ liệu sai hoặc đứng lâu.

## Phase 6 — Admin Dashboard

- [ ] **P6-T01** Hiển thị thống kê người đăng nhập/đã vote/chưa vote.
- [ ] **P6-T02** Hiển thị 5 thí sinh, số vote và thời gian còn lại.
- [ ] **P6-T03** Hiển thị danh sách tên và trạng thái vote.
- [ ] **P6-T04** Bắt đầu bằng số phút hoặc thời gian tuyệt đối.
- [ ] **P6-T05** Đồng bộ countdown 3–2–1 theo server time.
- [ ] **P6-T06** Tự khóa khi hết giờ.
- [ ] **P6-T07** Khóa, mở lại và công bố kết quả.
- [ ] **P6-T08** Reset vote và reset toàn bộ.
- [ ] **P6-T09** Modal xác nhận; reset yêu cầu nhập cụm xác nhận.
- [ ] **P6-T10** Ghi audit log cho action admin.

**Done:** Admin điều khiển đúng state machine và các client cập nhật realtime.

## Phase 7 — Hardening

- [ ] **P7-T01** Kiểm tra RLS và key exposure.
- [ ] **P7-T02** Validate/sanitize toàn bộ input server-side.
- [ ] **P7-T03** Thêm CSRF protection cho request thay đổi dữ liệu.
- [ ] **P7-T04** Thêm security headers/CSP phù hợp.
- [ ] **P7-T05** Log lỗi có request ID, không log token/secret.
- [ ] **P7-T06** Kiểm tra dependency vulnerabilities nghiêm trọng.

**Done:** Không lộ secret; endpoint nhạy cảm đều được guard.

## Phase 8 — Test & Deploy

- [ ] **P8-T01** Unit test validation, countdown, state transition và error mapping.
- [ ] **P8-T02** Integration test login, vote, lock, reopen, reveal và reset.
- [ ] **P8-T03** E2E mobile vote flow.
- [ ] **P8-T04** E2E display mode và admin flow.
- [ ] **P8-T05** Load test 300 client mở trang.
- [ ] **P8-T06** Burst test 150–300 vote trong 10 giây.
- [ ] **P8-T07** Test mất/reconnect hàng loạt.
- [ ] **P8-T08** Deploy Vercel Preview từ GitHub và smoke test.
- [ ] **P8-T09** Cấu hình env production và deploy production.
- [ ] **P8-T10** Kiểm tra trên điện thoại thật và laptop HDMI.
- [ ] **P8-T11** Tạo runbook ngày sự kiện.

**Done:** Production smoke test PASS và có báo cáo load test.

---

## 7. Biến môi trường

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_TRIGGER_NAME=
SESSION_SIGNING_SECRET=
RATE_LIMIT_SALT=
```

Không expose các biến không có prefix `NEXT_PUBLIC_` cho client.

---

## 8. Cấu trúc thư mục đề xuất

```text
app/
  login/page.tsx
  vote/page.tsx
  admin/page.tsx
  api/
components/
  candidate-card.tsx
  vote-confirm-dialog.tsx
  connection-banner.tsx
lib/
  supabase/
  auth/
  rate-limit/
  validation/
  errors/
supabase/
  migrations/
  seed.sql
public/images/
  branding/
  candidates/
tests/
```

---

## 9. Tiêu chí nghiệm thu cuối

- [ ] Vào `/` được chuyển đến `/login` khi chưa có session.
- [ ] Tên thường vào `/vote`; tên admin vào `/admin`.
- [ ] Hiển thị đúng 5 thí sinh trong một viewport điện thoại mục tiêu.
- [ ] Mỗi session chỉ vote được một lần.
- [ ] Modal xác nhận xuất hiện trước khi ghi vote.
- [ ] Kết quả cập nhật tự động không cần F5.
- [ ] `display=true` không thể gửi vote.
- [ ] Hết giờ tự khóa ở server/database.
- [ ] Lock, reopen, reveal và reset hoạt động đúng.
- [ ] Tổng `vote_count` luôn khớp số bản ghi vote.
- [ ] Load test và burst test có kết quả chấp nhận được.
- [ ] Vercel production hoạt động với Supabase production.

---

## 10. Progress Log

OpenCode cập nhật sau mỗi phase theo mẫu:

```md
### Phase X — DONE | PARTIAL | BLOCKED
- Tasks: X/Y
- Files changed:
  - `path`
- Migration:
  - `path`
- Checks:
  - lint: PASS/FAIL
  - typecheck: PASS/FAIL
  - test: PASS/FAIL
  - build: PASS/FAIL
- Issues:
  - ...
- Next task: P?-T??
```
