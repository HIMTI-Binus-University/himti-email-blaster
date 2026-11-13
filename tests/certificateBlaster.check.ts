import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import express from "express";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

// No SMTP connection: replace the transport before loading application modules.
process.env.PORT = "8000";
process.env.NODE_ENV = "test";
process.env.APP_API_KEY = "certificate-check-key";
process.env.MAILJET_SMTP_HOST = "smtp.example.com";
process.env.MAILJET_SMTP_PORT = "587";
process.env.MAILJET_SMTP_USER = "test";
process.env.MAILJET_SMTP_PASS = "test";
process.env.MAIL_FROM_EMAIL = "sender@example.com";
process.env.MAIL_FROM_NAME = "Test Sender";

const sent: Mail.Options[] = [];
nodemailer.createTransport = (() => ({
  sendMail: async (options: Mail.Options) => {
    sent.push(options);
    if (options.to === "fail@example.com") throw new Error("Simulated failure");
    return {};
  },
})) as unknown as typeof nodemailer.createTransport;

const main = async () => {
  const { default: routes } = await import("../src/routes/routes");
  const { errorHandler } = await import("../src/middleware/error.middleware");
  const app = express();
  app.use(express.json());
  app.use("/api", routes);
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const recipient = {
    email: "Alice@EXAMPLE.com",
    name: '<Alice & "Friends">',
    certificateUrl: "https://example.com/alice.pdf?x=1&y=2",
  };
  const payload = { subject: "Your certificate", recipients: [recipient], delayMs: 500 };
  const post = (path: string, body: unknown, key = "certificate-check-key") => fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify(body),
  });

  try {
    assert.equal((await post("/certificate-blast/send", payload, "wrong")).status, 401);
    for (const certificateUrl of ["invalid", "javascript:alert(1)", "file:///tmp/test.pdf", "https://user:pass@example.com/a.pdf"]) {
      assert.equal((await post("/certificate-blast/send", {
        ...payload, recipients: [{ ...recipient, certificateUrl }],
      })).status, 400);
    }
    for (const invalid of [
      { ...payload, recipients: [] },
      { ...payload, recipients: Array(201).fill(recipient) },
      { ...payload, recipients: [{ ...recipient, name: " " }] },
      { ...payload, recipients: [{ ...recipient, email: "invalid" }] },
      { ...payload, subject: "" },
      { ...payload, body: " " },
      { ...payload, body: "x".repeat(10001) },
      { ...payload, body: 123 },
      { ...payload, delayMs: 499 },
      { ...payload, unexpected: true },
    ]) {
      assert.equal((await post("/certificate-blast/send", invalid)).status, 400);
    }
    assert.equal(sent.length, 0);

    const response = await post("/certificate-blast/send", {
      ...payload,
      recipients: [recipient, { ...recipient, email: "alice@example.com", certificateUrl: "https://example.com/ignored" },
        { ...recipient, email: "fail@example.com", name: "Failed" },
        { ...recipient, email: "bob@example.com", name: "Bob", certificateUrl: "https://example.com/bob.pdf" }],
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.summary, { totalRecipients: 3, success: 2, failed: 1 });
    assert.deepEqual(result.results.map((entry: { status: string }) => entry.status), ["success", "failed", "success"]);
    assert.equal(sent.length, 3);
    assert.equal(sent[0].to, "alice@example.com");
    assert.match(String(sent[0].html), /&lt;Alice &amp; &quot;Friends&quot;&gt;/);
    assert.match(String(sent[0].html), /x=1&amp;y=2/);
    assert.match(String(sent[0].text), /https:\/\/example.com\/alice.pdf/);
    assert.match(String(sent[2].html), /Hello Bob,/);
    assert.match(String(sent[2].html), /bob\.pdf/);
    assert.doesNotMatch(String(sent[2].html), /alice\.pdf/);

    const original = await post("/email-blast/send", {
      recipients: ["original@example.com"], subject: "Original", text: "Unchanged",
    });
    assert.equal(original.status, 200);
    assert.deepEqual((await original.json()).summary, { totalRecipients: 1, success: 1, failed: 0 });
    assert.equal(sent[3].text, "Unchanged");

    const custom = await post("/certificate-blast/send", {
      ...payload,
      body: "Congratulations {{name}}!\nYour link: {{certificateUrl}}\n<script>alert(1)</script>",
      recipients: [recipient, { ...recipient, email: "bob@example.com", name: "Bob", certificateUrl: "https://example.com/bob.pdf" }],
    });
    assert.equal(custom.status, 200);
    assert.match(String(sent[4].text), /Congratulations <Alice & "Friends">!/);
    assert.match(String(sent[4].text), /Your link: https:\/\/example.com\/alice.pdf/);
    assert.match(String(sent[4].html), /!<br>Your link:/);
    assert.match(String(sent[4].html), /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(String(sent[4].html), /<script>/);
    assert.match(String(sent[5].text), /Congratulations Bob!/);
    assert.match(String(sent[5].text), /bob\.pdf/);
    assert.doesNotMatch(String(sent[5].text), /alice\.pdf/);
    console.log("Certificate checks passed; SMTP mocked, no emails sent.");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
