"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.contact = void 0;
const email_1 = require("@repo/email");
const contact_1 = require("@repo/email/templates/contact");
const error_1 = require("@repo/observability/error");
const rate_limit_1 = require("@repo/rate-limit");
const headers_1 = require("next/headers");
const env_1 = require("@/env");
const contact = async (name, email, message) => {
  try {
    if (
      env_1.env.UPSTASH_REDIS_REST_URL &&
      env_1.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      const rateLimiter = (0, rate_limit_1.createRateLimiter)({
        limiter: (0, rate_limit_1.slidingWindow)(1, "1d"),
      });
      const head = await (0, headers_1.headers)();
      const ip = head.get("x-forwarded-for");
      const { success } = await rateLimiter.limit(`contact_form_${ip}`);
      if (!success) {
        throw new Error(
          "You have reached your request limit. Please try again later."
        );
      }
    }
    await email_1.resend.emails.send({
      from: env_1.env.RESEND_FROM,
      to: env_1.env.RESEND_FROM,
      subject: "Contact form submission",
      replyTo: email,
      react: (
        <contact_1.ContactTemplate
          email={email}
          message={message}
          name={name}
        />
      ),
    });
    return {};
  } catch (error) {
    const errorMessage = (0, error_1.parseError)(error);
    return { error: errorMessage };
  }
};
exports.contact = contact;
