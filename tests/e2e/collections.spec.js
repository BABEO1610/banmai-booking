import { test, expect } from '@playwright/test'
import { concepts } from '../../client/src/data/showcase.js'
import { getCollection } from '../../client/src/data/collections.js'

test('seed concepts contain nine distinct, explicitly illustrative images', () => {
  const images = concepts.flatMap((item) => {
    const collection = getCollection(item)
    expect(collection.demo).toBe(true)
    expect(collection.images).toHaveLength(3)
    expect(collection.images.every((image) => image.demo && image.alt && image.caption)).toBe(true)
    return collection.images.map((image) => image.src)
  })
  expect(new Set(images).size).toBe(9)
})

test('API collection takes precedence and an unknown cover never receives stock supplements', () => {
  const original = { ...concepts[0], image: '/studio/cover.jpg', images: [{ src: '/studio/first.jpg', alt: 'Tác phẩm A', caption: 'Khung hình A' }, { src: '/studio/second.jpg', alt: 'Tác phẩm B', caption: 'Khung hình B' }] }
  expect(getCollection(original).images).toEqual(original.images)
  expect(getCollection(original).demo).toBe(false)
  expect(getCollection({ ...original, images: undefined }).images).toHaveLength(1)
  expect(getCollection({ ...original, images: undefined }).images[0].src).toBe('/studio/cover.jpg')
})
