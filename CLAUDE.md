# CLAUDE.md — IoT Dashboard

## 1. Mission

You are working on a **full-stack real-time IoT dashboard**.

Goal:
- Monitor ESP32 sensors in real-time
- Control LED devices reliably
- Ensure smooth UX with confirmation-based toggle
- Maintain clean, scalable architecture

UI:
- Theme: Disney / pink
- Language: Vietnamese

---

## 2. Architecture Overview

### Flow: Sensor System

ESP32 → MQTT → backend/mqtt.js → MySQL → SSE → frontend → UI

### Flow: Device Control System

UI toggle → API → MQTT publish → ESP32 → confirm → WebSocket → UI flip + DB sync

---

## 3. Tech Stack

Frontend:
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- React Query (server state)
- SSE (real-time sensor streaming)
- WebSocket (device confirmation)

Backend:
- Node.js + Express
- MQTT client
- WebSocket server (ws package)

Database:
- MySQL

---

## 4. Project Structure

### Backend (/backend)

- server.js  
  → Entry point, mounts routes, initializes MQTT, attaches WebSocket server

- mqtt.js  
  → Core realtime logic:
  - subscribe ESP32 topics
  - parse sensor data
  - write to DB
  - confirm device actions
  - broadcast `device_confirmed` via WebSocket

- wsServer.js  
  → WebSocket server module:
  - `attachWS(server)` — attach WS to the HTTP server at path `/ws`
  - `broadcast(data)` — push JSON to all connected clients
  - used by mqtt.js to notify frontend of ESP32 confirmations

- controllers/  
  → Business logic

- routes/  
  → API endpoints

---

### Frontend (/frontend/src)

Pages:
- Dashboard
- SensorData
- DeviceHistory
- Profile

Components:
- SensorCard (LIVE badge)
- DeviceCard (confirmation-based toggle with spinner)
- DataTable (pagination, sorting)
- Sidebar, Header

Hooks:
- useSSE → real-time sensor streaming
- useDeviceWS → WebSocket listener for device confirmation events
- React Query hooks → API communication

---

## 5. Database Schema

- sensors(id, name, type, unit)
- sensor_data(data_id, sensor_id, value, recorded_at)
- devices(device_id, device_name, current_status)
- device_actions(action_id, device_id, action, status)

device_actions.status values:
- `PENDING` — action sent, waiting for ESP32 confirmation
- `success` — ESP32 confirmed the command
- `failed` — no confirmation within 3s, DB reverted

---

## 6. Key Features

- Real-time sensor streaming (SSE + MQTT)
- Confirmation-based device toggle (WebSocket-driven)
- Auto-fail if no ESP32 confirmation in 3s
- Paginated + sortable + filterable tables with status badges
- ESP32 integration

---

## 7. Modules

### 7.1 Sensor System

- MQTT ingest
- Store DB
- Stream via SSE
- Render UI

### 7.2 Device Control System

- User clicks toggle → spinner shown at **original** state (no flip yet)
- API request → MQTT command → ESP32
- ESP32 confirms → MQTT handler → DB marked `success` → WebSocket `device_confirmed` broadcast
- Frontend receives WS event → cancel revert timer → `invalidateQueries` → React Query fetches new DB state → toggle flips
- If no WS event in 3s → `patchDeviceAction('failed')` → DB reverts → `invalidateQueries` → toggle stays at original

---

## 8. Important Entry Points

- /backend/server.js
- /backend/mqtt.js
- /backend/wsServer.js
- /frontend/src/pages/Dashboard.tsx
- /frontend/src/hooks/useSSE.ts
- /frontend/src/hooks/useDeviceWS.ts
- /frontend/src/components/DeviceCard.tsx

---

## 9. Coding Rules (VERY IMPORTANT)

### General

- ALWAYS follow existing code style
- DO NOT introduce new patterns unless necessary
- KEEP code minimal and readable
- AVOID over-engineering

---

### Frontend Rules

- Use **React Query** for all server state
- NEVER fetch manually if hook exists
- Device toggle uses **confirmation-based updates** (NOT optimistic flip)
- Toggle stays at original state with spinner until ESP32 confirms via WebSocket
- Keep UI responsive and non-blocking
- Components must be reusable

---

### Backend Rules

- Keep controllers thin and clear
- MQTT logic MUST stay inside mqtt.js
- WebSocket broadcast logic MUST stay inside wsServer.js
- NEVER mix HTTP logic with MQTT handling
- Validate all incoming data

---

### Realtime Rules

- SSE = push sensor data to frontend
- MQTT = device communication (backend ↔ ESP32)
- WebSocket = push device confirmation events to frontend
- DO NOT confuse their roles

---

## 10. Critical Behaviors

### Device Toggle Logic

1. User clicks toggle
2. Toggle shows spinner at **original** state (does NOT flip yet)
3. API request sent → backend updates DB to target, inserts PENDING action, publishes MQTT
4. ESP32 receives MQTT command, executes, publishes confirmation to `esp32/led_status`
5. Backend MQTT handler marks action `success`, broadcasts `{ type: 'device_confirmed', device_id }` via WebSocket
6. Frontend `useDeviceWS` receives event → cancels 3s revert timer → `invalidateQueries` → toggle flips to new state
7. If no WebSocket event in 3s → `patchDeviceAction('failed')` → DB reverts device to original status → `invalidateQueries` → spinner clears, toggle stays at original

NEVER break this flow.  
NEVER revert to optimistic flip (toggle must NOT change before confirmation arrives).

---

### Pending State Visual

- ON → trying OFF: toggle stays **colored** (ON color) + spinner
- OFF → trying ON: toggle stays **gray** (OFF color) + spinner

---

### Device History Status Badges

- `PENDING` → orange spinner badge "Đang chờ"
- `success` → green/gray dot + "Bật" / "Tắt"
- `failed` → rose badge "Thất bại"

---

## 11. WebSocket Protocol

Backend broadcasts on ESP32 confirmation:
```json
{ "type": "device_confirmed", "device_id": 1 }
```

Frontend (`useDeviceWS`) listens at `/ws` (proxied by Vite in dev, same host in prod).  
Only `device_confirmed` type exists currently. Add new types here if extending.

---

## 12. Debug Strategy

When something fails:

### Step 1: Identify layer
- Frontend?
- Backend?
- MQTT?
- WebSocket?
- Database?

---

### Step 2: Check flow

For sensors:
ESP32 → MQTT → DB → SSE → UI

For devices:
UI click → API → MQTT → ESP32 → MQTT confirm → DB update → WebSocket broadcast → UI flip

---

### Step 3: Common issues

- MQTT not receiving → check broker connection in mqtt.js
- SSE not emitting → check routes/events.js interval and client set
- WebSocket not firing → check wsServer.js `broadcast`, check Vite `/ws` proxy, check `useDeviceWS` connection
- Toggle not flipping after click → check `device_confirmed` WS message is arriving; check `clearPending` in Dashboard.tsx
- Toggle spinner never clears → 3s timer may have fired: check `patchDeviceAction` call and `invalidateQueries`
- React Query cache stale → call `qc.invalidateQueries({ queryKey: ['devices'] })`

---

## 13. Development Strategy

When implementing new feature:

1. Understand which module it belongs to
2. Identify affected layers
3. Reuse existing patterns
4. Keep consistency with current architecture

---

## 14. What NOT to do

- Do NOT rewrite large parts of the system
- Do NOT change architecture without reason
- Do NOT duplicate logic
- Do NOT bypass MQTT for device control
- Do NOT flip the toggle before ESP32 confirms (no optimistic flip)
- Do NOT put WebSocket broadcast logic outside wsServer.js

---

## 15. How to Start Working

When session starts:

1. Read this file (CLAUDE.md)
2. Understand architecture and flows
3. Ask for specific files if needed
4. Then implement tasks

---

## 16. Current State

- System is stable
- MQTT integration working
- SSE streaming active for sensor data
- WebSocket integrated for device confirmation
- Toggle uses confirmation-based flow (spinner at original state → flip on ESP32 confirm)
- Device history shows Đang chờ / Thành công / Thất bại badges
