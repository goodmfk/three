import * as THREE from "three";

export default class ScreenDrag {
    constructor(camera, options = {}) {
        this.camera = camera;
        this.worldManager = options.worldManager || null;
        this.options = Object.assign(
            {
                snap: {
                    enabled: true,
                    distance: 0.3,
                    minOverlapY: 0.02
                }
            },
            options
        );

        const groundY = this.worldManager ? this.worldManager.getGroundY() : 0;
        this._tmp = {
            plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundY),
            rayHit: new THREE.Vector3(),
            startObjectWorld: new THREE.Vector3()
        };
    }

    start(dragSession, ray, hitPoint) {
        const object = dragSession.object;
        if (!object) return false;

        object.getWorldPosition(this._tmp.startObjectWorld);

        if (!ray.intersectPlane(this._tmp.plane, this._tmp.rayHit)) {
            return false;
        }

        dragSession.grabOffset = this._tmp.startObjectWorld.clone().sub(this._tmp.rayHit);

        return true;
    }

    update(dragSession, ray) {
        const object = dragSession.object;
        if (!object) return null;

        if (!ray.intersectPlane(this._tmp.plane, this._tmp.rayHit)) {
            return null;
        }

        const newWorldPos = this._tmp.rayHit.clone().add(dragSession.grabOffset);

        const groundY = this.worldManager ? this.worldManager.getGroundY() : this._tmp.startObjectWorld.y;
        newWorldPos.y = groundY;

        if (this.worldManager && this.worldManager.bounds.enabled) {
            if (!this.worldManager.isInBounds(newWorldPos)) {
                const clampedPos = this.worldManager.clampPosition(newWorldPos);
                newWorldPos.copy(clampedPos);
            }
        }

        if (this.options.snap && this.options.snap.enabled) {
            this._applySnap(object, dragSession, newWorldPos);
        }

        if (object.parent) {
            return object.parent.worldToLocal(newWorldPos);
        }

        return newWorldPos;
    }

    end(dragSession) {
        const lm = this.options.layoutManager;
        if (lm && lm.layoutCenter) {
            lm.layoutCenter();
        }
    }

    _fitCameraToObjects() {
        const lm = this.options.layoutManager;
        if (!lm || !lm.getRoot) return;

        const root = lm.getRoot();
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
        if (this.camera.userData.controls && this.camera.userData.controls.target) {
            controlsTarget.copy(this.camera.userData.controls.target);
        }

        const dir = new THREE.Vector3().subVectors(this.camera.position, controlsTarget).normalize();

        this.camera.position.copy(center).add(dir.multiplyScalar(distance));
        this.camera.near = distance / 100;
        this.camera.far = distance * 100;
        this.camera.updateProjectionMatrix();

        if (this.camera.userData.controls && this.camera.userData.controls.target) {
            this.camera.userData.controls.target.copy(center);
            this.camera.userData.controls.update();
        }
    }

    _applySnap(object, dragSession, worldPos) {
        const lm = this.options.layoutManager;
        if (!lm || !lm.getRoot) return;

        const root = lm.getRoot();
        if (!root) return;

        const others = root.children;
        if (!others || others.length < 2) return;

        const snapDistance = this.options.snap.distance || 1.0;
        const minOverlapY = this.options.snap.minOverlapY || 0.02;

        object.updateMatrixWorld(true);
        const boxA = new THREE.Box3().setFromObject(object);
        const objectSize = new THREE.Vector3();
        boxA.getSize(objectSize);

        const nearbyTargets = [];
        const preRange = snapDistance * 5;

        for (const target of others) {
            if (target === object) continue;

            target.updateMatrixWorld(true);
            const boxB = new THREE.Box3().setFromObject(target);

            const overlapY = Math.min(boxA.max.y, boxB.max.y) - Math.max(boxA.min.y, boxB.min.y);
            if (overlapY <= minOverlapY) continue;

            const gapX = Math.max(0, Math.max(boxA.min.x - boxB.max.x, boxB.min.x - boxA.max.x));
            if (gapX > preRange) continue;

            nearbyTargets.push({ target, boxB });
        }

        const clampAxis = (v, min, max) => {
            if (min > max) return (min + max) / 2;
            return Math.min(Math.max(v, min), max);
        };

        let bestSnapPos = null;
        let minDistance = Infinity;

        const allSnapPositions = [];

        for (const { target, boxB } of nearbyTargets) {
            const zMin = boxB.min.z + objectSize.z / 2;
            const zMax = boxB.max.z - objectSize.z / 2;

            const snapRight = new THREE.Vector3(
                boxB.max.x + objectSize.x / 2,
                worldPos.y,
                clampAxis(worldPos.z, zMin, zMax)
            );

            const snapLeft = new THREE.Vector3(
                boxB.min.x - objectSize.x / 2,
                worldPos.y,
                clampAxis(worldPos.z, zMin, zMax)
            );

            allSnapPositions.push(snapRight, snapLeft);
        }

        for (let i = 0; i < others.length; i++) {
            for (let j = i + 1; j < others.length; j++) {
                const model1 = others[i];
                const model2 = others[j];
                
                if (model1 === object || model2 === object) continue;
                
                model1.updateMatrixWorld(true);
                model2.updateMatrixWorld(true);
                
                const box1 = new THREE.Box3().setFromObject(model1);
                const box2 = new THREE.Box3().setFromObject(model2);
                
                const overlapY = Math.min(box1.max.y, box2.max.y) - Math.max(box1.min.y, box2.min.y);
                if (overlapY <= minOverlapY) continue;
                
                let gapCenterX, gapWidth;
                if (box1.max.x < box2.min.x) {
                    gapCenterX = (box1.max.x + box2.min.x) / 2;
                    gapWidth = box2.min.x - box1.max.x;
                } else if (box1.min.x > box2.max.x) {
                    gapCenterX = (box1.min.x + box2.max.x) / 2;
                    gapWidth = box1.min.x - box2.max.x;
                } else {
                    continue;
                }
                
                const requiredWidth = objectSize.x + 0.02;
                if (gapWidth >= requiredWidth * 0.7) {
                    const zMin = Math.max(box1.min.z, box2.min.z) + objectSize.z / 2;
                    const zMax = Math.min(box1.max.z, box2.max.z) - objectSize.z / 2;
                    
                    const snapToGap = new THREE.Vector3(
                        gapCenterX,
                        worldPos.y,
                        clampAxis(worldPos.z, zMin, zMax)
                    );
                    
                    allSnapPositions.push(snapToGap);
                }
            }
        }

        for (const snapPos of allSnapPositions) {
            const distance = worldPos.distanceTo(snapPos);
            if (distance > snapDistance) continue;

            if (distance < minDistance) {
                let collision = false;

                const savedPos = object.position.clone();
                const tempPos = object.parent ? object.parent.worldToLocal(snapPos.clone()) : snapPos;
                object.position.copy(tempPos);
                object.updateMatrixWorld(true);

                const testBox = new THREE.Box3().setFromObject(object);

                for (const other of others) {
                    if (other === object) continue;

                    other.updateMatrixWorld(true);
                    const otherBox = new THREE.Box3().setFromObject(other);
                    
                    const safeDistance = 0.01;
                    const expandedTestBox = testBox.clone();
                    expandedTestBox.expandByScalar(-safeDistance);
                    
                    if (expandedTestBox.intersectsBox(otherBox)) {
                        collision = true;
                        break;
                    }
                }

                object.position.copy(savedPos);
                object.updateMatrixWorld(true);

                if (!collision) {
                    minDistance = distance;
                    bestSnapPos = snapPos;
                }
            }
        }

        if (bestSnapPos) {
            worldPos.copy(bestSnapPos);
            dragSession.isSnapped = true;
        } else {
            dragSession.isSnapped = false;
        }
    }
}
