/** Friendly, low-poly sea folklore. Everything here is geometry: no textures or downloads. */
export function addSeaCreatures({ THREE, scene, mobile = false }) {
  const sphere = new THREE.SphereGeometry(1, mobile ? 14 : 18, 12);
  const white = new THREE.MeshStandardMaterial({ color: 0xfffbea, roughness: .72 });
  const ink = new THREE.MeshStandardMaterial({ color: 0x173942, roughness: .9 });
  const blush = new THREE.MeshStandardMaterial({ color: 0xf69b86, roughness: .9 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf8cb59, roughness: .8 });
  const green = new THREE.MeshStandardMaterial({ color: 0x8ec66b, roughness: .85 });
  const purple = new THREE.MeshStandardMaterial({ color: 0xb386cc, roughness: .8 });
  const coral = new THREE.MeshStandardMaterial({ color: 0xf4b4ac, roughness: .85 });
  const foam = new THREE.MeshBasicMaterial({ color: 0xb6e1ca, transparent: true, opacity: .33, depthWrite: false });
  const waterRing = new THREE.MeshBasicMaterial({ color: 0x68c4bc, transparent: true, opacity: .25, depthWrite: false });
  const objects = [];

  function ball(parent, material, position, scale) {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.position.set(...position);
    mesh.scale.set(...(typeof scale === 'number' ? [scale, scale, scale] : scale));
    parent.add(mesh);
    return mesh;
  }

  // A little taper softens the ends of tentacles; the Catmull-Rom spline keeps every bend rounded.
  function tube(parent, material, points, radius, taper = false, segments = 36) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    const radial = 8;
    const geometry = new THREE.TubeGeometry(curve, segments, radius, radial, false);
    if (taper) {
      const positions = geometry.attributes.position;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments, center = curve.getPointAt(t);
        const factor = 1 - .88 * Math.pow(t, 1.5);
        for (let j = 0; j <= radial; j++) {
          const index = i * (radial + 1) + j;
          positions.setXYZ(index,
            center.x + (positions.getX(index) - center.x) * factor,
            center.y + (positions.getY(index) - center.y) * factor,
            center.z + (positions.getZ(index) - center.z) * factor);
        }
      }
      geometry.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(geometry, material);
    parent.add(mesh);
    return { mesh, curve };
  }

  function instances(parent, material, items) {
    const mesh = new THREE.InstancedMesh(sphere, material, items.length);
    const dummy = new THREE.Object3D();
    items.forEach((item, i) => {
      dummy.position.set(...item.position);
      dummy.rotation.set(0, 0, item.tilt || 0);
      dummy.scale.set(...(typeof item.scale === 'number' ? [item.scale, item.scale, item.scale] : item.scale));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    parent.add(mesh);
    return mesh;
  }

  function ripple(parent, x, z, radius, stretch = 1, material = waterRing) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, .028, 4, mobile ? 44 : 64), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, .045, z);
    mesh.scale.set(1, stretch, 1);
    parent.add(mesh);
  }

  function eyes(parent, centers, radius) {
    instances(parent, white, centers.map(position => ({ position, scale: [radius, radius * 1.07, radius * .74] })));
    instances(parent, ink, centers.map((p, i) => ({ position: [p[0] + (i ? -.035 : .035), p[1] + radius * .1, p[2] + radius * .64], scale: radius * .46 })));
    instances(parent, white, centers.map(p => ({ position: [p[0] - radius * .1, p[1] + radius * .28, p[2] + radius * .94], scale: radius * .14 })));
  }

  function creature(name, lon, lat) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set((lon - 13) * 2.2, .06, (60 - lat) * 4.4);
    group.userData = { title: name, coordinates: [lon, lat], kind: 'sea-creature' };
    scene.add(group);
    objects.push(group);
    return group;
  }

  // Jörmungandr is a cheerful, slightly cross-eyed sea noodle, with three soft green humps.
  const serpent = creature('Jörmungandr', mobile ? 4.1 : 1.7, 65.15);
  serpent.rotation.y = -.12;
  const serpentPath = [
    [-4.4, .18, -.5], [-3.8, 1.65, -.55], [-2.7, 2.05, -.5], [-1.65, .38, -.35],
    [-.45, 2.2, -.6], [.65, 2.45, -.45], [1.65, .35, -.15], [2.5, 1.3, .15], [2.9, 3.2, .65]
  ];
  tube(serpent, green, serpentPath, .55, false, mobile ? 60 : 80);
  tube(serpent, gold, serpentPath.map(p => [p[0], p[1] - .12, p[2] + .41]), .25, false, mobile ? 60 : 80);
  ball(serpent, green, [2.95, 3.47, .75], [1.05, .9, .78]);
  ball(serpent, gold, [2.96, 3.1, 1.25], [.87, .46, .53]);
  eyes(serpent, [[2.46, 3.9, 1.24], [3.43, 3.92, 1.22]], .43);
  instances(serpent, green, [
    { position: [2.18, 3.04, 1.28], scale: [.24, .17, .14] },
    { position: [3.75, 3.04, 1.26], scale: [.24, .17, .14] }
  ]);
  instances(serpent, blush, [
    { position: [2.09, 3.26, 1.38], scale: [.22, .14, .07] },
    { position: [3.81, 3.26, 1.36], scale: [.22, .14, .07] }
  ]);
  tube(serpent, ink, [[2.46, 3.12, 1.69], [2.7, 2.96, 1.75], [3.14, 2.96, 1.75], [3.43, 3.13, 1.68]], .046, false, 20);
  // Rounded gold feelers and a few pill-shaped dorsal scales keep the silhouette storybook friendly.
  instances(serpent, gold, [
    { position: [2.34, 4.33, .5], scale: [.18, .5, .19], tilt: -.3 },
    { position: [3.49, 4.35, .5], scale: [.18, .5, .19], tilt: .3 },
    { position: [-3.08, 2.48, -.52], scale: [.23, .34, .22], tilt: .2 },
    { position: [-.1, 2.66, -.55], scale: [.23, .34, .22], tilt: -.2 },
    { position: [.55, 2.91, -.45], scale: [.23, .34, .22], tilt: .1 }
  ]);
  ripple(serpent, -.2, -.3, 4.6, .5);
  ripple(serpent, -.2, -.3, 5.05, .51, foam);
  instances(serpent, white, [
    { position: [-1.65, .09, .25], scale: [.45, .075, .2] },
    { position: [1.65, .09, .35], scale: [.48, .075, .19] },
    { position: [-4.35, .09, -.07], scale: [.27, .06, .17] }
  ]);

  // The Kraken has eight curling arms, peach suckers, and a lopsided, curious face.
  const kraken = creature('Kraken', mobile ? 4.0 : 3.1, 59.65);
  kraken.rotation.y = -.08;
  const arms = [
    [[-.65,.65,.55],[-1.75,.38,1.25],[-3.05,.45,1.75],[-3.65,1.28,1.7],[-3.25,1.72,1.5]],
    [[-.9,.65,-.2],[-2,.35,-.55],[-3.3,.45,-.6],[-3.8,1.1,-1.05],[-3.4,1.45,-1.6]],
    [[-.55,.65,-.7],[-1.5,.35,-1.8],[-1.8,.55,-2.7],[-1.45,1.35,-3.0],[-.95,1.48,-2.7]],
    [[.15,.65,-.9],[.6,.3,-2.0],[1.3,.45,-2.8],[2,1.15,-2.75],[1.85,1.55,-2.2]],
    [[.85,.65,-.5],[2,.35,-1],[3.3,.45,-1.2],[3.85,1.25,-.95],[3.45,1.7,-.65]],
    [[.9,.65,.3],[2,.38,.75],[3.3,.45,1.1],[3.75,1.3,1.5],[3.2,1.75,1.65]],
    [[.5,.65,.8],[1.25,.35,1.8],[1.75,.4,2.8],[1.4,1.1,3.3],[.85,1.5,3]],
    [[-.25,.65,.85],[-.6,.3,1.9],[-1.1,.4,2.9],[-1.75,1.15,3.15],[-2.1,1.4,2.7]]
  ];
  const suckers = [];
  arms.forEach(points => {
    const { curve } = tube(kraken, purple, points, .38, true, mobile ? 24 : 32);
    for (let i = 1; i < 5; i++) {
      const t = .22 + i * .13, p = curve.getPointAt(t), radius = .15 * (1 - .65 * t);
      suckers.push({ position: [p.x, p.y + .2 * (1 - t), p.z + .13], scale: [radius, radius * .5, radius] });
    }
  });
  instances(kraken, coral, suckers);
  ball(kraken, purple, [0, 2.2, 0], [1.47, 1.75, 1.16]);
  ball(kraken, purple, [.28, 3.6, -.05], [.88, .54, .85]);
  eyes(kraken, [[-.56, 2.9, 1.02], [.57, 3.02, 1.0]], .48);
  instances(kraken, blush, [
    { position: [-1.02, 2.33, .88], scale: [.27, .16, .1] },
    { position: [1.03, 2.38, .86], scale: [.27, .16, .1] }
  ]);
  tube(kraken, ink, [[-.46, 2.25, 1.12], [-.2, 2.05, 1.2], [.15, 2.04, 1.2], [.42, 2.27, 1.14]], .054, false, 20);
  instances(kraken, coral, [
    { position: [-.42, 3.7, .45], scale: [.15, .18, .1] },
    { position: [.04, 3.85, .48], scale: [.12, .15, .1] },
    { position: [.45, 3.73, .52], scale: [.1, .12, .09] }
  ]);
  ripple(kraken, 0, 0, 3.5, .88);
  ripple(kraken, 0, 0, 4.1, .87, foam);
  instances(kraken, white, [
    { position: [-2.65, .09, .6], scale: [.36, .06, .18] },
    { position: [2.7, .09, -.2], scale: [.34, .06, .17] },
    { position: [.35, .09, 2.6], scale: [.3, .06, .18] }
  ]);

  return { count: objects.length, objects };
}
