import * as THREE from "three";

export default class LayoutState {
    constructor() {
        this.rotation = new THREE.Quaternion();
        this.rotation.set(0, 0, 0, 1);
    }

    setRotation(quaternion) {
        this.rotation.copy(quaternion);
    }

    getRotation() {
        return this.rotation;
    }

    reset() {
        this.rotation.set(0, 0, 0, 1);
    }
}
