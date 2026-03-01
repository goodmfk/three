import * as THREE from "three";

export default class DragSession {
    constructor() {
        this.active = false;
        
        this.startPoint = null;
        this.startMatrix = null;
        this.refPlane = null;
        
        this.currentPoint = null;
        this.currentMatrix = null;
        
        this.object = null;
        this.initialPosition = new THREE.Vector3();
        this.initialRotation = new THREE.Euler();
        this.initialScale = new THREE.Vector3();
        
        this.dragMode = null;
        this.mainAxis = null;
        
        this.grabPointWorld = null;
        this.grabOffset = null;
        
        this.isSnapped = false;
    }
    
    start(object, ray, hitPoint) {
        this.active = true;
        this.object = object;
        
        this.startPoint = hitPoint.clone();
        this.currentPoint = hitPoint.clone();
        
        this.startMatrix = object.matrixWorld.clone();
        this.currentMatrix = object.matrixWorld.clone();
        
        this.initialPosition.copy(object.position);
        this.initialRotation.copy(object.rotation);
        this.initialScale.copy(object.scale);
        
        const worldPos = new THREE.Vector3();
        object.getWorldPosition(worldPos);
        
        this.grabPointWorld = hitPoint.clone();
        this.grabOffset = hitPoint.clone().sub(worldPos);
        
        this.isSnapped = false;
    }
    
    update(newPoint) {
        if (!this.active) return;
        
        this.currentPoint = newPoint.clone();
        this.currentMatrix = this.object.matrixWorld.clone();
    }
    
    end() {
        this.active = false;
        
        this.startPoint = null;
        this.startMatrix = null;
        this.refPlane = null;
        this.currentPoint = null;
        this.currentMatrix = null;
        this.object = null;
        this.dragMode = null;
        this.mainAxis = null;
        this.grabPointWorld = null;
        this.grabOffset = null;
    }
    
    getDelta() {
        if (!this.startPoint || !this.currentPoint) {
            return new THREE.Vector3(0, 0, 0);
        }
        
        return this.currentPoint.clone().sub(this.startPoint);
    }
    
    setDragMode(dragMode) {
        this.dragMode = dragMode;
    }
    
    getDragMode() {
        return this.dragMode;
    }
    
    setMainAxis(mainAxis) {
        this.mainAxis = mainAxis;
    }
    
    getMainAxis() {
        return this.mainAxis;
    }
    
    getGrabPointWorld() {
        return this.grabPointWorld;
    }
    
    getGrabOffset() {
        return this.grabOffset;
    }
    
    getInitialPosition() {
        return this.initialPosition.clone();
    }
    
    getObject() {
        return this.object;
    }
    
    setObject(object) {
        this.object = object;
    }
    
    isActive() {
        return this.active;
    }
}
