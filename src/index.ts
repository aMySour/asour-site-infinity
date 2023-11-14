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
    // back to unset, parent element will decide
    document.body.style.cursor = '';
});

function addText(text: string, x: number, y: number) {
    const textSprite = new PIXI.Text(text, { fill: 0xffffff, fontFamily: 'Urbanist', align: 'center' });
    // pivot is center of text
    textSprite.anchor.set(0.5);
    textSprite.x = x;
    textSprite.y = y;
    viewport.addChild(textSprite);
}

import MarkdownIt from 'markdown-it';
const md = new MarkdownIt();

let domOverlays: {
    element: HTMLElement,
    position: { x: number, y: number },
    rotation: number,
}[] = [];

let domOverlayParent = document.querySelector('world') as HTMLElement;
domOverlayParent.style.position = 'absolute';
domOverlayParent.style.top = '0';
domOverlayParent.style.left = '0';
domOverlayParent.style.width = '100%';
domOverlayParent.style.height = '100%';
// pointer events none so it doesnt block pixi
domOverlayParent.style.pointerEvents = 'none';

function addDOMOverlay(element: HTMLElement, x: number, y: number, rotation: number, allowZoom = true) {
    // absolute position
    element.style.position = 'absolute';
    // top left is 0,0, and we want origin top left
    element.style.transformOrigin = 'top left';
    element.style.top = '0';
    element.style.left = '0';
    // pointer events auto so it can be interacted with
    element.style.pointerEvents = 'auto';
    // if allow zoom, add scroll listener to prevent default
    if (allowZoom) {
        element.addEventListener('wheel', (e) => {
            e.preventDefault();
        });
        // other scroll events too
        element.addEventListener('scroll', (e) => {
            e.preventDefault();
        });
    }
    domOverlays.push({ element, position: { x, y }, rotation });
}

function addTextMarkdown(text: string, x: number, y: number) {
    let html = md.render(text);
    console.log('html is', html);
    let textSprite = new PIXI.HTMLText(html, { fill: 0xffffff, fontFamily: 'Urbanist' });
    textSprite.height = 5000;
    // pivot is center of text
    textSprite.x = x;
    textSprite.y = y;
    viewport.addChild(textSprite);
}

// time for project description
// this is an experimental new kind of website, where instead of scrolling through isolated pages, its one page you can pan and zoom around.
// for navigation, theres stil a header which takes your camera places, and theres also some contextual UI, like when youre in the blog area, theres filters, sorting and blog search on your screen

// in tick, update dom overlays
app.ticker.add(() => {
    for (let overlay of domOverlays) {
        // viewport world coords to screen coords
        let screenPos = viewport.toScreen(overlay.position);
        overlay.element.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px) rotate(${overlay.rotation}rad) scale(${viewport.scale.x})`;
    }
});

// for each element in world, add dom element with data-xy and, if present, data-angle
// since flow doesnt exist because of the way this is built (and for other reasons) i chose to use `data-xy` instead of css transforms as the way to set positions. since html was where you defined flow, now its where you define pos instead
// we must first however do this starting from /, not from here since this may be a different page
const parser = new DOMParser();
async function handleHTML(html: string) {
    console.log('handling html...');
    let doc = parser.parseFromString(html, 'text/html');
    let worldElements = doc.querySelector('world')?.children || [];
    console.log('world elements', worldElements);
    for (let element of worldElements) {
        let lowercaseTagName = element.tagName.toLowerCase();
        // if tagname is script and type is infinity, eval it. yes yes, eval bad, but the thing is script tags are literally evaling code anyway, and this is only evaling code we wrote for our own site. there is ZERO difference to just writing the code in the first place, so if you say "bbut eval bad" still then you really dont know what youre talking about lol
        if (lowercaseTagName === 'script' && element.getAttribute('type') === 'infinity') {
            // eval it
            eval(element.innerHTML);
            continue;
        }
        // if its style, ignore for now we'll come back to it later
        if (lowercaseTagName === 'style') {
            continue;
        }
        // and now the final special case, which allows us to embed other files of loads of types, like md, html, etc. its our custom tag, world, which uses src (not data-src) to load a file and then replace itself with the contents of that file
        if (lowercaseTagName === 'world') {
            // get src
            let src = element.getAttribute('src');
            if (!src) {
                console.error('world tag without src');
                continue;
            }
            // fetch it
            let res = await fetch(src);
            // get text
            let text = await res.text();
            // recurse
            handleHTML(text);
            continue;
        }
        // if button, log it
        if (lowercaseTagName === 'button') {
            console.log('found button', element);
        }

        let xy = element.getAttribute('xy') || '0 0';
        let [x, y] = xy.split(' ').map(parseFloat);
        let angle = parseFloat(element.getAttribute('angle') || '0');
        element = domOverlayParent.appendChild(element);
        addDOMOverlay(element as HTMLElement, x, y, angle);
    }
}
// clear world
domOverlayParent.innerHTML = '';

// fetch / and handle it
fetch('/').then(res => res.text()).then(handleHTML);

domOverlayParent.style.zIndex = '1000';