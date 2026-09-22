export const VND = 'VND'
export const money = (amountVnd) => ({ amount: String(BigInt(amountVnd)), currency: VND })
export const parseMoney = (value, name = 'amount_vnd') => { if (!/^\d+$/.test(String(value))) throw new Error(`${name} phải là số nguyên không âm`); return BigInt(value) }
