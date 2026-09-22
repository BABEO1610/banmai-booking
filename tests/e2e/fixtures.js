import { test as base } from '@playwright/test'
export const test = base.extend({ demoCredentials: async ({}, use) => use({ email: 'customer.x@banmai.test', password: 'Demo1234!' }) })
export { expect } from '@playwright/test'
