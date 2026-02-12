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

        const draggedBox = new THREE.Box3().setFromObject(draggedObject);
        const draggedCenter = draggedBox.getCenter(new THREE.Vector3());
        const nearbyObjects = objects.filter(object => {
            const objectBox = new THREE.Box3().setFromObject(object);
            const objectCenter = objectBox.getCenter(new THREE.Vector3());
            const distance = draggedCenter.distanceTo(objectCenter);
            return distance < 1;
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
