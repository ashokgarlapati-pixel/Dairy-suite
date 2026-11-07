import http from 'http';
import { Socket } from 'net';
import app from '../src/app.js';

let results = [];

function assert(condition, message) {
  if (condition) {
    results.push({ status: 'PASS', message });
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    results.push({ status: 'FAIL', message });
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

function request(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve) => {
    const socket = new Socket();
    Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });
    const req = new http.IncomingMessage(socket);
    req.ip = '127.0.0.1';
    req.method = method.toUpperCase();
    req.url = path;
    req.originalUrl = path;
    req.headers = {
      host: 'localhost:5000',
      'x-forwarded-for': '127.0.0.1',
      'content-type': 'application/json',
      ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
    };

    const res = new http.ServerResponse(req);
    let resBody = '';

    res.write = function (chunk) {
      if (chunk) resBody += chunk.toString();
      return true;
    };

    res.end = function (chunk) {
      if (chunk) resBody += chunk.toString();

      let parsed = resBody;
      try {
        parsed = JSON.parse(resBody);
      } catch (e) {}

      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        data: parsed
      });
    };

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      req.headers['content-length'] = Buffer.byteLength(bodyStr).toString();
      req.push(Buffer.from(bodyStr));
    }
    req.push(null);

    app(req, res, (err) => {
      if (err) {
        resolve({
          status: 500,
          headers: {},
          data: { error: err.message }
        });
      }
    });
  });
}

async function runItem1Tests() {
  console.log('\n================================================================');
  console.log(' ITEM 1 VERIFICATION: SECURE LOGIN PAGE & AUTHENTICATION GATEWAY');
  console.log('================================================================\n');

  console.log('--- 1. INPUT VALIDATION TESTS ---');
  // 1. Missing credentials
  const emptyLogin = await request('POST', '/api/v1/auth/login', { body: {} });
  assert(emptyLogin.status === 400, `Rejects missing email & password with HTTP 400 (got ${emptyLogin.status})`);
  assert(emptyLogin.data?.success === false, 'Response indicates success: false');
  assert(Array.isArray(emptyLogin.data?.errors) && emptyLogin.data.errors.length >= 2, 'Returns structured field validation errors for email and password');

  // 2. Malformed email format
  const badEmail = await request('POST', '/api/v1/auth/login', {
    body: { email: 'not-an-email', password: 'ValidPassword123' }
  });
  assert(badEmail.status === 400, `Rejects invalid email format with HTTP 400 (got ${badEmail.status})`);
  assert(badEmail.data?.errors?.some(e => e.field === 'email'), 'Identifies invalid email field specifically');

  // 3. Password shorter than minimum constraint (6 chars)
  const shortPass = await request('POST', '/api/v1/auth/login', {
    body: { email: 'admin@dairycoop.org', password: '123' }
  });
  assert(shortPass.status === 400, `Rejects short password (<6 chars) with HTTP 400 (got ${shortPass.status})`);
  assert(shortPass.data?.errors?.some(e => e.field === 'password'), 'Identifies password length violation');

  console.log('\n--- 2. AUTHENTICATION ERROR STATES ---');
  // 4. Incorrect password
  const wrongPass = await request('POST', '/api/v1/auth/login', {
    body: { email: 'admin@dairycoop.org', password: 'WrongPassword999' }
  });
  assert(wrongPass.status === 401, `Invalid credentials returns HTTP 401 Unauthorized (got ${wrongPass.status})`);
  assert(wrongPass.data?.success === false, 'Error response confirms success: false');
  assert(typeof wrongPass.data?.message === 'string' && wrongPass.data.message.length > 0, 'Descriptive error message returned for banner display');

  // 5. Non-existent cooperative user
  const ghostUser = await request('POST', '/api/v1/auth/login', {
    body: { email: 'unknown@dairycoop.org', password: 'Password123' }
  });
  assert(ghostUser.status === 401, `Non-existent user returns HTTP 401 Unauthorized (got ${ghostUser.status})`);

  console.log('\n--- 3. ROLE-BASED AUTHENTICATION, JWT TOKENS & REDIRECTIONS ---');
  // 6. Maintenance Admin login & JWT verification
  const adminLogin = await request('POST', '/api/v1/auth/login', {
    body: { email: 'admin@dairycoop.org', password: 'Admin@123', rememberMe: true }
  });
  assert(adminLogin.status === 200, `Maintenance Admin login succeeds with HTTP 200`);
  assert(Boolean(adminLogin.data?.data?.accessToken), 'JWT accessToken generated and returned');
  const adminToken = adminLogin.data?.data?.accessToken || '';

  // Cryptographic token anatomy inspection
  const tokenParts = adminToken.split('.');
  assert(tokenParts.length === 3, 'JWT conforms to standard header.payload.signature structure');
  const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
  assert(payload.role === 'MAINTENANCE_ADMIN', `JWT payload contains role: MAINTENANCE_ADMIN (got ${payload.role})`);
  assert(payload.email === 'admin@dairycoop.org', `JWT payload contains verified email`);
  assert(adminLogin.data?.data?.defaultRoute === '/assets', `Admin correctly redirected to Fleet Health Dashboard (/assets)`);

  // 7. Field Technician login & redirection
  const techLogin = await request('POST', '/api/v1/auth/login', {
    body: { email: 'tech@dairycoop.org', password: 'Tech@123' }
  });
  assert(techLogin.status === 200, `Technician login succeeds with HTTP 200`);
  assert(techLogin.data?.data?.user?.role === 'TECHNICIAN', 'Technician user role verified');
  assert(techLogin.data?.data?.defaultRoute === '/calendar', `Technician correctly redirected to Task Calendar & Work Queue (/calendar)`);

  // 8. Operations Manager login & redirection
  const opsLogin = await request('POST', '/api/v1/auth/login', {
    body: { email: 'ops@dairycoop.org', password: 'Ops@123' }
  });
  assert(opsLogin.status === 200, `Operations Manager login succeeds with HTTP 200`);
  assert(opsLogin.data?.data?.user?.role === 'OPERATIONS_MANAGER', 'Operations Manager role verified');
  assert(opsLogin.data?.data?.defaultRoute === '/assets', `Operations Manager redirected to Fleet Dashboard (/assets)`);

  // 9. Vendor Specialist login & redirection
  const vendorLogin = await request('POST', '/api/v1/auth/login', {
    body: { email: 'vendor@cooltech.com', password: 'Vendor@123' }
  });
  assert(vendorLogin.status === 200, `Vendor Specialist login succeeds with HTTP 200`);
  assert(vendorLogin.data?.data?.user?.role === 'VENDOR', 'Vendor user role verified');
  assert(vendorLogin.data?.data?.defaultRoute === '/planning', `Vendor correctly redirected to Maintenance Planning Board (/planning)`);

  console.log('\n--- 4. FORGOT-PASSWORD RECOVERY FLOW ---');
  // 10. Valid email recovery dispatch
  const forgotValid = await request('POST', '/api/v1/auth/forgot-password', {
    body: { email: 'tech@dairycoop.org' }
  });
  assert(forgotValid.status === 200, `Forgot-password dispatch succeeds with HTTP 200`);
  assert(forgotValid.data?.success === true, 'Success flag confirmed');
  assert(typeof forgotValid.data?.message === 'string' && forgotValid.data.message.includes('sent'), 'Recovery dispatch message confirmed');

  // 11. Invalid email rejection in forgot-password
  const forgotInvalid = await request('POST', '/api/v1/auth/forgot-password', {
    body: { email: 'invalid-email' }
  });
  assert(forgotInvalid.status === 400, `Forgot-password rejects invalid email format with HTTP 400`);

  console.log('\n--- 5. SESSION VERIFICATION & PROTECTED ACCESS ---');
  // 12. Valid Bearer Token session check
  const sessionCheck = await request('GET', '/api/v1/auth/me', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(sessionCheck.status === 200, `Session verification (/auth/me) succeeds with HTTP 200`);
  assert(sessionCheck.data?.data?.user?.email === 'admin@dairycoop.org', 'Session profile returns correct cooperative identity');
  assert(!sessionCheck.data?.data?.user?.passwordHash, 'Security: Password hash is strictly excluded from returned profile');

  // 13. Missing Bearer Token rejection
  const noToken = await request('GET', '/api/v1/auth/me');
  assert(noToken.status === 401, `Unauthenticated request to /auth/me rejected with HTTP 401`);

  // 14. Tampered Bearer Token rejection
  const tamperedToken = adminToken.slice(0, -6) + 'xxxxxx';
  const badToken = await request('GET', '/api/v1/auth/me', {
    headers: { authorization: `Bearer ${tamperedToken}` }
  });
  assert(badToken.status === 401, `Cryptographically tampered JWT rejected with HTTP 401`);

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log('             ITEM 1 VERIFICATION RESULTS SUMMARY                ');
  console.log('================================================================');
  console.log(` TOTAL ASSERTIONS : ${results.length}`);
  console.log(` PASSED           : ${passed}`);
  console.log(` FAILED           : ${failed}`);
  console.log(` SUCCESS RATE     : ${Math.round((passed / results.length) * 100)}%`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runItem1Tests().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
