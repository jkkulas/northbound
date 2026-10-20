// Small sculpted travel toys. All vehicles face local -Z and use normal depth
// testing, so they sit in the map rather than painting over its mountains.
export const TORP = [10.2586, 59.1867];
export const HOVIK = [10.5817, 59.9];
// The Opera is deliberately oversized and grows east from its geographic pin.
// Leave room for the whole car, including its nose while turning, to its west.
export const OSLO_FORECOURT = [10.1, 59.9];

const southFromTorp = [
  TORP, [10.34, 59.25], [10.35, 59.34], [10.31, 59.47],
  [10.23, 59.58], [10.18, 59.70], [10.12, 59.77],
  [10.08, 59.83], OSLO_FORECOURT,
];
const southFromLillehammer = [
  [10.47, 61.11], [10.65, 60.91], [10.68, 60.80],
  [10.61, 60.70], [10.48, 60.52], [10.10, 60.33],
  [10.08, 60.17], [10.09, 60.08], [10.07, 59.98], OSLO_FORECOURT,
];
const gudbrandsdal = [
  [9.54, 61.77],
  [9.87, 61.61], [10.14, 61.53], [10.29, 61.31],
  ...southFromLillehammer,
];
const southCoast = [
  [5.73, 58.97], [5.76, 58.85], [6.01, 58.63],
  [6.29, 58.45], [6.66, 58.30], [7.06, 58.22],
  [7.45, 58.17], [8.00, 58.15], [8.36, 58.35],
  [8.76, 58.55], [9.07, 58.73], [9.30, 58.86],
  [9.49, 59.15], [9.66, 59.22], [9.99, 59.10],
  [10.11, 59.13], ...southFromTorp,
];

// These are scenic cartographic corridors, not a turn-by-turn road dataset.
// They follow the broad eastern valleys and inland southern coast. Western
// passes, fjord ferries and northern islands deliberately use a valley departure
// after the camera fades: a toy car cannot take the real roads' tunnels/ferries.
// Also available to scenery builders so separate peak meshes can leave space.
export const NORWAY_ROAD_CORRIDORS = [gudbrandsdal, southCoast, southFromTorp];

function mapDistanceSquared(a, b) {
  return ((a[0] - b[0]) * 2.2) ** 2 + ((a[1] - b[1]) * 4.4) ** 2;
}

function annotateRoute(points, clicked, destinationName) {
  const route = points.map(point => [...point]);
  Object.defineProperties(route, {
    departure: { value: [...route[0]] },
    clicked: { value: [...clicked] },
    destination: { value: [...OSLO_FORECOURT] },
    destinationName: { value: destinationName },
    snapped: { value: mapDistanceSquared(route[0], clicked) > .04 },
  });
  return route;
}

export function routeNorway(start) {
  const clicked = Array.isArray(start) && start.length >= 2 && start.every(Number.isFinite)
    ? start : [8.7, 62.1];
  let nearest = null;
  for (const corridor of NORWAY_ROAD_CORRIDORS) {
    for (let i = 0; i < corridor.length - 1; i++) {
      const a = corridor[i], b = corridor[i + 1];
      const dx = (b[0] - a[0]) * 2.2, dz = (b[1] - a[1]) * 4.4;
      const t = Math.max(0, Math.min(1,
        (((clicked[0] - a[0]) * 2.2) * dx + ((clicked[1] - a[1]) * 4.4) * dz)
        / (dx * dx + dz * dz || 1)));
      const departure = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const distance = mapDistanceSquared(departure, clicked);
      if (!nearest || distance < nearest.distance) nearest = { corridor, i, departure, distance };
    }
  }
  const points = [nearest.departure, ...nearest.corridor.slice(nearest.i + 1)];
  // A click directly on the destination still gets a short, visible arrival.
  if (points.length < 3 && mapDistanceSquared(points[0], OSLO_FORECOURT) < .006)
    points.splice(0, points.length, [9.96, 59.91], [10.03, 59.9], OSLO_FORECOURT);
  return annotateRoute(points, clicked, 'Høvik · Oslo');
}

export function routeTorpToOslo() {
  return annotateRoute(southFromTorp, TORP, 'Oslo waterfront');
}

export function createVehicles({ THREE, scene }) {
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({
    color, roughness: .76, metalness: .035, ...extra,
  });
  const coral = material(0xbb624e), coralLight = material(0xce7a60);
  const cream = material(0xf2dfab), ivory = material(0xfff1ca);
  const glass = material(0x46676a, { roughness: .38 });
  const rubber = material(0x39413c), chrome = material(0xccbc8f);
  const lamp = material(0xffefb0, { emissive: 0xf4cb70, emissiveIntensity: .34 });

  function mesh(geometry, mat, parent, x = 0, y = 0, z = 0) {
    const item = new THREE.Mesh(geometry, mat);
    item.position.set(x, y, z); item.castShadow = true; item.receiveShadow = true;
    parent.add(item); return item;
  }
  function box(w, h, d, mat, parent, x = 0, y = 0, z = 0) {
    return mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z);
  }
  function sphere(w, h, d, mat, parent, x = 0, y = 0, z = 0) {
    const item = mesh(new THREE.SphereGeometry(1, 18, 12), mat, parent, x, y, z);
    item.scale.set(w, h, d); return item;
  }
  function slab(points, thickness, mat, parent, y = 0) {
    const shape = new THREE.Shape();
    points.forEach(([x, z], i) => i ? shape.lineTo(x, z) : shape.moveTo(x, z));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: thickness, bevelEnabled: true, bevelSize: .035,
      bevelThickness: .035, bevelSegments: 2, steps: 1,
    });
    geometry.rotateX(Math.PI / 2);
    return mesh(geometry, mat, parent, 0, y + thickness / 2, 0);
  }
  const shadowMap = (() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(30,46,34,.42)');
    gradient.addColorStop(.42, 'rgba(30,46,34,.24)');
    gradient.addColorStop(1, 'rgba(30,46,34,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  })();
  function contactShadow(parent, w, d, opacity) {
    const shadow = mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({
      map: shadowMap, color: 0x314335, transparent: true,
      opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
    }), parent, 0, .018, 0);
    shadow.rotation.x = -Math.PI / 2; shadow.castShadow = false;
    return shadow;
  }

  const carModel = new THREE.Group(); carModel.name = 'car-map-toy';
  const chassis = new THREE.Group(); carModel.add(chassis);
  contactShadow(carModel, 2.15, 3.1, .55);
  // Rounded plan-view body, raised above four proper rubber wheels.
  slab([[-.52, -1.13], [.52, -1.13], [.63, -.86], [.63, .83],
    [.48, 1.09], [-.48, 1.09], [-.63, .83], [-.63, -.86]], .34, coral, chassis, .46);
  box(1.07, .12, .65, coralLight, chassis, 0, .70, -.70);
  const cabin = box(.91, .44, .96, cream, chassis, 0, .88, .02);
  box(.82, .29, .025, glass, chassis, 0, .91, -.473).rotation.x = -.15;
  box(.82, .27, .025, glass, chassis, 0, .92, .515).rotation.x = .10;
  for (const side of [-1, 1]) {
    box(.025, .28, .80, glass, chassis, side * .465, .92, .025);
    box(.05, .34, .065, cream, chassis, side * .475, .91, .08);
    box(.12, .065, .20, chrome, chassis, side * .64, .80, -.42);
    box(.16, .16, .045, lamp, chassis, side * .38, .56, -1.165);
    box(.16, .11, .045, coralLight, chassis, side * .40, .55, 1.125);
  }
  // Oversized roof rack and tiny suitcase make the car read at overview scale.
  box(.95, .055, .80, chrome, chassis, 0, 1.14, .07);
  box(.61, .22, .46, material(0x8c9b74), chassis, -.05, 1.27, .08);
  for (const x of [-.21, .12]) box(.04, .23, .47, cream, chassis, x, 1.275, .08);
  box(.50, .11, .055, rubber, chassis, 0, .49, -1.19);
  box(1.10, .07, .07, chrome, chassis, 0, .36, -1.18);
  box(1.10, .07, .07, chrome, chassis, 0, .36, 1.13);
  const wheels = [];
  for (const x of [-.67, .67]) for (const z of [-.73, .72]) {
    const wheel = new THREE.Group(); wheel.position.set(x, .30, z); carModel.add(wheel);
    const tire = mesh(new THREE.CylinderGeometry(.30, .30, .19, 14), rubber, wheel);
    tire.rotation.z = Math.PI / 2;
    const hub = mesh(new THREE.CylinderGeometry(.16, .16, .206, 12), cream, wheel);
    hub.rotation.z = Math.PI / 2;
    for (let spoke = 0; spoke < 3; spoke++) {
      const spokeMesh = box(.212, .035, .28, chrome, wheel);
      spokeMesh.rotation.x = spoke * Math.PI / 3;
    }
    wheels.push(wheel);
  }
  carModel.userData = { kind: 'car', chassis, wheels, footprint: { width: 1.53, length: 2.45 }, cabin };

  const flightModel = new THREE.Group(); flightModel.name = 'plane-map-toy';
  const airframe = new THREE.Group(); flightModel.add(airframe);
  sphere(.44, .43, 1.61, ivory, airframe, 0, .53, .08);
  sphere(.40, .37, .38, coral, airframe, 0, .53, -1.40);
  sphere(.31, .23, .57, glass, airframe, 0, .87, -.37);
  // Swept, thick wings and tail are geometry with visible side faces.
  slab([[-.31, -.50], [-2.32, .06], [-2.34, .43], [-.27, .28]], .13, cream, airframe, .50);
  slab([[.31, -.50], [2.32, .06], [2.34, .43], [.27, .28]], .13, cream, airframe, .50);
  slab([[-.17, 1.02], [-1.03, 1.34], [-1.00, 1.57], [.0, 1.43],
    [1.00, 1.57], [1.03, 1.34], [.17, 1.02]], .095, coral, airframe, .62);
  // A swept upright tail, with the same soft bevel as the wing surfaces.
  const finShape = new THREE.Shape();
  finShape.moveTo(-.98, .64); finShape.lineTo(-1.32, 1.32);
  finShape.lineTo(-1.57, 1.25); finShape.lineTo(-1.49, .62); finShape.closePath();
  const finGeometry = new THREE.ExtrudeGeometry(finShape, {
    depth: .13, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2,
  });
  finGeometry.rotateY(Math.PI / 2); finGeometry.translate(-.065, 0, 0);
  mesh(finGeometry, coral, airframe);
  for (const side of [-1, 1]) {
    box(.25, .035, .40, coral, airframe, side * 2.03, .61, .24);
    const strut = box(.045, .51, .045, chrome, airframe, side * .56, .27, .07);
    strut.rotation.z = -side * .34;
    const tire = mesh(new THREE.CylinderGeometry(.17, .17, .13, 12), rubber, airframe, side * .66, .07, .07);
    tire.rotation.z = Math.PI / 2;
  }
  const propeller = new THREE.Group(); propeller.position.set(0, .53, -1.76); airframe.add(propeller);
  sphere(.12, .12, .16, chrome, propeller);
  const propMat = material(0x665a44);
  for (const angle of [0, Math.PI / 2]) {
    const blade = box(.095, 1.30, .045, propMat, propeller);
    blade.rotation.z = angle;
  }
  flightModel.userData = { kind: 'plane', airframe, propeller, footprint: { width: 4.8, length: 3.65 } };

  const arrival = new THREE.Mesh(new THREE.RingGeometry(.45, .60, 64),
    new THREE.MeshBasicMaterial({ color: 0xffd56d, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false }));
  arrival.name = 'journey-arrival-ring'; arrival.rotation.x = -Math.PI / 2;
  carModel.visible = flightModel.visible = false;
  scene.add(carModel, flightModel, arrival);
  return { flightModel, carModel, arrival };
}

// Animate the inner sculpture, leaving the root heading and terrain placement
// under the route controller's control. Time is seconds, progress is 0…1.
export function animateVehicle(model, { time = 0, progress = 0, turn = 0, speed = 1 } = {}) {
  const data = model.userData;
  if (data.kind === 'car') {
    data.chassis.position.y = Math.sin(time * 15) * .025 * speed;
    data.chassis.rotation.z = Math.max(-.10, Math.min(.10, -turn * .38));
    data.chassis.rotation.x = Math.sin(progress * Math.PI * 2) * .035;
    for (const wheel of data.wheels) wheel.rotation.x = -time * 13 * speed;
  } else if (data.kind === 'plane') {
    data.propeller.rotation.z = time * 42;
    data.airframe.rotation.z = Math.max(-.32, Math.min(.32, -turn * .55)) + Math.sin(progress * Math.PI * 4) * .065;
    data.airframe.rotation.x = -.10 * Math.sin(progress * Math.PI);
    data.airframe.position.y = Math.sin(time * 3.1) * .035;
  }
}
