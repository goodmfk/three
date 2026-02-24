import * as THREE from "three";

export default class DragCollision {
    constructor(options = {}) {
        this.options = Object.assign(
            {
                enabled: true,
                tolerance: 0.01,
                preventPenetration: true
            },
            options
        );

        this.hooks = {
            onCollision: null,
            onCollisionEnd: null
        };

        this.collidingObjects = new Set();
        this._objectCache = [];
        this._lastCacheTime = 0;
        this._cacheInterval = 100;
        this._isDragging = false;
        this._lastDetectionTime = 0;
    }

    detectCollisions(draggedObject, scene) {
        if (!this.options.enabled) return;

        if (!this._isDragging) return;

        const now = Date.now();
        if (now - this._lastDetectionTime < 16) return;
        this._lastDetectionTime = now;

        const newCollidingObjects = new Set();
        const objects = this.getSceneObjects(scene, draggedObject);

        // 只检测带有pickRoot标志的物体（模型实例）
        const pickRootObjects = objects.filter(object => {
            let current = object;
            while (current) {
                if (current.userData && current.userData.pickRoot) {
                    return true;
                }
                if (!current.parent) {
                    break;
                }
                current = current.parent;
            }
            return false;
        });

        // 如果没有其他物体，直接返回
        if (pickRootObjects.length === 0) {
            this.collidingObjects.clear();
            return;
        }

        const draggedBox = new THREE.Box3().setFromObject(draggedObject);
        const draggedCenter = draggedBox.getCenter(new THREE.Vector3());
        
        // 扩大搜索范围，减少不必要的检测
        const nearbyObjects = pickRootObjects.filter(object => {
            const objectBox = new THREE.Box3().setFromObject(object);
            const objectCenter = objectBox.getCenter(new THREE.Vector3());
            const distance = draggedCenter.distanceTo(objectCenter);
            // 使用更大的距离阈值，减少计算量
            return distance < 3;
        });

        for (const object of nearbyObjects) {
            const objectBox = new THREE.Box3().setFromObject(object);
            if (draggedBox.intersectsBox(objectBox)) {
                newCollidingObjects.add(object);

                if (!this.collidingObjects.has(object)) {
                    this.hooks.onCollision?.(this, draggedObject, object);
                }
            } else {
                if (this.collidingObjects.has(object)) {
                    this.hooks.onCollisionEnd?.(this, draggedObject, object);
                }
            }
        }

        this.collidingObjects = newCollidingObjects;
    }

    setDragging(isDragging) {
        this._isDragging = isDragging;
    }

    getSceneObjects(scene, draggedObject) {
        const currentTime = Date.now();
        if (currentTime - this._lastCacheTime > this._cacheInterval) {
            this._objectCache = [];
            
            scene.traverse((object) => {
                if (object !== draggedObject && 
                    object.isMesh && 
                    object.visible) {
                    this._objectCache.push(object);
                }
            });
            
            this._lastCacheTime = currentTime;
        }
        
        return this._objectCache;
    }

    isColliding() {
        return this.collidingObjects.size > 0;
    }

    getCollidingObjects() {
        return this.collidingObjects;
    }

    clear() {
        this.collidingObjects.clear();
    }
}
