import { demoStore } from '../mock/store.js'
export function getPayment(request, response) { response.json({ data: demoStore.paymentView(request.params.id) }) }
