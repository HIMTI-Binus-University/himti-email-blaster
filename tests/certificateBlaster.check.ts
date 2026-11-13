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
      { ...payload, body: "x".repeat(100001) },
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
      body: "<p>Congratulations {{name}}!</p><p>Your link: {{certificateUrl}}</p>",
      recipients: [recipient, { ...recipient, email: "bob@example.com", name: "Bob", certificateUrl: "https://example.com/bob.pdf" }],
    });
    assert.equal(custom.status, 200);
    assert.match(String(sent[4].html), /<p>Congratulations &lt;Alice &amp; &quot;Friends&quot;&gt;!<\/p>/);
    assert.match(String(sent[4].html), /Your link: https:\/\/example.com\/alice.pdf/);
    assert.match(String(sent[5].html), /Congratulations Bob!/);
    assert.match(String(sent[5].text), /bob\.pdf/);
    assert.doesNotMatch(String(sent[5].text), /alice\.pdf/);
    const { certificateUrl, ...multipleRecipient } = recipient;
    for (const invalid of [
      multipleRecipient,
      { ...multipleRecipient, certificateUrls: [] },
      { ...recipient, certificateUrls: [certificateUrl] },
      { ...multipleRecipient, certificateUrls: Array(21).fill(certificateUrl) },
      { ...multipleRecipient, certificateUrls: ["javascript:alert(1)"] },
    ]) {
      assert.equal((await post("/certificate-blast/send", { ...payload, recipients: [invalid] })).status, 400);
    }
    const beforeMultiple = sent.length;
    const urls = [certificateUrl, "https://example.com/second.pdf?x=1&y=2"];
    const multiple = await post("/certificate-blast/send", {
      ...payload,
      body: "Hello {{name}}!\nFirst: {{certificateUrl}}\nAll:\n{{certificateUrls}}",
      recipients: [{ ...multipleRecipient, certificateUrls: [...urls, urls[0]] }],
    });
    assert.equal(multiple.status, 200);
    assert.deepEqual((await multiple.json()).summary, { totalRecipients: 1, success: 1, failed: 0 });
    assert.equal(sent.length, beforeMultiple + 1);
    const mail = sent[beforeMultiple];
    assert.match(String(mail.html), /First: https:\/\/example.com\/alice.pdf/);
    assert.ok(String(mail.html).includes(`All:\n${urls.map((url) => url.replace(/&/g, "&amp;")).join("<br>")}`));
    assert.equal((String(mail.html).match(/<a href=/g) ?? []).length, 2);
    assert.match(String(mail.html), /second\.pdf\?x=1&amp;y=2/);
    assert.match(String(mail.html), /View your certificate 2/);
    const defaultMultiple = await post("/certificate-blast/send", {
      ...payload, recipients: [{ ...multipleRecipient, certificateUrls: urls }],
    });
    assert.equal(defaultMultiple.status, 200);
    assert.match(String(sent[beforeMultiple + 1].text), /Your certificates are ready/);
    for (const html of [" ", 123, "x".repeat(100001)]) {
      assert.equal((await post("/certificate-blast/send", { ...payload, html })).status, 400);
    }
    const beforeHtml = sent.length;
    const htmlResponse = await post("/certificate-blast/send", {
      ...payload,
      body: '<!doctype html><html><body><h1 style="color: blue">Hello {{name}}</h1><a href="{{certificateUrl}}">First</a><div>{{certificateUrls}}</div></body></html>',
      recipients: [{ ...multipleRecipient, certificateUrls: urls }],
    });
    assert.equal(htmlResponse.status, 200);
    const htmlMail = sent[beforeHtml];
    assert.match(String(htmlMail.html), /<h1 style="color: blue">Hello &lt;Alice &amp; &quot;Friends&quot;&gt;<\/h1>/);
    assert.match(String(htmlMail.html), /href="https:\/\/example.com\/alice.pdf\?x=1&amp;y=2"/);
    assert.ok(String(htmlMail.html).includes(urls.map((url) => url.replace(/&/g, "&amp;")).join("<br>")));
    assert.match(String(htmlMail.html), /View your certificate 2<\/a><\/p><\/body><\/html>$/);
    assert.match(String(htmlMail.text), /Hello <Alice & "Friends">/);
    assert.doesNotMatch(String(htmlMail.text), /<h1/);
    const htmlOnly = await post("/certificate-blast/send", { ...payload, body: "<p>Hello {{name}}</p>" });
    assert.equal(htmlOnly.status, 200);
    assert.match(String(sent[beforeHtml + 1].html), /^<p>Hello &lt;Alice/);
    assert.match(String(sent[beforeHtml + 1].text), /Your certificate is ready/);
    console.log("Certificate checks passed; SMTP mocked, no emails sent.");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
