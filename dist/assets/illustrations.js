// Engraved ornaments occupy the same chart plane as the geographic ink.
// Loading is explicit so the map never reveals half-loaded decorations.
export function createIllustration({THREE, scene, url, position, width, height, rotation = 0}) {
  const material = new THREE.MeshBasicMaterial({transparent: true, depthTest: true, depthWrite: false, toneMapped:false});
  const geometry = new THREE.PlaneGeometry(width,height);
  geometry.translate(0,height*.5,0);
  geometry.rotateX(-Math.PI/2);
  const sprite = new THREE.Mesh(geometry,material);
  sprite.position.copy(position);
  sprite.rotation.y=rotation;
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
