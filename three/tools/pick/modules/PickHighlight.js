export default class PickHighlight {
    constructor() {
        this.saved = new Map();
        this.active = false;
        this.target = null;
    }

    select(object) {
        this.clear();

        this.target = object;
        this.active = true;

        object.traverse(child => {
            if (child.isMesh && child.material && child.material.emissive) {
                this.saved.set(child, child.material.emissive.clone());
            }
        });
    }

    run() {
        if (!this.active || !this.target) return;

        this.saved.forEach((_, mesh) => {
            mesh.material.emissive.setHex(0x333333);
        });
    }

    clear() {
        if (!this.saved.size) return;

        this.saved.forEach((value, mesh) => {
            mesh.material.emissive.copy(value);
        });

        this.saved.clear();
        this.target = null;
        this.active = false;
    }
}
