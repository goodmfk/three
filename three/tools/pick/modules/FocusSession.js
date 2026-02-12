import * as THREE from "three";

class FocusSession {

    #active = false;
    #progress = 0;

    #fromDistance = 0;
    #toDistance = 0;

    #originDistance = null;
    #restoring = false;
    
    constructor(viewer, options = {}) {
        this.viewer = viewer;

        this.options = Object.assign(
            {
                distance: null,
                duration: 0.35
            },
            options
        );
    }

    start(object) {
        if (this.options.distance == null) return;

        const camera = this.viewer.camera;
        const controls = this.viewer.controls;

        const currentDistance = camera.position.distanceTo(controls.target);

        if (this.#originDistance === null) {
            this.#originDistance = currentDistance;
        }

        this.#fromDistance = currentDistance;
        this.#toDistance = this.options.distance;

        this.#progress = 0;
        this.#active = true;
    }

    restore() {
        if (this.#originDistance == null) return;

        const camera = this.viewer.camera;
        const controls = this.viewer.controls;

        const currentDistance = camera.position.distanceTo(controls.target);

        this.#fromDistance = currentDistance;
        this.#toDistance = this.#originDistance;

        this.#progress = 0;
        this.#active = true;

        this.#restoring = true;
        controls.enabled = false;
    }

    run(delta) {
        if (!this.#active) return;

        const camera = this.viewer.camera;
        const controls = this.viewer.controls;

        this.#progress += delta / this.options.duration;
        const t = Math.min(this.#progress, 1);

        const distance = this.#fromDistance + (this.#toDistance - this.#fromDistance) * t;

        const dir = camera.position
            .clone()
            .sub(controls.target)
            .normalize();

        camera.position
            .copy(controls.target)
            .addScaledVector(dir, distance);

        controls.update();

        if (t >= 1) {
            this.#active = false;
            if (this.#restoring) {
                this.#restoring = false;
                const controls = this.viewer.controls;
                controls.enabled = true;
                this.#originDistance = null;
            }
        }
    }

    get active() {
        return this.#active;
    }

    get originDistance() {
        return this.#originDistance;
    }
}

export default FocusSession;