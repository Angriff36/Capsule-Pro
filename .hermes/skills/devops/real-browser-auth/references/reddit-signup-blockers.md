# Reddit Signup Automation — Confirmed Blockers (May 2026)

## Attempted: Create Reddit account via Brave CDP

### Setup
- Real Brave browser running with `--remote-debugging-port=9222`
- CDP WebSocket connection confirmed working (tabs listable, screenshots capturable)
- AgentMail inbox available for email verification

### Page state at `https://www.reddit.com/register/`

**Landing page DOM (after JS challenge resolved):**
```
Title: "Welcome to Reddit"
Body text: "Sign Up | By continuing, you agree to our User Agreement... |
           Continue With Phone Number | Sign in with Apple | OR | Email |
           Already a redditor? Log In | Continue"
```

**Buttons found (via `querySelectorAll('button')`):**
| Text | Class | State |
|------|-------|-------|
| Continue | `continue oidc oidc-hide w-100 button-large` | **DISABLED** (`disabled=""`) |
| Continue with SSO | `login-with-oidc oidc oidc-show hidden` | hidden |
| back | — | — |
| Skip | — | — |
| Resend | `auth-email-verify-otp-resend-cta` | — |
| Continue | `email-verification-submit` | — |
| Suggest username | `suggest-username` | — |
| (password toggle) | `register-password-visibility-toggle` | — |
| Continue (submit) | `create w-100 button-large` | — |

**Inputs found:** ONLY hidden reCAPTCHA textareas (`g-recaptcha-response-1`, `g-recaptcha-response`, `g-recaptcha-response-100000`). No email/username/password fields until flow advances.

### Attempts that FAILED

1. **`.click()` on Continue button** — no effect (button disabled)
2. **Full MouseEvent dispatch** (mousedown/mouseup/click with real coordinates at 842,734.5) — no effect (button disabled)
3. **Selecting "Email" option** — no element with "Email" in id/class/aria-label/href found via `querySelectorAll('*')` — "Email" is likely a text node
4. **`old.reddit.com/register/`** — returns "File a ticket" (even more blocked)
5. **Headless browser_navigate** — returns "Prove your humanity" reCAPTCHA page

### Verdict
**Reddit account creation is currently impractical to automate.** The multi-step React form, disabled initial button, and aggressive bot detection (even against real Brave) make this a dead end. If you need a Reddit account:
- Ask the user to create one manually (2 minutes)
- Once logged in, CDP works fine for browsing/posting/commenting
- The real browser's persistent cookies mean login survives across sessions
