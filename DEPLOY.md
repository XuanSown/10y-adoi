# Hướng dẫn Deploy

## Bước 1: Tạo Supabase Project

1. Truy cập [supabase.com](https://supabase.com) và tạo tài khoản Free
2. Tạo project mới, chọn region Singapore (gần Việt Nam nhất)
3. Lưu lại:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Anon Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)

## Bước 2: Chạy Migration

1. Vào Supabase Dashboard → SQL Editor
2. Copy nội dung từng file migration theo thứ tự:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls.sql`
   - `supabase/migrations/003_rpc_vote.sql`
   - `supabase/migrations/004_rpc_admin.sql`
3. Chạy seed data: `supabase/seed.sql`
4. Bật Realtime: vào Database → Replication → Bật cho tables `candidates` và `events`

## Bước 3: Cấu hình Environment

Cập nhật `.env.local` với giá trị thật:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_TRIGGER_NAME=SownAdmin1903
SESSION_SIGNING_SECRET=<random-32-char-string>
RATE_LIMIT_SALT=<random-16-char-string>
```

## Bước 4: Deploy Vercel

1. Push code lên GitHub
2. Truy cập [vercel.com](https://vercel.com) → Import Project
3. Chọn repo GitHub
4. Thêm Environment Variables (giống `.env.local`)
5. Deploy

## Bước 5: Kiểm tra

- Mở `https://your-app.vercel.app`
- Đăng nhập bằng tên bất ki → vào trang vote
- Đăng nhập bằng `SownAdmin1903` → vào admin
- Mở `?display=true` trên màn hình projector/HDMI

## Runbook Ngày Sự Kiện

1. **Trước sự kiện**: Login admin → Reset votes (nếu cần)
2. **Bắt đầu**: Nhấn "Bắt đầu vote" → chọn thời gian
3. **Trong lúc vote**: Theo dõi số vote realtime
4. **Kết thúc**: Nhấn "Khóa vote" → "Công bố kết quả"
5. **Reset**: Dùng "Reset votes" hoặc "Reset toàn bộ" để sự kiện tiếp theo
