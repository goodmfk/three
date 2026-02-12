import * as THREE from "three";

export default class PickRotateKeys {
    constructor(viewer, options = {}) {
        this.viewer = viewer;
        
        this.options = Object.assign(
            {
                enabled: true,
                stepDeg: 45,
                axis: "y",
                keys: {
                    left: "ArrowLeft",
                    right: "ArrowRight"
                },
                requireSelected: true,
                ignoreWhenDragging: true,
                ignoreWhenTyping: true
            },
            options
        );
        
        this.enabled = false;
        this.activeObject = null;
        this.isDragging = false;
        
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.addEventListeners();
    }
    
    addEventListeners() {
        document.addEventListener("keydown", this.handleKeyDown);
    }
    
    removeEventListeners() {
        document.removeEventListener("keydown", this.handleKeyDown);
    }
    
    enable() {
        this.enabled = true;
    }
    
    disable() {
        this.enabled = false;
        this.activeObject = null;
    }
    
    select(object) {
        this.activeObject = object;
        this.enable();
    }
    
    clear() {
        this.activeObject = null;
        this.disable();
    }
    
    setDragging(dragging) {
        this.isDragging = dragging;
    }
    
    handleKeyDown(event) {
        if (!this.enabled) return;
        if (!this.activeObject) return;
        if (this.isDragging && this.options.ignoreWhenDragging) return;
        if (this.isTyping() && this.options.ignoreWhenTyping) return;
        
        const stepRad = (this.options.stepDeg * Math.PI) / 180;
        
        if (event.key === this.options.keys.left) {
            this.rotateObject(-stepRad);
            event.preventDefault();
        } else if (event.key === this.options.keys.right) {
            this.rotateObject(stepRad);
            event.preventDefault();
        }
    }
    
    rotateObject(stepRad) {
        if (!this.activeObject) return;
        
        this.activeObject.rotation[this.options.axis] += stepRad;
        this.normalizeAngle();
    }
    
    normalizeAngle() {
        if (!this.activeObject) return;
        
        let angle = this.activeObject.rotation[this.options.axis];
        const twoPi = 2 * Math.PI;
        
        angle = angle % twoPi;
        if (angle < 0) {
            angle += twoPi;
        }
        
        this.activeObject.rotation[this.options.axis] = angle;
    }
    
    isTyping() {
        const activeElement = document.activeElement;
        return (
            activeElement &&
            (activeElement.tagName === "INPUT" ||
             activeElement.tagName === "TEXTAREA" ||
             activeElement.isContentEditable)
        );
    }
    
    dispose() {
        this.removeEventListeners();
        this.disable();
    }
}