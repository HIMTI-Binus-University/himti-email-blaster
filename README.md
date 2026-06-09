# email-blaster-api

A small RESTful API for sending a simple email blast to a list of recipients using Express.js, TypeScript, Nodemailer, and Mailjet SMTP.

This project does not use a database, Prisma, authentication login, or a frontend. It is intentionally small and beginner-friendly while still using a real backend folder structure.

## Tech Stack

- Node.js
- Express.js
- TypeScript
- Nodemailer
- Mailjet SMTP
- Zod
- dotenv

## Folder Structure

```txt
email-blaster-api/
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   └── mailjet.ts
│   ├── features/
│   │   └── email-blaster/
│   │       ├── emailBlaster.controller.ts
│   │       ├── emailBlaster.routes.ts
│   │       ├── emailBlaster.schema.ts
│   │       ├── emailBlaster.service.ts
│   │       └── emailBlaster.types.ts
│   ├── middleware/
│   │   ├── apiKey.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validate.middleware.ts
│   ├── routes/
│   │   └── routes.ts
│   ├── utils/
│   │   ├── AppError.ts
│   │   ├── asyncHandler.ts
│   │   └── sleep.ts
│   └── index.ts
├── .env.example
├── .gitignore
├── AGENTS.md
├── package.json
├── tsconfig.json
└── README.md
```

## Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Edit `.env` and replace the placeholder values with your real Mailjet SMTP values.

Example:

```env
PORT=8000
NODE_ENV=development

APP_API_KEY=change_this_internal_api_key

MAILJET_SMTP_HOST=in-v3.mailjet.com
MAILJET_SMTP_PORT=587
MAILJET_SMTP_USER=your_mailjet_api_key
MAILJET_SMTP_PASS=your_mailjet_secret_key

MAIL_FROM_EMAIL=noreply@yourdomain.com
MAIL_FROM_NAME=Your Organization
```

## Mailjet SMTP Setup

1. Create or log in to your Mailjet account.
2. Open the Mailjet dashboard.
3. Go to the SMTP and SEND API settings.
4. Copy your API key and Secret Key.
5. Verify the sender email address or sender domain you want to use.
6. Put the values into `.env`.

Required Mailjet environment variables:

- `MAILJET_SMTP_HOST`: Mailjet SMTP server host. Usually `in-v3.mailjet.com`.
- `MAILJET_SMTP_PORT`: SMTP port. Usually `587` for TLS/STARTTLS.
- `MAILJET_SMTP_USER`: Mailjet API key / public key. This is used as the SMTP username.
- `MAILJET_SMTP_PASS`: Mailjet Secret Key. This is used as the SMTP password. Mailjet may only show it once when created, so save it securely.
- `MAIL_FROM_EMAIL`: Verified sender email/domain in Mailjet. This must be verified before sending.
- `MAIL_FROM_NAME`: Display name shown to recipients.

## Run in Development

```bash
npm run dev
```

The API will run at:

```txt
http://localhost:8000
```

## Build and Run Production

Build TypeScript:

```bash
npm run build
```

Start the compiled server:

```bash
npm start
```

You can also type-check without emitting files:

```bash
npm run typecheck
```

## API Documentation

Base URL:

```txt
http://localhost:8000/api
```

### GET /api/health

Checks if the API is running.

Example response:

```json
{
  "status": "ok",
  "message": "Email blaster API is running"
}
```

cURL:

```bash
curl http://localhost:8000/api/health
```

### GET /api/email-blast/test

Checks whether the required Mailjet SMTP environment variables are configured.

This endpoint does not send any email.

Example success response:

```json
{
  "message": "Mailjet SMTP configuration is available",
  "config": {
    "host": "in-v3.mailjet.com",
    "port": 587,
    "fromEmail": "noreply@yourdomain.com",
    "fromName": "Your Organization"
  }
}
```

cURL:

```bash
curl http://localhost:8000/api/email-blast/test
```

### POST /api/email-blast/send

Sends the email blast one recipient at a time.

This endpoint is protected by the `x-api-key` header.

Headers:

```http
Content-Type: application/json
x-api-key: your_api_key_here
```

Request body:

```json
{
  "recipients": [
    "person1@gmail.com",
    "person2@gmail.com"
  ],
  "subject": "Welcome to Our Event",
  "html": "<h1>Hello!</h1><p>Thank you for registering.</p>",
  "text": "Hello! Thank you for registering.",
  "delayMs": 1500
}
```

Rules:

- `recipients` is required and must be an array of valid email strings.
- Maximum recipients is 200.
- Duplicate recipient emails are removed before sending.
- `subject` is required and has a maximum length of 150 characters.
- At least one of `html` or `text` must be provided.
- `delayMs` is optional.
- Default `delayMs` is `1500`.
- Minimum `delayMs` is `500`.

Example success response:

```json
{
  "message": "Email blast completed",
  "summary": {
    "totalRecipients": 2,
    "success": 2,
    "failed": 0
  },
  "results": [
    {
      "email": "person1@gmail.com",
      "status": "success"
    },
    {
      "email": "person2@gmail.com",
      "status": "success"
    }
  ]
}
```

Example partial failure response:

```json
{
  "message": "Email blast completed with some failures",
  "summary": {
    "totalRecipients": 2,
    "success": 1,
    "failed": 1
  },
  "results": [
    {
      "email": "person1@gmail.com",
      "status": "success"
    },
    {
      "email": "person2@gmail.com",
      "status": "failed",
      "error": "SMTP error message here"
    }
  ]
}
```

cURL:

```bash
curl -X POST http://localhost:8000/api/email-blast/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: change_this_internal_api_key" \
  -d '{
    "recipients": [
      "person1@gmail.com",
      "person2@gmail.com"
    ],
    "subject": "Welcome to Our Event",
    "html": "<h1>Hello!</h1><p>Thank you for registering.</p>",
    "text": "Hello! Thank you for registering.",
    "delayMs": 1500
  }'
```

## Testing Email Blast with Postman

Follow these steps to send an email blast from Postman.

### 1. Start the API Server

Make sure dependencies are installed:

```bash
npm install
```

Make sure your `.env` file exists and contains valid values:

```bash
cp .env.example .env
```

Then run the development server:

```bash
npm run dev
```

Keep this terminal open. You should see the API running on:

```txt
http://localhost:8000
```

### 2. Check the Health Endpoint in Postman

1. Open Postman.
2. Click **New**.
3. Choose **HTTP Request**.
4. Set the method to `GET`.
5. Enter this URL:

```txt
http://localhost:8000/api/health
```

6. Click **Send**.
7. You should receive:

```json
{
  "status": "ok",
  "message": "Email blaster API is running"
}
```

If this request fails, make sure `npm run dev` is still running and the port in `.env` is `8000`.

### 3. Check Mailjet SMTP Configuration in Postman

This endpoint only checks whether the Mailjet SMTP environment variables exist. It does not send an email.

1. Create another Postman request.
2. Set the method to `GET`.
3. Enter this URL:

```txt
http://localhost:8000/api/email-blast/test
```

4. Click **Send**.
5. If your Mailjet config is available, you should receive:

```json
{
  "message": "Mailjet SMTP configuration is available",
  "config": {
    "host": "in-v3.mailjet.com",
    "port": 587,
    "fromEmail": "noreply@yourdomain.com",
    "fromName": "Your Organization"
  }
}
```

If this returns an error, check your `.env` file and make sure these values are filled:

```env
MAILJET_SMTP_HOST=in-v3.mailjet.com
MAILJET_SMTP_PORT=587
MAILJET_SMTP_USER=your_mailjet_api_key
MAILJET_SMTP_PASS=your_mailjet_secret_key
MAIL_FROM_EMAIL=noreply@yourdomain.com
MAIL_FROM_NAME=Your Organization
```

After editing `.env`, stop the server and restart it with:

```bash
npm run dev
```

### 4. Create the Send Email Blast Request

1. Create another Postman request.
2. Set the method to `POST`.
3. Enter this URL:

```txt
http://localhost:8000/api/email-blast/send
```

### 5. Add the Required Headers

In Postman, open the **Headers** tab and add these rows:

| Key | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `x-api-key` | `change_this_internal_api_key` |

The `x-api-key` value must match your `.env` value:

```env
APP_API_KEY=change_this_internal_api_key
```

If the value does not match, the API will return:

```json
{
  "message": "Missing or invalid API key"
}
```

### 6. Add the JSON Request Body

In Postman:

1. Open the **Body** tab.
2. Choose **raw**.
3. On the right side dropdown, choose **JSON**.
4. Paste this JSON:

```json
{
  "recipients": [
    "person1@gmail.com",
    "person2@gmail.com"
  ],
  "subject": "Welcome to Our Event",
  "html": "<h1>Hello!</h1><p>Thank you for registering.</p>",
  "text": "Hello! Thank you for registering.",
  "delayMs": 1500
}
```

Replace `person1@gmail.com` and `person2@gmail.com` with real recipient emails that should receive the message.

Important body notes:

- `recipients` must be an array.
- Every item inside `recipients` must be a valid email.
- Maximum recipients is `200`.
- Duplicate emails will be removed automatically.
- `subject` is required.
- At least one of `html` or `text` is required.
- `delayMs` is optional.
- If `delayMs` is not sent, the API uses `1500`.
- `delayMs` cannot be lower than `500`.

### 7. Send the Request

1. Review the URL:

```txt
POST http://localhost:8000/api/email-blast/send
```

2. Review the headers:

```http
Content-Type: application/json
x-api-key: change_this_internal_api_key
```

3. Review the body JSON.
4. Click **Send**.

The API will send the email one-by-one using Mailjet SMTP. If one recipient fails, the API continues sending to the next recipient.

### 8. Read the Response

If all emails are sent successfully, you should receive:

```json
{
  "message": "Email blast completed",
  "summary": {
    "totalRecipients": 2,
    "success": 2,
    "failed": 0
  },
  "results": [
    {
      "email": "person1@gmail.com",
      "status": "success"
    },
    {
      "email": "person2@gmail.com",
      "status": "success"
    }
  ]
}
```

If some emails fail, you may receive:

```json
{
  "message": "Email blast completed with some failures",
  "summary": {
    "totalRecipients": 2,
    "success": 1,
    "failed": 1
  },
  "results": [
    {
      "email": "person1@gmail.com",
      "status": "success"
    },
    {
      "email": "person2@gmail.com",
      "status": "failed",
      "error": "SMTP error message here"
    }
  ]
}
```

### 9. Common Postman Errors

#### Missing or Invalid API Key

Response:

```json
{
  "message": "Missing or invalid API key"
}
```

Fix:

- Open the **Headers** tab.
- Add `x-api-key`.
- Make sure the value is exactly the same as `APP_API_KEY` in `.env`.
- Restart the server if you changed `.env`.

#### Validation Failed

Example response:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "path": "recipients.0",
      "message": "Invalid email"
    }
  ]
}
```

Fix:

- Make sure `recipients` is an array.
- Make sure each recipient is a valid email.
- Make sure `subject` is not empty.
- Make sure either `html` or `text` exists.
- Make sure `delayMs` is at least `500`.

#### Mailjet SMTP Authentication Error

Possible causes:

- `MAILJET_SMTP_USER` is not the Mailjet API key.
- `MAILJET_SMTP_PASS` is not the Mailjet Secret Key.
- The Secret Key was copied incorrectly.
- The sender email or domain is not verified in Mailjet.

Fix:

- Check the Mailjet SMTP and SEND API settings.
- Copy the API key into `MAILJET_SMTP_USER`.
- Copy the Secret Key into `MAILJET_SMTP_PASS`.
- Verify `MAIL_FROM_EMAIL` or the sender domain in Mailjet.
- Restart the server.

#### Request Keeps Loading

This can happen when sending to many recipients because the API waits between each email.

Example:

- `10` recipients
- `delayMs: 1500`
- The request waits around `13.5` seconds just for delays between sends

Fix:

- Start testing with `1` or `2` recipients.
- Keep `delayMs` at `1500` or higher for safer sending.
- Wait for Postman to finish before sending another request.

## Safe Sending Notes

- Do not use Gmail SMTP for bulk sending.
- Do not put all recipients in one `To` field.
- Send one-by-one so recipients do not see each other.
- Use a delay between sends.
- Verify your sender email or domain in Mailjet.
- Configure SPF, DKIM, and DMARC in Mailjet.
- Only send to people who should receive the email.
- Never commit `.env`.
- Never hardcode real API keys or SMTP secrets.
