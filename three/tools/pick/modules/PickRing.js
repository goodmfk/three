import * as THREE from "three";

export default class PickRing {
    constructor(viewer, options) {
        this.viewer = viewer;
        this.options = options;

        this.ring = null;

        this.refDist = 1;
        this.refFovK = 1;

        this.active = false;
    }

    select(object) {
        this.clear();

        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const halfX = size.x * 0.5;
        const halfZ = size.z * 0.5;
        const baseRadius = Math.sqrt(
            halfX * halfX + halfZ * halfZ
        );

        const ringWidth = baseRadius * this.options.ringWidth;
        const outerRadius =
            baseRadius * this.options.padding + ringWidth * 0.5;
        const innerRadius = outerRadius - ringWidth;

        const geometry = new THREE.RingGeometry(
            innerRadius,
            outerRadius,
            96
        );

        const material = new THREE.MeshBasicMaterial({
            color: this.options.color,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false
        });

        this.ring = new THREE.Mesh(geometry, material);
        this.ring.rotation.set(-Math.PI / 2, 0, 0);

        const drop = Math.max(size.y * 0.02, 0.01);

        this.ring.position.set(
            center.x,
            box.min.y - drop,
            center.z
        );

        this.viewer.scene.add(this.ring);

        const camera = this.viewer.camera;
        this.refDist = camera.position.distanceTo(this.ring.position);
        this.refFovK = Math.tan(
            THREE.MathUtils.degToRad(camera.fov) * 0.5
        );

        this.active = true;
    }

    run() {
        if (!this.active || !this.ring) return;

        const camera = this.viewer.camera;
        const dist = camera.position.distanceTo(this.ring.position);
        const fovK = Math.tan(
            THREE.MathUtils.degToRad(camera.fov) * 0.5
        );

        const raw =
            (dist * fovK) / (this.refDist * this.refFovK);

        const scale = Math.pow(raw, 0.6);
        if (Math.abs(scale - this._lastScale) < 0.001) return;
        this._lastScale = scale;
        this.ring.scale.set(scale, scale, scale);
    }
    follow(object) {
        if (!this.active || !this.ring) return;

        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const halfX = size.x * 0.5;
        const halfZ = size.z * 0.5;
        const baseRadius = Math.sqrt(
            halfX * halfX + halfZ * halfZ
        );

        const ringWidth = baseRadius * this.options.ringWidth;
        const outerRadius =
            baseRadius * this.options.padding + ringWidth * 0.5;
        const innerRadius = outerRadius - ringWidth;

        this.ring.geometry.dispose();
        this.ring.geometry = new THREE.RingGeometry(
            innerRadius,
            outerRadius,
            96
        );

        const drop = Math.max(size.y * 0.02, 0.01);

        this.ring.position.set(
            center.x,
            box.min.y - drop,
            center.z
        );

        const camera = this.viewer.camera;
        this.refDist = camera.position.distanceTo(this.ring.position);
        this.refFovK = Math.tan(
            THREE.MathUtils.degToRad(camera.fov) * 0.5
        );
    }

    clear() {
        if (!this.ring) return;

        this.viewer.scene.remove(this.ring);
        this.ring.geometry.dispose();
        this.ring.material.dispose();

        this.ring = null;
        this.active = false;
    }
}
