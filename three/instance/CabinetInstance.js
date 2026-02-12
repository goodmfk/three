import * as THREE from "three";

export default class CabinetInstance {
    constructor(instanceId, model, options = {}) {
        this.id = instanceId;
        this.model = model;
        this.options = Object.assign({
            position: new THREE.Vector3(),
            rotation: new THREE.Euler(),
            scale: new THREE.Vector3(1, 1, 1)
        }, options);
        
        this.object3D = this.createObject3D();
        
        this.isSelected = false;
        this.isDragging = false;
        this.isSnapped = false;
        this.snapTarget = null;
        
        this.originalMaterials = new Map();
    }
    
    createObject3D() {
        const group = new THREE.Group();
        
        const modelClone = this.model.scene.clone();
        
        const box = new THREE.Box3().setFromObject(modelClone);
        const center = box.getCenter(new THREE.Vector3());
        modelClone.position.sub(center);
        
        group.add(modelClone);
        
        group.position.copy(this.options.position);
        group.rotation.copy(this.options.rotation);
        group.scale.copy(this.options.scale);
        
        group.userData.instanceId = this.id;
        group.userData.pickRoot = true;
        
        return group;
    }
    
    update() {
    }
    
    getBoundingBox() {
        const box = new THREE.Box3().setFromObject(this.object3D);
        return box;
    }
    
    getPosition() {
        return this.object3D.position.clone();
    }
    
    setPosition(position) {
        this.object3D.position.copy(position);
    }
    
    getRotation() {
        return this.object3D.rotation.clone();
    }
    
    setRotation(rotation) {
        this.object3D.rotation.copy(rotation);
    }
    
    getScale() {
        return this.object3D.scale.clone();
    }
    
    setScale(scale) {
        this.object3D.scale.copy(scale);
    }
    
    select() {
        this.isSelected = true;
    }
    
    deselect() {
        this.isSelected = false;
    }
    
    startDrag() {
        this.isDragging = true;
    }
    
    endDrag() {
        this.isDragging = false;
    }
    
    setSnapped(snapped, target = null) {
        this.isSnapped = snapped;
        this.snapTarget = target;
    }
    
    dispose() {
        this.object3D.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((material) => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }
}