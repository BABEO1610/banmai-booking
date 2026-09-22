import { demoStore } from '../mock/store.js'
export const bookingSettingsModel = { get: () => demoStore.state.settings, update: (input, actorId) => demoStore.updateSettings(input, actorId) }
