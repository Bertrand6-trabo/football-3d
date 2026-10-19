 
import './style.css'
import * as THREE from 'three'

// FOOTBALL 3D - PART 1
// Controls will be added in Parts 2 and 3.

const $ = id => document.getElementById(id)

const game = $('game')
const team1 = $('team1')
const team2 = $('team2')
const startButton = $('startGame')
const startScreen = $('startScreen')
const pauseScreen = $('pauseScreen')
const endScreen = $('endScreen')

const clubs = {
  blue: { name: 'BLUE FC', color: 0x1976ff },
  red: { name: 'RED UNITED', color: 0xef3948 },
  green: { name: 'GREEN CITY', color: 0x15a768 },
  gold: { name: 'GOLDEN STARS', color: 0xe2b33b }
}

let homeClub = clubs.blue
let awayClub = clubs.red

let homePlayers = []
let awayPlayers = []
let hero
let goalkeeperHome
let goalkeeperAway

let scoreHome = 0
let scoreAway = 0
let remaining = 90
let running = false
let paused = false
let finished = false

let matchStartedAt = 0
let pausedDuration = 0
let pauseStartedAt = 0
let lastKick = 0
let lastPass = 0
let lastSlide = 0
let stamina = 100
let toastUntil = 0
let selectedPlayerIndex = 0
let ballOwner = null
let lastTouchTeam = 'home'
let shotCooldown = 0

const keys = Object.create(null)

// THREE.JS SCENE
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x8bb7d2)
scene.fog = new THREE.Fog(0x8bb7d2, 38, 90)

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 150)
camera.position.set(0, 8, 12)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.domElement.tabIndex = 0
game.appendChild(renderer.domElement)

scene.add(new THREE.HemisphereLight(0xffffff, 0x435744, 2))

const sunlight = new THREE.DirectionalLight(0xffffff, 2.5)
sunlight.position.set(-10, 18, 8)
sunlight.castShadow = true
sunlight.shadow.mapSize.set(1024, 1024)
scene.add(sunlight)

function box(parent, w, h, d, color, x, y, z, material = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, ...material })
  )

  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

// GRASS
const grassBase = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x526b47 })
)

grassBase.rotation.x = -Math.PI / 2
grassBase.position.y = -0.1
grassBase.receiveShadow = true
scene.add(grassBase)

const pitch = new THREE.Group()
scene.add(pitch)

const grass = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 30),
  new THREE.MeshStandardMaterial({
    color: 0x167b39,
    roughness: 1
  })
)

grass.rotation.x = -Math.PI / 2
grass.receiveShadow = true
pitch.add(grass)

// GRASS STRIPES
for (let i = 0; i < 6; i++) {
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 5),
    new THREE.MeshBasicMaterial({
      color: i % 2 ? 0x218a40 : 0x167b39
    })
  )

  stripe.rotation.x = -Math.PI / 2
  stripe.position.set(0, 0.012, -12.5 + i * 5)
  pitch.add(stripe)
}

// PITCH LINES
function line(x, z, w, d) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.025, d),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  )

  mesh.position.set(x, 0.035, z)
  pitch.add(mesh)
}

line(0, -14.8, 20, 0.12)
line(0, 14.8, 20, 0.12)
line(-9.9, 0, 0.12, 29.6)
line(9.9, 0, 0.12, 29.6)
line(0, 0, 20, 0.08)

const circle = new THREE.Mesh(
  new THREE.RingGeometry(2.8, 2.9, 64),
  new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
  })
)

circle.rotation.x = -Math.PI / 2
circle.position.y = 0.04
pitch.add(circle)

// GOALS
for (const end of [-1, 1]) {
  line(0, end * 12.1, 8, 0.08)
  line(-4, end * 10.1, 0.08, 4)
  line(4, end * 10.1, 0.08, 4)

  const goal = new THREE.Group()
  goal.position.z = end * 14.8
  pitch.add(goal)

  box(goal, 4, 0.12, 0.12, 0xffffff, 0, 2, 0)
  box(goal, 0.12, 2, 0.12, 0xffffff, -2, 1, 0)
  box(goal, 0.12, 2, 0.12, 0xffffff, 2, 1, 0)

  const net = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.8, 0.55),
    new THREE.MeshStandardMaterial({
      color: 0xe7eeee,
      wireframe: true
    })
  )

  net.position.set(0, 0.95, end * 0.3)
  goal.add(net)
}

// STADIUM STANDS
for (const end of [-1, 1]) {
  for (let i = 0; i < 3; i++) {
    box(
      scene, 24, 0.55, 0.8,
      i % 2 ? 0x334b7a : 0x25385d,
      0, 0.4 + i * 0.6,
      end * (18 + i * 1.2)
    )
  }
}

// FLOODLIGHTS
for (const x of [-13, 13]) {
  for (const z of [-14, 14]) {
    box(scene, 0.22, 8, 0.22, 0x64716b, x, 4, z)

    const lamp = new THREE.PointLight(0xffffff, 12, 25)
    lamp.position.set(x, 8, z)
    scene.add(lamp)
  }
}

// PLAYER MODELS
function makePlayer(color, x, z, options = {}) {
  const root = new THREE.Group()
  root.position.set(x, 0, z)
  scene.add(root)

  const shirt = new THREE.MeshStandardMaterial({ color })
  const skin = new THREE.MeshStandardMaterial({ color: 0xb97b55 })
  const shorts = new THREE.MeshStandardMaterial({ color: 0x202637 })
  const sock = new THREE.MeshStandardMaterial({ color: 0xf2f2f2 })
  const shoes = new THREE.MeshStandardMaterial({ color: 0x151515 })
  const hair = new THREE.MeshStandardMaterial({ color: 0x241a16 })

  function part(parent, geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }

  part(root, new THREE.CylinderGeometry(0.27, 0.35, 0.72, 16),
    shirt, 0, 1.35, 0)

  part(root, new THREE.SphereGeometry(0.3, 16, 12),
    shirt, 0, 1.62, 0)

  part(root, new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12),
    skin, 0, 1.82, 0)

  const head = part(root, new THREE.SphereGeometry(0.22, 20, 16),
    skin, 0, 2.04, 0)

  head.scale.y = 1.12

  part(root, new THREE.SphereGeometry(
    0.225, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.48
  ), hair, 0, 2.12, 0)

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 90px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(options.number || 10), 64, 66)

  const texture = new THREE.CanvasTexture(canvas)

  const number = part(
    root,
    new THREE.PlaneGeometry(0.28, 0.28),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    }),
    0, 1.4, 0.355
  )

  number.rotation.y = Math.PI

  part(root, new THREE.BoxGeometry(0.58, 0.28, 0.34),
    shorts, 0, 0.88, 0)

  const legs = []
  const arms = []

  for (const side of [-1, 1]) {
    const leg = new THREE.Group()
    leg.position.set(side * 0.18, 0.77, 0)
    root.add(leg)

    part(leg, new THREE.CylinderGeometry(0.115, 0.09, 0.48, 12),
      shorts, 0, -0.25, 0)

    part(leg, new THREE.CylinderGeometry(0.09, 0.075, 0.32, 12),
      sock, 0, -0.64, 0)

    part(leg, new THREE.BoxGeometry(0.17, 0.1, 0.28),
      shoes, 0, -0.83, 0.04)

    legs.push(leg)

    const arm = new THREE.Group()
    arm.position.set(side * 0.34, 1.62, 0)
    root.add(arm)

    part(arm, new THREE.CylinderGeometry(0.09, 0.075, 0.45, 12),
      shirt, 0, -0.23, 0)

    part(arm, new THREE.SphereGeometry(0.08, 12, 10),
      skin, 0, -0.48, 0)

    arms.push(arm)
  }

  return {
    root,
    legs,
    arms,
    phase: Math.random() * 6,
    running: false,
    slidingUntil: 0,
    slideDirection: new THREE.Vector3(0, 0, -1),
    home: new THREE.Vector3(x, 0, z),
    team: options.team || 'home',
    number: options.number || 10,
    isKeeper: !!options.keeper
  }
}

// TEAM CREATION
function clearPlayers() {
  for (const p of [
    ...homePlayers,
    ...awayPlayers,
    goalkeeperHome,
    goalkeeperAway
  ]) {
    if (p) scene.remove(p.root)
  }

  homePlayers = []
  awayPlayers = []
  goalkeeperHome = null
  goalkeeperAway = null
}

function buildTeams() {
  clearPlayers()

  homeClub = clubs[team1.value] || clubs.blue
  awayClub = clubs[team2.value] || clubs.red

  const homeFormation = [
    [0, 5], [-5, 4], [5, 4], [-3, 9], [3, 9]
  ]

  const awayFormation = [
    [0, -5], [-5, -4], [5, -4], [-3, -9], [3, -9]
  ]

  homePlayers = homeFormation.map(([x, z], i) =>
    makePlayer(homeClub.color, x, z, {
      number: i === 0 ? 10 : i + 2,
      team: 'home'
    })
  )

  awayPlayers = awayFormation.map(([x, z], i) =>
    makePlayer(awayClub.color, x, z, {
      number: i + 2,
      team: 'away'
    })
  )

  goalkeeperHome = makePlayer(0xf4c542, 0, 13.1, {
    number: 1, team: 'home', keeper: true
  })

  goalkeeperAway = makePlayer(0x8e44ad, 0, -13.1, {
    number: 1, team: 'away', keeper: true
  })

  hero = homePlayers[selectedPlayerIndex] || homePlayers[0]

  $('homeName').textContent = homeClub.name
  $('awayName').textContent = awayClub.name
  $('homeBadge').textContent = homeClub.name[0]
  $('awayBadge').textContent = awayClub.name[0]
  $('homeBadge').className = 'badge ' + team1.value
  $('awayBadge').className = 'badge ' + team2.value
}

// BALL
const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 })
)

ball.castShadow = true
scene.add(ball)

const ballVelocity = new THREE.Vector3()
const clock = new THREE.Clock()

function setPossession(player) {
  ballOwner = player

  if (player) {
    lastTouchTeam = player.team
    ballVelocity.set(0, 0, 0)
  }
}

function releaseBall() {
  ballOwner = null
}

function ballFrontOf(player, distance = 0.8) {
  const forward = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(player.root.quaternion)
    .normalize()

  return new THREE.Vector3(
    player.root.position.x + forward.x * distance,
    0.3,
    player.root.position.z + forward.z * distance
  )
}

function resetPositions() {
  scoreHome = 0
  scoreAway = 0
  remaining = 90
  stamina = 100
  running = false
  paused = false
  finished = false
  ballOwner = null
  lastTouchTeam = 'home'
  ballVelocity.set(0, 0, 0)

  homePlayers.forEach((p, i) => {
    p.root.position.copy(p.home)
    p.root.rotation.set(0, Math.PI, 0)
    p.running = false
    p.slidingUntil = 0
  })

  awayPlayers.forEach((p, i) => {
    p.root.position.copy(p.home)
    p.root.rotation.set(0, 0, 0)
    p.running = false
    p.slidingUntil = 0
  })

  if (hero && homePlayers.length) {
    hero = homePlayers[0]
    selectedPlayerIndex = 0
  }

  goalkeeperHome.root.position.set(0, 0, 13.1)
  goalkeeperAway.root.position.set(0, 0, -13.1)

  ball.position.set(0, 0.3, 0)
  updateHUD()
}

function updateHUD() {
  if ($('homeScore')) $('homeScore').textContent = scoreHome
  if ($('awayScore')) $('awayScore').textContent = scoreAway
  if ($('clock')) $('clock').textContent = `${Math.floor(remaining)}'`

  if ($('staminaBar')) {
    $('staminaBar').style.width = `${stamina}%`
  }

  if ($('playerState')) {
    $('playerState').textContent =
      hero && ballOwner === hero ? 'HAS BALL' : 'READY'
  }

  if ($('matchStatus')) {
    $('matchStatus').textContent = paused
      ? 'PAUSED'
      : finished
        ? 'FULL TIME'
        : running
          ? 'MATCH IN PROGRESS'
          : 'READY TO PLAY'
  }
}

function showToast(message) {
  const toast = $('toast')
  if (!toast) return

  toast.textContent = message
  toast.style.display = 'block'
  toastUntil = performance.now() + 1800
}

function beginMatch() {
  resetPositions()
  running = true
  paused = false
  finished = false
  matchStartedAt = performance.now()
  pausedDuration = 0

  if (startScreen) startScreen.style.display = 'none'
  if (pauseScreen) pauseScreen.style.display = 'none'
  if (endScreen) endScreen.style.display = 'none'

  showToast('KICK OFF! ⚽')
  updateHUD()
}

function pauseMatch() {
  if (!running || finished) return

  paused = !paused

  if (paused) {
    pauseStartedAt = performance.now()
    if (pauseScreen) pauseScreen.style.display = 'flex'
  } else {
    pausedDuration += performance.now() - pauseStartedAt
    if (pauseScreen) pauseScreen.style.display = 'none'
  }

  updateHUD()
}

function endMatch() {
  running = false
  paused = false
  finished = true

  if ($('endTitle')) {
    $('endTitle').textContent =
      scoreHome > scoreAway
        ? `${homeClub.name} WIN!`
        : scoreAway > scoreHome
          ? `${awayClub.name} WIN!`
          : 'IT IS A DRAW!'
  }

  if ($('finalScore')) {
    $('finalScore').textContent = `${scoreHome} - ${scoreAway}`
  }

  if (endScreen) endScreen.style.display = 'flex'
  updateHUD()
}

function switchPlayer() {
  if (!homePlayers.length) return

  let closest = null
  let closestDistance = Infinity

  homePlayers.forEach((p, i) => {
    if (p === hero) return

    const d = p.root.position.distanceTo(ball.position)
    if (d < closestDistance) {
      closestDistance = d
      closest = p
      selectedPlayerIndex = i
    }
  })

  if (closest) {
    hero = closest
    showToast(`PLAYER ${hero.number} SELECTED`)
  }
}

function passBall() {
  if (!running || paused || finished || !hero) return

  if (ballOwner !== hero) {
    showToast('GET THE BALL FIRST!')
    return
  }

  const teammates = homePlayers.filter(p => p !== hero)

  if (!teammates.length) return

  let target = null
  let bestScore = -Infinity

  teammates.forEach(p => {
    const dx = p.root.position.x - hero.root.position.x
    const dz = p.root.position.z - hero.root.position.z
    const distance = Math.hypot(dx, dz)

    // Prefer a teammate farther forward and not too far away.
    const score = -dz - distance * 0.45

    if (score > bestScore) {
      bestScore = score
      target = p
    }
  })

  if (!target) return

  const direction = new THREE.Vector3(
    target.root.position.x - hero.root.position.x,
    0,
    target.root.position.z - hero.root.position.z
  ).normalize()

  const start = ballFrontOf(hero, 0.9)
  ball.position.copy(start)
  releaseBall()

  ballVelocity.copy(direction).multiplyScalar(13)
  ballVelocity.y = 2
  lastPass = performance.now()

  showToast('PASS!')
}

function shootBall() {
  if (!running || paused || finished || !hero) return

  if (ballOwner !== hero) {
    showToast('GET THE BALL FIRST!')
    return
  }

  const direction = new THREE.Vector3(
    hero.root.position.x * -0.15,
    0,
    -1
  ).normalize()

  const start = ballFrontOf(hero, 1)
  ball.position.copy(start)
  releaseBall()

  ballVelocity.copy(direction).multiplyScalar(23)
  ballVelocity.y = 5
  lastKick = performance.now()

  showToast('SHOT ON GOAL! ⚽')
}

function slideTackle() {
  if (!running || paused || finished || !hero) return

  const now = performance.now()
  if (now - lastSlide < 1000) return

  lastSlide = now
  hero.slidingUntil = now + 550

  const forward = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(hero.root.quaternion)
    .normalize()

  hero.slideDirection.copy(forward)
  hero.root.position.addScaledVector(forward, 1.1)

  if (ballOwner && ballOwner.team === 'away') {
    const distance = hero.root.position.distanceTo(ballOwner.root.position)

    if (distance < 2.4) {
      const opponent = ballOwner
      releaseBall()

      const awayFromHero = new THREE.Vector3(
        opponent.root.position.x - hero.root.position.x,
        0,
        opponent.root.position.z - hero.root.position.z
      ).normalize()

      ball.position.set(
        opponent.root.position.x,
        0.4,
        opponent.root.position.z
      )

      ballVelocity.copy(awayFromHero).multiplyScalar(9)
      ballVelocity.y = 2

      showToast('GREAT TACKLE!')
    } else {
      showToast('SLIDE TACKLE!')
    }
  } else {
    showToast('SLIDE TACKLE!')
  }
}

function chooseTeams() {
  const first = team1?.value || 'blue'
  const second = team2?.value || 'red'

  homeClub = clubs[first] || clubs.blue
  awayClub = clubs[second] || clubs.red

  if (homeClub === awayClub) {
    awayClub = Object.values(clubs).find(c => c !== homeClub) || clubs.red
  }

  buildTeams()
  resetPositions()
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase()

  if (
    ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)
  ) {
    event.preventDefault()
  }

  keys[key] = true

  if (event.repeat) return

  if (key === 'p' || key === 'escape') {
    pauseMatch()
  }

  if (key === 'e') passBall()
  if (key === 'q') slideTackle()
  if (key === 'tab') {
    event.preventDefault()
    switchPlayer()
  }
  if (key === ' ') shootBall()
})

window.addEventListener('keyup', event => {
  keys[event.key.toLowerCase()] = false
})

if (startButton) {
  startButton.addEventListener('click', () => {
    chooseTeams()
    beginMatch()
  })
}

if ($('resumeGame')) {
  $('resumeGame').addEventListener('click', () => {
    if (paused) pauseMatch()
  })
}

if ($('restartGame')) {
  $('restartGame').addEventListener('click', beginMatch)
}

if ($('playAgain')) {
  $('playAgain').addEventListener('click', beginMatch)
}

if ($('mainMenu')) {
  $('mainMenu').addEventListener('click', () => {
    running = false
    paused = false
    finished = false
    if (pauseScreen) pauseScreen.style.display = 'none'
    if (endScreen) endScreen.style.display = 'none'
    if (startScreen) startScreen.style.display = 'flex'
  })
}

if ($('endMenu')) {
  $('endMenu').addEventListener('click', () => {
    running = false
    finished = false
    if (endScreen) endScreen.style.display = 'none'
    if (startScreen) startScreen.style.display = 'flex'
  })
}

/* ==========================================
   FOOTBALL 3D - PART 3
   Movement, AI, ball physics, goals & animation
========================================== */

const FIELD_X = 18
const FIELD_Z = 15

let lastFrameTime = 0
let matchTimeAccumulator = 0

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function movePlayer(player, dx, dz, speed, dt) {
  const length = Math.hypot(dx, dz)
  if (length < 0.01) {
    player.running = false
    return
  }

  dx /= length
  dz /= length

  player.root.position.x += dx * speed * dt
  player.root.position.z += dz * speed * dt

  player.root.position.x = clamp(player.root.position.x, -FIELD_X, FIELD_X)
  player.root.position.z = clamp(player.root.position.z, -FIELD_Z + 1, FIELD_Z - 1)

  player.root.rotation.y = Math.atan2(dx, dz)
  player.running = true
  player.phase += dt * speed * 3
}

function animatePlayer(player, dt) {
  if (!player) return

  const sliding = performance.now() < (player.slidingUntil || 0)

  // Animate the arms and legs while running.
  if (player.legs && player.legs.length >= 2) {
    const swing = player.running ? Math.sin(player.phase) * 0.65 : 0
    player.legs[0].rotation.x = swing
    player.legs[1].rotation.x = -swing
  }

  if (player.arms && player.arms.length >= 2) {
    const swing = player.running ? Math.sin(player.phase + Math.PI) * 0.35 : 0
    player.arms[0].rotation.x = swing
    player.arms[1].rotation.x = -swing
  }

  // A simple low pose during a slide.
  if (sliding) {
    player.root.rotation.x = -0.35
  } else {
    player.root.rotation.x = 0
  }
}

function updateHuman(dt) {
  if (!hero) return

  let dx = 0
  let dz = 0

  if (keys['w'] || keys['arrowup']) dz -= 1
  if (keys['s'] || keys['arrowdown']) dz += 1
  if (keys['a'] || keys['arrowleft']) dx -= 1
  if (keys['d'] || keys['arrowright']) dx += 1

  const sprinting = keys['shift'] && stamina > 0
  let speed = sprinting ? 8.5 : 5.5

  if (sprinting && (dx !== 0 || dz !== 0)) {
    stamina = Math.max(0, stamina - 22 * dt)
  } else {
    stamina = Math.min(100, stamina + 10 * dt)
  }

  if (hero.slidingUntil && performance.now() < hero.slidingUntil) {
    movePlayer(hero, hero.slideDirection.x, hero.slideDirection.z, 10, dt)
  } else {
    movePlayer(hero, dx, dz, speed, dt)
  }

  // Move the controlled player with the ball.
  if (ballOwner === hero) {
    const front = ballFrontOf(hero, 0.9)
    ball.position.copy(front)
    ball.position.y = 0.3
  }
}

function updateFriendlyAI(dt) {
  homePlayers.forEach(player => {
    if (player === hero) return
    if (ballOwner === player) {
      const front = ballFrontOf(player, 0.85)
      ball.position.copy(front)
      ball.position.y = 0.3
      return
    }

    // Teammates support the attack and chase loose balls.
    let targetX = player.home.x
    let targetZ = player.home.z

    if (!ballOwner && player.root.position.distanceTo(ball.position) < 9) {
      targetX = ball.position.x
      targetZ = ball.position.z
    } else if (ballOwner && ballOwner.team === 'home') {
      targetX += ballOwner.root.position.x * 0.2
      targetZ -= 1.5
    }

    const dx = targetX - player.root.position.x
    const dz = targetZ - player.root.position.z
    const distance = Math.hypot(dx, dz)

    if (distance > 0.5) {
      movePlayer(player, dx, dz, 3.3, dt)
    } else {
      player.running = false
    }

    // Collect a loose ball.
    if (!ballOwner && player.root.position.distanceTo(ball.position) < 1.15) {
      setPossession(player)
      showToast('TEAMMATE HAS THE BALL!')
    }
  })
}

function updateOpponentAI(dt) {
  awayPlayers.forEach(player => {
    if (ballOwner === player) {
      // Attack toward the home goal.
      const targetX = -player.root.position.x * 0.15
      const targetZ = 14.5

      const dx = targetX - player.root.position.x
      const dz = targetZ - player.root.position.z

      movePlayer(player, dx, dz, 3.6, dt)

      const distanceToGoal = Math.abs(player.root.position.z - 14.5)

      if (distanceToGoal < 4 && Math.random() < 0.025) {
        const direction = new THREE.Vector3(
          -player.root.position.x * 0.06,
          0,
          1
        ).normalize()

        ball.position.copy(ballFrontOf(player, 0.9))
        releaseBall()
        ballVelocity.copy(direction).multiplyScalar(17)
        ballVelocity.y = 4
      } else {
        const front = ballFrontOf(player, 0.85)
        ball.position.copy(front)
        ball.position.y = 0.3
      }

      return
    }

    // The nearest opponent pressures the ball.
    const targetX = ballOwner && ballOwner.team === 'away'
      ? player.home.x
      : ball.position.x

    const targetZ = ballOwner && ballOwner.team === 'away'
      ? player.home.z
      : ball.position.z

    const dx = targetX - player.root.position.x
    const dz = targetZ - player.root.position.z
    const distance = Math.hypot(dx, dz)

    if (distance > 0.8) {
      movePlayer(player, dx, dz, 3.8, dt)
    }

    if (!ballOwner && player.root.position.distanceTo(ball.position) < 1.1) {
      setPossession(player)
    }

    // Opponents can challenge the controlled player.
    if (
      ballOwner === hero &&
      player.root.position.distanceTo(hero.root.position) < 1.15
    ) {
      if (Math.random() < 0.008) {
        setPossession(player)
        showToast('OPPONENT WON THE BALL!')
      }
    }
  })
}

function updateGoalkeepers(dt) {
  const keepers = [
    { player: goalkeeperHome, goalZ: 13.1 },
    { player: goalkeeperAway, goalZ: -13.1 }
  ]

  keepers.forEach(({ player, goalZ }) => {
    if (!player) return

    const targetX = clamp(ball.position.x, -3.1, 3.1)
    const difference = targetX - player.root.position.x

    player.root.position.x += clamp(difference, -4 * dt, 4 * dt)
    player.root.position.z = goalZ

    if (Math.abs(difference) > 0.1) {
      player.root.rotation.y = difference > 0 ? Math.PI / 2 : -Math.PI / 2
    }

    // Keeper blocks shots near the goal.
    const nearGoal = Math.abs(ball.position.z - goalZ) < 1.2
    const nearKeeper = Math.abs(ball.position.x - player.root.position.x) < 1.5

    if (nearGoal && nearKeeper && ball.position.y < 2.5) {
      releaseBall()
      ballVelocity.z *= -0.65
      ballVelocity.x += (Math.random() - 0.5) * 5
      ballVelocity.y = 2.5
      showToast('GREAT SAVE! 🧤')
    }
  })
}

function resetAfterGoal() {
  ballOwner = null
  ballVelocity.set(0, 0, 0)
  ball.position.set(0, 0.3, 0)

  homePlayers.forEach(player => {
    player.root.position.copy(player.home)
    player.running = false
  })

  awayPlayers.forEach(player => {
    player.root.position.copy(player.home)
    player.running = false
  })

  goalkeeperHome.root.position.set(0, 0, 13.1)
  goalkeeperAway.root.position.set(0, 0, -13.1)

  if (hero) hero.root.position.copy(hero.home)
}

function checkGoals() {
  // Home attacks toward the negative Z goal.
  if (ball.position.z < -15.2 && Math.abs(ball.position.x) < 4.2) {
    scoreHome++
    lastTouchTeam = 'home'
    updateHUD()
    showToast('GOOOOOAL! ⚽')
    resetAfterGoal()
    return
  }

  // Away attacks toward the positive Z goal.
  if (ball.position.z > 15.2 && Math.abs(ball.position.x) < 4.2) {
    scoreAway++
    lastTouchTeam = 'away'
    updateHUD()
    showToast('OPPONENT SCORES!')
    resetAfterGoal()
    return
  }

  // Keep the ball within the playable area.
  if (Math.abs(ball.position.x) > FIELD_X) {
    ball.position.x = clamp(ball.position.x, -FIELD_X, FIELD_X)
    ballVelocity.x *= -0.65
  }

  if (ball.position.z < -FIELD_Z && Math.abs(ball.position.x) >= 4.2) {
    ball.position.z = -FIELD_Z
    ballVelocity.z *= -0.6
  }

  if (ball.position.z > FIELD_Z && Math.abs(ball.position.x) >= 4.2) {
    ball.position.z = FIELD_Z
    ballVelocity.z *= -0.6
  }
}

function updateBall(dt) {
  if (ballOwner) {
    const front = ballFrontOf(ballOwner, 0.85)
    ball.position.x = front.x
    ball.position.z = front.z
    ball.position.y = 0.3
    return
  }

  ballVelocity.y -= 9.8 * dt

  ball.position.x += ballVelocity.x * dt
  ball.position.y += ballVelocity.y * dt
  ball.position.z += ballVelocity.z * dt

  // Bounce and roll on the grass.
  if (ball.position.y < 0.3) {
    ball.position.y = 0.3

    if (Math.abs(ballVelocity.y) > 1.2) {
      ballVelocity.y *= -0.38
    } else {
      ballVelocity.y = 0
    }

    ballVelocity.x *= Math.pow(0.94, dt * 60)
    ballVelocity.z *= Math.pow(0.94, dt * 60)
  }

  // Rotate the ball as it travels.
  ball.rotation.x += ballVelocity.z * dt
  ball.rotation.z -= ballVelocity.x * dt

  checkGoals()

  // Players can collect the moving ball.
  if (!ballOwner && ball.position.y < 1.1) {
    const allPlayers = [...homePlayers, ...awayPlayers]

    for (const player of allPlayers) {
      if (player.root.position.distanceTo(ball.position) < 0.95) {
        setPossession(player)
        break
      }
    }
  }
}

function updateMatch(dt) {
  if (!running || paused || finished) return

  updateHuman(dt)
  updateFriendlyAI(dt)
  updateOpponentAI(dt)
  updateGoalkeepers(dt)
  updateBall(dt)

  homePlayers.forEach(p => animatePlayer(p, dt))
  awayPlayers.forEach(p => animatePlayer(p, dt))
  animatePlayer(goalkeeperHome, dt)
  animatePlayer(goalkeeperAway, dt)

  // One real second equals one match second.
  matchTimeAccumulator += dt

  if (matchTimeAccumulator >= 1) {
    remaining = Math.max(0, remaining - 1)
    matchTimeAccumulator = 0
    updateHUD()
  }

  if (remaining <= 0) {
    endMatch()
  }

  if ($('toast') && performance.now() > toastUntil) {
    $('toast').style.display = 'none'
  }

  updateHUD()
}

function animate() {
  requestAnimationFrame(animate)

  const dt = Math.min(clock.getDelta(), 0.05)

  updateMatch(dt)

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

window.addEventListener('resize', () => {
  if (!camera || !renderer) return

  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Prepare the teams and display the game.
buildTeams()
resetPositions()
animate()

console.log('Football 3D is ready! ⚽')
