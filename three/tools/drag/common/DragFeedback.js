import * as THREE from "three";

export default class DragFeedback {
    constructor(viewer, options = {}) {
        this.viewer = viewer;
        this.options = Object.assign(
            {
                enabled: true,
                dragCursor: 'grabbing',
                normalCursor: 'grab'
            },
            options
        );

        this.dragIndicator = null;
    }

    init() {
        if (!this.options.enabled) return;
    }

    onDragStart(object) {
        if (!this.options.enabled) return;

        this.viewer.renderer.domElement.style.cursor = this.options.dragCursor;

        if (object.material) {
            this.originalMaterial = object.material;
            
            this.highlightMaterial = new THREE.MeshStandardMaterial({
                color: 0x6aa9ff,
                emissive: 0x333333,
                transparent: true,
                opacity: 0.8
            });
            
            object.material = this.highlightMaterial;
        }
    }

    onDrag(object) {
    }

    onDragEnd(object) {
        if (!this.options.enabled) return;

        this.viewer.renderer.domElement.style.cursor = this.options.normalCursor;

        if (object.material && this.originalMaterial) {
            object.material = this.originalMaterial;
            this.originalMaterial = null;
            if (this.highlightMaterial) {
                this.highlightMaterial.dispose();
                this.highlightMaterial = null;
            }
        }
    }

    dispose() {
        if (this.dragIndicator) {
            this.viewer.scene.remove(this.dragIndicator);
            this.dragIndicator = null;
        }

        if (this.highlightMaterial) {
            this.highlightMaterial.dispose();
            this.highlightMaterial = null;
        }
    }
}
