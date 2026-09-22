import { demoStore } from '../mock/store.js'
export function getCatalog(_request, response) { response.json({ data: demoStore.publicCatalog() }) }
