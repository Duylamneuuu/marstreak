# MarStreak · DC1

MarStreak giúp thành viên MarWuy điểm danh và tham gia hoạt động trên Discord. `/checkin` ghi ngày điểm danh, tính chuỗi ngày liên tiếp và giao ba nhiệm vụ. `/quests` mở lại hướng dẫn và tiến độ của người gọi. Mặc định bot ghi tiến độ im lặng. Người vận hành có thể bật một tin riêng khi thành viên đạt 3/3.

Chuỗi chỉ phụ thuộc các ngày điểm danh liên tiếp. Điểm danh được tính riêng; tiến độ **0/3–3/3** chỉ tính ba nhiệm vụ được giao. Thành viên vẫn giữ chuỗi nếu điểm danh mỗi ngày, dù chưa hoàn thành đủ ba nhiệm vụ.

Khi tiếp quản, đọc [Bàn giao](docs/HANDOFF.md) và [Trạng thái tính năng](docs/FEATURES.md#trạng-thái-tính-năng). Hai mục này ghi cấu hình mặc định, phần có thể bật và điều kiện cần kiểm tra trước khi mở cho thành viên. Bộ mẫu chạy với **Message Content Intent tắt**. [Quyền và dữ liệu dùng để tính quest](docs/FEATURES.md#quyền-và-dữ-liệu-dùng-để-tính-quest)

| Mục đích | Tài liệu |
| --- | --- |
| Cài bot lần đầu | [Hướng dẫn từng bước: app, quyền, ID, cấu hình và chạy thử](docs/SETUP.md) |
| Hướng dẫn thành viên | [Tin nhắn có thể ghim và cách làm từng nhiệm vụ](docs/MEMBER-GUIDE.md) |
| Xem sản phẩm | [Demo 0/3 đến 3/3](docs/demo/README.md) · [Kết quả kiểm thử](docs/QA-2026-11-27.md) |
| Duyệt phạm vi và phân công | [Hồ sơ bàn giao](docs/HANDOFF.md) |
| Cấu hình danh sách nhiệm vụ và quyền | [Tính năng và cấu hình](docs/FEATURES.md) |
| Đổi lời bot, hình ảnh hoặc cách chấm | [Hướng dẫn phát triển](docs/MAINTENANCE.md) |
| Chạy bot, sao lưu và khôi phục | [Demo Kit cho Windows](DEMO-KIT/README.md) · [Vận hành trên VPS](docs/VPS.md) |

## Chạy thử trong server Discord riêng

Mở [SETUP](docs/SETUP.md) và làm lần lượt: cài ứng dụng Discord, chuẩn bị kênh, điền token và bốn ID, rồi chạy bằng Node.js 24. Bộ mẫu dùng **Voice 120 giây + thả emoji + gửi tin trong thread**, không cần Message Content Intent. Hướng dẫn có sẵn mẫu `.env`, quyền theo vai trò, kết quả cần thấy và cách xử lý lỗi thường gặp.

Khi bot báo **MarStreak sẵn sàng**, `/checkin` gửi thẻ điểm danh và bảng ba nhiệm vụ ngay sau đó. Dùng [hướng dẫn thành viên](docs/MEMBER-GUIDE.md) để thử hoặc sao chép phần tin nhắn ghim vào kênh giới thiệu. Chạy một tiến trình cho mỗi ứng dụng và tệp SQLite; xem [Windows](DEMO-KIT/README.md) hoặc [VPS](docs/VPS.md) cho cách vận hành.

## Hình ảnh và phạm vi sử dụng

Thẻ điểm danh dùng biểu tượng Discord của MarWuy. Hai nhân vật tạm được tách và chỉnh lại đường nét từ poster MarWuy do dự án cung cấp. Nền rừng là phần cắt từ poster. Sharp ghép các lớp ảnh với chữ và tiến độ. Product và Design cần duyệt bộ ảnh trước khi phát hành. [Tài sản](assets/) · [Demo và nguồn ảnh](docs/demo/README.md)
