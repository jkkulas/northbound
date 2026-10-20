// Original ink illustrations, rendered as camera-facing paper cutouts.
// Loading is explicit so the map never reveals half-loaded decorations.
export function createIllustration({THREE, scene, url, position, width, height, rotation = 0}) {
  const material = new THREE.SpriteMaterial({transparent: true, depthTest: false, depthWrite: false, rotation});
  const sprite = new THREE.Sprite(material);
  sprite.center.set(.5, 0);
  sprite.position.copy(position);
  sprite.scale.set(width, height, 1);
  sprite.renderOrder = 5;
  sprite.visible = false;
  scene.add(sprite);
  const ready = new THREE.TextureLoader().loadAsync(String(url)).then(texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    material.map = texture;
    material.needsUpdate = true;
    sprite.visible = true;
    return sprite;
  });
  return {sprite, ready};
}
