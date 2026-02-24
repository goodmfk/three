import * as THREE from "three";
import CabinetInstance from "./CabinetInstance.js";

export default class InstanceManager {
    constructor(layoutRoot, layoutState, worldManager = null) {
        this.layoutRoot = layoutRoot;
        this.layoutState = layoutState;
        this.worldManager = worldManager;
        this.instances = new Map();
        this.nextInstanceId = 1;
    }
    
    createInstance(model, options = {}) {
        const instanceId = this.nextInstanceId++;
        
        // 如果没有指定位置，使用WorldManager计算初始位置
        if (!options.position && this.worldManager) {
            options.position = this.worldManager.calculateSpawnPosition(model);
        }
        
        const instance = new CabinetInstance(instanceId, model, options);
        
        instance.object3D.quaternion.copy(this.layoutState.getRotation());
        
        this.layoutRoot.add(instance.object3D);
        
        this.instances.set(instanceId, instance);
        
        return instance;
    }
    
    // 设置WorldManager
    setWorldManager(worldManager) {
        this.worldManager = worldManager;
    }
    
    // 获取WorldManager
    getWorldManager() {
        return this.worldManager;
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