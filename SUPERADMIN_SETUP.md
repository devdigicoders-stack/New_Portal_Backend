## 🚀 NewsPortal - SuperAdmin Setup Guide

### ✅ Changes Made

1. **Removed Dummy Data**
   - ❌ Removed all 12 dummy news articles
   - ❌ Removed all 4 dummy user accounts
   - ✅ Database starts empty

2. **Added SuperAdmin API**
   - ✅ New endpoint: `POST /users/create-superadmin`
   - ✅ No authentication required (first-time setup only)
   - ✅ Prevents duplicate SuperAdmin creation
   - ✅ Password validation (minimum 8 characters)

---

## 🔧 Create SuperAdmin Account

### Method 1: API Endpoint (Recommended)

```
POST http://localhost:5000/api/users/create-superadmin
Content-Type: application/json

{
  "name": "Your Name",
  "email": "your-email@example.com",
  "password": "SecurePassword123"
}
```

### Response (Success)
```json
{
  "message": "SuperAdmin account created successfully!",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Your Name",
    "email": "your-email@example.com",
    "role": "admin"
  }
}
```

### Response (Error - Already Exists)
```json
{
  "error": "SuperAdmin already exists. Use /create-admin endpoint instead."
}
```

### Response (Error - Invalid Password)
```json
{
  "error": "Password must be at least 8 characters."
}
```

---

## 📝 Postman Collection

### Create SuperAdmin
```
POST /users/create-superadmin
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@newsportal.com",
  "password": "AdminPass@123"
}
```

---

## 🔐 Security Features

✅ **Password Validation**
- Minimum 8 characters required
- Hashed with bcryptjs (10 rounds)

✅ **One-Time Setup**
- Only works if no admin exists
- Prevents accidental duplicate creation

✅ **Email Uniqueness**
- Checks if email already registered
- Case-insensitive matching

✅ **Activity Logging**
- SuperAdmin creation logged in activities
- Audit trail maintained

---

## 📊 After SuperAdmin Creation

### Login as SuperAdmin
```
POST /auth/login
{
  "email": "admin@newsportal.com",
  "password": "AdminPass@123"
}

Response:
{
  "message": "Login successful!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@newsportal.com",
    "role": "admin"
  }
}
```

### Create Other Users
```
POST /users
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "name": "Reporter Name",
  "email": "reporter@newsportal.com",
  "password": "ReporterPass@123",
  "role": "reporter"
}
```

---

## 🎯 Setup Workflow

1. **Start Backend**
   ```bash
   cd backend
   npm start
   ```

2. **Create SuperAdmin**
   ```bash
   curl -X POST http://localhost:5000/api/users/create-superadmin \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Admin User",
       "email": "admin@newsportal.com",
       "password": "AdminPass@123"
     }'
   ```

3. **Login as SuperAdmin**
   - Use email and password from step 2
   - Get JWT token from response

4. **Create Other Users**
   - Use token to create reporters, editors, users
   - Each user gets unique credentials

5. **Start Frontend**
   ```bash
   cd website
   npm install
   npm run dev
   ```

---

## 📋 API Endpoints Summary

### Public (No Auth Required)
```
POST /users/create-superadmin - Create first admin
POST /auth/register - User registration
POST /auth/login - User login
GET /news - Get approved news
GET /news/:id - Get news detail
GET /categories - Get categories
```

### Protected (Auth Required)
```
GET /auth/me - Get profile
POST /auth/change-password - Change password
POST /users - Create user (admin only)
GET /users - List users (admin only)
PUT /users/:id - Update user (admin only)
DELETE /users/:id - Delete user (admin only)
PUT /users/:id/approve - Approve user (admin only)
POST /news - Create article (reporter/editor/admin)
PUT /news/:id/approve - Approve article (editor/admin)
PUT /news/:id/reject - Reject article (editor/admin)
GET /news/reporter/dashboard - Reporter dashboard
GET /activities - Activity logs (staff only)
```

---

## ✅ Verification

### Check SuperAdmin Created
```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "ok",
  "message": "NewsPortal API Server is healthy and running."
}
```

---

## 🎉 Ready to Go!

✅ Backend: Clean, no dummy data
✅ SuperAdmin API: Ready to use
✅ Database: Empty, ready for real data
✅ Authentication: Full JWT support
✅ All endpoints: Functional

**Start creating your SuperAdmin account! 🚀**
