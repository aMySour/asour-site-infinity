import * as PIXI from 'pixi.js';
import { Viewport } from "pixi-viewport";
import * as THREE from 'three'; // yes, pixi and three in same project. three for background, pixi for foreground

const threeRenderer = new THREE.WebGLRenderer({ alpha: true });
const width = window.innerWidth;
const height = window.innerHeight;
threeRenderer.setSize(width, height);
const threeCamera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
const threeScene = new THREE.Scene();
threeScene.add(threeCamera);
// in the bg is just a giant cube with shaded material
const geometry = new THREE.BoxGeometry(500, 500, 500);
const material = new THREE.MeshPhongMaterial({ color: 0x000000, specular: 0x111111, shininess: 1 });
const mesh = new THREE.Mesh(geometry, material);
mesh.position.set(0, 0, -800);
mesh.rotation.set(40, 25, 0);
threeScene.add(mesh);
// add a point light
const light = new THREE.PointLight(0xffffff, 100000000, 1000);
light.position.set(0, 0, 0);
threeScene.add(light);
document.body.appendChild(threeRenderer.domElement);

const app = new PIXI.Application({
    backgroundColor: 0x210929,
    resizeTo: window,
    backgroundAlpha: 0.7,
});
document.body.appendChild(app.view as HTMLCanvasElement);

threeRenderer.setAnimationLoop(() => {
    // spin the cube
    mesh.rotation.x += 0.0002;
    mesh.rotation.y += 0.0005;
    mesh.rotation.z += 0.0005;
    threeRenderer.render(threeScene, threeCamera);
});

const viewport = new Viewport({
    events: app.renderer.events,
});

// center the viewport on 0,0
viewport.moveCenter(0, 0);

app.stage.addChild(viewport);

viewport
    .drag()
    .pinch()
    .wheel()
    .decelerate();

// make sure the viewport resizes with the window
window.addEventListener('resize', () => {
    viewport.resize(window.innerWidth, window.innerHeight);
    // three as well
    threeCamera.aspect = window.innerWidth / window.innerHeight;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
});

// add a circle
const circle = new PIXI.Graphics();
circle.beginFill(0xff0000);
circle.drawCircle(0, 0, 50);
circle.endFill();
viewport.addChild(circle);

// when pointer down on pixi, cursor to grabbing, and when pointer up, cursor to normal again
viewport.on('pointerdown', () => {
    document.body.style.cursor = 'grabbing';
});

viewport.on('pointerup', () => {
    document.body.style.cursor = 'default';
});