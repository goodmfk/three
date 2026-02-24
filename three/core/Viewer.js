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
                        shape: "square"//square   circle
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

        // 初始化WorldManager
        this.worldManager = new WorldManager(this.config.world);

        // 初始化LayoutManager，传入WorldManager
        this.layoutManager = new LayoutManager(this.scene, this.worldManager);

        // 初始化InstanceManager，传入WorldManager
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

        // 设置WorldManager的scene
        this.worldManager.setScene(this.scene);

        // 显示世界边界
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
            45, // 与aaa2.html保持一致，使用60度视角
            clientWidth / clientHeight,
            0.1,
            1000
        );

        //this.camera.position.set(0, 2, 3); // 调整相机位置，让模型看起来更大
        this.camera.position.set(0, 3, 6); // 与aaa2.html保持一致，使用更接近的初始位置
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
        this.controls.screenSpacePanning = false; // 禁用屏幕平移，与aaa2.html保持一致
        this.controls.target.set(0, 0, 0); // 控制相机围绕原点旋转，与aaa2.html保持一致
        this.controls.minDistance = 2; // 限制相机缩放距离，与aaa2.html保持一致
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

    getLayoutManager() {
        return this.layoutManager;
    }

    get layoutRoot() {
        return this.layoutManager.getRoot();
    }

    // 简化的模型添加接口
    async addModel(modelPath, options = {}) {
        try {
            const model = await this.modelManager.loadModel(modelPath);
            const instance = this.instanceManager.createInstance(model, options);

            // 总是调用layoutCenter，确保模型添加后整体居中
            this.layoutManager.layoutCenter();
            // 调整相机，确保所有模型都能在屏幕上显示
            this.fitCameraToObjects();

            return instance;
        } catch (error) {
            console.error("Error adding model:", error);
            throw error;
        }
    }

    // 调整相机，确保所有模型都能在屏幕上显示
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

    // 批量加载模型的接口
    async addModels(modelPaths, options = {}) {
        try {
            const instances = [];
            const models = [];

            // 先加载所有模型
            for (const modelPath of modelPaths) {
                const model = await this.modelManager.loadModel(modelPath);
                models.push(model);
            }

            // 计算总宽度
            let totalWidth = 0;
            const modelSizes = [];

            for (const model of models) {
                const box = new THREE.Box3().setFromObject(model.scene);
                const size = box.getSize(new THREE.Vector3());
                modelSizes.push(size);
                totalWidth += size.x;
            }

            // 依次放置每个模型
            let currentX = -totalWidth / 2;

            for (let i = 0; i < models.length; i++) {
                const model = models[i];
                const size = modelSizes[i];

                // 计算当前模型的位置
                const position = new THREE.Vector3(currentX + size.x / 2, 0, 0);

                // 创建实例
                const instance = this.instanceManager.createInstance(model, {
                    ...options,
                    position
                });

                instances.push(instance);
                currentX += size.x;
            }

            // 所有模型加载完成后，只调用一次layoutCenter
            this.layoutManager.layoutCenter();
            // 调整相机，确保所有模型都能在屏幕上显示
            this.fitCameraToObjects();

            return instances;
        } catch (error) {
            console.error("Error adding models:", error);
            throw error;
        }
    }

    // 获取WorldManager实例
    getWorldManager() {
        return this.worldManager;
    }

    // 布局中心方法，便于外部调用
    layoutCenter() {
        this.layoutManager.layoutCenter();
    }

    // 布局边界限制方法，便于外部调用
    layoutClamp() {
        this.layoutManager.layoutClamp();
    }
}
