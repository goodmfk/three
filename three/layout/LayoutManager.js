import * as THREE from "three";

export default class LayoutManager {
    constructor(scene, worldManager = null) {
        this.scene = scene;
        this.worldManager = worldManager;

        this.layoutRoot = new THREE.Group();
        this.layoutRoot.name = "LayoutRoot";
        this.scene.add(this.layoutRoot);

        if (this.worldManager) {
            this.worldManager.setLayoutRoot(this.layoutRoot);
        }

        this._tmp = {
            boundingBox: new THREE.Box3(),
            center: new THREE.Vector3(),
            delta: new THREE.Vector3(),
            position: new THREE.Vector3()
        };
    }

    layoutCenter() {
        if (this.layoutRoot.children.length === 0) {
            return;
        }

        const pickRootChildren = this.layoutRoot.children.filter(child => 
            child.userData && child.userData.pickRoot
        );

        if (pickRootChildren.length === 0) {
            return;
        }

        if (pickRootChildren.length === 1) {
            const object = pickRootChildren[0];
            
            const worldPosition = object.getWorldPosition(new THREE.Vector3());
            
            const targetWorldPosition = new THREE.Vector3(0, worldPosition.y, 0);
            
            const targetLocalPosition = this.layoutRoot.worldToLocal(targetWorldPosition);
            
            object.position.copy(targetLocalPosition);
            this.layoutRoot.updateMatrixWorld(true);
        } 
        else {
            if (this.worldManager) {
                const center = this.worldManager.calculateWorldCenter();
                
                const delta = this._tmp.delta;
                delta.set(-center.x, 0, -center.z);

                this.layoutRoot.position.add(delta);
                this.layoutRoot.updateMatrixWorld(true);
            } else {
                const boundingBox = this._tmp.boundingBox;
                boundingBox.makeEmpty();

                pickRootChildren.forEach(child => {
                    boundingBox.expandByObject(child);
                });

                if (boundingBox.isEmpty()) {
                    return;
                }

                const center = this._tmp.center;
                boundingBox.getCenter(center);

                const delta = this._tmp.delta;
                delta.set(-center.x, 0, -center.z);

                this.layoutRoot.position.add(delta);
                this.layoutRoot.updateMatrixWorld(true);
            }
        }
    }

    layoutScale() {
    }

    layoutClamp() {
        if (!this.worldManager || !this.worldManager.bounds.enabled) {
            return;
        }

        this.layoutRoot.children.forEach(child => {
            if (child.userData && child.userData.pickRoot) {
                const position = this._tmp.position;
                child.getWorldPosition(position);
                
                const clampedPosition = this.worldManager.clampPosition(position);
                child.position.copy(this.layoutRoot.worldToLocal(clampedPosition));
            }
        });
        
        this.layoutRoot.updateMatrixWorld(true);
    }

    add(object) {
        this.layoutRoot.add(object);
    }

    remove(object) {
        this.layoutRoot.remove(object);
    }

    getRoot() {
        return this.layoutRoot;
    }

    clear() {
        while (this.layoutRoot.children.length > 0) {
            this.layoutRoot.remove(this.layoutRoot.children[0]);
        }
    }

    setWorldManager(worldManager) {
        this.worldManager = worldManager;
        if (worldManager) {
            worldManager.setLayoutRoot(this.layoutRoot);
        }
    }

    getWorldManager() {
        return this.worldManager;
    }
}
