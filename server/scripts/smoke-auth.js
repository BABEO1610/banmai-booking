const api = 'http://localhost:3000/api/v1'
const cookieHeader = (response) => response.headers.get('set-cookie')?.split(';')[0]
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@banmai.test', password: 'Demo1234!' }) })
const loginBody = await login.json()
if (!login.ok) throw new Error(`login failed: ${login.status} ${loginBody.error?.code || ''}`)
const cookie = cookieHeader(login)
const csrf = loginBody.data.csrfToken
const me = await fetch(`${api}/auth/me`, { headers: { cookie } })
const adminUsers = await fetch(`${api}/admin/users`, { headers: { cookie } })
const adminUsersBody = await adminUsers.json()
const serializedUsers = JSON.stringify(adminUsersBody)
const secretLeak = /passwordHash|password_hash|authVersion|dbId/.test(serializedUsers)
console.log(JSON.stringify({ login: login.status, role: loginBody.data.user.role, me: me.status, adminUsers: adminUsers.status, csrfPresent: Boolean(csrf), cookiePresent: Boolean(cookie), managedUsers: adminUsersBody.data?.length || 0, secretLeak }, null, 2))
if (!me.ok || !adminUsers.ok || loginBody.data.user.role !== 'ADMIN' || secretLeak) process.exitCode = 1
