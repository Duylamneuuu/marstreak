# MarStreak

Bot Discord hỗ trợ điểm danh, chuỗi ngày liên tiếp và ba nhiệm vụ hằng ngày. Dùng `/checkin` để điểm danh và nhận nhiệm vụ. Dùng `/quests` để xem tiến độ Voice, Reaction và Community. Bot lưu tiến độ trong SQLite và gửi tin nhắn riêng khi người dùng cho phép.

## Cài đặt

Cần Node.js 24 trở lên, một ứng dụng bot Discord do bạn quản lý và quyền cài ứng dụng vào server của bạn. Dùng **Guild Install** với scope `bot` và `applications.commands`. Trong kênh dùng lệnh, thành viên cần quyền **Use Application Commands**. Cho bot xem kênh thử, gửi phản hồi có ảnh và đọc lịch sử ở kênh Reaction. Bot cần nhìn thấy các phòng Voice và public thread dùng cho nhiệm vụ. Các sự kiện hiện tại dùng Gateway intents thông thường, không cần **Message Content** hoặc **Administrator**.

```sh
git clone https://github.com/Duylamneuuu/marstreak.git
cd marstreak
npm ci
npm test
```

Trên Windows PowerShell, dùng `npm.cmd` thay cho `npm` nếu chính sách máy chặn `npm.ps1`.

## Cấu hình và chạy

Sao chép `.env.example` thành `.env` trong thư mục dự án. Điền token từ ứng dụng của bạn và thay các ID bằng ID trong server đó. Bật **Developer Mode** trong Discord để sao chép ID kênh, tin nhắn và server.

| Biến | Giá trị |
| --- | --- |
| `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID` | Token và Application ID của cùng ứng dụng. |
| `DISCORD_GUILD_ID` | ID của server sẽ đăng ký hai lệnh. Mỗi tiến trình phục vụ một server. |
| `LAB_VOICE_CHANNEL_IDS`, `LAB_VOICE_SECONDS` | ID phòng Voice, cách nhau bằng dấu phẩy. Mặc định 120 giây. |
| `LAB_REACTION_CHANNEL_ID`, `LAB_REACTION_MESSAGE_ID`, `LAB_REACTION_EMOJI` | ID kênh chữ và tin nhắn mục tiêu. Emoji có thể là Unicode hoặc ID emoji tùy chỉnh của server. |
| `LAB_COMMUNITY_THREAD_ID` | ID của một public thread đang mở và chưa khóa. |
| `CHECKIN_RESET_TIME`, `CHECKIN_DB_PATH` | Giờ reset theo giờ Việt Nam, mặc định `00:00`. DB mặc định ở `data/checkins.sqlite`. |

Chạy `npm start`. Khi thấy “MarStreak sẵn sàng”, thử `/checkin` và `/quests` trong server đã chọn. Dừng bằng Ctrl+C trong terminal đang chạy bot. Chỉ chạy một tiến trình cho cùng token và DB. Giữ `.env` và dữ liệu SQLite ở máy vận hành.

## Xem thử và sao lưu

- `npm run preview:quests` dựng bốn mốc tiến độ và ảnh DM dùng dữ liệu mẫu trong thư mục `previews/`.
- `npm run backup` tạo và kiểm tra bản sao SQLite trong thư mục `backups/` bên cạnh DB. Để khôi phục, dừng bot, trỏ `CHECKIN_DB_PATH` tới bản sao đã kiểm rồi khởi động và đối chiếu `/quests`.
- `assets/` chứa bốn ảnh bot dùng trong DC1 Lab. Hai mascot được tách từ poster MarWuy với AI hỗ trợ làm sạch, nền rừng là phần cắt từ poster và thumbnail điểm danh là icon MarWuy. Hai mascot dùng bản đã lược metadata, giữ nguyên hình hiển thị.
