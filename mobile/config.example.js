// ─────────────────────────────────────────────
//  API Configuration
//     Change this IP to YOUR machine's local IP
//     before running the app.
//
//  How to find your IP:
//    • macOS/Linux : run `ifconfig | grep "inet "`
//    • Windows     : run `ipconfig` in CMD
// ─────────────────────────────────────────────
const API_IP = 'Your IP';
const API_PORT = 'Your Port';

export const API_BASE_URL = `http://${API_IP}:${API_PORT}/api`;
