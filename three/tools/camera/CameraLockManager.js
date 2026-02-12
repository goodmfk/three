export default class CameraLockManager {
    constructor(camera, controls) {
        this.camera = camera;
        this.controls = controls;
        this._locked = false;
        this._prevEnabled = true;
    }

    acquireLock() {
        if (!this.controls) return;

        if (this._locked) return;

        this._prevEnabled = this.controls.enabled;
        this.controls.enabled = false;
        this._locked = true;
    }

    releaseLock() {
        if (!this.controls) return;

        if (!this._locked) return;

        this.controls.enabled = this._prevEnabled;
        this._locked = false;
    }
}
