# IoT Dashboard — Mô Tả Chi Tiết Dự Án

## 1. Tổng Quan

Đây là một **full-stack real-time IoT dashboard** dùng để giám sát cảm biến ESP32 và điều khiển thiết bị LED từ xa qua trình duyệt web.

- **Giao diện:** Tiếng Việt, chủ đề Disney / màu hồng
- **Phần cứng:** ESP32 với cảm biến nhiệt độ, độ ẩm, ánh sáng và 3 LED
- **Realtime:** MQTT (backend ↔ ESP32), SSE (cảm biến → UI), WebSocket (xác nhận thiết bị → UI)

---

## 2. Kiến Trúc Hệ Thống

### Luồng dữ liệu cảm biến

```
ESP32
  └─► MQTT publish: esp32/sensor_data { temperature, humidity, lux }
        └─► backend/mqtt.js parse → lưu MySQL sensor_data
              └─► WebSocket broadcast { type: 'sensor_data', data }
                    └─► frontend useDeviceWS → cập nhật SensorCard trực tiếp
```

### Luồng điều khiển thiết bị (confirmation-based)

```
User click toggle
  └─► spinner hiện tại trạng thái GỐC (KHÔNG lật trước)
        └─► POST /api/devices/:id/action { action: 'ON'|'OFF' }
              └─► backend: cập nhật DB + insert PENDING action + publish MQTT esp32/led_cmd
                    └─► ESP32 nhận lệnh, thực thi, publish esp32/led_status { led1, led2, led3 }
                          └─► mqtt.js: đánh dấu action SUCCESS + broadcast device_confirmed
                                └─► frontend useDeviceWS nhận → hủy timer 5s → invalidateQueries
                                      └─► React Query fetch lại DB → toggle lật
                    (Nếu 5s không có WS: PATCH action failed → DB revert → spinner tắt, toggle giữ nguyên)
```

---

## 3. Cấu Trúc Thư Mục

```
IoT/
├── backend/
│   ├── server.js                     # Entry point Express
│   ├── mqtt.js                       # MQTT client, xử lý realtime
│   ├── wsServer.js                   # WebSocket server module
│   ├── db/
│   │   └── pool.js                   # MySQL connection pool
│   ├── controllers/
│   │   ├── devicesController.js      # Logic thiết bị + MQTT publish
│   │   ├── sensorDataController.js   # Truy vấn dữ liệu cảm biến
│   │   └── deviceActionsController.js# Lịch sử hành động + revert
│   ├── routes/
│   │   ├── devices.js
│   │   ├── sensorData.js
│   │   ├── deviceActions.js
│   │   └── sensors.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── .env                          # Biến môi trường (DB, MQTT)
│   ├── package.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx         # Trang chính: cảm biến + toggle thiết bị
│   │   │   ├── SensorData.tsx        # Bảng dữ liệu cảm biến có phân trang
│   │   │   ├── DeviceHistory.tsx     # Lịch sử hành động thiết bị
│   │   │   └── Profile.tsx           # Thông tin sinh viên
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── DeviceCard.tsx        # Toggle switch + spinner
│   │   │   ├── SensorCard.tsx        # Hiển thị giá trị + LIVE badge
│   │   │   ├── DataTable.tsx         # Bảng dùng chung (sort, filter, phân trang)
│   │   │   └── MickeyIcon.tsx        # Icon trang trí Disney
│   │   ├── hooks/
│   │   │   ├── useDevices.ts         # Query + mutation thiết bị
│   │   │   ├── useSensorData.ts      # Query cảm biến (latest, chart, list)
│   │   │   ├── useDeviceActions.ts   # Query lịch sử hành động
│   │   │   └── useDeviceWS.ts        # WebSocket listener
│   │   ├── lib/
│   │   │   ├── api.ts                # Axios HTTP client
│   │   │   └── utils.ts              # Tiện ích format (ngày, giá trị, class)
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── .env
│   ├── nginx.conf
│   └── Dockerfile
│
├── docker-compose.yml
├── CLAUDE.md
└── .env.example
```

---

## 4. Database Schema (MySQL)

```sql
-- Định nghĩa cảm biến
CREATE TABLE sensors (
  sensor_id   INT PRIMARY KEY AUTO_INCREMENT,
  sensor_name VARCHAR(255),
  sensor_type VARCHAR(100),   -- 'temp' | 'hum' | 'light'
  unit        VARCHAR(50)
);

-- Dữ liệu đo được
CREATE TABLE sensor_data (
  data_id     INT PRIMARY KEY AUTO_INCREMENT,
  sensor_id   INT,
  value       DECIMAL(10, 2),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id)
);

-- Thiết bị LED
CREATE TABLE devices (
  device_id      INT PRIMARY KEY AUTO_INCREMENT,
  device_name    VARCHAR(255),
  current_status ENUM('ON', 'OFF'),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lịch sử hành động điều khiển
CREATE TABLE device_actions (
  action_id   INT PRIMARY KEY AUTO_INCREMENT,
  device_id   INT,
  action      ENUM('ON', 'OFF'),
  status      ENUM('PENDING', 'SUCCESS', 'FAILED'),
  action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(device_id)
);
```

**Giải thích `device_actions.status`:**
| Giá trị | Ý nghĩa |
|---------|---------|
| `PENDING` | Lệnh đã gửi, chờ ESP32 xác nhận |
| `SUCCESS` | ESP32 đã thực thi và phản hồi |
| `FAILED` | Hết 5s không có phản hồi, DB đã revert |

---

## 5. Backend — Chi Tiết

### `server.js`
- Khởi tạo Express, CORS, JSON parser
- Mount 4 nhóm route: `/api/sensors`, `/api/sensor-data`, `/api/devices`, `/api/device-actions`
- Attach WebSocket server tại `/ws`
- **Startup cleanup:** Tìm tất cả action `PENDING` còn sót → đánh dấu `FAILED`, revert `devices.current_status`
- Port: `3001`

### `mqtt.js`
- Kết nối MQTT broker qua env `MQTT_BROKER`, `MQTT_USER`, `MQTT_PASS`
- **Subscribe:**
  - `esp32/sensor_data` → parse JSON `{ temperature, humidity, lux }` → lưu DB → broadcast sensor_data qua WS
  - `esp32/led_status` → parse `{ led1, led2, led3 }` → tìm PENDING action → đánh dấu SUCCESS → broadcast `device_confirmed` qua WS
- **Publish:**
  - `publishDeviceCommand(deviceId, action)` → topic `esp32/led_cmd`
  - Map: device_id 1→led1, 2→led2, 3→led3

### `wsServer.js`
- `attachWS(server)` → tạo WebSocketServer tại path `/ws`
- Quản lý Set các client đang kết nối
- `broadcast(data)` → gửi JSON tới tất cả client có `readyState === OPEN`

### `controllers/devicesController.js`
```
GET /api/devices
  → Trả danh sách devices + pending_action_id (null nếu không có PENDING)

POST /api/devices/:id/action  { action: 'ON'|'OFF' }
  → Transaction: update current_status + insert PENDING action
  → Publish MQTT command
  → Trả { action_id, device, mqtt_published }
```

### `controllers/sensorDataController.js`
```
GET /api/sensor-data/latest
  → Giá trị mới nhất mỗi cảm biến kèm metadata

GET /api/sensor-data/chart?sensor_id=X&limit=24
  → N bản ghi gần nhất theo thứ tự thời gian (cho biểu đồ)

GET /api/sensor-data?page=1&limit=10&search=...&sort_key=...&sort_dir=...
  → Phân trang, tìm kiếm (hỗ trợ định dạng ngày Việt Nam), sắp xếp
```

### `controllers/deviceActionsController.js`
```
GET /api/device-actions?page=1&limit=10&device_id=...&action=...&status=...
  → Lịch sử có lọc + phân trang + sắp xếp

GET /api/device-actions/:id
  → Một bản ghi action

PATCH /api/device-actions/:id  { status: 'success'|'failed' }
  → Nếu failed: revert device_status trong transaction
  → Nếu success: đánh dấu SUCCESS
```

---

## 6. Frontend — Chi Tiết

### TypeScript Types (`types/index.ts`)

```typescript
interface Sensor        { sensor_id, sensor_name, sensor_type, unit }
interface SensorData    { data_id, sensor_id, value, recorded_at, sensor_name, sensor_type, unit }
interface Device        { device_id, device_name, current_status: 'ON'|'OFF', created_at, pending_action_id: number|null }
interface DeviceAction  { action_id, device_id, action: 'ON'|'OFF', status: 'PENDING'|'SUCCESS'|'FAILED', action_time, device_name }
interface PaginatedResponse<T> { data: T[], total, page, limit, totalPages }
```

### HTTP Client (`lib/api.ts`)
- Axios instance: `baseURL = /api`, timeout 10s
- Các hàm: `fetchSensors`, `fetchLatestSensorData`, `fetchSensorDataChart`, `fetchSensorData`, `fetchDevices`, `postDeviceAction`, `fetchDeviceAction`, `patchDeviceAction`, `fetchDeviceActions`

### Hooks

| Hook | Mục đích |
|------|---------|
| `useDevices()` | Query danh sách devices, refetch 10s |
| `useDeviceAction()` | Mutation POST action |
| `useLatestSensorData()` | Query latest readings, refetch 10s |
| `useSensorDataChart(id)` | Query biểu đồ, refetch 15s |
| `useSensorDataList(params)` | Query bảng phân trang |
| `useDeviceActions(params)` | Query lịch sử hành động |
| `useDeviceWS(onMessage)` | WebSocket tại `/ws`, trả `{ connected }` |

### Pages

#### `Dashboard.tsx`
- 3 SensorCard: nhiệt độ, độ ẩm, ánh sáng (dữ liệu realtime từ WS)
- Biểu đồ area: nhiệt độ + độ ẩm chung, ánh sáng riêng (Recharts)
- 3 DeviceCard với màu sắc theo chủ đề (cyan, pink, amber)
- Logic toggle confirmation-based với `pendingMap` state
- WebSocket listener: `device_confirmed` → `clearPending()` + invalidate query

#### `SensorData.tsx`
- Bảng dữ liệu cảm biến có phân trang, tìm kiếm, lọc theo cảm biến, sắp xếp
- Badge màu theo loại cảm biến (đỏ/xanh/vàng)

#### `DeviceHistory.tsx`
- Lịch sử hành động với badge trạng thái:
  - `PENDING` → badge cam + spinner "Đang chờ"
  - `SUCCESS` → chấm xanh + "Bật" / "Tắt"
  - `FAILED` → badge hồng đậm "Thất bại"
- Lọc theo thiết bị, hành động, trạng thái

#### `Profile.tsx`
- Thông tin sinh viên (avatar, tên, MSSV, lớp)
- Liên kết tài nguyên (Báo cáo, Code, API Doc, Figma)

### Components

#### `DeviceCard.tsx`
```
Props: name, sub, icon, isOn, onToggle, color, isPending, showSpinner

- Toggle switch: trái (OFF, xám) ↔ phải (ON, màu)
- Khi showSpinner: núm toggle thay bằng spinner
- Khi isPending: cursor-wait, click bị chặn
- Màu theo prop: cyan | pink | amber
```

#### `SensorCard.tsx`
```
Props: title, value, icon, colorTheme, live

- Badge LIVE nếu connected
- Màu theo loại: red (nhiệt độ), blue (độ ẩm), amber (ánh sáng)
```

#### `DataTable.tsx`
```
Props: title, data, columns, total, page, totalPages, callbacks, filters, sort, loading

- Tìm kiếm, lọc, sắp xếp cột, spinner loading
- Phân trang + chọn số hàng (10/20/50)
- Trạng thái rỗng
```

---

## 7. Cấu Hình & Môi Trường

### Backend `.env`
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=123456
DB_NAME=iot
PORT=3001
MQTT_BROKER=mqtt://localhost:1884
MQTT_USER=vuthiphuongthao
MQTT_PASS=pthao
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:3001
```

### Vite Dev Proxy (`vite.config.ts`)
```
/api/*  →  http://localhost:3001/api/*
/ws     →  ws://localhost:3001/ws
```

### Docker Compose
| Service | Image | Port |
|---------|-------|------|
| db | MySQL 8.0 | 3306 |
| backend | Node.js custom | 3001 |
| frontend | Nginx + React build | 80 |

---

## 8. Tech Stack

### Backend
| Package | Phiên bản | Mục đích |
|---------|-----------|---------|
| express | ^4.18.3 | Web framework |
| mysql2 | ^3.9.2 | MySQL driver |
| mqtt | ^5.15.1 | MQTT client |
| ws | ^8.18.2 | WebSocket server |
| express-validator | ^7.0.1 | Validate input |
| dotenv | ^16.4.5 | Env variables |
| nodemon | ^3.1.0 | Dev auto-restart |

### Frontend
| Package | Phiên bản | Mục đích |
|---------|-----------|---------|
| react | ^18.2.0 | UI framework |
| typescript | ^5.2.2 | Type safety |
| vite | ^5.1.5 | Build tool |
| @tanstack/react-query | ^5.28.0 | Server state |
| axios | ^1.6.8 | HTTP client |
| tailwindcss | ^3.4.1 | CSS utilities |
| recharts | ^2.12.2 | Biểu đồ |
| lucide-react | ^0.356.0 | Icons |
| clsx + tailwind-merge | - | Class merging |

---

## 9. MQTT Topics

| Topic | Hướng | Payload |
|-------|-------|---------|
| `esp32/sensor_data` | ESP32 → Backend | `{ "temperature": 28.5, "humidity": 65.2, "lux": 320 }` |
| `esp32/led_status` | ESP32 → Backend | `{ "led1": true, "led2": false, "led3": true }` |
| `esp32/led_cmd` | Backend → ESP32 | `{ "led1": true }` (chỉ LED cần thay đổi) |

---

## 10. WebSocket Protocol

Backend broadcast tới tất cả frontend clients:

```json
// Xác nhận thiết bị từ ESP32
{ "type": "device_confirmed", "device_id": 1 }

// Dữ liệu cảm biến mới
{ "type": "sensor_data", "data": { ... } }
```

Frontend kết nối tại `/ws` (Vite proxy trong dev, cùng host trong prod).

---

## 11. Logic Toggle Thiết Bị — Quan Trọng

```
1. User click toggle
2. pendingMap lưu { originalIsOn, targetIsOn, isErrorState=false }
3. Spinner hiện tại trạng thái GỐC (KHÔNG lật toggle)
4. POST /api/devices/:id/action gửi lên backend
5. Backend: transaction cập nhật DB + insert PENDING + publish MQTT
6. ESP32 nhận, thực thi, publish esp32/led_status
7. mqtt.js đánh dấu action SUCCESS, broadcast device_confirmed
8. useDeviceWS nhận → clearPending() + invalidateQueries(['devices'])
9. React Query fetch lại → toggle lật sang trạng thái mới

Nếu không có WS sau 5 giây:
→ patchDeviceAction(action_id, 'failed')
→ Backend revert device_status trong transaction
→ invalidateQueries → spinner tắt, toggle vẫn ở trạng thái gốc
```

**KHÔNG bao giờ dùng optimistic flip.** Toggle chỉ lật khi ESP32 xác nhận.

---

## 12. Khởi Động Dự Án

### Cách 1: Thủ công

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev   # nodemon server.js, port 3001

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev   # Vite dev server, port 5173
```

### Cách 2: Docker Compose

```bash
docker-compose up --build
# Frontend: http://localhost
# Backend API: http://localhost:3001
```

### Yêu cầu
- Node.js >= 18
- MySQL 8.0 (local hoặc Docker)
- MQTT broker (ví dụ: Mosquitto tại port 1884)
- ESP32 đã flash firmware phù hợp

---

## 13. Các Điểm Quan Trọng Cần Nhớ

1. **Không optimistic flip** — Toggle chỉ lật sau khi nhận `device_confirmed` qua WebSocket
2. **Timeout 5 giây** — Nếu ESP32 không phản hồi, action FAILED, DB revert
3. **Startup cleanup** — Khi server khởi động lại, tất cả PENDING action cũ tự động FAILED
4. **MQTT logic** — Chỉ nằm trong `mqtt.js`, không được viết ở chỗ khác
5. **WebSocket broadcast** — Chỉ nằm trong `wsServer.js`
6. **React Query** — Dùng cho tất cả server state, không fetch thủ công nếu đã có hook
7. **Vietnamese UI** — Toàn bộ text UI là tiếng Việt
8. **Transaction safety** — Cập nhật device + insert action trong cùng 1 transaction MySQL
