# MarStreak · DC1

Bot Discord giúp thành viên điểm danh, giữ chuỗi ngày và làm ba nhiệm vụ hằng ngày. Dùng `/checkin` để nhận việc, `/quests` để xem cách làm và tiến độ. Bot tự ghi nhận hành động và có thể báo hoàn thành qua tin nhắn riêng.

**Chị Cún xem demo:** mở [bộ thẻ ngay trên GitHub](docs/demo/README.md), rồi xem [kết quả hai tài khoản thật](docs/QA-2026-11-27.md). Để chốt bản chạy đầu tiên và giao người cài đặt, dùng [trang bàn giao](docs/HANDOFF.md).

| Bạn muốn | Mở tài liệu |
| --- | --- |
| Xem demo trong 5 phút | [Demo và năm ảnh mẫu](docs/demo/README.md) |
| Bàn giao cho Lead hoặc cho AI đọc | [Tóm tắt bàn giao DC1](docs/HANDOFF.md) |
| Xem các quest và cách bật lại tính năng dự phòng | [Tính năng và cấu hình](docs/FEATURES.md) |
| Đổi lời bot, hình, cách chấm hoặc thêm nhiệm vụ | [Muốn sửa gì thì mở đâu?](docs/MAINTENANCE.md) |
| Cài bot chạy lâu dài, sao lưu và xử lý sự cố | [Cài trên VPS bằng systemd](docs/VPS.md) |

## Chạy thử trong server Discord riêng

1. Cài [Node.js 24](https://nodejs.org/en/download). Trong [Discord Developer Portal](https://discord.com/developers/applications), chọn một app bạn quản lý. Dùng **Guild Install** với scope `bot` và `applications.commands` để cài app vào server thử. Thành viên cần **Use Application Commands**. [Discord App Quick Start](https://docs.discord.com/developers/quick-start/getting-started)
2. Chuẩn bị một kênh chữ bot thấy được, một phòng Voice và một thread công khai đang mở. Bật **Developer Mode** để sao chép ID. [Cấu hình từng nhiệm vụ](docs/FEATURES.md#cấu-hình-cơ-bản)
3. Clone source, cài dependency và chạy test.

   ```sh
   git clone https://github.com/Duylamneuuu/marstreak.git
   cd marstreak
   npm ci
   npm test
   ```

4. Sao chép [`.env.example`](.env.example) thành `.env` trong thư mục có `package.json`. Bản mẫu giao ba việc: vào Voice, thả emoji và gửi tin trong chủ đề. Điền năm ô sau trên máy chạy bot.

   | Ô cần điền | Lấy ở đâu |
   | --- | --- |
   | `DISCORD_TOKEN` | Token của app mà người vận hành được giao quản lý. Nhập trực tiếp trong file riêng trên máy chạy bot. |
   | `DISCORD_APPLICATION_ID` | **General Information → Application ID** của cùng app. |
   | `DISCORD_GUILD_ID` | Trong Discord, nhấp phải biểu tượng server thử → **Copy Server ID**. |
   | `LAB_VOICE_CHANNEL_IDS` | Nhấp phải phòng Voice cho phép làm nhiệm vụ → **Copy Channel ID**. |
   | `LAB_COMMUNITY_THREAD_ID` | Nhấp phải chính chủ đề công khai đang mở → **Copy Channel ID**. Kênh chữ chứa chủ đề có ID riêng. |

5. Chạy `npm start`. Khi terminal báo **MarStreak sẵn sàng**, mở Discord, chọn `/checkin` của app vừa cài rồi làm theo thẻ. Dừng bằng Ctrl+C. Trên Windows dùng [START-LAB.cmd](DEMO-KIT/START-LAB.cmd) và [STOP-LAB.cmd](DEMO-KIT/STOP-LAB.cmd), hoặc dùng `npm.cmd` nếu PowerShell chặn `npm.ps1`.

   Khi thử bản mẫu, hãy dùng một tài khoản thành viên thường. Vào phòng Voice ghi trên thẻ đủ hai phút, thả một emoji mới vào tin trong kênh bot thấy được và gửi một tin vào đúng chủ đề. Mở `/quests` để kiểm tra 3/3 rồi khởi động lại bot và mở lại bảng. Thành công khi ba dấu tick và chuỗi điểm danh vẫn còn.

Mỗi tiến trình phục vụ một server. Dùng một tiến trình cho mỗi app và file SQLite. Giữ token, `.env`, dữ liệu thành viên, backup và log ở máy vận hành.

## Hình ảnh

`assets/` chứa thumbnail điểm danh, hai mascot tạm và nền rừng từ poster MarWuy. Dùng ảnh đã được Lead/Design duyệt khi triển khai chính thức. `npm run preview:quests` tạo lại ảnh minh họa trong `previews/` từ dữ liệu mẫu.
