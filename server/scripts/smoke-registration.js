const email = `nguyenbaquangminh62+otp-${Date.now()}@gmail.com`
const response = await fetch('http://localhost:3000/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Local OTP Smoke', email, password: 'LocalOtpSmoke123!' }) })
const payload = await response.json()
console.log(JSON.stringify({ status: response.status, email, challengeId: payload.data?.challengeId, errorCode: payload.error?.code }, null, 2))
if (response.status !== 202 || !payload.data?.challengeId) process.exitCode = 1
