import * as THREE from "three";

export default class LayoutManager {
    constructor(scene) {
        this.scene = scene;

        this.layoutRoot = new THREE.Group();
        this.layoutRoot.name = "LayoutRoot";
        this.scene.add(this.layoutRoot);

        this._tmp = {
            boundingBox: new THREE.Box3(),
            center: new THREE.Vector3(),
            delta: new THREE.Vector3()
        };
    }

    layoutCenter() {
        if (this.layoutRoot.children.length === 0) {
            return;
        }

        const boundingBox = this._tmp.boundingBox;
        boundingBox.makeEmpty();

        this.layoutRoot.children.forEach(child => {
            if (child.userData && child.userData.pickRoot) {
                boundingBox.expandByObject(child);
            }
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

    layoutScale() {
    }

    layoutClamp() {
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
}
