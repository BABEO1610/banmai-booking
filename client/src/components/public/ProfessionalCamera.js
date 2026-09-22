// Original, anonymous mirrorless-camera study. All textures are generated locally.
// Shared materials and instanced knurling keep the detail budget predictable.
export function buildProfessionalCamera(T, RoundedBoxGeometry, mergeGeometries, mergeVertices, environment) {
  const camera = new T.Group()
  const materials = [], textures = [], geometries = new Set(), instances = []
  const material = (options) => {
    const item = new T.MeshStandardMaterial(options)
    materials.push(item); return item
  }
  const texture = (width, height, paint) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    paint(canvas.getContext('2d'), width, height)
    const map = new T.CanvasTexture(canvas); textures.push(map); return map
  }
  const grain = texture(64, 64, (ctx, width, height) => {
    const pixels = ctx.createImageData(width, height)
    let seed = 83
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const shade = 95 + (seed >>> 24) * .45
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade; pixels.data[i + 3] = 255
    }
    ctx.putImageData(pixels, 0, 0)
    for (let y = 2; y < height; y += 4) for (let x = 2; x < width; x += 4) {
      ctx.fillStyle = '#545658'; ctx.beginPath(); ctx.ellipse(x, y, 1.8, 1.5, .3, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#b2b5b6'; ctx.beginPath(); ctx.ellipse(x - .3, y - .5, 1.25, .65, .3, 0, Math.PI * 2); ctx.fill()
    }
  })
  grain.colorSpace = T.SRGBColorSpace
  grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.repeat.set(1.5, 1.5)
  const shell = material({ color: 0x18191c, roughness: .57, metalness: .45 })
  const rubber = material({ color: 0x252629, roughness: .92, map: grain })
  const black = material({ color: 0x070809, roughness: .5, metalness: .25 })
  const metal = material({ color: 0x8e9298, roughness: .32, metalness: .95 })
  const edge = material({ color: 0x34373b, roughness: .42, metalness: .7 })
  const optical = material({ color: 0x010304, roughness: .18, metalness: .05 })
  const glass = material({ color: 0x04070a, roughness: .07, metalness: .35, envMap: environment, envMapIntensity: .22, transparent: true, opacity: .7, depthWrite: false })
  metal.envMap = environment; metal.envMapIntensity = .75
  const mesh = (geometry, mat, x = 0, y = 0, z = 0) => {
    geometries.add(geometry)
    // +z is the front: right-hand grip belongs on the visitor's left. Change
    // positions rather than negative scaling, keeping all text/UVs readable.
    const item = new T.Mesh(geometry, mat); item.position.set(-x, y, z); camera.add(item); return item
  }
  const box = (w, h, d, radius, mat, x = 0, y = 0, z = 0) => mesh(radius < .06 ? new T.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, radius), mat, x, y, z)
  const cylinder = (radius, depth, mat, x, y, z, axis = 'z') => {
    const item = mesh(new T.CylinderGeometry(radius, radius, depth, radius < .3 ? 24 : 48), mat, x, y, z)
    if (axis === 'z') item.rotation.x = Math.PI / 2
    return item
  }
  const ring = (radius, thickness, mat, x, y, z) => mesh(new T.TorusGeometry(radius, thickness, 8, radius < .3 ? 24 : 64), mat, x, y, z)
  const knurl = (radius, depth, count, x, y, z, axis = 'z') => {
    const geometry = new T.BoxGeometry(.018, .026, depth)
    geometries.add(geometry)
    const item = new T.InstancedMesh(geometry, rubber, count); instances.push(item)
    const transform = new T.Object3D()
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2
      transform.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0)
      transform.rotation.z = a - Math.PI / 2; transform.updateMatrix(); item.setMatrixAt(i, transform.matrix)
    }
    item.position.set(-x, y, z)
    if (axis === 'y') item.rotation.x = Math.PI / 2
    camera.add(item)
  }
  const label = (text, w, h, x, y, z, back = false, color = '#cbd0d4') => {
    const map = texture(512, 128, (ctx) => {
      ctx.fillStyle = color; ctx.font = '500 42px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 64)
    })
    map.colorSpace = T.SRGBColorSpace
    const mat = new T.MeshBasicMaterial({ map, transparent: true, depthWrite: false }); materials.push(mat)
    const item = mesh(new T.PlaneGeometry(w, h), mat, x, y, z)
    if (back) item.rotation.y = Math.PI
    return item
  }

  // Magnesium body, asymmetric deep grip and rubber front panel.
  box(3.35, 2.03, 1.02, .13, shell, 0, 0, -.08)
  box(2.16, 1.5, .08, .08, rubber, -.48, -.18, .45)
  box(.9, 1.94, 1.43, .24, rubber, 1.35, -.02, .16)
  box(.78, .3, 1.15, .1, shell, 1.36, .93, .11)
  box(3.18, .08, .94, .03, black, -.02, -.96, -.08)
  box(3.25, .17, 1.0, .05, shell, 0, .91, -.08)
  // Sloped EVF housing rather than a rectangular toy prism.
  const housing = new T.Shape()
  housing.moveTo(-.63, .97); housing.lineTo(-.45, 1.36); housing.lineTo(.22, 1.36); housing.lineTo(.5, .97); housing.closePath()
  const finder = mesh(new T.ExtrudeGeometry(housing, { depth: .76, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2, steps: 1 }), shell, -.15, 0, -.58)
  finder.name = 'viewfinder-housing'
  box(.63, .06, .45, .015, black, -.25, 1.4, -.17)
  box(.07, .06, .43, .01, metal, -.52, 1.44, -.17)
  box(.07, .06, .43, .01, metal, .02, 1.44, -.17)
  box(.83, .54, .22, .12, rubber, -.23, 1.06, -.67)
  box(.51, .29, .03, .05, optical, -.23, 1.06, -.79)
  label('BAN MAI', .78, .21, -.18, 1.13, .218)

  // Stepped mount and 85mm barrel; no pink plastic lens band.
  const lx = -.36, ly = -.06
  cylinder(.84, .1, metal, lx, ly, .51)
  cylinder(.8, .16, black, lx, ly, .61)
  cylinder(.76, .38, shell, lx, ly, .86)
  ring(.775, .025, edge, lx, ly, .75)
  cylinder(.79, .58, rubber, lx, ly, 1.31)
  knurl(.792, .53, 96, lx, ly, 1.31)
  cylinder(.75, .31, shell, lx, ly, 1.75)
  ring(.753, .015, edge, lx, ly, 1.9)
  cylinder(.765, .24, rubber, lx, ly, 2.03)
  knurl(.766, .2, 96, lx, ly, 2.03)
  // Open front rim and recessed optical elements, avoiding a solid cylinder cap.
  const profile = [[.755, 2.12], [.76, 2.26], [.73, 2.31], [.651, 2.31], [.643, 2.26], [.645, 2.16]]
  const lip = mesh(new T.LatheGeometry(profile.map(([r, z]) => new T.Vector2(r, z)), 64), black, lx, ly)
  lip.rotation.x = Math.PI / 2 // Lathe y becomes z.
  ring(.71, .011, edge, lx, ly, 2.32)
  ring(.657, .01, metal, lx, ly, 2.3)
  cylinder(.645, .018, black, lx, ly, 2.15)
  cylinder(.58, .02, optical, lx, ly, 2.17)
  ring(.5, .008, optical, lx, ly, 2.19)
  ring(.38, .005, optical, lx, ly, 2.2)
  // Wide-open portrait-lens diaphragm is rounded, recessed behind the glass.
  mesh(new T.CircleGeometry(.26, 48), black, lx, ly, 2.21)
  // A spherical cap has genuine optical curvature/normals, unlike a flattened
  // sphere whose reflections make the front element look like a painted disc.
  const frontGlass = mesh(new T.SphereGeometry(1.65, 48, 16, 0, Math.PI * 2, 0, .395), glass, lx, ly, .65)
  frontGlass.rotation.x = Math.PI / 2
  label('85mm  1:1.8', .7, .12, lx, ly - .63, 2.325)
  label('Ø 67', .25, .085, lx, ly + .665, 2.325)
  label('AF / MF', .35, .095, -.9, .42, .54)
  box(.24, .08, .06, .025, black, -.92, .32, .54)

  // Knurled mode/control dials, shutter button, seams and attachment hardware.
  for (const [x, z, r] of [[-1.18, -.1, .28], [.86, -.3, .23], [1.4, .19, .23]]) {
    cylinder(r, .14, black, x, 1.07, z, 'y'); knurl(r, .1, 40, x, 1.07, z, 'y')
    cylinder(r * .88, .015, shell, x, 1.15, z, 'y')
  }
  const shutter = cylinder(.105, .06, metal, 1.4, 1.19, .19, 'y')
  const modeLabel = label('M  A  S  P', .39, .1, -1.18, 1.165, -.1)
  modeLabel.rotation.x = -Math.PI / 2
  for (const x of [-1.62, 1.73]) {
    const lug = ring(.09, .026, metal, x, .72, -.03); lug.rotation.y = Math.PI / 2
  }
  for (const [x, y] of [[-1.45, .78], [-1.47, -.8], [1.07, -.84]]) {
    cylinder(.035, .014, metal, x, y, .443)
    box(.043, .006, .005, .002, black, x, y, .452)
  }
  const lampMat = material({ color: 0x29362f, roughness: .3, emissive: 0x000000 })
  const lamp = mesh(new T.CircleGeometry(.032, 16), lampMat, -.98, .71, .443)
  // Rear LCD and right-hand controls stay credible when visitors change angle.
  box(2.38, 1.54, .08, .08, black, -.33, -.12, -.632)
  const screenMap = texture(512, 320, (ctx) => {
    ctx.fillStyle = '#121a20'; ctx.fillRect(0, 0, 512, 320)
    const g = ctx.createLinearGradient(0, 40, 450, 260); g.addColorStop(0, '#263e4c'); g.addColorStop(1, '#171b24')
    ctx.fillStyle = g; ctx.fillRect(12, 36, 488, 242)
    ctx.strokeStyle = '#70878e'; ctx.lineWidth = 1
    for (const x of [175, 337]) { ctx.beginPath(); ctx.moveTo(x, 36); ctx.lineTo(x, 278); ctx.stroke() }
    for (const y of [117, 198]) { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(500, y); ctx.stroke() }
    ctx.strokeStyle = '#c9cdd0'; ctx.strokeRect(222, 122, 68, 68)
    ctx.fillStyle = '#d8e0e3'; ctx.font = '16px monospace'; ctx.fillText('M   1/250   F1.8   ISO 100', 18, 24); ctx.fillText('RAW    AWB    85mm', 18, 305)
  })
  screenMap.colorSpace = T.SRGBColorSpace
  const screenMat = new T.MeshBasicMaterial({ map: screenMap }); materials.push(screenMat)
  const screen = mesh(new T.PlaneGeometry(2.14, 1.31), screenMat, -.33, -.12, -.679); screen.rotation.y = Math.PI
  cylinder(.26, .06, rubber, 1.15, -.2, -.65)
  ring(.2, .014, edge, 1.15, -.2, -.688)
  cylinder(.085, .07, shell, 1.15, -.2, -.69)
  for (const [x, y] of [[.96, .67], [1.36, .67], [.97, -.67], [1.36, -.67]]) cylinder(.07, .05, black, x, y, -.63)
  label('MENU', .23, .075, .96, .8, -.643, true)
  label('DISP', .21, .075, 1.36, .8, -.643, true)
  box(.49, .62, .15, .11, rubber, 1.32, .3, -.64)

  // Bake static hardware into one draw per shared material. Movable shutter,
  // status lamp and instanced knurling remain independent for interaction.
  const batches = new Map()
  camera.updateMatrixWorld(true)
  for (const item of [...camera.children]) {
    if (!item.isMesh || item.isInstancedMesh || item === shutter || item === lamp) continue
    const group = batches.get(item.material) || []
    group.push(item); batches.set(item.material, group)
  }
  for (const [mat, items] of batches) {
    if (items.length < 2) continue
    const parts = items.map((item) => {
      const geometry = item.geometry.index ? item.geometry.toNonIndexed() : item.geometry.clone()
      geometry.applyMatrix4(item.matrix); return geometry
    })
    const combined = mergeGeometries(parts)
    parts.forEach((part) => part.dispose())
    if (!combined) continue
    const indexed = mergeVertices(combined)
    combined.dispose(); items.forEach((item) => camera.remove(item)); mesh(indexed, mat)
  }

  // Preserve full PBR for still/interactive viewing. Only sustained slow moving
  // frames select cheaper direct-light materials; geometry/engraving stays intact.
  const lightweightMaterials = new Map(), assignments = []
  for (const item of camera.children) {
    const original = item.material
    if (!original?.isMeshStandardMaterial) continue
    if (!lightweightMaterials.has(original)) {
      const simple = new T.MeshPhongMaterial({
        color: original.color.clone(), map: original.map, shininess: 6 + (1 - original.roughness) * 72,
        specular: original.metalness > .6 ? 0x757575 : 0x24242a,
        transparent: original.transparent, opacity: original.opacity, depthWrite: original.depthWrite,
        emissive: original.emissive.clone(),
      })
      materials.push(simple); lightweightMaterials.set(original, simple)
    }
    assignments.push([item, original, lightweightMaterials.get(original)])
  }
  return {
    camera,
    setLightweight(active) { assignments.forEach(([item, original, simple]) => { item.material = active ? simple : original }) },
    shoot(active) { shutter.position.y = active ? 1.165 : 1.19; lamp.material.emissive.setHex(active ? 0x487a40 : 0x000000) },
    dispose() { instances.forEach((item) => item.dispose()); geometries.forEach((item) => item.dispose()); materials.forEach((item) => item.dispose()); textures.forEach((item) => item.dispose()) },
  }
}
