if (typeof require === 'function') {
  var THREE = require('three');
}

var xAxis = new THREE.Vector2(1.0, 0.0);

var camera, scene, renderer, composer;
var mouseRealX = 0, mouseRealY = 0;
var mouseX = 0, mouseY = 0;
var windowHalfX = window.innerWidth / 2.0;
var windowHalfY = window.innerHeight / 2.0;
var aspect = window.innerWidth / window.innerHeight;
var frustumSize = 1000.0;
var frustumHalfSize = frustumSize / 2.0;

var r, g, b, y;

var currentAspectX;
var currentAspectY;

var danger = {};
var player = {};
var field = {};
var controls = {};
var stage = {};

var oldTime = Date.now();

init();
animate();

var effect;

function init() {
  camera = camera = new THREE.OrthographicCamera(-frustumHalfSize * aspect, frustumHalfSize * aspect,
    frustumHalfSize, -frustumHalfSize, 1, 1000);
  camera.position.set(0, 0, 10);
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer = new THREE.EffectComposer(renderer);
  composer.setSize(window.innerWidth, window.innerHeight);
  var renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  effect = new THREE.ShaderPass(THREE.Shader);
  effect.uniforms['amount'].value = 0.002;
  effect.renderToScreen = true;
  composer.addPass(effect);

  document.body.appendChild(renderer.domElement);

  document.addEventListener('mousemove', onDocumentMouseMove, false);
  document.addEventListener('touchstart', onDocumentTouchStart, false);
  document.addEventListener('touchmove', onDocumentTouchMove, false);
  document.addEventListener("keydown", onDocumentKeyDown, false);
  document.addEventListener("keyup", onDocumentKeyUp, false);
  window.addEventListener('resize', onWindowResize, false);

  document.addEventListener("click", onDocumentClick, false);
  document.addEventListener("touchstart", onDocumentClick, false);

  stage.sectorCount = 12;

  setupDanger();
  setupPlayingField();
  setupPayer();

  resetState();

  updateScreenSpacePointerPosition();
  onWindowResize();
  clearControls();
}

function resetState() {
  stage.time = 0.0;
  stage.pause = false;
  stage.endGame = false;
  stage.progress = 0.0;
  stage.endTime = 50;
  stage.state = 0;
  stage.oneTime = 0.7;
  stage.twoTime = 0.95;
  stage.color = 0xFFFFFF;
  stage.timeMultiplier = 0;
  stage.timeMultiplierDecayBase = 2;
  stage.timeMultiplierDecay = 2;
  stage.timePerClickBase = 0.6;
  stage.timePerClick =  0.6;
  stage.threat = 0;
  stage.threatPerClick = 1;

  stage.startTime = getTime();
  stage.finishTime = 0;
  stage.score = 0;

  field.circleField.material.color.setHex(stage.color);

  effect.uniforms['dimm'].value = 1.0;
  effect.uniforms['amount'].value = 0.0;

  player.gun.scale.x = 1.0;
  player.gun.scale.y = 1.0;
}

function clearControls() {
  controls.left = false;
  controls.right = false;
  controls.pause = false;
  controls.click = false;
}

function onDocumentKeyUp(event) {
  if (event.key == "ArrowLeft" || event.code == "KeyA") {
    controls.right = false;
  } else if (event.key == "ArrowRight" || event.code == "KeyD") {
    controls.left = false;
  }
}

function onDocumentKeyDown(event) {
  if (event.key == " ") {
    stage.pause = !stage.pause;
    if (stage.endGame) {
      stage.endGame = false;
      resetState();
    }
  } else if (event.key == "ArrowLeft" || event.code == "KeyA") {
    controls.right = true;
  } else if (event.key == "ArrowRight" || event.code == "KeyD") {
    controls.left = true;
  }
};

function onDocumentClick(event) {
  controls.click = true;
}

function setupPlayingField() {
  var geometryField = new THREE.CircleGeometry(frustumSize / 4, 512);
  var materialField = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true });
  var circleField = new THREE.Mesh(geometryField, materialField);
  scene.add(circleField);
  field.circleField = circleField;
}

function setupPayer() {
  var pW = 40;
  var pH = 40;
  var gunShape = new THREE.Shape();
  gunShape.moveTo(pW * 0.7, -pH + 10);
  gunShape.lineTo(pW * 1.2, -pH);
  gunShape.lineTo(0, pH + 50);
  gunShape.lineTo(-pW * 1.2, -pH);
  gunShape.lineTo(-pW * 0.7, -pH + 10);
  gunShape.splineThru([
    new THREE.Vector2(-pW * 0.7, -pH + 10),
    new THREE.Vector2(-pW / 2.5, -pH / 1.8),
    new THREE.Vector2(0, -pH / 2),
    new THREE.Vector2(pW / 2.5, -pH / 1.8),
    new THREE.Vector2(pW * 0.7, -pH + 10)
  ]);
  var gunGeometry = new THREE.ShapeGeometry(gunShape);
  player.gun = new THREE.Mesh(gunGeometry,
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true }));

  scene.add(player.gun);

  player.angle = 3.0 * Math.PI / 2.0;
  player.velocity = 0.0;
}

function setupDanger() {
  danger.sectorsShapes = [];
  danger.sectorsRanges = [];
  var currentAngle = 0;
  var angleStep = 2 * Math.PI / stage.sectorCount;
  for (i = 0; i < stage.sectorCount; i++) {
    var color;
    var range = {};
    var shape = new THREE.Shape();
    shape.moveTo(0, 0);
    range.from = currentAngle;
    var dir = new THREE.Vector2(Math.cos(currentAngle), Math.sin(currentAngle));
    dir = dir.normalize();
    var howFar = 10000;
    shape.lineTo(dir.x * howFar, dir.y * howFar);
    currentAngle += angleStep;
    range.to = currentAngle;
    var dir = new THREE.Vector2(Math.cos(currentAngle), Math.sin(currentAngle));
    dir = dir.normalize();
    shape.lineTo(dir.x * howFar, dir.y * howFar);
    danger.sectorsShapes.push(new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF, opacity: 0.05, transparent: true })));
    danger.sectorsRanges.push(range);
    scene.add(danger.sectorsShapes[i]);
  }
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function getTime() {
  return Date.now() / 1000;
}

function render() {
  console.log("stage.timeMultiplier: " + stage.timeMultiplier);
  console.log("stage.threat: " + stage.threat);

  var now = getTime();
  var dt = now - oldTime;
  if (dt > 1 || dt < -1) {
    dt = 0.013;
  }
  oldTime = now;

  if (!stage.pause) {
    stage.time += dt * Math.min(Math.max(1.0, stage.timeMultiplier), 5.0);
    updateState();
  }
  if (!stage.endGame && !stage.pause) {
    stage.progress = stage.time / stage.endTime;
    updatePlayerPosition(dt, stage.time, now);
    field.circleField.scale.x = 0.3 + stage.progress * 1.3;
    field.circleField.scale.y = 0.3 + stage.progress * 1.3;

    updateClicks();

    stage.finishTime = now;
    if (stage.timeMultiplier > 0) {
      stage.timeMultiplier = Math.max(0.0, stage.timeMultiplier - stage.timeMultiplierDecay * dt)
      stage.timeMultiplierDecay = stage.timeMultiplierDecayBase * stage.timeMultiplier / 2.0;
    }
  } else if (!stage.pause) {
    effect.uniforms['angle'].value = stage.time * dt;
    effect.uniforms['amount'].value += 0.002 * dt * Math.sin(stage.time * field.circleField.scale.x);
    effect.uniforms['dimm'].value -= 0.5 * dt;
    field.circleField.scale.x = Math.sin(stage.time * 3) * 0.1 + 1.0 + now - stage.finishTime;
    field.circleField.scale.y = Math.cos(stage.time * 3 + Math.PI / 4) * 0.1 + 1.0 + now - stage.finishTime;
  }
  if (stage.state > 1) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

function updateClicks() {
  if (controls.click) {
    controls.click = false;
    if (stage.pause) {
      return;
    }
    var circleW = field.circleField.scale.x * frustumSize / 4;
    var circleH = field.circleField.scale.y * frustumSize / 4;
  if (mouseX < circleW && mouseX > -circleW
      && mouseY < circleH && mouseY > -circleH) {
      console.log("click inside");
      stage.timeMultiplier += stage.timePerClick;
      stage.threat += stage.threatPerClick;
    } else {
      console.log("click outside");
      stage.timeMultiplier -= 1.2 * stage.timePerClick;
      stage.threat -= stage.threatPerClick;
    }
  }
}

function updateState() {
  if (stage.progress > stage.oneTime && stage.progress < stage.twoTime) {
    stage.state = 1;
  } else if (stage.progress > stage.twoTime && stage.time < stage.endTime) {
    stage.state = 2;
  } else if (stage.time >= stage.endTime && !stage.endGame) {
    field.circleField.material.color.setHex(0xFFFFFFF);
    stage.state = 3;
    stage.endGame = true;
    effect.uniforms['dimm'].value = 1.0;
    field.circleField.scale.x = 0.1;
    field.circleField.scale.y = 0.1;
    player.gun.scale.x = 0;
    player.gun.scale.y = 0;
  }
}

function updatePlayerPosition(dt, gameTime, gloablTime) {
  var maxV = 2 * Math.PI;
  var maxA = Math.PI;

  // Calculate velocity
  var slowDownFactor = 1 + dt * 10;
  if (controls.right && !controls.left) {
    if (player.velocity > 0) {
      player.velocity /= slowDownFactor;
    }
    player.a = -maxA * dt * 4;
    player.velocity += player.a;
  } else if (controls.left && !controls.right) {
    if (player.velocity < 0) {
      player.velocity /= slowDownFactor;
    }
    player.a = maxA * dt * 4;
    player.velocity += player.a;
  } else {
    player.velocity /= slowDownFactor;
  }

  player.velocity = THREE.Math.clamp(player.velocity, -maxV, maxV);
  // Calculate position and rotation
  player.angle += player.velocity * dt;
  var direction = new THREE.Vector2(Math.cos(player.angle), Math.sin(player.angle));
  var baseOffset = 1;
  var offset = 0.012 * Math.sin(gloablTime * 2);
  if (stage.state !== 0) {
    // SNAP
    offset = offset;
  }

  player.gun.position.x = frustumHalfSize * direction.x * (baseOffset + offset);
  player.gun.position.y = frustumHalfSize * direction.y * (baseOffset + offset);
  if (stage.state === 2) {
    var posToZero = (stage.progress - stage.twoTime) / (1.0 - stage.twoTime);
    player.gun.position.x *= 1.0 - posToZero;
    player.gun.position.y *= 1.0 - posToZero;
    player.gun.scale.x = Math.min(1.0 - posToZero, 1.0);
    player.gun.scale.y = Math.min(1.0 - posToZero, 1.0);
    effect.uniforms['dimm'].value = 1.0 - Math.sqrt(posToZero);
    effect.uniforms['amount'].value = 0.02 * posToZero + 0.002;
  }

  var dir = new THREE.Vector2(0 - player.gun.position.x, 0 - player.gun.position.y);
  if (stage.state !== 2) {
    player.gun.rotation.z = Math.atan2(dir.y, dir.x) - Math.PI / 2;
  }
  player.dir = dir.normalize();
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  aspect = window.innerWidth / window.innerHeight;

  if (windowHalfX > windowHalfY) {
    currentAspectX = aspect;
    currentAspectY = 1.0;
  } else {
    currentAspectX = 1.0;
    currentAspectY = 1.0 / aspect;
  }
  camera.left = - frustumHalfSize * currentAspectX;
  camera.right = frustumHalfSize * currentAspectX;
  camera.top = frustumHalfSize * currentAspectY;
  camera.bottom = - frustumHalfSize * currentAspectY;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  updateScreenSpacePointerPosition();
}

function onDocumentMouseMove(event) {
  mouseRealX = event.clientX - windowHalfX;
  mouseRealY = event.clientY - windowHalfY;
  updateScreenSpacePointerPosition();
}

function onDocumentTouchStart(event) {
  if (event.touches.length === 1) {
    event.preventDefault();
    mouseRealX = event.touches[0].pageX - windowHalfX;
    mouseRealY = event.touches[0].pageY - windowHalfY;
    updateScreenSpacePointerPosition();
  }
}

function onDocumentTouchMove(event) {
  if (event.touches.length === 1) {
    event.preventDefault();
    mouseRealX = event.touches[0].pageX - windowHalfX;
    mouseRealY = event.touches[0].pageY - windowHalfY;
    updateScreenSpacePointerPosition();
  }
}

function updateScreenSpacePointerPosition() {
  mouseX = mouseRealX * frustumSize / window.innerWidth * currentAspectX;
  mouseY = -mouseRealY * frustumSize / window.innerHeight * currentAspectY;

  if (mouseX === 0.0 && mouseY == 0.0) {
    mouseX = 0.01;
  }
}