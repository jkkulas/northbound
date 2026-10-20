// Little painted souvenirs, built once and merged by colour. No textures,
// animation loop, or additional runtime dependencies are needed.
export function addLandmarks({ THREE, scene, worldPoint, mobile = false }) {
  const colors = {
    cream: 0xffe9bd, white: 0xfff7df, butter: 0xf5c657,
    coral: 0xe87557, red: 0xc95643, pink: 0xe8a18d,
    brick: 0xb8674d, roof: 0xb94739, teal: 0x387e78,
    glass: 0x78c7c2, ink: 0x284c52, wood: 0x856345,
    stone: 0xc7bc92, leaf: 0x589451, lime: 0x8cb75c,
    water: 0x409b9d, gold: 0xffda76,
  };
  const materials = Object.fromEntries(Object.entries(colors).map(([name, color]) => [
    name, new THREE.MeshStandardMaterial({ color, roughness: .86, metalness: 0 }),
  ]));
  materials.shadow = new THREE.MeshBasicMaterial({
    color: 0x153c36, transparent: true, opacity: .16,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const sphere = new THREE.SphereGeometry(1, mobile ? 8 : 12, mobile ? 6 : 8);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const cone = new THREE.ConeGeometry(1, 1, 12);
  const disk = new THREE.CircleGeometry(1, 24);
  const geometryCache = new Map();
  const originals = new Set([sphere, cylinder, cone, disk]);

  function softBox(w, h, d) {
    const key = `box:${w}:${h}:${d}`;
    if (geometryCache.has(key)) return geometryCache.get(key);
    const r = Math.min(.045, w * .15, h * .15, d * .15);
    const shape = new THREE.Shape();
    const x = w / 2 - r, y = h / 2 - r;
    shape.moveTo(-x, -y); shape.lineTo(x, -y);
    shape.lineTo(x, y); shape.lineTo(-x, y); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: d - r * 2, steps: 1, bevelEnabled: true,
      bevelSegments: 2, bevelSize: r, bevelThickness: r, curveSegments: 1,
    });
    g.translate(0, 0, -d / 2 + r);
    geometryCache.set(key, g); originals.add(g); return g;
  }
  function roofGeometry(w, h, d) {
    const key = `roof:${w}:${h}:${d}`;
    if (geometryCache.has(key)) return geometryCache.get(key);
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(0, h); s.lineTo(w / 2, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: d, steps: 1, bevelEnabled: true, bevelSize: .025,
      bevelThickness: .025, bevelSegments: 2, curveSegments: 1,
    });
    g.translate(0, 0, -d / 2);
    geometryCache.set(key, g); originals.add(g); return g;
  }

  function souvenir(title, coordinates, rotation = -.12) {
    const group = new THREE.Group();
    group.name = `landmark-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    group.position.copy(worldPoint(coordinates, .1)); group.rotation.y = rotation;
    group.userData = { title, coordinates: [...coordinates], kind: 'landmark' };
    const batches = new Map();
    function part(geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
      const matrix = new THREE.Matrix4().compose(
        new THREE.Vector3(...position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
        new THREE.Vector3(...scale),
      );
      const transformed = (geometry.index ? geometry.toNonIndexed() : geometry.clone()).applyMatrix4(matrix);
      if (!batches.has(material)) batches.set(material, []);
      batches.get(material).push(transformed);
    }
    const box = (w, h, d, color, x, y, z, rotation = [0, 0, 0]) =>
      part(softBox(w, h, d), color, [x, y, z], [1, 1, 1], rotation);
    const ball = (rx, ry, rz, color, x, y, z) => part(sphere, color, [x, y, z], [rx, ry, rz]);
    const pillar = (r, h, color, x, y, z) => part(cylinder, color, [x, y, z], [r, h, r]);
    const roof = (w, h, d, color, x, y, z) => part(roofGeometry(w, h, d), color, [x, y, z]);
    function tree(x, z, size = 1) {
      pillar(.07 * size, .55 * size, 'wood', x, .28 * size, z);
      ball(.38 * size, .48 * size, .36 * size, 'leaf', x, .72 * size, z);
      ball(.25 * size, .31 * size, .26 * size, 'lime', x - .13 * size, .86 * size, z + .08 * size);
    }
    function window(x, y, z, w = .16, h = .21) {
      box(w + .045, h + .045, .035, 'cream', x, y, z);
      box(w, h, .041, 'ink', x, y, z + .022);
    }
    function finish() {
      // One draw call per paint colour, rather than one per little window.
      for (const [color, pieces] of batches) {
        let length = 0;
        for (const piece of pieces) length += piece.attributes.position.array.length;
        const positions = new Float32Array(length), normals = new Float32Array(length);
        let offset = 0;
        for (const piece of pieces) {
          positions.set(piece.attributes.position.array, offset);
          normals.set(piece.attributes.normal.array, offset);
          offset += piece.attributes.position.array.length; piece.dispose();
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.computeBoundingSphere();
        const mesh = new THREE.Mesh(geometry, materials[color]);
        mesh.name = `${group.name}-${color}`; group.add(mesh);
      }
      group.userData.drawCalls = group.children.length;
      scene.add(group); return group;
    }
    part(disk, 'shadow', [0, .014, 0], [1.8, 1.25, 1], [-Math.PI / 2, 0, 0]);
    return { group, box, ball, pillar, roof, tree, window, part, finish };
  }
  const objects = [];

  // Bryggen: the close row of painted, gabled timber warehouses on the quay.
  {
    const k = souvenir('Bergen · Bryggen', [5.32, 60.39], -.18);
    k.box(3.15, .15, 1.6, 'stone', 0, .075, .12);
    const paint = ['red', 'butter', 'cream', 'coral'];
    [-1.05, -.35, .35, 1.05].forEach((x, i) => {
      const h = [1.02, 1.19, 1.06, 1.15][i];
      k.box(.64, h, .9, paint[i], x, .15 + h / 2, -.06);
      k.roof(.69, .45, .98, i === 1 ? 'brick' : 'roof', x, .15 + h, -.06);
      k.window(x - .14, .88, .412, .1, .17); k.window(x + .14, .88, .412, .1, .17);
      k.box(.18, .33, .04, 'wood', x, .32, .42);
      k.box(.045, h * .9, .04, 'cream', x - .29, .18 + h / 2, .425);
    });
    k.box(3.2, .1, .27, 'wood', 0, .17, .82);
    k.tree(1.57, -.55, .72); k.tree(-1.57, -.48, .66);
    objects.push(k.finish());
  }

  // Oslo Opera House: the walkable white roof rises out of the fjord.
  {
    const k = souvenir('Oslo · Opera House', [10.75, 59.91], -.2);
    const shape = new THREE.Shape();
    shape.moveTo(-.9, 0); shape.lineTo(.9, 0);
    shape.lineTo(.9, .79); shape.lineTo(-.9, .09); shape.closePath();
    const slope = new THREE.ExtrudeGeometry(shape, { depth: 2.95, bevelEnabled: false, steps: 1 });
    slope.rotateY(Math.PI / 2); slope.translate(-1.475, .035, 0);
    originals.add(slope); k.part(slope, 'white');
    k.box(1.5, .64, .87, 'glass', .2, 1.02, -.48);
    k.box(1.6, .12, .96, 'white', .2, 1.4, -.48);
    k.box(.48, .58, .88, 'wood', -.83, 1, -.49);
    for (const x of [-.38, 0, .38, .75]) k.box(.035, .61, .025, 'teal', x, 1.04, -.027);
    for (const x of [-.91, -.3, .31, .92])
      k.box(.018, .012, 1.89, 'stone', x, .48, -.02, [Math.atan(.7 / 1.8), 0, 0]);
    k.tree(1.5, -.85, .67); k.tree(-1.55, -.9, .62);
    objects.push(k.finish());
  }

  // City Hall's copper cap and little golden crowns above the brick tower.
  {
    const k = souvenir('Stockholm · City Hall', [18.07, 59.33], -.16);
    k.box(3, .13, 1.65, 'stone', 0, .065, 0);
    k.box(2.1, .92, 1.05, 'brick', .24, .58, -.08);
    k.roof(2.25, .36, 1.17, 'teal', .24, 1.04, -.08);
    k.box(.61, 2.13, .64, 'brick', -1.01, 1.18, -.06);
    k.box(.7, .13, .73, 'cream', -1.01, 2.08, -.06);
    k.box(.48, .38, .5, 'teal', -1.01, 2.44, -.06);
    k.part(cone, 'teal', [-1.01, 2.83, -.06], [.4, .48, .4]);
    k.pillar(.035, .35, 'gold', -1.01, 3.15, -.06);
    for (const x of [-1.15, -1.01, -.87]) {
      k.ball(.065, .07, .06, 'gold', x, 3.36, -.06);
      k.pillar(.025, .13, 'gold', x, 3.28, -.06);
    }
    for (const x of [-.5, -.03, .44, .91]) k.window(x, .65, .463, .18, .33);
    k.window(-1.01, 1.65, .278, .2, .37);
    k.box(.32, .42, .04, 'ink', -1.01, .37, .28);
    k.tree(1.4, -.43, .77); k.tree(1.38, .64, .58);
    objects.push(k.finish());
  }

  // Nyhavn has a different silhouette: tall candy-coloured canal houses,
  // copper dormers, a little moored boat, and a Danish flag.
  {
    const k = souvenir('Copenhagen · Nyhavn', [12.57, 55.68], -.13);
    k.box(3.2, .12, 1.3, 'stone', 0, .06, -.22);
    k.box(3.3, .035, .7, 'water', 0, .04, .83);
    [-1.02, -.34, .34, 1.02].forEach((x, i) => {
      const h = [1.37, 1.57, 1.43, 1.32][i];
      k.box(.62, h, .82, ['butter', 'pink', 'coral', 'glass'][i], x, .12 + h / 2, -.25);
      k.roof(.68, .32, .9, 'teal', x, .12 + h, -.25);
      for (const y of [.63, 1.12]) {
        k.window(x - .14, y, .179, .1, .18); k.window(x + .14, y, .179, .1, .18);
      }
      k.box(.16, .3, .04, 'wood', x, .28, .18);
    });
    k.box(1.2, .18, .35, 'ink', -.25, .16, .86);
    k.box(.5, .24, .3, 'cream', -.13, .35, .86);
    k.box(.28, .1, .035, 'glass', -.13, .37, 1.02);
    k.pillar(.025, .85, 'wood', -.65, .62, .86);
    k.box(.28, .18, .02, 'red', -.5, .95, .86);
    k.box(.035, .18, .025, 'white', -.55, .95, .86);
    k.box(.28, .035, .025, 'white', -.5, .95, .86);
    k.tree(1.54, -.64, .66);
    objects.push(k.finish());
  }

  // Warsaw's terracotta Royal Castle, with a clock and green baroque cupola.
  {
    const k = souvenir('Warsaw · Royal Castle', [21.01, 52.25], -.14);
    k.box(3.25, .12, 1.8, 'stone', 0, .06, 0);
    k.box(2.72, 1.06, 1.12, 'coral', 0, .65, -.08);
    k.roof(2.85, .38, 1.25, 'roof', 0, 1.18, -.08);
    k.box(.58, 1.93, .64, 'coral', 0, 1.09, .24);
    k.box(.68, .12, .74, 'cream', 0, 1.98, .24);
    k.box(.47, .3, .53, 'teal', 0, 2.2, .24);
    k.ball(.32, .25, .32, 'teal', 0, 2.49, .24);
    k.part(cone, 'teal', [0, 2.82, .24], [.16, .38, .16]);
    k.ball(.065, .075, .065, 'gold', 0, 3.05, .24);
    k.ball(.18, .18, .037, 'cream', 0, 1.57, .575);
    k.box(.025, .12, .018, 'ink', 0, 1.61, .617);
    k.box(.09, .025, .018, 'ink', .035, 1.57, .619);
    for (const x of [-1.08, -.66, .66, 1.08]) {
      k.window(x, .9, .5, .14, .22); k.window(x, .46, .5, .14, .22);
    }
    k.box(.29, .45, .045, 'wood', 0, .36, .585);
    k.tree(-1.51, -.57, .75); k.tree(1.5, -.52, .66);
    objects.push(k.finish());
  }

  // A Dutch windmill, with broad ivory sails and small sunny tulip beds.
  {
    const k = souvenir('Holland · Windmill', [4.5, 52.1], -.17);
    k.part(cylinder, 'lime', [0, .045, 0], [1.42, .09, 1.12]);
    const taper = new THREE.CylinderGeometry(.31, .53, 1.63, 12);
    originals.add(taper); k.part(taper, 'cream', [0, .91, 0]);
    k.pillar(.57, .12, 'wood', 0, .35, 0);
    k.part(cone, 'teal', [0, 2.02, 0], [.64, .72, .64]);
    k.box(.27, .4, .04, 'wood', 0, .32, .53);
    k.window(-.14, 1.22, .4, .12, .19);
    for (const angle of [Math.PI / 4, Math.PI * 3 / 4]) {
      k.box(.095, 2.95, .085, 'wood', 0, 1.85, .58, [0, 0, angle]);
      k.box(.23, 2.72, .035, 'white', 0, 1.85, .63, [0, 0, angle]);
      k.box(.045, 2.84, .048, 'butter', 0, 1.85, .655, [0, 0, angle]);
    }
    k.ball(.16, .16, .12, 'gold', 0, 1.85, .72);
    k.box(.67, .07, .4, 'butter', -.91, .12, .58);
    k.box(.67, .07, .4, 'coral', .91, .12, .58);
    for (const x of [-1.12, -.89, -.66, .66, .89, 1.12]) {
      k.pillar(.025, .18, 'leaf', x, .24, .58);
      k.ball(.085, .105, .08, x < 0 ? 'gold' : 'red', x, .36, .58);
    }
    k.tree(-1.15, -.61, .75); k.tree(1.13, -.67, .64);
    objects.push(k.finish());
  }

  for (const geometry of originals) geometry.dispose();
  return { count: objects.length, objects };
}
