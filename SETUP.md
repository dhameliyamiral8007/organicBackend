# Quick Setup Guide

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Set Up PostgreSQL Database

1. Make sure PostgreSQL is installed and running on your machine
2. Create a database:
   ```sql
   CREATE DATABASE ecommerce_db;
   ```

## Step 3: Create .env File

Create a `.env` file in the root directory with the following content:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
```

**Important:** Replace `your_postgres_password` with your actual PostgreSQL password and change `JWT_SECRET` to a secure random string.

## Step 4: Start the Server

For development (with auto-reload):
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start on `http://localhost:3000`

## Step 5: Test the API

### Register a User
```bash
POST http://localhost:3000/api/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "address": "123 Main St"
}
```

### Login as User
```bash
POST http://localhost:3000/api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Register an Admin
```bash
POST http://localhost:3000/api/admins/register
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "admin123"
}
```

### Login as Admin
```bash
POST http://localhost:3000/api/admins/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

## Database Tables

The application will automatically create the following tables:
- `users` - Stores user information
- `admins` - Stores admin information

Tables are created automatically when the server starts.
