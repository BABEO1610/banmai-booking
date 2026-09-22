import { demoStore } from '../mock/store.js'
export const catalogModel = { public: () => demoStore.publicCatalog(), packages: () => demoStore.state.packages, addons: () => demoStore.state.addons }
