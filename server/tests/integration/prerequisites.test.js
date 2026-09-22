import test from 'node:test'
test('real PostgreSQL integration suite requires an isolated TEST_DATABASE_URL', { skip: 'Chưa chạy destructive integration test khi TEST_DATABASE_URL chưa trỏ tới DB cô lập.' }, () => {})
