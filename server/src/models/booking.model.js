import { demoStore } from '../mock/store.js'
export const bookingModel = { byId: (id) => demoStore.state.bookings.find((booking) => booking.id === id), owned: (userId) => demoStore.ownedBookings(userId), create: (input, userId, key) => demoStore.createBooking(input, userId, key) }
