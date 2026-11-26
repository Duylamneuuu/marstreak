# Cài MarStreak trên VPS

Hướng dẫn cho Ubuntu 24.04 LTS hoặc Debian 12 dùng systemd, với quyền SSH và `sudo`. Bot kết nối ra Discord bằng HTTPS/WebSocket. Dùng một tiến trình cho một app và file SQLite. Trước khi cài, chốt server, người giữ token, người sao lưu và bên quản lý VPS.

## 1. Chuẩn bị bot Discord

Làm các bước trong [README](../README.md#chạy-thử-trong-server-discord-riêng) để cài ứng dụng và lấy Application ID, server ID và các ID cần thiết. Dùng một server thử để kiểm chứng luồng trước ngày mở cho thành viên. [Discord App Quick Start](https://docs.discord.com/developers/quick-start/getting-started)

## 2. Cài Node.js 24

Cài công cụ tải và kiểm tra bản Node.js 24 LTS theo kiến trúc VPS. Đoạn này đặt Node ở `/opt/marstreak-node`, khớp đường dẫn trong file systemd.

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git xz-utils

(
  set -e
  case "$(uname -m)" in
    x86_64) node_arch=x64 ;;
    aarch64) node_arch=arm64 ;;
    *) echo "Hãy chọn bản Node.js 24 phù hợp với kiến trúc VPS"; exit 1 ;;
  esac
  staging="$(mktemp -d)"
  cd "$staging"
  curl --fail --show-error --silent --location https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o SHASUMS256.txt
  grep -E "  node-v24[.][0-9]+[.][0-9]+-linux-${node_arch}[.]tar[.]xz$" SHASUMS256.txt > check.txt
  node_tar="$(awk 'NR == 1 {print $2}' check.txt)"
  node_version="${node_tar#node-}"
  node_version="${node_version%-linux-*}"
  curl --fail --show-error --silent --location "https://nodejs.org/dist/$node_version/$node_tar" -o "$node_tar"
  sha256sum --check check.txt
  sudo install -d -m 755 /opt/marstreak-node
  sudo tar -xJf "$node_tar" -C /opt/marstreak-node --strip-components=1
)
/opt/marstreak-node/bin/node --version
```

[Nguồn tải Node.js chính thức](https://nodejs.org/en/download)

## 3. Cài source và cấu hình

```bash
id marstreak >/dev/null 2>&1 || sudo useradd --system --create-home --home-dir /var/lib/marstreak --shell /usr/sbin/nologin marstreak
sudo install -d -m 755 -o marstreak -g marstreak /opt/marstreak
sudo -u marstreak git clone https://github.com/Duylamneuuu/marstreak.git /opt/marstreak
cd /opt/marstreak
sudo -u marstreak env PATH=/opt/marstreak-node/bin:/usr/bin:/bin npm ci
sudo -u marstreak env PATH=/opt/marstreak-node/bin:/usr/bin:/bin npm test

sudo install -d -m 750 -o root -g marstreak /etc/marstreak
sudo install -m 640 -o root -g marstreak .env.example /etc/marstreak/marstreak.env
sudoedit /etc/marstreak/marstreak.env
```

Đoạn `install .env.example` dùng ở lần cài đầu. Trong file, điền token và ID của môi trường bạn quản lý, chọn quest theo [bảng tính năng](FEATURES.md) và đặt `CHECKIN_DB_PATH=/var/lib/marstreak/checkins.sqlite`. Dùng `sudoedit` để nhập token tại VPS. Giữ file cấu hình ngoài checkout và quyền đọc giới hạn cho người vận hành.

## 4. Bật dịch vụ và thử

```bash
sudo install -m 644 deploy/marstreak.service /etc/systemd/system/marstreak.service
sudo systemd-analyze verify /etc/systemd/system/marstreak.service
sudo systemctl daemon-reload
sudo systemctl enable --now marstreak.service
sudo systemctl status marstreak.service --no-pager
sudo journalctl -u marstreak.service -n 40 --no-pager
```

Chờ log **MarStreak sẵn sàng**, rồi gọi `/checkin` và `/quests` trong server đã cấu hình. Làm một quest, bấm **Xem tiến độ mới**, thử khởi động lại với `sudo systemctl restart marstreak.service` rồi kiểm tra streak và tiến độ. Nếu đã chạy cùng app ở máy Lab hoặc terminal khác, dừng ở đó trước khi bật VPS. [Tài liệu systemd.service](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)

## 5. Sao lưu, khôi phục và nâng cấp

**Sao lưu** bằng lệnh sau. Bot in đường dẫn file đã qua `quick_check`. Giữ thêm một bản sao ở nơi team có quyền truy cập phù hợp.

```bash
sudo -u marstreak /opt/marstreak-node/bin/node --env-file=/etc/marstreak/marstreak.env /opt/marstreak/src/backup.js
```

**Khôi phục.** Dừng dịch vụ bằng `sudo systemctl stop marstreak.service`. Sao chép file backup đã kiểm tra sang một tên mới trong `/var/lib/marstreak`, đặt owner `marstreak:marstreak` và quyền `0600`. Đổi `CHECKIN_DB_PATH` sang bản vừa chép. Bật dịch vụ, đối chiếu `/quests` và streak. Giữ file cũ để có thể trỏ về khi cần.

**Nâng cấp.** Ghi SHA đang chạy rồi sao lưu. Dừng dịch vụ, cập nhật checkout bằng `git pull --ff-only` dưới user `marstreak`, chạy lại `npm ci` và `npm test` bằng Node ở trên, rồi bật lại và thử. Nếu cần quay lại, dừng dịch vụ, chuyển về SHA đã ghi, cài đúng dependency của bản đó và kiểm tra dữ liệu trước khi bật.

## Khi demo gặp lỗi

| Triệu chứng | Kiểm tra |
| --- | --- |
| Bot offline | Xem `systemctl status` và `journalctl`. Kiểm tra token, Application ID, mạng tới Discord và quyền đọc file cấu hình. |
| Thiếu lệnh | Kiểm tra app đã cài vào đúng guild, scope `applications.commands` và quyền thành viên. |
| Không nhận ba quest | Kiểm tra ít nhất ba mã đã khai báo, đúng ID đích và thành viên làm được. |
| Quest không tăng | Điểm danh trước, chọn đúng app và kênh. Với Poll, bấm **Vote** trong đúng bài còn mở. Với Voice, xem thời gian đã tính và phòng trên thẻ. |
| Không nhận DM | Mở `/quests` để xem kết quả đã ghi, kiểm tra cài đặt nhận tin riêng. |
| Thẻ thiếu ảnh | Kiểm tra các PNG trong `assets/` và dependency Sharp. Hướng dẫn dạng chữ vẫn hiện trong embed. |

Mẫu dịch vụ và quy trình trên dành cho máy vận hành. Kết quả Lab và regression trong repo là cơ sở để nghiệm thu. Kiểm tra VPS thật, lưu bản sao và quyền role tại server nhận bàn giao trước khi mở.
