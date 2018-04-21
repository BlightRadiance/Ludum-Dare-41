if (typeof require === 'function') {
  var THREE = require('three');
}

var xAxis = new THREE.Vector2(1.0, 0.0);

var camera, scene, renderer;
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

var pointer;
var player = {};

var oldTime = Date.now();

var paused = false;

init();
animate();

function init() {
  camera = camera = new THREE.OrthographicCamera(-frustumHalfSize * aspect, frustumHalfSize * aspect,
    frustumHalfSize, -frustumHalfSize, 1, 1000);
  camera.position.set(0, 0, 1);
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  document.addEventListener('mousemove', onDocumentMouseMove, false);
  document.addEventListener('touchstart', onDocumentTouchStart, false);
  document.addEventListener('touchmove', onDocumentTouchMove, false);
  document.addEventListener("keydown", onDocumentKeyDown, false);
  window.addEventListener('resize', onWindowResize, false);

  setupPlayingField();
  setupPayer();
  setupPointer();

  updateScreenSpacePointerPosition();
  onWindowResize();
}

function onDocumentKeyDown(event) {
  if (event.key == " ") {
    paused = !paused;
  }
};

function setupPointer() {
  var geometryPointer = new THREE.CircleGeometry(frustumSize / 50, 32);
  var materialPointer = new THREE.MeshBasicMaterial({ color: 0x000000 });
  pointer = new THREE.Mesh(geometryPointer, materialPointer);
  scene.add(pointer);
}

function setupPlayingField() {
  var geometryField = new THREE.CircleGeometry(frustumSize / 2, 512);
  var materialField = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  var circleField = new THREE.Mesh(geometryField, materialField);
  scene.add(circleField);
}

function setupPayer() {
  var playerShape = new THREE.Shape();
  var pW = 80;
  var pH = 80;
  playerShape.moveTo(pW * 0.7, -pH);
  playerShape.lineTo(pW * 1.2, -pH + 10);
  playerShape.lineTo(pW, pH);
  playerShape.lineTo(-pW, pH);
  playerShape.lineTo(-pW * 1.2, -pH  + 10);
  playerShape.lineTo(-pW * 0.7, -pH-2);
  playerShape.splineThru([
    new THREE.Vector2(-pW * 0.7, -pH),
    new THREE.Vector2(-pW / 2.5, -pH / 1.8),
    new THREE.Vector2(0, -pH / 2),
    new THREE.Vector2(pW / 2.5, -pH / 1.8),
    new THREE.Vector2(pW * 0.7, -pH)
  ]);

  var playerGeometry = new THREE.ShapeGeometry(playerShape);
  player.shape = new THREE.Mesh(playerGeometry,
    new THREE.MeshBasicMaterial({ color: 0x00000 }));

  scene.add(player.shape);

  player.angle = Math.PI / 2.0;
  player.velocity = 0.0;
  player.acceleration = 0.0;
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  var now = Date.now();
  var dt = (now - oldTime) / 1000;
  oldTime = now;

  pointer.position.x = mouseX;
  pointer.position.y = mouseY;

  if (!paused) {
    updatePlayerPosition(dt);
  }

  renderer.render(scene, camera);
}

function updatePlayerPosition(dt) {
  var maxVelocity = 4 * Math.PI;
  var pointerPosition = new THREE.Vector2(mouseX, mouseY);
  pointerPosition = pointerPosition.normalize();
  targetAngle = Math.atan2(pointerPosition.y, pointerPosition.x);
  var diff = Math.atan2(Math.sin(targetAngle-player.angle), Math.cos(targetAngle-player.angle));

  // Calculate velocity
  if (diff < 0) {
    if (diff > -0.01) {
      diff = -Math.pow(diff, 2);
    } else {
      diff = THREE.Math.clamp(-Math.pow(diff - 1, 4), -maxVelocity, -maxVelocity / 1000);
    } 
  } else {
    if (diff < 0.01) {
      diff = Math.pow(diff, 2);
    } else {
      diff = THREE.Math.clamp(Math.pow(diff + 1, 4), maxVelocity / 1000, maxVelocity); 
    }
  }
  player.velocity = diff;

  // Calculate position and rotation
  player.angle += player.velocity * dt;
  player.shape.position.x = frustumHalfSize * Math.cos(player.angle);
  player.shape.position.y = frustumHalfSize * Math.sin(player.angle);
  player.shape.rotation.z = player.angle - Math.PI / 2;
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