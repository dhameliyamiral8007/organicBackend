# E-commerce Backend API

A Node.js backend application for an e-commerce store with PostgreSQL database, featuring user and admin authentication systems.

## Features

- ✅ User registration and login
- ✅ Admin registration and login
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ User profile management
- ✅ Admin profile management
- ✅ Protected routes with middleware
- ✅ Input validation
- ✅ PostgreSQL database integration

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

## Project Structure

```
organiBackend/
├── config/
│   └── database.js          # PostgreSQL connection
├── controllers/
│   ├── userController.js    # User request handlers
│   └── adminController.js   # Admin request handlers
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   └── validation.js        # Input validation middleware
├── models/
│   ├── User.js              # User database model
│   └── Admin.js             # Admin database model
├── routes/
│   ├── userRoutes.js        # User routes
│   └── adminRoutes.js       # Admin routes
├── services/
│   ├── userService.js       # User business logic
│   └── adminService.js      # Admin business logic
├── .env.example             # Environment variables template
├── index.js                 # Main server file
└── package.json             # Dependencies
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd organiBackend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   - Install PostgreSQL on your local machine
   - Create a new database:
     ```sql
     CREATE DATABASE ecommerce_db;
     ```

4. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update the values in `.env`:
     ```env
     PORT=3000
     NODE_ENV=development
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=ecommerce_db
     DB_USER=postgres
     DB_PASSWORD=your_password
     JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
     JWT_EXPIRE=7d
     ```

5. **Start the server**
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

## API Endpoints

### User Routes

#### Register User
- **POST** `/api/users/register`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "+1234567890",
    "address": "123 Main St"
  }
  ```

#### Login User
- **POST** `/api/users/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

#### Get User Profile (Protected)
- **GET** `/api/users/profile`
- **Headers:** `Authorization: Bearer <token>`

#### Update User Profile (Protected)
- **PUT** `/api/users/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "name": "John Updated",
    "phone": "+1234567890",
    "address": "456 New St"
  }
  ```

#### Get All Users (Admin Only)
- **GET** `/api/users`
- **Headers:** `Authorization: Bearer <admin_token>`

### Admin Routes

#### Register Admin
- **POST** `/api/admins/register`
- **Body:**
  ```json
  {
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123"
  }
  ```

#### Login Admin
- **POST** `/api/admins/login`
- **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "admin123"
  }
  ```

#### Get Admin Profile (Protected)
- **GET** `/api/admins/profile`
- **Headers:** `Authorization: Bearer <token>`

#### Update Admin Profile (Protected)
- **PUT** `/api/admins/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "name": "Admin Updated"
  }
  ```

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

Tokens are returned upon successful login/registration and expire after the time specified in `JWT_EXPIRE` (default: 7 days).

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]  // For validation errors
}
```

## Development

- **Development mode:** `npm run dev` (uses nodemon for auto-reload)
- **Production mode:** `npm start`

## License

ISC
