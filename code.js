if (typeof require === 'function')
{
  var THREE = require('three');
}

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

  var geometryField = new THREE.CircleGeometry(frustumSize / 2, 512);
  var materialField = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  var circleField = new THREE.Mesh(geometryField, materialField);
  scene.add(circleField);

  var geometryPointer = new THREE.CircleGeometry(frustumSize / 20, 32);
  var materialPointer = new THREE.MeshBasicMaterial({ color: 0x888888 });
  pointer = new THREE.Mesh(geometryPointer, materialPointer);
  scene.add(pointer);


  var geometryHelper = new THREE.CircleGeometry(frustumSize / 10, 32);
  r = new THREE.Mesh(geometryHelper, new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
  g = new THREE.Mesh(geometryHelper, new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
  b = new THREE.Mesh(geometryHelper, new THREE.MeshBasicMaterial({ color: 0x0000FF }));
  y = new THREE.Mesh(geometryHelper, new THREE.MeshBasicMaterial({ color: 0x00FFFF }));
  scene.add(r);
  scene.add(g);
  scene.add(b);
  scene.add(y);

  document.addEventListener('mousemove', onDocumentMouseMove, false);
  document.addEventListener('touchstart', onDocumentTouchStart, false);
  document.addEventListener('touchmove', onDocumentTouchMove, false);
  window.addEventListener('resize', onWindowResize, false);

  onWindowResize();
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  var time = Date.now();

  pointer.position.x = mouseX;
  pointer.position.y = -mouseY;

  r.position.x = frustumHalfSize;
  r.position.y = frustumHalfSize;

  g.position.x = -frustumHalfSize;
  g.position.y = frustumHalfSize;

  b.position.x = -frustumHalfSize;
  b.position.y = -frustumHalfSize;

  y.position.x = frustumHalfSize;
  y.position.y = -frustumHalfSize;

  renderer.render(scene, camera);
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
  console.log("Pointer: x = " + mouseRealX + "; y = " + mouseRealY);
  mouseX = mouseRealX * frustumSize / window.innerWidth * currentAspectX;
  mouseY = mouseRealY * frustumSize / window.innerHeight * currentAspectY;
}