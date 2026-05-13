import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

let isGamePlaying = false;

window.addEventListener('iniciarJuego', () => {
    isGamePlaying = true;
    clock.start();
});

let scene, camera, renderer, clock, mixer;
let player, floor, actions = {}, currentAction;

let gameSpeed = 35;
let obstacles = [];
let alienModel;

let currentLane = 1;
const lanes = [-4, 0, 4];

let targetX = 0;
let alienAnimClip;

let distancia = 0;
let vida = 100;
let isGameOver = false;

const textoDistancia = document.getElementById('texto-distancia');
const barraVida = document.getElementById('barra-vida');
const pantallaGameOver = document.getElementById('game-over');
const puntajeFinal = document.getElementById('puntaje-final');

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);
    scene.fog = new THREE.Fog(0xcccccc, 15, 60);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 6, 12);
    camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5, 10, 5);
    light.castShadow = true;
    scene.add(light);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const textureLoader = new THREE.TextureLoader();
    const floorMat = new THREE.MeshStandardMaterial({
        map: textureLoader.load('textures/suelo.jpg')
    });

    floorMat.map.wrapS = THREE.RepeatWrapping;
    floorMat.map.wrapT = THREE.RepeatWrapping;
    floorMat.map.repeat.set(1, 10);

    floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 200),
        floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    new RGBELoader()
        .setPath('textures/')
        .load('ambiente.hdr', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = texture;
            scene.environment = texture;
        });

    const loader = new GLTFLoader();
    loader.setPath('assets/');

    // PLAYER
    loader.load('Running.glb', (gltf) => {
        player = gltf.scene;
        player.scale.set(0.015, 0.015, 0.015);
        player.rotation.y = Math.PI;

        player.traverse(c => {
            if (c.isMesh) c.castShadow = true;
        });

        scene.add(player);
        targetX = lanes[currentLane];
        mixer = new THREE.AnimationMixer(player);

        gltf.animations.forEach((clip) => {
            const name = clip.name.toLowerCase();
            if (name.includes('run')) {
                actions['correr'] = mixer.clipAction(clip);
                actions['correr'].play();
                currentAction = actions['correr'];
            }
            if (name.includes('jump')) {
                actions['saltar'] = mixer.clipAction(clip);
                actions['saltar'].setLoop(THREE.LoopOnce);
                actions['saltar'].clampWhenFinished = true;
            }
            if (name.includes('kick')) {
                actions['patada'] = mixer.clipAction(clip);
                actions['patada'].setLoop(THREE.LoopOnce);
                actions['patada'].clampWhenFinished = true;
            }
        });

        loadAlien();
    });

    window.addEventListener('keydown', onKeyDown);
}

function loadAlien() {
    const loader = new GLTFLoader();
    loader.setPath('assets/');

    // AQUÍ CARGAMOS TU NUEVO ALIEN DE 16MB (Asegúrate que se llame así o cambia el nombre)
    loader.load('AlienAttack.glb', (gltf) => {
        alienModel = gltf.scene;
        
        // Ajuste de escala para el modelo de Mixamo
        alienModel.scale.set(1.5, 1.5, 1.5); 
        
        // El Alien debe mirar hacia el jugador
        alienModel.rotation.y = 0; 

        if (gltf.animations.length > 0) {
            alienAnimClip = gltf.animations[0];
        }

        // Generar obstáculos iniciales
        for (let i = 0; i < 3; i++) spawnObstacle();
    });
}

function spawnObstacle() {
    if (!alienModel) return;

    const newAlien = SkeletonUtils.clone(alienModel);
    newAlien.position.x = lanes[Math.floor(Math.random() * 3)];
    newAlien.position.z = -Math.random() * 100 - 40;

    let alienMixer = null;
    if (alienAnimClip) {
        alienMixer = new THREE.AnimationMixer(newAlien);
        const action = alienMixer.clipAction(alienAnimClip);
        action.play();
    }

    newAlien.userData = {
        kicked: false,
        crashed: false,
        mixer: alienMixer
    };

    scene.add(newAlien);
    obstacles.push(newAlien);
}

function onKeyDown(event) {
    if (!player || isGameOver) return;
    switch (event.code) {
        case 'KeyA':
            if (currentLane > 0) currentLane--;
            movePlayer();
            break;
        case 'KeyD':
            if (currentLane < 2) currentLane++;
            movePlayer();
            break;
        case 'Space':
            fadeToAction('saltar', 0.1);
            break;
        case 'KeyK':
            fadeToAction('patada', 0.1);
            break;
    }
}

function movePlayer() {
    targetX = lanes[currentLane];
}

function recibirDano() {
    vida -= 20; // Bajamos el daño para que no muera tan rápido
    if (vida < 0) vida = 0;
    barraVida.style.width = vida + '%';

    if (vida <= 0) {
        isGameOver = true;
        pantallaGameOver.style.display = 'flex';
        puntajeFinal.innerText = `Metros recorridos: ${Math.floor(distancia)}`;
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (!isGamePlaying || isGameOver) {
        renderer.render(scene, camera);
        return;
    }

    const delta = clock.getDelta();
    distancia += (gameSpeed * delta) * 0.2;
    textoDistancia.innerText = `Metros: ${Math.floor(distancia)}`;

    if (mixer) mixer.update(delta);

    if (player) {
        player.position.x += (targetX - player.position.x) * 10 * delta;
    }

    if (floor) {
        floor.material.map.offset.y += (gameSpeed * delta) / 10;
    }

    obstacles.forEach((obs) => {
        if (obs.userData.mixer) obs.userData.mixer.update(delta);

        if (!obs.userData.kicked) {
            obs.position.z += (gameSpeed + 10) * delta; // El alien viene hacia ti

            const dist = obs.position.distanceTo(player.position);
            if (dist < 2.0) {
                if (currentAction === actions['patada']) {
                    obs.userData.kicked = true;
                } else if (!obs.userData.crashed) {
                    obs.userData.crashed = true;
                    recibirDano();
                }
            }
        } else {
            obs.position.z -= 60 * delta;
            obs.position.y += 30 * delta;
            obs.rotation.x += 10 * delta;
        }

        // Reposicionar alien si se sale de la pantalla
        if (obs.position.z > 15) {
            obs.position.set(
                lanes[Math.floor(Math.random() * 3)],
                0,
                -Math.random() * 80 - 60
            );
            obs.userData.kicked = false;
            obs.userData.crashed = false;
        }
    });

    renderer.render(scene, camera);
}

function fadeToAction(name, duration) {
    if (!actions[name] || currentAction === actions[name]) return;
    const prev = currentAction;
    currentAction = actions[name];
    if (prev) prev.fadeOut(duration);
    currentAction.reset().fadeIn(duration).play();

    if (name !== 'correr') {
        const restore = () => {
            mixer.removeEventListener('finished', restore);
            fadeToAction('correr', 0.2);
        };
        mixer.addEventListener('finished', restore);
    }
}