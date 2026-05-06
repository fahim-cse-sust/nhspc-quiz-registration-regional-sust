# NHSPC Quiz Registration — BCC Govt Regional, Sylhet

A minimalistic, modern and responsive Next.js full-stack website for registering students for the NHSPC quiz. Admins can register students, allocate rooms, and track available seats. Super Admin can manage rooms and capacities.

This version uses **MongoDB** as the database with **Prisma ORM**.

## Main Features

- Email/password sign-up and login for admins
- Secure password hashing with bcrypt
- JWT-based HTTP-only cookie session
- Role-based access: `SUPER_ADMIN` and `ADMIN`
- Super Admin room management
- Student registration with birth certificate number, email, phone and room allocation
- MongoDB-backed room capacity check using an atomic allocated-seat counter
- Dashboard cards, recent registrations and room availability
- Student search, room filter, edit and delete
- CSV export for all students and room-wise allocation
- Responsive layout with clean, official, minimal UI
- Dark/light mode toggle

## Folder Structure

```txt
nhspc-registration-nextjs/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ src/
│  ├─ actions/              # Server actions for auth, room and student CRUD
│  ├─ app/                  # Next.js App Router pages and API routes
│  ├─ components/           # Reusable UI, layout and form components
│  └─ lib/                  # Prisma, auth helpers, validation, CSV helpers
├─ middleware.ts            # Route protection and Super Admin room guard
├─ package.json
├─ .env.example
└─ README.md
```

## Database Design

The Prisma schema contains three main models:

```txt
User
- id, name, email, password, role, createdAt, updatedAt

Room
- id, name, capacity, allocatedSeats, createdAt, updatedAt

Student
- id, name, institution, className, birthCertificateNumber, email, phone, roomId, registeredById, note, createdAt, updatedAt
```

For MongoDB, Prisma stores IDs as MongoDB `ObjectId` values using:

```prisma
@id @default(auto()) @map("_id") @db.ObjectId
```

## Required Software

Install these first:

1. **Node.js LTS**
2. **VS Code**
3. **MongoDB** — local MongoDB Community Server or MongoDB Atlas
4. VS Code extensions recommended:
   - Prisma
   - Tailwind CSS IntelliSense
   - ESLint
   - Prettier

## Installation in VS Code

Open VS Code, then open the project folder. Open the VS Code terminal and run:

```bash
npm install
```

This installs all required packages from `package.json`, including:

```bash
npm install next react react-dom @prisma/client@6.19.2 bcryptjs jose zod lucide-react sonner clsx tailwind-merge
npm install -D typescript @types/node @types/react @types/react-dom prisma@6.19.2 tsx tailwindcss @tailwindcss/postcss eslint eslint-config-next @types/bcryptjs
```

You normally only need to run `npm install` because the packages are already listed in `package.json`.

## Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then edit `.env` and update your MongoDB connection string.

### Local MongoDB example

```env
DATABASE_URL="mongodb://127.0.0.1:27017/nhspc_registration"
JWT_SECRET="your-long-random-secret"
SUPER_ADMIN_EMAIL="superadmin@nhspc-sylhet.gov.bd"
SUPER_ADMIN_PASSWORD="ChangeMe123!"
```

### MongoDB Atlas example

```env
DATABASE_URL="mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/nhspc_registration?retryWrites=true&w=majority"
JWT_SECRET="your-long-random-secret"
SUPER_ADMIN_EMAIL="superadmin@nhspc-sylhet.gov.bd"
SUPER_ADMIN_PASSWORD="ChangeMe123!"
```

## Database Setup for MongoDB

For MongoDB with Prisma, use `db push` instead of SQL-style migrations:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

The seed command creates the Super Admin account using the values from `.env`.

You can also open Prisma Studio:

```bash
npx prisma studio
```

## Run the Website

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Default Super Admin Login

From `.env.example`:

```txt
Email: superadmin@nhspc-sylhet.gov.bd
Password: ChangeMe123!
```

Change these before using the website in real work.

## Important Pages

```txt
/login
/signup
/dashboard
/students
/students/new
/students/[id]/edit
/rooms
/rooms/new
/rooms/[id]/edit
```

`/rooms` pages are only accessible to Super Admin.

## CSV Export

All students:

```txt
/api/students/export
```

Room filtered students:

```txt
/api/students/export?roomId=ROOM_ID
```

Room summary:

```txt
/api/rooms/export
```

## How Room Capacity Works in MongoDB

Each room has:

```txt
capacity
allocatedSeats
```

When an admin registers a student, the app first reserves one seat in the selected room using an atomic MongoDB update through Prisma. If the room is full, registration is stopped. If student creation fails because of duplicate birth certificate number, email or phone number, the reserved seat is released again.

This avoids normal overbooking problems when multiple admins are registering students at the same time.

## Useful Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production build
npm run lint         # Run ESLint
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push Prisma schema to MongoDB
npm run db:seed      # Create/update Super Admin
npx prisma studio    # Open database UI
```

## Production Notes

Before deployment:

- Use a strong `JWT_SECRET`.
- Change the seeded Super Admin password.
- Use MongoDB Atlas or another managed MongoDB service.
- Run `npx prisma db push` during setup or deployment.
- Use HTTPS so cookies remain secure.
- Review access control based on your organisation's final policy.


## Prisma version note

This project is pinned to Prisma 6.19.2 because the schema uses the Prisma 6 datasource style with `url = env("DATABASE_URL")`. Do not install `prisma@latest` or `@prisma/client@latest` unless you also migrate the project to Prisma 7 configuration using `prisma.config.ts`.

## Quiz Marks and Rank List Update

This version includes a new **Quiz Marks** module for the SUST regional quiz.

### New features

- New protected dashboard page: `/quiz`
- Super admin can set the **total quiz mark**.
- Admin and super admin can enter or update each student’s quiz mark.
- Server-side validation prevents any mark above the total quiz mark.
- Super admin cannot reduce the total mark below the highest already-entered student mark.
- Automatic **Top 10 Rank List** is generated from saved marks.
- Dashboard now shows marked scripts and a live top-rank preview.
- Student CSV export now includes the quiz mark.
- Responsive layout with light animations and hover effects.

### Important after replacing the files

Because the database schema has been updated, run:

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run db:seed
npm run dev
```

The seed command also creates the default quiz configuration with total mark `50`. The super admin can change this later from the **Quiz Marks** page.
