# Tech Stack & Dependency Audit Log

**Project Name**: WiFi Admin Portal
**Version**: v1.0.2
**Date**: 2026-01-29

이 문서는 프로젝트에서 사용 중인 주요 기술 스택과 라이브러리, 그리고 해당 버전을 기록합니다. 보안 취약점 점검 및 유지보수 시 참고하시기 바랍니다.

## 1. System Environment
| Component | Version | Description |
|-----------|---------|-------------|
| **OS** | Linux | Server Operating System |
| **Runtime** | Node.js v18.19.1 | JavaScript Runtime Environment |
| **Database** | MySQL (via mysql2) | RDBMS |

---

## 2. Backend
**Path**: `/backend`
**Framework**: Express.js

### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | Web Framework (Latest v5 pre-release) |
| `mysql2` | ^3.15.3 | MySQL Client for Node.js |
| `jsonwebtoken` | ^9.0.3 | JWT Authentication & Verification |
| `bcryptjs` | ^3.0.3 | Password Hashing (Security) |
| `helmet` | ^8.1.0 | Security Headers Middleware |
| `express-rate-limit` | ^8.2.1 | API Rate Limiting (Brute-force protection) |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing |
| `compression` | ^1.8.1 | Gzip Compression |
| `dotenv` | ^17.2.3 | Environment Variable Management |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `nodemon` | ^3.1.11 | Development Server Auto-restart |

---

## 3. Frontend
**Path**: `/frontend`
**Framework**: React (Vite)

### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.0 | UI Library |
| `react-dom` | ^19.2.0 | DOM Renderer for React |
| `react-router-dom` | ^6.28.0 | Routing |
| `axios` | ^1.13.2 | HTTP Client |
| `lucide-react` | ^0.559.0 | Scalable Vector Icons |
| `chart.js` | ^4.5.1 | Charting Library (Core) |
| `react-chartjs-2` | ^5.3.1 | React wrapper for Chart.js |
| `framer-motion` | ^12.23.26 | Animation Library |

### Dev Dependencies (Build Tools)
| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^5.4.11 | Build Tool & Dev Server |
| `eslint` | ^9.39.1 | Linter |
| `@vitejs/plugin-react` | ^4.3.3 | Vite React Plugin |
| `globals` | ^16.5.0 | Global variables for ESLint |

---

## 4. Security Checklist (As of v1.0.2)
- [x] **Authentication**: JWT (`jsonwebtoken`) + BCrypt (`bcryptjs`)
- [x] **Headers**: Helmet (`helmet`) applied
- [x] **Rate Limiting**: Applied to sensitive routes (`express-rate-limit`)
- [x] **Data Sanitation**: MySQL2 Parameterized Queries (Prevent SQL Injection)
- [x] **CORS**: Configurable via environment variables
- [ ] **Dependency Audit**: Conduct `npm audit` periodically
