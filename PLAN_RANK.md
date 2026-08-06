# Plan: Trang `/rank` — Excel-Style Horizontal Bar Chart

## Mục tiêu
Tạo trang `/rank` hiển thị biểu đồ thanh ngang giống Excel — mỗi bar có label bên trái, giá trị hiển thị trên bar, x-axis ở dưới cùng. Ai cũng xem được.

## Files

### Sửa
- `app/rank/page.tsx` — rewrite giao diện
- `app/globals.css` — thêm CSS cho x-axis

### Không cần tạo mới
- Dùng sẵn API `/api/snapshot`

## Thiết kế (theo ảnh Excel)

```
┌──────────────────────────────────────────────────┐
│         10TH ANNIVERSARY — A DECADE OF INSPIRATION│
│              Bảng xếp hạng                        │
├──────────────────────────────────────────────────┤
│                                                    │
│  Trần Văn A   ████████████████████████  12 vote   │
│                                                    │
│  Nguyễn Thị C  ██████████████████  9 vote          │
│                                                    │
│  Phạm Quốc D   ████████████████  8 vote            │
│                                                    │
│  Lê Triệu E    ██████████  5 vote                  │
│                                                    │
│  Trần Xuân B   ████████  4 vote                    │
│                                                    │
│  ├─────┼─────┼─────┼─────┼─────┼─────┤            │
│  0     2     4     6     8    10    12             │
│                  Số vote                            │
└──────────────────────────────────────────────────┘
```

## Chi tiết thiết kế

### Layout mỗi bar
- **Label bên trái**: tên thí sinh + số thứ tự (badge tròn)
- **Bar**: horizontal, width = `(vote_count / maxVotes) * 100%`
- **Giá trị trên bar**: hiển thị `N vote` trên mép phải của bar
- **Màu bar**: 
  - Top 1 ( nhất): gradient gold `#fad68e → #c8922a`
  - Top 2-3: gradient blue `#3b82f6 → #1e40af`
  - Top 4-5: gradient xám `#64748b → #475569`

### X-axis
- Ở dưới cùng danh sách
- Hiển thị mốc: 0, maxVotes/4, maxVotes/2, 3*maxVotes/4, maxVotes
- Dùng `border-t` với `border-dashed` để tạo grid lines dọc

### Animation
- Bar animation: `transition-all duration-700 ease-out`
- Khi load lần đầu: bar mở rộng từ 0 → giá trị thực

### Styling
- Background: giữ nguyên `background.png`
- Cards: `.liquid-glass-card` với padding lớn hơn
- Header: `.liquid-glass-header` + `.fx-focus`
- Font: SVN-Gilroy Bold cho labels

## Checklist
- [ ] Cập nhật PLAN_RANK.md
- [ ] Rewrite `app/rank/page.tsx`
- [ ] Thêm CSS x-axis vào `globals.css`
- [ ] Build pass
- [ ] Push GitHub
