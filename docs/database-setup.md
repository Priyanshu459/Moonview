# PostgreSQL Setup Documentation
# Moonview — Local Development

## Requirements

- PostgreSQL 17 (installed via winget)
- psql CLI available in PATH

---

## Step 1: Verify PostgreSQL Installation

After installation, verify PostgreSQL is running:

```powershell
# Check if PostgreSQL service is running
Get-Service -Name "postgresql*"

# Verify psql is accessible (may need to restart terminal or re-open after winget install)
psql --version
```

If `psql` is not found, add PostgreSQL to your PATH:
```
C:\Program Files\PostgreSQL\17\bin
```

---

## Step 2: Connect as the Default Admin

```powershell
# Connect as the default postgres superuser
psql -U postgres
```

You will be prompted for the password you set during installation.

---

## Step 3: Create Database and Application User

Run these SQL commands in the psql prompt:

```sql
-- Create the application database
CREATE DATABASE moonview_dev;

-- Create application user with a STRONG password
-- Replace 'CHANGE_THIS_PASSWORD' with a real secure password
CREATE USER moonview_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE moonview_dev TO moonview_user;

-- Grant schema privileges (required for Prisma migrations)
\c moonview_dev
GRANT ALL ON SCHEMA public TO moonview_user;
GRANT CREATE ON SCHEMA public TO moonview_user;

-- Verify
\du
\l

-- Exit
\q
```

---

## Step 4: Configure Environment Variables

Copy the example env file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` and update the DATABASE_URL:

```env
DATABASE_URL="postgresql://moonview_user:YOUR_PASSWORD@localhost:5432/moonview_dev?schema=public"
```

Also generate and set secure values for:
- `JWT_SECRET` — 64 random hex chars:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- `COOKIE_SECRET` — 32 random hex chars:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `ADMIN_EMAIL` — your admin email
- `ADMIN_PASSWORD` — a strong password (min 12 chars)

---

## Step 5: Install Dependencies and Generate Prisma Client

```powershell
# From project root
npm install

# Generate Prisma client
npm run db:generate
```

---

## Step 6: Run Migrations

```powershell
# Create and apply the initial migration
npm run db:migrate:dev -- --name init
```

---

## Step 7: Seed the Database

```powershell
# Creates admin user + seeds genres/categories
npm run db:seed
```

---

## Step 8: Verify Connection

```powershell
# Start the backend
npm run dev:backend
```

Open http://localhost:3001/api/health — you should see:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "services": {
      "database": { "status": "ok", "latencyMs": 5 }
    }
  }
}
```

---

## Common Issues

### psql not found after winget install
Restart your terminal. If still not found, manually add to PATH:
`C:\Program Files\PostgreSQL\17\bin`

### Authentication failed
Double-check the password in `backend\.env` matches what you set for `moonview_user`.

### pg_hba.conf issues
By default, local connections use `scram-sha-256`. If you get auth errors, verify with:
```powershell
psql -U postgres -c "SHOW hba_file;"
```

### Prisma migration fails
Ensure `moonview_user` has CREATE privileges on the public schema (Step 3 above).

---

## Production Notes (Oracle Cloud)

On the Oracle VM:
1. Install PostgreSQL 17 via `apt` (Ubuntu)
2. Create the same user/database structure
3. Bind PostgreSQL to localhost only (127.0.0.1) — never expose port 5432 to the internet
4. Use a strong password from a secrets manager
5. Configure `pg_hba.conf` to only allow local connections
6. Set up regular backups via pg_dump or pgBackRest
