import * as THREE from "three";

import PickHighlight from "./modules/PickHighlight.js";
import PickRing from "./modules/PickRing.js";
import PickFocus from "./modules/PickFocus.js";
import PickRotateKeys from "./modules/PickRotateKeys.js";

import resolvePickRoot from "./math/resolvePickRoot.js";
import isViewChanged from "./math/isViewChanged.js";

export default class PickTool {
    constructor(viewer, options = {}) {
        this.viewer = viewer;

        this.options = Object.assign(
            {
                pickAsWhole: true,

                highlight: {
                    enabled: true
                },

                ring: {
                    enabled: true,
                    color: 0x6aa9ff,
                    padding: 1.05,
                    ringWidth: 0.08
                },

                focus: {
                    enabled: true,
                    distanceScale: 0.7,
                    duration: 0.35
                },

                rotateKeys: {
                    enabled: true,
                    stepDeg: 45,
                    axis: "y",
                    keys: {
                        left: "ArrowLeft",
                        right: "ArrowRight"
                    },
                    requireSelected: true,
                    ignoreWhenDragging: true,
                    ignoreWhenTyping: true
                },

                cancelIfNoViewChange: true,

                viewChangeThreshold: {
                    rotate: 0.002,
                    move: 0.002,
                    target: 0.002
                },

                customHandlers: []
            },
            options
        );

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.selectedObject = null;

        this.pointerDown = false;
        this.pressedOnObject = false;

        this.downCameraPos = new THREE.Vector3();
        this.downCameraQuat = new THREE.Quaternion();
        this.downTarget = new THREE.Vector3();

        this.highlight = null;
        this.ring = null;
        this.focus = null;
        this.rotateKeys = null;
        this.customHandlers = [];

        this.hooks = {
            onEnable: null,
            onDisable: null,
            onSelect: null,
            onClear: null
        };

        this.initEffects();

        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
    }

    initEffects() {
        if (this.options.highlight?.enabled) {
            this.highlight = new PickHighlight();
        }

        if (this.options.ring?.enabled) {
            this.ring = new PickRing(this.viewer, this.options.ring);
        }

        if (this.options.focus?.enabled) {
            this.focus = new PickFocus(this.viewer, this.options.focus);
        }

        if (this.options.rotateKeys?.enabled) {
            this.rotateKeys = new PickRotateKeys(this.viewer, this.options.rotateKeys);
        }

        if (this.options.customHandlers?.length) {
            this.customHandlers = [...this.options.customHandlers];
        }
    }

    enable() {
        const el = this.viewer.renderer.domElement;
        el.addEventListener("pointerdown", this.handlePointerDown);
        el.addEventListener("pointerup", this.handlePointerUp);
        el.addEventListener("pointerleave", this.handlePointerUp);

        this.hooks.onEnable?.(this);
    }

    disable() {
        const el = this.viewer.renderer.domElement;
        el.removeEventListener("pointerdown", this.handlePointerDown);
        el.removeEventListener("pointerup", this.handlePointerUp);
        el.removeEventListener("pointerleave", this.handlePointerUp);

        this.clearSelection();
        this.rotateKeys?.dispose();
        this.hooks.onDisable?.(this);
    }

    handlePointerDown(e) {
        this.pointerDown = true;

        const controls = this.viewer.controls;
        this.downCameraPos.copy(this.viewer.camera.position);
        this.downCameraQuat.copy(this.viewer.camera.quaternion);
        this.downTarget.copy(controls.target);

        const hitObject = this.pickObjectAt(e);

        if (hitObject) {
            this.pressedOnObject = true;

            if (hitObject !== this.selectedObject) {
                this.selectObject(hitObject);
            }
        } else {
            this.pressedOnObject = false;
        }
    }

    handlePointerUp() {
        if (!this.pointerDown) return;
        this.pointerDown = false;

        if (this.pressedOnObject) return;
        
        // 点击空白区域，立即清除选择并重新启用相机旋转控制
        this.clearSelection();
    }

    pickObjectAt(e) {
        const rect = this.viewer.renderer.domElement.getBoundingClientRect();

        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.viewer.camera);

        const hits = this.raycaster.intersectObjects(
            this.viewer.scene.children,
            true
        );

        if (!hits.length) return null;

        const hit = hits[0].object;

        const pickedObject = this.options.pickAsWhole
            ? resolvePickRoot(hit, this.viewer.scene)
            : hit;
        
        return pickedObject;
    }

    selectObject(object) {
        this.clearSelection();
        this.selectedObject = object;

        this.highlight?.select(object);
        this.ring?.select(object);
        this.focus?.select(object);
        this.rotateKeys?.select(object);
        this.customHandlers.forEach(h => h.select?.(object));

        this.hooks.onSelect?.(this, object);
        
        // 选中物体时，禁用相机旋转控制
        if (this.viewer.controls) {
            this.viewer.controls.enabled = false;
        }
    }

    clearSelection() {
        if (!this.selectedObject) return;

        this.highlight?.clear();
        this.ring?.clear();
        this.focus?.clear();
        this.rotateKeys?.clear();
        this.customHandlers.forEach(h => h.clear?.());

        this.selectedObject = null;
        this.hooks.onClear?.(this);
        
        // 清除选择时，重新启用相机旋转控制
        if (this.viewer.controls) {
            this.viewer.controls.enabled = true;
        }
    }

    isActiveSelection() {
        return !!this.selectedObject;
    }

    run(delta) {
        const object = this.selectedObject;

        if (object) {
            this.ring?.follow?.(object);
        }

        this.ring?.run?.();
        this.focus?.run?.(delta);
    }
}
