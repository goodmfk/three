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

        const newCollidingObjects = new Set();
        const objects = this.getSceneObjects(scene, draggedObject);

        const pickRootObjects = objects;

        if (pickRootObjects.length === 0) {
            this.collidingObjects.clear();
            return;
        }

        const draggedBox = new THREE.Box3().setFromObject(draggedObject);
        const draggedCenter = draggedBox.getCenter(new THREE.Vector3());
        
        const nearbyObjects = pickRootObjects.filter(object => {
            const objectBox = new THREE.Box3().setFromObject(object);
            const objectCenter = objectBox.getCenter(new THREE.Vector3());
            const distance = draggedCenter.distanceTo(objectCenter);
            return distance < 3;
        });

        for (const object of nearbyObjects) {
            const objectBox = new THREE.Box3().setFromObject(object);
            if (this._checkCollision(draggedBox, objectBox)) {
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
        this._objectCache = [];
        
        scene.traverse((object) => {
            if (object !== draggedObject && 
                object.isMesh && 
                object.visible) {
                this._objectCache.push(object);
            }
        });
        
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

    _checkCollision(box1, box2) {
        if (!box1.intersectsBox(box2)) {
            return false;
        }
        
        const overlapBox = new THREE.Box3().intersect(box1, box2);
        const overlapSize = new THREE.Vector3();
        overlapBox.getSize(overlapSize);
        
        const overlapVolume = overlapSize.x * overlapSize.y * overlapSize.z;
        
        const box1Size = new THREE.Vector3();
        box1.getSize(box1Size);
        const box1Volume = box1Size.x * box1Size.y * box1Size.z;
        
        const box2Size = new THREE.Vector3();
        box2.getSize(box2Size);
        const box2Volume = box2Size.x * box2Size.y * box2Size.z;
        
        const minVolume = Math.min(box1Volume, box2Volume);
        
        const collisionThreshold = 0.01;
        if (overlapVolume / minVolume < collisionThreshold) {
            return false;
        }
        
        return true;
    }
}
