import * as THREE from "three";
import CabinetInstance from "./CabinetInstance.js";

export default class InstanceManager {
    constructor(layoutRoot, layoutState) {
        this.layoutRoot = layoutRoot;
        this.layoutState = layoutState;
        this.instances = new Map();
        this.nextInstanceId = 1;
    }
    
    createInstance(model, options = {}) {
        const instanceId = this.nextInstanceId++;
        
        const instance = new CabinetInstance(instanceId, model, options);
        
        instance.object3D.quaternion.copy(this.layoutState.getRotation());
        
        this.layoutRoot.add(instance.object3D);
        
        this.instances.set(instanceId, instance);
        
        return instance;
    }
    
    removeInstance(instanceId) {
        if (this.instances.has(instanceId)) {
            const instance = this.instances.get(instanceId);
            this.layoutRoot.remove(instance.object3D);
            this.instances.delete(instanceId);
            return true;
        }
        return false;
    }
    
    getInstance(instanceId) {
        return this.instances.get(instanceId);
    }
    
    getByObject(object3D) {
        for (const instance of this.instances.values()) {
            if (instance.object3D === object3D) {
                return instance;
            }
        }
        return null;
    }
    
    getAllInstances() {
        return Array.from(this.instances.values());
    }
    
    update() {
        for (const instance of this.instances.values()) {
            instance.update();
        }
    }
    
    getInstanceCount() {
        return this.instances.size;
    }
    
    clearInstances() {
        for (const instanceId of this.instances.keys()) {
            this.removeInstance(instanceId);
        }
    }
}