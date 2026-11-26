# MarStreak · DC1

Bot Discord giúp thành viên điểm danh, giữ chuỗi ngày và làm ba nhiệm vụ hằng ngày. Dùng `/checkin` để nhận việc, `/quests` để xem cách làm và tiến độ. Bot tự ghi nhận hành động và có thể báo hoàn thành qua tin nhắn riêng.

| Bạn muốn | Mở tài liệu |
| --- | --- |
| Xem demo trong 5 phút | [Demo và năm ảnh mẫu](docs/demo/README.md) |
| Bàn giao cho Lead hoặc cho AI đọc | [Tóm tắt bàn giao DC1](docs/HANDOFF.md) |
| Xem các quest và cách bật lại tính năng dự phòng | [Tính năng và cấu hình](docs/FEATURES.md) |
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

4. Sao chép [`.env.example`](.env.example) thành `.env`. Điền token, Application ID và ID server, phòng Voice, thread của môi trường bạn vừa chuẩn bị.
5. Chạy `npm start`. Khi terminal báo **MarStreak sẵn sàng**, mở Discord, chọn `/checkin` của app vừa cài rồi làm theo thẻ. Dừng bằng Ctrl+C. Trên Windows dùng [START-LAB.cmd](DEMO-KIT/START-LAB.cmd) và [STOP-LAB.cmd](DEMO-KIT/STOP-LAB.cmd), hoặc dùng `npm.cmd` nếu PowerShell chặn `npm.ps1`.

Mỗi tiến trình phục vụ một server. Dùng một tiến trình cho mỗi app và file SQLite. Giữ token, `.env`, dữ liệu thành viên, backup và log ở máy vận hành.

## Hình ảnh

`assets/` chứa thumbnail điểm danh, hai mascot tạm và nền rừng từ poster MarWuy. Dùng ảnh đã được Lead/Design duyệt khi triển khai chính thức. `npm run preview:quests` tạo lại ảnh minh họa trong `previews/` từ dữ liệu mẫu.
