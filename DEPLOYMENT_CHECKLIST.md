# Deployment Checklist

This document outlines everything needed to deploy the VIPO Agents application to production.

---

## Environment Variables

### Required

These variables **must** be set for the application to function:

| NAME          | Description               | Used in                                                                         | Notes                                  |
| ------------- | ------------------------- | ------------------------------------------------------------------------------- | -------------------------------------- |
| `MONGODB_URI` | MongoDB connection string | `lib/db.js`, `lib/mongoose.js`, `lib/dbConnect.js`                              | Use MongoDB Atlas for production       |
| `MONGODB_DB`  | Database name             | `lib/db.js`, `lib/mongoose.js`                                                  | Default: `vipo`                        |
| `JWT_SECRET`  | Secret key for JWT tokens | `lib/auth.js`, `lib/auth/server.js`, `lib/auth/createToken.js`, `middleware.js` | Use a strong random string (32+ chars) |

### Payment (PayPlus)

| NAME                     | Description                    | Used in                 | Notes                                          |
| ------------------------ | ------------------------------ | ----------------------- | ---------------------------------------------- |
| `PAYPLUS_API_KEY`        | PayPlus API key                | `lib/payplus/client.js` | Required for payments                          |
| `PAYPLUS_SECRET`         | PayPlus API secret             | `lib/payplus/client.js` | Required for payments                          |
| `PAYPLUS_WEBHOOK_SECRET` | Webhook signature verification | `lib/payplus/client.js` | Recommended for production                     |
| `PAYPLUS_BASE_URL`       | PayPlus API base URL           | `lib/payplus/client.js` | Default: `https://restapiv2.payplus.co.il/api` |
| `PAYPLUS_CALLBACK_URL`   | Webhook callback URL           | `lib/payplus/client.js` | Optional override                              |

### SMS/OTP (Twilio)

| NAME                 | Description         | Used in       | Notes                                   |
| -------------------- | ------------------- | ------------- | --------------------------------------- |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID  | `lib/auth.js` | Required for OTP                        |
| `TWILIO_AUTH_TOKEN`  | Twilio Auth Token   | `lib/auth.js` | Required for OTP                        |
| `TWILIO_FROM_NUMBER` | Sender phone number | `lib/auth.js` | Format: `+972...` or `whatsapp:+972...` |

### WhatsApp Notifications

| NAME                           | Description                 | Used in                             | Notes                      |
| ------------------------------ | --------------------------- | ----------------------------------- | -------------------------- |
| `WHATSAPP_TOKEN`               | WhatsApp Business API token | `lib/notifications/sendWhatsApp.js` | Optional                   |
| `WHATSAPP_PHONE_ID`            | WhatsApp Phone ID           | `lib/notifications/sendWhatsApp.js` | Optional                   |
| `NEXT_PUBLIC_MANAGER_WHATSAPP` | Manager WhatsApp number     | `lib/whatsapp.ts`                   | For customer support links |

### Media (Cloudinary)

| NAME                    | Description           | Used in             | Notes                      |
| ----------------------- | --------------------- | ------------------- | -------------------------- |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `lib/cloudinary.js` | Required for image uploads |
| `CLOUDINARY_API_KEY`    | Cloudinary API key    | `lib/cloudinary.js` | Required for image uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `lib/cloudinary.js` | Required for image uploads |

### Email (SMTP)

| NAME          | Description          | Used in        | Notes                              |
| ------------- | -------------------- | -------------- | ---------------------------------- |
| `SMTP_HOST`   | SMTP server host     | `lib/email.js` | Optional - for email notifications |
| `SMTP_PORT`   | SMTP server port     | `lib/email.js` | Default: 587                       |
| `SMTP_USER`   | SMTP username        | `lib/email.js` | Optional                           |
| `SMTP_PASS`   | SMTP password        | `lib/email.js` | Optional                           |
| `SMTP_SECURE` | Use TLS              | `lib/email.js` | `true` for port 465                |
| `EMAIL_FROM`  | Sender email address | `lib/email.js` | Optional                           |

### Application

| NAME                       | Description             | Used in                              | Notes                          |
| -------------------------- | ----------------------- | ------------------------------------ | ------------------------------ |
| `PUBLIC_URL`               | Public base URL         | Various API routes                   | e.g., `https://yourdomain.com` |
| `NEXT_PUBLIC_BASE_URL`     | Client-side base URL    | Client components                    | Same as PUBLIC_URL             |
| `NEXT_PUBLIC_COMPANY_NAME` | Company name for quotes | `app/api/orders/[id]/quote/route.js` | Default: `VIPO`                |
| `NODE_ENV`                 | Environment mode        | Various                              | Set to `production` for prod   |

### Admin Seeding (Development Only)

| NAME             | Description            | Used in                      | Notes             |
| ---------------- | ---------------------- | ---------------------------- | ----------------- |
| `ADMIN_EMAIL`    | Default admin email    | `app/api/seed/init/route.js` | For initial setup |
| `ADMIN_PASSWORD` | Default admin password | `app/api/seed/init/route.js` | For initial setup |

---

## Health Check

**Endpoint:** `GET /api/health`

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "version": "1.0.0"
}
```

Use this endpoint for:

- Load balancer health checks
- Uptime monitoring (e.g., UptimeRobot, Pingdom)
- Deployment verification

---

## Build Commands

| Command         | Description              |
| --------------- | ------------------------ |
| `npm install`   | Install dependencies     |
| `npm run build` | Build for production     |
| `npm start`     | Start production server  |
| `npm run dev`   | Start development server |

### Pre-deployment Checks

Run these commands before deploying:

```bash
npm run lint:eslint    # Check for linting errors
npm run typecheck      # Check TypeScript types
npx prettier --check . # Check code formatting
npm run build          # Verify build succeeds
```

---

## Runtime Requirements

### Node.js

- **Minimum version:** 18.x LTS
- **Recommended:** 20.x LTS

### External Services

| Service       | Purpose              | Required                  |
| ------------- | -------------------- | ------------------------- |
| MongoDB Atlas | Database             | ✅ Yes                    |
| PayPlus       | Payment processing   | ✅ Yes (for payments)     |
| Twilio        | SMS/OTP verification | ⚠️ Optional (for OTP)     |
| Cloudinary    | Image hosting        | ⚠️ Optional (for uploads) |
| SMTP Server   | Email notifications  | ⚠️ Optional               |

---

## Deployment Targets

### Vercel (Recommended)

Next.js native platform with automatic builds.

1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy
4. Use one deployment trigger only: push to `main` (avoid running `vercel --prod` for the same change)

**Settings:**

- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`

### Render

1. Create a new Web Service
2. Connect your repository
3. Set environment variables
4. Configure:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Pre-Deployment Checklist

- [ ] All required environment variables are set
- [ ] MongoDB Atlas cluster is configured and accessible
- [ ] PayPlus credentials are configured (if using payments)
- [ ] `npm run build` passes without errors
- [ ] Health check endpoint responds at `/api/health`
- [ ] SSL/HTTPS is configured
- [ ] Domain DNS is configured
- [ ] Backup strategy is in place for MongoDB

---

## Post-Deployment Verification

1. **Health Check:** `curl https://yourdomain.com/api/health`
2. **Login Test:** Verify admin can log in
3. **Database Connection:** Check logs for MongoDB connection
4. **Payment Test:** Run a test transaction (sandbox mode)

---

## Troubleshooting

### Build Fails

- Check for TypeScript errors: `npm run typecheck`
- Check for ESLint errors: `npm run lint:eslint`
- Verify all imports are correct

### Database Connection Issues

- Verify `MONGODB_URI` is correct
- Check IP whitelist in MongoDB Atlas
- Ensure network connectivity

### Payment Issues

- Verify PayPlus credentials
- Check webhook URL is accessible
- Review PayPlus dashboard for errors

---

_Last updated: December 2024_
