import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ToolManager } from "../tools/ToolManager.js";
import ModelManager from "../model/ModelManager.js";
import InstanceManager from "../instance/InstanceManager.js";
import LayoutState from "../layout/LayoutState.js";
import LayoutManager from "../layout/LayoutManager.js";

export class Viewer {
    constructor(container, config = {}) {
        this.container = container;

        this.config = Object.assign(
            {
                tools: {
                    pick: true
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
        
        this.layoutManager = new LayoutManager(this.scene);
        
        this.instanceManager = new InstanceManager(this.layoutManager.getRoot(), this.layoutState);

        this.init();
    }

    init() {
        this.initRenderer();
        this.initCamera();
        this.initCameraLights();
        this.initControls();
        this.initResize();
        this.initDefaultTools();
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
            60, // 与aaa2.html保持一致，使用60度视角
            clientWidth / clientHeight,
            0.1,
            1000
        );

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
}
