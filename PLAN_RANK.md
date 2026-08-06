# Plan: Trang `/rank` — Horizontal Bar Chart

## Mục tiêu
Tạo trang `/rank` hiển thị biểu đồ thanh ngang so sánh số vote của 5 thí sinh. Ai cũng xem được, không cần đăng nhập.

## Files

### Tạo mới
- `app/rank/page.tsx`

### Không cần sửa file khác
- Dùng sẵn API `/api/snapshot` để lấy data

## Thiết kế

### Layout
```
┌─────────────────────────────────────┐
│  Header: Tên sự kiện (.fx-focus)    │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ ① Nguyễn Văn A    ████████ 12│  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ ② Trần Thị B      ██████   9 │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ ③ Lê Văn C        ████     6 │  │
│  └───────────────────────────────┘  │
│  ...                                │
├─────────────────────────────────────┤
│  Footer: Tổng 27 vote               │
└─────────────────────────────────────┘
```

### Logic
- Fetch data từ `/api/snapshot` (có sẵn candidates + vote_count)
- Realtime subscription trên table `candidates` → auto refresh khi vote thay đổi
- Polling fallback mỗi 15s
- Bar width = `vote_count / maxVotes * 100%`
- Khi vote = 0 → bar trống (0%)
- Sắpếp theo `display_order` (1-5)

### Styling
- `.liquid-glass-card` cho mỗi row
- `.liquid-glass-header` cho header
- `.fx-focus` cho tên sự kiện
- Màu thanh bar: `bg-primary` (blue)
- Background thanh: `bg-white/10`
- Số thứ tự: badge tròn `bg-primary/10 text-primary`
- Transition mượt khi bar thay đổi (`transition-all duration-500`)

## Checklist
- [ ] Tạo `app/rank/page.tsx`
- [ ] Fetch data từ `/api/snapshot`
- [ ] Realtime subscription + polling fallback
- [ ] Horizontal bar chart responsive
- [ ] Header với animation `.fx-focus`
- [ ] Footer tổng vote
- [ ] Build pass
- [ ] Push lên GitHub
