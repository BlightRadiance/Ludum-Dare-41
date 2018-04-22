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
var dangerBaseOpacity = 0.05;

var textUpdateTimer = 0.0;
var textThreshold = 0.026;
var textNeedsUpdate = true;
var textPause = {};
var surfingThreshold = 0.8;
textPause.text = "Reignite dying star\n\nClick the star to increase\nits gravitational pull\n\nThis will destabilize the star\nBut will make progress faster\nAnd your score higher\n\nUse 'A' and 'D' or arrows to evade\nenergy bursts\n\nSurf green energy bursts\nfor higher score\n\n\nPress 'Space' to continue";
textPause.size = 30;

var trialShiftTimer = 0.0;
var trialShiftThreshold = 5;

var directionSwapTimer = 0.0;
var directionSwapThreshold = 20;

var textScore = {};
textScore.text = "";
textScore.size = 40;

var textEnd = {};
textEnd.text = "";
textEnd.size = 80;

var r, g, b, y;

var currentAspectX;
var currentAspectY;

var danger = {};
var player = {};
var field = {};
var controls = {};
var stage = {};

var text = {};

var oldTime = Date.now();

var audio = {};
var particles = {};

init();
animate();

var effect;

function init() {
  camera = camera = new THREE.OrthographicCamera(-frustumHalfSize * aspect, frustumHalfSize * aspect,
    frustumHalfSize, -frustumHalfSize, 1, 1000);
  camera.position.set(0, 0, 700);
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

  stage.sectorCount = 240;

  setupSounds();

  initParticles();

  setupPayer();
  setupDanger();
  setupPlayingField();

  resetState();

  updateScreenSpacePointerPosition();
  onWindowResize();
  clearControls();

  initFont();


}

function initParticles() {
  particles.system = new THREE.GPUParticleSystem({
    maxParticles: 100000
  });
  particles.rate = 100;
  particles.timeScale = 1.0;
  particles.system.position.z = 0;
  particles.time = 0;
  scene.add(particles.system);
}

function setupSounds() {
  var audioLoader = new THREE.AudioLoader();
  var listener = new THREE.AudioListener();
  audio.click = new THREE.Audio(listener);
  audioLoader.load('effects/click.wav', function (buffer) {
    audio.click.setBuffer(buffer);
    audio.click.setLoop(false);
    audio.click.setVolume(0.1);
  });

  audio.explode = new THREE.Audio(listener);
  audioLoader.load('effects/explode.wav', function (buffer) {
    audio.explode.setBuffer(buffer);
    audio.explode.setLoop(false);
    audio.explode.setVolume(0.2);
  });
}

function createText() {
  var textGeo = new THREE.TextBufferGeometry(text.text, {
    font: text.font,
    size: text.size,
    height: text.height,
    curveSegments: text.curveSegments,
    bevelThickness: text.bevelThickness,
    bevelSize: text.bevelSize,
    bevelEnabled: true
  });
  textGeo.computeBoundingBox();
  textGeo.computeVertexNormals();
  var centerOffsetX = - 0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);
  var centerOffsetY = - 0.5 * (textGeo.boundingBox.max.y + textGeo.boundingBox.min.y);
  text.mesh = new THREE.Mesh(textGeo, text.material);
  text.mesh.position.x = centerOffsetX;
  text.mesh.position.y = centerOffsetY;
  text.mesh.position.z = 12;

  text.meshBlack = new THREE.Mesh(textGeo, text.materialBlack);
  text.meshBlack.position.x = centerOffsetX;
  text.meshBlack.position.y = centerOffsetY;
  text.meshBlack.position.z = 10;
  text.meshBlack.position.x += 3;
  text.meshBlack.position.y += 2;

  text.meshBlack2 = new THREE.Mesh(textGeo, text.materialBlack);
  text.meshBlack2.position.x = centerOffsetX;
  text.meshBlack2.position.y = centerOffsetY;
  text.meshBlack2.position.z = 10;
  text.meshBlack2.position.x -= 2;
  text.meshBlack2.position.y -= 2;
  scene.add(text.meshBlack);
  scene.add(text.meshBlack2);
  scene.add(text.mesh);
}

function refreshText() {
  if (text.font !== null && textNeedsUpdate) {
    textNeedsUpdate = false;
    scene.remove(text.mesh);
    scene.remove(text.meshBlack);
    scene.remove(text.meshBlack2);
    doDispose(text.mesh);
    doDispose(text.meshBlack);
    doDispose(text.meshBlack2);
    createText();
  }
}

function setText(textTarget) {
  textNeedsUpdate = true;
  text.size = textTarget.size;
  text.text = textTarget.text;
}

function doDispose(obj) {
  if (obj !== null) {
    for (var i = 0; i < obj.children.length; i++) {
      doDispose(obj.children[i]);
    }
    if (obj.geometry) {
      obj.geometry.dispose();
      obj.geometry = undefined;
    }
    if (obj.material) {
      if (obj.material.map) {
        obj.material.map.dispose();
        obj.material.map = undefined;
      }
      obj.material.dispose();
      obj.material = undefined;
    }
  }
  obj = undefined;
};

function initFont() {
  text.text = textPause;
  text.height = 20;
  text.size = 30;
  text.hover = 0;
  text.curveSegments = 4;
  text.bevelThickness = 1;
  text.bevelSize = 0.1;
  text.bevelSegments = 3;
  text.mesh = null;
  text.font = null;

  text.material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 1.0 });
  text.materialBlack = new THREE.MeshBasicMaterial({ color: 0x00000, transparent: true, opacity: 1.0 });

  var loader = new THREE.TTFLoader();
  loader.load('font/kenny.ttf', function (json) {
    text.font = new THREE.Font(json);
    createText();
  });
}

function resetState() {
  stage.time = 0.0;
  stage.pause = false;
  stage.endGame = false;
  stage.progress = 0.0;
  stage.endTime = 300;
  stage.state = 0;
  stage.oneTime = 0.7;
  stage.twoTime = 0.975;
  stage.color = 0xFFFFFF;
  stage.timeMultiplier = 0;
  stage.timeMultiplierDecayBase = 2;
  stage.timeMultiplierDecay = 2;
  stage.timePerClick = 0.6;

  stage.threat = 0;
  stage.threatDecayBase = 1;
  stage.threatDecay = 1;
  stage.threatPerClick = 1.65;

  stage.startTime = getTime();
  stage.finishTime = 0;
  stage.frameScore = 0;
  stage.score = 0;
  stage.playerInSpike = 0;

  stage.direction = getRandomInt(0, 1);

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
    if (stage.pause) {
      setText(textPause);
    } else {
      setText(textScore);
    }
    if (stage.endGame) {
      stage.endGame = false;
      text.text = "";
      textNeedsUpdate = true;
      textUpdateTimer = 100;
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
  danger.shapes = [];
  danger.properties = [];
  var currentAngle = 0;
  var angleStep = 2 * Math.PI / stage.sectorCount;
  for (i = 0; i < stage.sectorCount; i++) {
    var color;
    var properties = {};
    var shape = new THREE.Shape();
    shape.moveTo(0, 0);
    properties.from = currentAngle;
    var dir = new THREE.Vector2(Math.cos(currentAngle), Math.sin(currentAngle));
    dir = dir.normalize();
    var howFar = 10000;
    shape.lineTo(dir.x * howFar, dir.y * howFar);
    currentAngle += angleStep;
    properties.to = currentAngle;
    var dir = new THREE.Vector2(Math.cos(currentAngle), Math.sin(currentAngle));
    dir = dir.normalize();
    shape.lineTo(dir.x * howFar, dir.y * howFar);
    danger.shapes.push(new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF, opacity: dangerBaseOpacity, transparent: true })));

    properties.touchedByTrialsCount = 0;
    danger.properties.push(properties);
    scene.add(danger.shapes[i]);
  }
  danger.trials = [];

  generateTrial();
  generateTrial();
  generateTrial();
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function generateTrial() {
  var trial = {};
  // Danger storm
  trial.type = getRandomInt(1, 1);
  trial.timeToAppear = getRandomInt(3, 10);
  trial.deadZone = getRandomFloat(0, 2.0 * Math.PI);
  trial.deadZoneAngleDiff = getRandomFloat(Math.PI / 32, Math.PI / 8);
  trial.speed = getRandomFloat(Math.PI / 10, Math.PI / 6);
  trial.direction = stage.direction;
  danger.trials.push(trial);
}

function runTrial(trial, dt, now) {
  if (trial.type == 1) {
    if (trial.direction == 1) {
      trial.deadZone += trial.speed * dt * (stage.threat / 15.0 + 1);
    } else {
      trial.deadZone -= trial.speed * dt * (stage.threat / 15.0 + 1);
    }
    for (i = 0; i < stage.sectorCount; i++) {
      var theatAngleDiff = trial.deadZoneAngleDiff * (stage.threat / 40.0 + 0.8)
      if (collideAngleRanges(danger.properties[i].from, danger.properties[i].to,
        trial.deadZone - theatAngleDiff, trial.deadZone + theatAngleDiff)) {
        trial.timeToAppear -= dt;
        trial.timeToAppear = Math.max(0, trial.timeToAppear);
        danger.shapes[i].material.opacity += 4 * dt * (stage.threat / 80 + 1);
        danger.shapes[i].material.opacity = Math.min(1.0, danger.shapes[i].material.opacity);
        danger.properties[i].touchedByTrialsCount += 1;
      }
    }
  }
}

function collideDangerWithPlayer(dt, now) {
  stage.playerInSpike = 0;
  for (i = 0; i < stage.sectorCount; i++) {
    if (isAngleBetween(danger.properties[i].from, danger.properties[i].to, player.angle)) {
      stage.playerInSpike = Math.max(stage.playerInSpike, danger.shapes[i].material.opacity);
      if (stage.playerInSpike < surfingThreshold && stage.playerInSpike > 0.05 || danger.properties[i].touchedByTrialsCount > 1) {
        stage.playerInSpike = surfingThreshold - 0.1;
        danger.shapes[i].material.color.setHex(0x114411);
      } else {
        danger.shapes[i].material.color.setHex(0xAA0000);
      }
    } else {
      if (danger.properties[i].touchedByTrialsCount > 1) {
        danger.shapes[i].material.color.setHex(0x00AA00);
        danger.shapes[i].material.opacity -= 8 * dt;
      } else {
        if (danger.shapes[i].material.opacity < surfingThreshold) {
          danger.shapes[i].material.color.setHex(0x118811);
        } else {
          danger.shapes[i].material.color.setHex(0xFFFFFF);
        }
      }
    }
  }
}

function calculateFrameScore(dt) {
  var dangerSurfingBonus = 100;
  var fontSizeOffset = 0;
  if (stage.playerInSpike < surfingThreshold && stage.playerInSpike > 0.05) {
    stage.frameScore += dangerSurfingBonus;
    fontSizeOffset = 10;
  }
  if (stage.playerInSpike >= surfingThreshold) {
    fontSizeOffset = -20;
    stage.frameScore /= 2;
  } else {
    stage.frameScore += 1;
    stage.frameScore *= (stage.threat / 20) + 0.5;
  }
  text.size = textScore.size + stage.threat + fontSizeOffset;
  stage.score += stage.frameScore * dt;
}

function decayDanger(dt, now) {
  for (i = 0; i < stage.sectorCount; i++) {
    danger.shapes[i].material.opacity -= dt * 2;
    danger.shapes[i].material.opacity = Math.max(danger.shapes[i].material.opacity, 0.0);
  }
}

function resetSectorsState() {
  for (i = 0; i < stage.sectorCount; i++) {
    danger.properties[i].touchedByTrialsCount = 0;
  }
}

function isAngleBetween(aA, aB, target) {
  return isAngleBetweenImpl(aA, aB, target, false);
}

function isAngleBetweenImpl(aA, aB, target, req) {
  var normalAA = aA % (2.0 * Math.PI);
  var normalAB = aB % (2.0 * Math.PI);
  var normalTarget = target % (2.0 * Math.PI);
  if (normalAA < 0.0) normalAA = 2.0 * Math.PI + normalAA;
  if (normalAB < 0.0) normalAB = 2.0 * Math.PI + normalAB;
  if (normalTarget < 0.0) normalTarget = 2.0 * Math.PI + normalTarget;
  if (normalAA <= normalAB) {
    return normalTarget > normalAA && normalTarget < normalAB;
  } else if (!req) {
    return isAngleBetweenImpl(normalAA, 2.0 * Math.PI - 0.01, target, true) || isAngleBetweenImpl(0.0, normalAB, target, true);
  } else {
    return false;
  }
}

function sleepFor(sleepDuration) {
  var now = new Date().getTime();
  while (new Date().getTime() < now + sleepDuration) { /* do nothing */ }
}

// TODO: check
function collideAngleRanges(aA, aB, bA, bB) {
  return isAngleBetween(aA, aB, bA) || isAngleBetween(aA, aB, bB)
    || isAngleBetween(bA, bB, aA) || isAngleBetween(bA, bB, aB);
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function getTime() {
  return Date.now() / 1000;
}

function updateTrialsState() {
  if (directionSwapTimer > directionSwapThreshold) {
    directionSwapThreshold = getRandomFloat(20, 40);
    directionSwapTimer = 0.0;
    if (stage.direction == 1) {
      stage.direction = 0;
    } else {
      stage.direction = 1;
    }
  }

  if (trialShiftTimer > trialShiftThreshold) {
    trialShiftTimer = 0.0;
    danger.trials.shift();
  }

  var targetTrailCount = Math.ceil(stage.threat / 20) + 1;
  //console.log(targetTrailCount);
  if (targetTrailCount > danger.trials.length) {
    generateTrial();
  } else if (targetTrailCount < danger.trials.length) {
    danger.trials.pop();
  }
}

var firstRun = true;
function updateParticles(dt, time) {
  var delta = dt * particles.timeScale;
  options = {
		position: new THREE.Vector3(),
		velocity: new THREE.Vector3(),
		velocityRandomness: -1,
		colorRandomness: 0,
		turbulence: 0.1,
		lifetime: 100000,
		size: 10,
		sizeRandomness: 1
	};
  for (var i = 0; i < particles.rate * delta; i++) {
    //options.velocity = new THREE.Vector3();
    particles.system.spawnParticle(options);
  }
  particles.time = stage.threat * 100;
  particles.system.update(time * 10);
}

function render() {
  //console.log("stage.timeMultiplier: " + stage.timeMultiplier);
  //console.log("stage.threat: " + stage.threat);
  var shouldPauseAfterRender = false;
  var now = getTime();
  var dt = now - oldTime;
  if (dt > 1 || dt < -1) {
    dt = 0.013;
  }
  stage.frameScore = 0.0;
  textUpdateTimer += dt;
  if (textUpdateTimer > textThreshold) {
    textUpdateTimer = 0;
    refreshText();
  }

  oldTime = now;

  if (!stage.pause) {
    if (stage.time == 0.0) {
      shouldPauseAfterRender = true;
    }
    stage.time += dt * Math.min(Math.max(1.0, stage.timeMultiplier), 5.0);
    updateState();
  }
  if (!stage.endGame && !stage.pause) {
    directionSwapTimer += dt;
    trialShiftTimer += dt;
    effect.uniforms['amount'].value = 0.002 * stage.threat / 30;
    textNeedsUpdate = true;
    text.text = Math.ceil(stage.score);

    stage.progress = stage.time / stage.endTime;

    updatePlayerPosition(dt, stage.time, now);

    //field
    field.circleField.scale.x = 0.3 + stage.progress * 1.3;
    field.circleField.scale.y = 0.3 + stage.progress * 1.3;
    field.circleField.material.color.g = stage.threat / 40 + 0.2;
    field.circleField.material.color.b = stage.threat / 40 + 0.2;
    field.circleField.material.color.r = stage.threat / 40 + 0.2;
    //console.log("field.circleField.material.color.r: " + field.circleField.material.color.r);
    updateClicks();

    //decay
    stage.finishTime = now;
    if (stage.timeMultiplier > 0) {
      stage.timeMultiplier = Math.max(0.0, stage.timeMultiplier - stage.timeMultiplierDecay * dt)
      stage.timeMultiplierDecay = stage.timeMultiplierDecayBase * stage.timeMultiplier / 2.0;
    }

    if (stage.threat > 0) {
      stage.threat = Math.max(0.0, stage.threat - stage.threatDecay * dt * (stage.threat / 5));
      //console.log(stage.threat);
    }

    resetSectorsState();
    updateTrialsState();
    //trials
    var i;
    for (i = 0; i < danger.trials.length; i++) {
      runTrial(danger.trials[i], dt, now);
    }
    decayDanger(dt, now);
    collideDangerWithPlayer(dt, now);
    calculateFrameScore(dt);
    updateParticles(dt, stage.time);
  } else if (!stage.pause) {
    effect.uniforms['angle'].value = stage.time * dt;
    effect.uniforms['amount'].value += 0.002 * dt * Math.sin(stage.time * field.circleField.scale.x);
    //effect.uniforms['dimm'].value -= 0.5 * dt;
    field.circleField.scale.x = Math.sin(stage.time * 3) * 0.1 + 1.0 + now - stage.finishTime;
    field.circleField.scale.y = Math.cos(stage.time * 3 + Math.PI / 4) * 0.1 + 1.0 + now - stage.finishTime;
  }
  if (shouldPauseAfterRender) {
    stage.pause = true;
    setText(textPause);
  }
  composer.render();
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
      //console.log("click inside");
      stage.timeMultiplier += stage.timePerClick;
      stage.threat += stage.threatPerClick;
      stage.threat = Math.min(stage.threat, 70);
      if (stage.playerInSpike < surfingThreshold && stage.playerInSpike > 0.05) {
        stage.score += stage.threat * 3;
      } else {
        stage.score += stage.threat * 0.8;
      }
      audio.click.play();
    } else {
      //console.log("click outside");
      //stage.timeMultiplier -= 1.2 * stage.timePerClick;
      //stage.threat -= stage.threatPerClick;
      //stage.threat = Math.max(stage.threat, 0.0);
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
    audio.explode.play();
    stage.endGame = true;
    setText(textEnd);
    text.text = "Score: " + Math.ceil(stage.score);
    effect.uniforms['dimm'].value = 1.0;
    field.circleField.scale.x = 0.1;
    field.circleField.scale.y = 0.1;
    player.gun.scale.x = 0;
    player.gun.scale.y = 0;
  }
}

function updatePlayerPosition(dt, gameTime, gloablTime) {
  var maxV = Math.PI / 2 * 1.2;
  var maxA = Math.PI / 4;

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