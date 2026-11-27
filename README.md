# MarStreak · DC1

MarStreak giúp thành viên MarWuy điểm danh và tham gia hoạt động trên Discord. `/checkin` ghi ngày điểm danh, tính chuỗi ngày liên tiếp và giao ba nhiệm vụ. `/quests` mở lại hướng dẫn và tiến độ của người gọi. Khi hoàn thành một việc, thành viên có thể nhận thông báo riêng.

Chuỗi chỉ phụ thuộc các ngày điểm danh liên tiếp. Điểm danh được tính riêng; tiến độ **0/3–3/3** chỉ tính ba nhiệm vụ được giao. Thành viên vẫn giữ chuỗi nếu điểm danh mỗi ngày, dù chưa hoàn thành đủ ba nhiệm vụ.

| Mục đích | Tài liệu |
| --- | --- |
| Xem sản phẩm | [Demo 0/3 đến 3/3](docs/demo/README.md) · [Kết quả kiểm thử](docs/QA-2026-11-27.md) |
| Duyệt phạm vi và phân công | [Hồ sơ bàn giao](docs/HANDOFF.md) |
| Cấu hình danh sách nhiệm vụ và quyền | [Tính năng và cấu hình](docs/FEATURES.md) |
| Đổi lời bot, hình ảnh hoặc cách chấm | [Hướng dẫn phát triển](docs/MAINTENANCE.md) |
| Chạy bot, sao lưu và khôi phục | [Demo Kit cho Windows](DEMO-KIT/README.md) · [Vận hành trên VPS](docs/VPS.md) |

## Chạy thử trong server Discord riêng

1. Chuẩn bị Node.js 24 và một ứng dụng Discord thuộc quyền quản lý của dự án. Trong Developer Portal, chọn **Guild Install** với hai scope `bot` và `applications.commands`, rồi cài app vào server thử. Thành viên cần quyền **Use Application Commands**. [Node.js](https://nodejs.org/en/download) · [Discord Developer Portal](https://discord.com/developers/applications) · [Hướng dẫn của Discord](https://docs.discord.com/developers/quick-start/getting-started)
2. Với cấu hình mẫu, chuẩn bị một phòng Voice, một kênh chữ có thể thả emoji và một thread công khai đang mở. Bật **Developer Mode** trong Discord để sao chép ID.
3. Tải mã nguồn và kiểm tra môi trường.

   ```sh
   git clone https://github.com/Duylamneuuu/marstreak.git
   cd marstreak
   npm ci
   npm test
   ```

4. Sao chép [`.env.example`](.env.example) thành `.env` cùng cấp với `package.json`. Điền các giá trị dưới đây trên máy chạy bot.

   | Biến | Nguồn |
   | --- | --- |
   | `DISCORD_TOKEN` | Token trong mục **Bot** của ứng dụng |
   | `DISCORD_APPLICATION_ID` | **General Information → Application ID** của cùng ứng dụng |
   | `DISCORD_GUILD_ID` | **Copy Server ID** của server thử |
   | `LAB_VOICE_CHANNEL_IDS` | **Copy Channel ID** của phòng Voice hợp lệ |
   | `LAB_COMMUNITY_THREAD_ID` | **Copy Channel ID** của chính thread công khai |

5. Chạy `npm start`. Khi xuất hiện **MarStreak sẵn sàng**, dùng tài khoản thành viên gọi `/checkin` trong server thử. Với cấu hình mẫu, ở trong phòng Voice hai phút, thả một emoji mới và gửi một tin trong thread được giao. Mở `/quests`, kiểm tra 3/3, rồi khởi động lại bot với cùng SQLite và mở lại bảng.

Dùng một tiến trình cho mỗi ứng dụng và tệp SQLite. Dừng tiến trình trong terminal bằng Ctrl+C. Trên Windows có thể dùng launcher sau khi cấu hình xong. Token, dữ liệu thành viên, bản sao lưu và log thuộc máy vận hành. [Hướng dẫn Windows](DEMO-KIT/README.md)

## Hình ảnh và phạm vi sử dụng

Thẻ điểm danh dùng biểu tượng Discord của MarWuy. Hai nhân vật tạm được tách và chỉnh lại đường nét từ poster MarWuy do dự án cung cấp. Nền rừng là phần cắt từ poster. Sharp ghép các lớp ảnh với chữ và tiến độ. Product và Design cần duyệt bộ ảnh trước khi phát hành. [Tài sản](assets/) · [Demo và nguồn ảnh](docs/demo/README.md)
