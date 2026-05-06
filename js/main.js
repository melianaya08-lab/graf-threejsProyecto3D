import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

let scene, camera, renderer, clock;
let player, alienModel, mixer;
let alienAnimClip;

let isGamePlaying = false;
let isGameOver = false;

const lanes = [-4, 0, 4];
let currentLane = 1;
let targetX = 0;

const obstacles = [];
const decorations = [];

const loading = document.getElementById("loading");

function hideLoading() {
    if (loading) loading.style.display = "none";
}

window.addEventListener('iniciarJuego', () => {
    isGamePlaying = true;
    clock.start();
});

init();
animate();

function init() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
    camera.position.set(0, 6, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    document.getElementById("container").appendChild(renderer.domElement);

    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5,10,5);
    scene.add(light);

    // FBX loader
    const loader = new FBXLoader();
    loader.setPath("assets/");

    // PLAYER
    loader.load("Running.fbx", (fbx) => {
        player = fbx;
        player.scale.set(0.015,0.015,0.015);
        scene.add(player);
    });

    // ALIEN
    loader.load("AlienAttack.fbx", (fbx) => {

        alienModel = fbx;
        alienModel.scale.set(0.04,0.04,0.04);

        if (fbx.animations.length > 0) {
            alienAnimClip = fbx.animations[0];
        }

        console.log("Alien listo");

        hideLoading(); // 👈 AQUÍ

        spawnObstacle();

        setTimeout(() => {
            for(let i=0;i<4;i++) spawnObstacle();
        }, 500);

        setTimeout(() => {
            for(let i=0;i<10;i++) spawnDecoration();
        }, 800);

    });

}

function spawnObstacle() {
    if (!alienModel) return;

    const clone = SkeletonUtils.clone(alienModel);
    clone.position.x = lanes[Math.floor(Math.random()*3)];
    clone.position.z = -Math.random()*80 - 30;

    scene.add(clone);
    obstacles.push(clone);
}

function spawnDecoration() {
    const geo = new THREE.DodecahedronGeometry(0.4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const rock = new THREE.Mesh(geo, mat);

    rock.position.x = (Math.random()-0.5)*18;
    rock.position.z = -Math.random()*100;
    scene.add(rock);

    decorations.push(rock);
}

function animate() {
    requestAnimationFrame(animate);

    if (!isGamePlaying) {
        renderer.render(scene,camera);
        return;
    }

    renderer.render(scene,camera);
}