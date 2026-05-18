# React/Next.js CDP Form Interaction

Reusable Python patterns for interacting with React/Next.js apps through Chrome DevTools Protocol (CDP) WebSocket. Use when QA-testing bolt.new exports, localhost dev servers, or any React/Next.js site where the real browser must be used.

## Core Helper Functions

```python
import json, websocket, time, urllib.request

def cmd(ws, method, params, msg_id, timeout=8):
    """Send CDP command and wait for matching-ID response. Handles reordering."""
    ws.send(json.dumps({"id": msg_id, "method": method, "params": params}))
    deadline = time.time() + timeout
    while time.time() < deadline:
        ws.settimeout(0.5)
        try:
            r = json.loads(ws.recv())
            if r.get("id") == msg_id:
                return r
        except:
            continue
    return None

def evaljs(ws, code, msg_id):
    """Shortcut for Runtime.evaluate."""
    return cmd(ws, "Runtime.evaluate", {"expression": code}, msg_id)

def native_type(selector, value):
    """Fill a React-controlled input via native value setter. Returns JS expression string."""
    return """
(function() {
    var native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    var el = document.querySelector('""" + selector + """');
    if (!el) return 'NOT FOUND: """ + selector + """';
    native.call(el, '""" + value + """');
    el.dispatchEvent(new Event('input', {bubbles: true}));
    el.dispatchEvent(new Event('change', {bubbles: true}));
    return 'OK'
})()
"""
```

## Opening a Tab

```python
req = urllib.request.Request(
    "http://localhost:9222/json/new?http://localhost:3000/auth/signin", method="PUT")
tab = json.loads(urllib.request.urlopen(req).read())
ws_url = tab["webSocketDebuggerUrl"]
ws = websocket.create_connection(ws_url, timeout=30, suppress_origin=True)

# Always enable Runtime first
cmd(ws, "Runtime.enable", {}, 1)
time.sleep(3)  # Wait for page to load + hydrate
```

## Hydration — Critical Step for React/Next.js

Next.js pages need time for JavaScript to hydrate after initial HTML load. After opening a tab or navigating, **always**:

```python
time.sleep(5)  # 3-5 seconds minimum for hydration
ws.settimeout(0.3)
for _ in range(10):  # Drain buffered events
    try: ws.recv()
    except: break
```

Skipping this step causes "Invalid email or password" errors on valid credentials (NextAuth CSRF token not yet fetched by client JS).

## Complete NextAuth Sign-In Flow

```python
# Open sign-in page
req = urllib.request.Request(
    "http://localhost:9222/json/new?http://localhost:3000/auth/signin", method="PUT")
tab = json.loads(urllib.request.urlopen(req).read())
ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=30, suppress_origin=True)

cmd(ws, "Runtime.enable", {}, 1)
time.sleep(5)  # WAIT FOR HYDRATION
ws.settimeout(0.3)
for _ in range(10):
    try: ws.recv()
    except: break

# Fill email (React-controlled input)
evaljs(ws, native_type('input[type="email"]', 'test@example.com'), 11)
time.sleep(0.3)

# Fill password
evaljs(ws, native_type('input[type="password"]', 'test123456'), 12)
time.sleep(0.3)

# Submit via form submit event (NOT button click)
evaljs(ws, """
document.querySelector('form').dispatchEvent(
    new Event('submit', {bubbles: true, cancelable: true})
)
""", 13)
time.sleep(5)

# Verify — should be on /dashboard
r = evaljs(ws, "window.location.href", 14)
print(r.get("result",{}).get("result",{}).get("value","?") if r else "?")
```

## Filling Date Inputs

Date inputs need both `input` AND `change` events:

```python
evaljs(ws, """
(function() {
    var native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    var el = document.querySelector('input[type="date"]');
    var d = new Date();
    d.setDate(d.getDate() - 20);
    var ds = d.toISOString().split('T')[0];
    native.call(el, ds);
    el.dispatchEvent(new Event('input', {bubbles: true}));
    el.dispatchEvent(new Event('change', {bubbles: true}));
    return ds;
})()
""", 20)
```

## Status Dropdown Interaction (Controlled Components)

For dropdown menus that render conditionally in React:

```python
# Step 1: Click the trigger button to open dropdown
evaljs(ws, """
(function() {
    var btns = document.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
        if (btns[i].textContent.includes('Keep')) {
            btns[i].dispatchEvent(new MouseEvent('click', {bubbles: true}));
            return 'clicked';
        }
    }
    return 'not found';
})()
""", 30)
time.sleep(1)  # Wait for React re-render

# Step 2: Click the dropdown option
evaljs(ws, """
(function() {
    var btns = document.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
        if (btns[i].textContent === 'Return Started') {
            btns[i].dispatchEvent(new MouseEvent('click', {bubbles: true}));
            return 'clicked';
        }
    }
    return 'not found';
})()
""", 31)
time.sleep(3)  # Wait for API call + re-render
```

## Session Persistence

CDP tabs within the same Brave instance share cookies. Once signed in via one tab, open new tabs to authenticated routes and the session persists:

```python
# Already signed in — navigate to authenticated page
req = urllib.request.Request(
    "http://localhost:9222/json/new?http://localhost:3000/dashboard/add", method="PUT")
```

## Pitfalls

### Direct value assignment silently fails on React
`document.querySelector('input').value = 'text'` sets the HTML attribute but React's synthetic event system reads from the property descriptor. The input appears filled but React state is empty. **Always use `nativeInputValueSetter`.**

### Button.click() silently fails on React forms
React uses `onSubmit` on the `<form>`, not `onClick` on the `<button>`. Programmatic `.click()` may not propagate to React's handler. **Always use `form.dispatchEvent(new Event('submit', ...))`.**

### Hydration race condition
NextAuth's `signIn()` function fetches the CSRF token asynchronously after page load. If you fill and submit the form immediately without waiting for hydration (~3-5 seconds), the CSRF token won't be ready and sign-in fails with "Invalid email or password" — even with correct credentials.

### Bcrypt hash verification
If sign-in keeps failing despite correct credentials, verify the hash directly:
```bash
cd ~/projects/returncue && node -e "
const bcrypt = require('bcryptjs');
const hash = 'STORED_HASH';
bcrypt.compare('PASSWORD', hash).then(r => console.log('MATCH:', r));
"
```

### NextAuth CSRF verification via API
To test credentials without the browser:
```bash
# Get CSRF token and cookies from the CSR endpoint
CSRF=$(curl -s http://localhost:3000/api/auth/csrf | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
# Sign in via the callback endpoint
curl -v -L -c /tmp/cookies.txt -b /tmp/cookies.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=test@example.com" \
  --data-urlencode "password=test123456" \
  http://localhost:3000/api/auth/callback/credentials
```
A 302 redirect to `/` = success. A 302 to `/auth/signin?error=CredentialsSignin` = failure.

### Text content matching in buttons with icons
`button.textContent` includes text from child elements like SVG icons. When searching for a button by text, use `.includes('Keep')` instead of exact match, since a button with `<span>Keep</span><ChevronDown />` will have `textContent = "Keep\n"` (or similar with whitespace).

### ID matching across CDP responses
CDP responses may arrive out of order. Always send with distinct IDs and recv in a loop matching the expected ID. The `cmd()` helper above handles this — never use raw `ws.send()`/`ws.recv()` if sending multiple commands.
