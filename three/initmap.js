const im = document.createElement('script');
im.type = 'importmap';
im.textContent = JSON.stringify({
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",

    "three/examples/jsm/controls/OrbitControls.js":
      "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js",

    "three/examples/jsm/loaders/GLTFLoader.js":
      "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",

    "three/examples/jsm/loaders/DRACOLoader.js":
      "https://unpkg.com/three@0.160.0/examples/jsm/loaders/DRACOLoader.js",

    "three/examples/jsm/loaders/KTX2Loader.js":
      "https://unpkg.com/three@0.160.0/examples/jsm/loaders/KTX2Loader.js",

    "three/examples/jsm/loaders/RGBELoader.js":
      "https://unpkg.com/three@0.160.0/examples/jsm/loaders/RGBELoader.js",

    "three/examples/jsm/loaders/EXRLoader.js":
      "https://unpkg.com/three@0.160.0/examples/jsm/loaders/EXRLoader.js",

    "three/examples/jsm/environments/RoomEnvironment.js":
      "https://unpkg.com/three@0.160.0/examples/jsm/environments/RoomEnvironment.js",

    "three/examples/jsm/lights/RectAreaLightUniformsLib.js":
      "https://unpkg.com/three@0.160.0/examples/jsm/lights/RectAreaLightUniformsLib.js",

    "three/examples/jsm/libs/meshopt_decoder.module.js":
      "https://unpkg.com/three@0.160.0/examples/jsm/libs/meshopt_decoder.module.js"
  }
});
const firstScript = document.querySelector('script');
if (firstScript) {
  firstScript.before(im);
} else {
  document.head.appendChild(im);
}


