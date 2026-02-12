import * as THREE from "three";
import DragFeedback from "./common/DragFeedback.js";
import DragCollision from "./common/DragCollision.js";
import DragSession from "./DragSession.js";
import CameraLockManager from "../camera/CameraLockManager.js";

import ScreenDrag from "./strategies/ScreenDrag.js";

export const DragMode = {
    NONE: "none",
    PLANE: "plane"
};

export default class DragTool {
    constructor(viewer, options = {}) {
        this.viewer = viewer;

        const defaults = {
            enabled: true,
            strategy: "screen",
            strategyOptions: {
                clampToView: true,
                viewPaddingNdc: 0.08
            },
            handler: {
                sensitivity: 0.1,
                threshold: 0.01,
                boundary: {
                    enabled: false,
                    minX: -100,
                    maxX: 100,
                    minZ: -100,
                    maxZ: 100
                }
            },
            collision: {
                enabled: true
            },
            feedback: {
                enabled: true
            }
        };

        const merged = {
            enabled: options.enabled != null ? options.enabled : defaults.enabled,
            strategy: options.strategy != null ? options.strategy : defaults.strategy,
            strategyOptions: Object.assign({}, defaults.strategyOptions, options.strategyOptions || {}),
            handler: Object.assign({}, defaults.handler, options.handler || {}),
            collision: Object.assign({}, defaults.collision, options.collision || {}),
            feedback: Object.assign({}, defaults.feedback, options.feedback || {})
        };

        merged.handler.boundary = Object.assign(
            {},
            defaults.handler.boundary,
            (options.handler && options.handler.boundary) ? options.handler.boundary : {}
        );

        this.options = merged;

        const strategy = new ScreenDrag(viewer.camera, Object.assign({}, this.options.strategyOptions, {
            layoutManager: this.viewer.layoutManager
        }));
        this.strategy = strategy;

        this.dragSession = new DragSession();

        this.collision = new DragCollision(this.options.collision);
        this.feedback = new DragFeedback(this.viewer, this.options.feedback);

        this.hooks = {
            onEnable: null,
            onDisable: null,
            onDragStart: null,
            onDrag: null,
            onDragEnd: null,
            onCollision: null,
            onCollisionEnd: null,
            onBoundaryExceeded: null
        };

        this._dragging = false;
        this._selectedObject = null;
        this._lastMousePos = new THREE.Vector2();

        this.cameraLockManager = new CameraLockManager(this.viewer.camera, this.viewer.controls);

        this._raycaster = new THREE.Raycaster();

        this.bindModuleEvents();
    }

    bindModuleEvents() {
        this.collision.hooks.onCollision = (collision, draggedObject, collidingObject) => {
            if (this.hooks.onCollision) this.hooks.onCollision(this, draggedObject, collidingObject);
        };

        this.collision.hooks.onCollisionEnd = (collision, draggedObject, collidingObject) => {
            if (this.hooks.onCollisionEnd) this.hooks.onCollisionEnd(this, draggedObject, collidingObject);
        };
    }

    enable() {
        this.feedback.init();
        if (this.hooks.onEnable) this.hooks.onEnable(this);
    }

    disable() {
        this.endDrag();
        this.collision.clear();
        this.feedback.dispose();
        if (this.hooks.onDisable) this.hooks.onDisable(this);
    }

    startDrag(object, mousePos) {
        if (!object) return;

        if (this.viewer.updateSize) {
            this.viewer.updateSize();
        }

        this._raycaster.setFromCamera(mousePos, this.viewer.camera);

        const dragMode = this._calculateDragMode(object);
        if (dragMode === DragMode.NONE) {
            this.viewer.controls.enabled = true;
            return;
        }

        const intersects = this._raycaster.intersectObject(object, true);
        let hitPoint;
        if (intersects.length > 0) {
            hitPoint = intersects[0].point.clone();
        } else {
            hitPoint = object.getWorldPosition(new THREE.Vector3());
        }

        this.dragSession.setObject(object);

        const success = this.strategy.start(this.dragSession, this._raycaster.ray, hitPoint);

        if (!success) {
            this.viewer.controls.enabled = true;
            return;
        }

        this.cameraLockManager.acquireLock();

        this._selectedObject = object;
        this._dragging = true;
        this._lastMousePos.copy(mousePos);

        this.feedback.onDragStart(object);
        this.collision.setDragging(true);
        if (this.hooks.onDragStart) {
            this.hooks.onDragStart(this, object, {
                startPos: mousePos,
                initialObjectPos: object.position.clone()
            });
        }
    }

    _calculateDragMode(object) {
        const cameraForward = new THREE.Vector3();
        this.viewer.camera.getWorldDirection(cameraForward);

        const worldQuat = new THREE.Quaternion();
        object.getWorldQuaternion(worldQuat);

        const axes = [
            { axis: new THREE.Vector3(1, 0, 0), name: "x" },
            { axis: new THREE.Vector3(0, 1, 0), name: "y" },
            { axis: new THREE.Vector3(0, 0, 1), name: "z" }
        ];

        for (let i = 0; i < axes.length; i++) {
            axes[i].axis.applyQuaternion(worldQuat).normalize();
        }

        let maxDot = -1;
        let mainAxis = axes[0];

        for (let i = 0; i < axes.length; i++) {
            const dot = Math.abs(axes[i].axis.dot(cameraForward));
            if (dot > maxDot) {
                maxDot = dot;
                mainAxis = axes[i];
            }
        }

        this.dragSession.setMainAxis(mainAxis.axis);

        // if (maxDot > 0.95) {
        //     return DragMode.NONE;
        // }

        return DragMode.PLANE;
    }

    updateDrag(mousePos, camera) {
        if (!this._dragging || !this._selectedObject) return;

        if (Math.abs(mousePos.x - this._lastMousePos.x) < this.options.handler.threshold &&
            Math.abs(mousePos.y - this._lastMousePos.y) < this.options.handler.threshold) {
            return;
        }

        this._raycaster.setFromCamera(mousePos, camera);

        const newPosition = this.strategy.update(this.dragSession, this._raycaster.ray);

        if (!newPosition) return;

        const boundary = this.options.handler.boundary;

        if (boundary.enabled) {
            const clampedPosition = this._clampPosition(newPosition);
            if (!clampedPosition.equals(newPosition)) {
                this._selectedObject.position.copy(clampedPosition);
                if (this.hooks.onBoundaryExceeded) {
                    this.hooks.onBoundaryExceeded(this, this._selectedObject, {
                        attemptedPosition: newPosition,
                        restoredPosition: clampedPosition,
                        boundary: boundary
                    });
                }
            } else {
                this._selectedObject.position.copy(newPosition);
            }
        } else {
            this._selectedObject.position.copy(newPosition);
        }

        this._lastMousePos.copy(mousePos);

        this.feedback.onDrag(this._selectedObject);
        this.collision.detectCollisions(this._selectedObject, this.viewer.scene);
        if (this.hooks.onDrag) {
            this.hooks.onDrag(this, this._selectedObject, {
                newPosition,
                session: this.dragSession
            });
        }
    }

    endDrag() {
        if (!this._dragging || !this._selectedObject) return;

        const object = this._selectedObject;

        this.strategy.end(this.dragSession);

        this._dragging = false;
        this._selectedObject = null;

        this.feedback.onDragEnd(object);
        this.collision.setDragging(false);
        this.collision.clear();
        this.cameraLockManager.releaseLock();

        if (this.hooks.onDragEnd) {
            this.hooks.onDragEnd(this, object, {
                endPos: this._lastMousePos,
                finalObjectPos: object.position.clone()
            });
        }
    }

    isDragging() {
        return this._dragging;
    }

    getSelectedObject() {
        return this._selectedObject;
    }

    getCollisionObjects() {
        return this.collision.getCollidingObjects();
    }

    run(delta) {
    }

    _clampPosition(position) {
        const boundary = this.options.handler.boundary;
        return new THREE.Vector3(
            Math.max(boundary.minX, Math.min(boundary.maxX, position.x)),
            position.y,
            Math.max(boundary.minZ, Math.min(boundary.maxZ, position.z))
        );
    }
}
