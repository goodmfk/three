import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ToolManager } from "../tools/ToolManager.js";
import ModelManager from "../model/ModelManager.js";
import InstanceManager from "../instance/InstanceManager.js";
import LayoutState from "../layout/LayoutState.js";
import LayoutManager from "../layout/LayoutManager.js";
import WorldManager from "../world/WorldManager.js";

export class Viewer {
    constructor(container, config = {}) {
        this.container = container;

        this.config = Object.assign(
            {
                tools: {
                    pick: true
                },
                world: {
                    groundY: 0,
                    bounds: {
                        enabled: true,
                        minX: -5,
                        maxX: 5,
                        minZ: -5,
                        maxZ: 5,
                        margin: 0.1,
                        shape: "square"
                    },
                    spawnStrategy: {
                        gap: 0.5,
                        autoCenter: false,
                        autoFitCamera: false
                    }
                }
            },
            config
        );
        this.scene = new THREE.Scene();
        this.camera = null;
        this.cameraLights = null;
        this.renderer = null;
        this.controls = null;

        this.tools = new ToolManager(this);
        this.modelManager = new ModelManager();
        this.layoutState = new LayoutState();

        this.worldManager = new WorldManager(this.config.world);

        this.layoutManager = new LayoutManager(this.scene, this.worldManager);

        this.instanceManager = new InstanceManager(this.layoutManager.getRoot(), this.layoutState, this.worldManager);

        this.init();
    }

    init() {
        this.initRenderer();
        this.initCamera();
        this.initCameraLights();
        this.initControls();
        this.initResize();
        this.initDefaultTools();

        this.worldManager.setScene(this.scene);

        this.worldManager.showBoundary();
    }

    initRenderer() {
        const { clientWidth, clientHeight } = this.container;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });

        this.renderer.setSize(clientWidth, clientHeight);
        this.container.appendChild(this.renderer.domElement);
    }

    initCamera() {
        const { clientWidth, clientHeight } = this.container;

        this.camera = new THREE.PerspectiveCamera(
            45,
            clientWidth / clientHeight,
            0.1,
            1000
        );

        this.camera.position.set(0, 3, 6);
        this.scene.add(this.camera);
    }

    initCameraLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        this.camera.add(ambient);

        const direct = new THREE.DirectionalLight(0xffffff, 2.5);
        direct.position.set(0.5, 0, 0.866);
        this.camera.add(direct);

        this.cameraLights = { ambient, direct };
    }

    initControls() {
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.controls.enableDamping = true;
        this.controls.screenSpacePanning = false;
        this.controls.target.set(0, 0, 0);
        this.controls.minDistance = 2;
        this.controls.maxDistance = 10;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI * 0.5;
    }

    initResize() {
        window.addEventListener("resize", () => {
            this.updateSize();
        });

        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateSize();
            });
            this.resizeObserver.observe(this.container);
        }
    }

    updateSize() {
        const { clientWidth, clientHeight } = this.container;
        this.camera.aspect = clientWidth / clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(clientWidth, clientHeight);
    }

    initDefaultTools() {
        Object.entries(this.config.tools).forEach(([name, enabled]) => {
            if (enabled) {
                this.tools.enable(name);
            }
        });

        this.tools.init();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    start() {
        let lastTime = performance.now();

        const loop = (now) => {
            requestAnimationFrame(loop);

            const delta = (now - lastTime) / 1000;
            lastTime = now;

            this.controls.update();
            this.tools.activeTools.forEach(tool => {
                if (tool.run) {
                    tool.run(delta);
                }
            });

            this.render();
        };

        requestAnimationFrame(loop);
    }

    _baseCameraDistance = null;
    _lastCameraAdjustTime = 0;
    _cameraAdjustCooldown = 500;
    _lastBoundingBoxSize = null;
    _cameraDistanceThreshold = 0.8;

    adjustCameraAfterDrag() {
        const root = this.layoutManager.getRoot();
        if (!root || root.children.length === 0) return;

        const box = new THREE.Box3();
        root.children.forEach(child => box.expandByObject(child));

        if (box.isEmpty()) return;

        const center = new THREE.Vector3();
        box.getCenter(center);

        const size = new THREE.Vector3();
        box.getSize(size);
        const currentSize = size.length();

        const now = Date.now();
        if (now - this._lastCameraAdjustTime < this._cameraAdjustCooldown) {
            if (this.controls) {
                this.controls.target.copy(center);
                this.controls.update();
            }
            return;
        }

        let needAdjustment = this._needCameraAdjustment(box);

        if (!needAdjustment && this._lastBoundingBoxSize) {
            const sizeRatio = currentSize / this._lastBoundingBoxSize;
            if (sizeRatio < this._cameraDistanceThreshold) {
                needAdjustment = true;
            }
        }

        if (needAdjustment) {
            const targetPosition = new THREE.Vector3();
            const targetTarget = new THREE.Vector3();

            const maxSize = Math.max(size.x, size.y, size.z);
            const fov = THREE.MathUtils.degToRad(this.camera.fov);
            let distance = maxSize / (2 * Math.tan(fov / 2));
            distance *= 1.25;

            let controlsTarget = new THREE.Vector3(0, 0, 0);
            if (this.controls && this.controls.target) {
                controlsTarget.copy(this.controls.target);
            }

            const dir = new THREE.Vector3().subVectors(this.camera.position, controlsTarget).normalize();

            targetPosition.copy(center).add(dir.multiplyScalar(distance));
            targetTarget.copy(center);

            this.camera.near = distance / 100;
            this.camera.far = distance * 100;
            this.camera.updateProjectionMatrix();

            this._smoothlyMoveCameraTo(targetPosition, targetTarget);

            this._lastCameraAdjustTime = now;
        } else {
            if (this.controls) {
                this.controls.target.copy(center);
                this.controls.update();
            }
        }

        this._lastBoundingBoxSize = currentSize;
    }

    _needCameraAdjustment(box) {
        const frustum = new THREE.Frustum();
        const cameraMatrix = new THREE.Matrix4();
        cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(cameraMatrix);

        const points = [
            new THREE.Vector3(box.min.x, box.min.y, box.min.z),
            new THREE.Vector3(box.max.x, box.min.y, box.min.z),
            new THREE.Vector3(box.min.x, box.max.y, box.min.z),
            new THREE.Vector3(box.max.x, box.max.y, box.min.z),
            new THREE.Vector3(box.min.x, box.min.y, box.max.z),
            new THREE.Vector3(box.max.x, box.min.y, box.max.z),
            new THREE.Vector3(box.min.x, box.max.y, box.max.z),
            new THREE.Vector3(box.max.x, box.max.y, box.max.z)
        ];

        for (const point of points) {
            if (!frustum.containsPoint(point)) {
                return true;
            }
        }

        return false;
    }

    _smoothlyMoveCameraTo(targetPosition, targetTarget, duration = 500) {
        const startTime = Date.now();
        const startPosition = this.camera.position.clone();
        const startTarget = this.controls ? this.controls.target.clone() : new THREE.Vector3();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeProgress = this._easeOutCubic(progress);

            this.camera.position.lerpVectors(startPosition, targetPosition, easeProgress);

            if (this.controls) {
                this.controls.target.lerpVectors(startTarget, targetTarget, easeProgress);
                this.controls.update();
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    _easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    smoothlyMoveCamera(targetPosition, targetTarget) {
        const alpha = 0.2;

        this.camera.position.lerp(targetPosition, alpha);
        if (this.controls) {
            this.controls.target.lerp(targetTarget, alpha);
            this.controls.update();
        }
    }

    getLayoutManager() {
        return this.layoutManager;
    }

    get layoutRoot() {
        return this.layoutManager.getRoot();
    }

    async addModel(modelPath, options = {}) {
        try {
            const model = await this.modelManager.loadModel(modelPath);
            const instance = this.instanceManager.createInstance(model, options);

            this.layoutManager.layoutCenter();
            this.fitCameraToObjects();

            return instance;
        } catch (error) {
            console.error("Error adding model:", error);
            throw error;
        }
    }

    fitCameraToObjects() {
        const root = this.layoutManager.getRoot();
        if (!root || root.children.length === 0) return;

        const box = new THREE.Box3();
        root.children.forEach(child => box.expandByObject(child));

        if (box.isEmpty()) return;

        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxSize = Math.max(size.x, size.y, size.z);
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        let distance = maxSize / (2 * Math.tan(fov / 2));
        distance *= 1.25;

        let controlsTarget = new THREE.Vector3(0, 0, 0);
        if (this.controls && this.controls.target) {
            controlsTarget.copy(this.controls.target);
        }

        const dir = new THREE.Vector3().subVectors(this.camera.position, controlsTarget).normalize();

        this.camera.position.copy(center).add(dir.multiplyScalar(distance));
        this.camera.near = distance / 100;
        this.camera.far = distance * 100;
        this.camera.updateProjectionMatrix();

        if (this.controls) {
            this.controls.target.copy(center);
            this.controls.update();
        }
    }

    async addModels(modelPaths, options = {}) {
        try {
            const instances = [];
            const models = [];

            for (const modelPath of modelPaths) {
                const model = await this.modelManager.loadModel(modelPath);
                models.push(model);
            }

            let totalWidth = 0;
            const modelSizes = [];

            for (const model of models) {
                const box = new THREE.Box3().setFromObject(model.scene);
                const size = box.getSize(new THREE.Vector3());
                modelSizes.push(size);
                totalWidth += size.x;
            }

            let currentX = -totalWidth / 2;

            for (let i = 0; i < models.length; i++) {
                const model = models[i];
                const size = modelSizes[i];

                const position = new THREE.Vector3(currentX + size.x / 2, 0, 0);

                const instance = this.instanceManager.createInstance(model, {
                    ...options,
                    position
                });

                instances.push(instance);
                currentX += size.x;
            }

            this.layoutManager.layoutCenter();
            this.fitCameraToObjects();

            return instances;
        } catch (error) {
            console.error("Error adding models:", error);
            throw error;
        }
    }

    getWorldManager() {
        return this.worldManager;
    }

    layoutCenter() {
        this.layoutManager.layoutCenter();
    }

    layoutClamp() {
        this.layoutManager.layoutClamp();
    }
}
