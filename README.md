# Devis App

A mobile application for managing and generating professional quotes (devis). The frontend is built with React Native (Expo) and the backend is a Laravel REST API backed by MySQL, with JWT authentication and PDF export via Laravel DomPDF.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Authentication](#authentication)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [License](#license)

---

## Overview

Devis App is a full-stack mobile solution that streamlines the process of creating and managing quotations. Users can log in securely, manage clients and products, compose detailed quotes, and export them as PDF files — all from a mobile interface.

---

## Tech Stack

**Frontend**
- React Native with Expo
- expo-linking
- @expo/vector-icons

**Backend**
- Laravel (PHP)
- MySQL
- JWT authentication
- Laravel DomPDF (`barryvdh/laravel-dompdf`) for PDF generation
- PHP Dotenv (`vlucas/phpdotenv`) for environment configuration

---

## Project Structure

```
devis-app/
├── back-end/          # Laravel REST API
│   ├── app/
│   ├── routes/
│   ├── database/
│   └── ...
├── mobile/            # React Native Expo application
│   ├── app/
│   ├── components/
│   └── ...
├── composer.json      # PHP dependencies (Laravel, DomPDF)
├── package.json       # JS dependencies (Expo)
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Node.js >= 18 and npm
- Expo CLI — `npm install -g expo-cli`
- PHP >= 8.1
- Composer
- MySQL >= 5.7 or MariaDB
- Laravel CLI (optional) — `composer global require laravel/installer`

---

### Backend Setup

1. Clone the repository:

```bash
git clone https://github.com/bahasalah255/devis-app.git
cd devis-app
```

2. Navigate to the backend and install PHP dependencies:

```bash
cd back-end
composer install
```

3. Copy the environment file and configure it:

```bash
cp .env.example .env
```

Then edit `.env` with your database and JWT settings:

```env
APP_NAME=DevisApp
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=devis_db
DB_USERNAME=root
DB_PASSWORD=yourpassword

JWT_SECRET=your_jwt_secret_key
```

4. Generate the application key and JWT secret:

```bash
php artisan key:generate
php artisan jwt:secret
```

5. Run database migrations (and seeders if available):

```bash
php artisan migrate --seed
```

6. Start the development server:

```bash
php artisan serve
```

The API will be available at `http://localhost:8000`.

---

### Frontend Setup

1. Navigate to the mobile directory:

```bash
cd mobile
npm install
```

2. Update the API base URL in your configuration file (e.g., `constants/api.js` or similar) to point to your backend:

```js
export const API_URL = "http://192.168.x.x:8000/api";
```

> Use your machine's local IP address (not `localhost`) so that the Expo app on your phone can reach the backend.

3. Start the Expo development server:

```bash
npx expo start
```

4. Scan the QR code with the Expo Go app on your Android or iOS device, or press `a` / `i` to open on an emulator.

---

## Authentication

The API uses JWT (JSON Web Tokens) for stateless authentication. After a successful login, the server returns a token that must be included in the `Authorization` header of all subsequent protected requests:

```
Authorization: Bearer <your_token>
```

Tokens are verified server-side on every protected route via Laravel middleware.

---

## Features

- User registration and login with JWT authentication
- Create, view, update, and delete quotes (devis)
- Manage clients and line items within each quote
- Automatic total calculation (HT, TVA, TTC)
- Export quotes as PDF documents using Laravel DomPDF
- Clean, mobile-first UI built with React Native and Expo

---

## API Endpoints

| Method | Endpoint               | Description                   | Auth Required |
|--------|------------------------|-------------------------------|---------------|
| POST   | `/api/auth/register`   | Register a new user           | No            |
| POST   | `/api/auth/login`      | Login and receive JWT token   | No            |
| POST   | `/api/auth/logout`     | Invalidate current token      | Yes           |
| GET    | `/api/devis`           | List all quotes               | Yes           |
| POST   | `/api/devis`           | Create a new quote            | Yes           |
| GET    | `/api/devis/{id}`      | Get a specific quote          | Yes           |
| PUT    | `/api/devis/{id}`      | Update a quote                | Yes           |
| DELETE | `/api/devis/{id}`      | Delete a quote                | Yes           |
| GET    | `/api/devis/{id}/pdf`  | Export a quote as PDF         | Yes           |
| GET    | `/api/clients`         | List all clients              | Yes           |
| POST   | `/api/clients`         | Create a new client           | Yes           |

> Note: Refer to `routes/api.php` in the backend for the full and authoritative list of routes.

---

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2025 bahasalah255

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
