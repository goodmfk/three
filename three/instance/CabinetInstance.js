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
        
        this.isSelected = false;
        this.isDragging = false;
        this.isSnapped = false;
        this.snapTarget = null;
        
        this.originalMaterials = new Map();
        
        this.object3D = this.createObject3D();
    }
    
    createObject3D() {
        const group = new THREE.Group();
        
        const modelClone = this.model.scene.clone();
        
        // 打印模型结构，以便了解面板部分的命名
        this.logModelStructure(modelClone, 0);
        
        modelClone.traverse((child) => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    const clonedMaterials = child.material.map(m => m.clone());
                    this.originalMaterials.set(child, clonedMaterials.map(m => m.clone()));
                    child.material = clonedMaterials;
                } else {
                    const clonedMaterial = child.material.clone();
                    this.originalMaterials.set(child, clonedMaterial.clone());
                    child.material = clonedMaterial;
                }
            }
        });
        
        const box = new THREE.Box3().setFromObject(modelClone);
        const center = box.getCenter(new THREE.Vector3());
        modelClone.position.sub(center);
        
        group.add(modelClone);
        
        // 显示模型结构，帮助调试
        setTimeout(() => {
            this.showModelStructure();
        }, 1000);
        
        group.position.copy(this.options.position);
        group.rotation.copy(this.options.rotation);
        group.scale.copy(this.options.scale);
        
        group.userData.instanceId = this.id;
        group.userData.pickRoot = true;
        
        return group;
    }
    
    logModelStructure(object, depth) {
        const indent = '  '.repeat(depth);
        console.log(`${indent}${object.type}: ${object.name}`);
        
        object.children.forEach(child => {
            this.logModelStructure(child, depth + 1);
        });
    }
    
    isPanelMesh(mesh) {
        const meshName = mesh.name || '';
        
        // 拉手不被识别为面板
        if (meshName.includes('拉手')) {
           // return false;
        }
        
        const isDoor = meshName.includes('门') || meshName=="上";
        
        if (!isDoor) return false;
        
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        
        const isColumn = size.x < 0.1 && size.z < 0.1 && size.y > 0.2;
        if (isColumn) {
            return false;
        }
        
        const volume = size.x * size.y * size.z;
        if (volume < 0.001) {
            return false;
        }
        
        return true;
    }
    
    // 检查是否是拉手
    isHandleMesh(mesh) {
        const meshName = mesh.name || '';
        return meshName.includes('拉手')
    }
    
    // 专门修改拉手颜色的方法
    changeHandleColor(color) {
        this.object3D.traverse((child) => {
            if (child.isMesh) {
                if (this.isHandleMesh(child)) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((material, index) => {
                            if (material.isMeshStandardMaterial || material.isMeshBasicMaterial) {
                                material.color.set(color);
                            }
                        });
                    } else if (child.material.isMeshStandardMaterial || child.material.isMeshBasicMaterial) {
                        child.material.color.set(color);
                    }
                }
            }
        });
    }
    
    showModelStructure() {
        let meshCount = 0;
        let panelCount = 0;
        let handleCount = 0;
        
        this.object3D.traverse((child) => {
            if (child.isMesh) {
                meshCount++;
                const isPanel = this.isPanelMesh(child);
                const isHandle = this.isHandleMesh(child);
                
                if (isPanel) {
                    panelCount++;
                    console.log(`[PANEL ${panelCount}] Mesh: ${child.name || 'unnamed'}`);
                } else if (isHandle) {
                    handleCount++;
                    console.log(`[HANDLE ${handleCount}] Mesh: ${child.name || 'unnamed'}`);
                } else {
                    console.log(`[MESH ${meshCount}] Mesh: ${child.name || 'unnamed'}`);
                }
                
                // 显示材质信息
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((mat, index) => {
                            console.log(`  Material ${index}: ${mat.name || 'unnamed'}`);
                        });
                    } else {
                        console.log(`  Material: ${child.material.name || 'unnamed'}`);
                    }
                }
            }
        });
        
        console.log(`=== Total: ${meshCount} meshes, ${panelCount} panels, ${handleCount} handles ===`);
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
    
    changeColor(color, onlyPanels = true) {
        this.object3D.traverse((child) => {
            if (child.isMesh) {
                const isPanel = onlyPanels ? this.isPanelMesh(child) : true;
                if (isPanel) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((material, index) => {
                            if (material.isMeshStandardMaterial || material.isMeshBasicMaterial) {
                                material.color.set(color);
                            }
                        });
                    } else if (child.material.isMeshStandardMaterial || child.material.isMeshBasicMaterial) {
                        child.material.color.set(color);
                    }
                }
            }
        });
    }
    
    resetColor() {
        this.object3D.traverse((child) => {
            if (child.isMesh) {
                const isPanel = this.isPanelMesh(child);
                const isHandle = this.isHandleMesh(child);
                
                if (isPanel || isHandle) {
                    if (this.originalMaterials.has(child)) {
                        const originalMaterial = this.originalMaterials.get(child);
                        if (Array.isArray(originalMaterial)) {
                            child.material = originalMaterial.map(m => m.clone());
                        } else {
                            child.material = originalMaterial.clone();
                        }
                    }
                }
            }
        });
    }
    
    // 专门重置拉手颜色的方法
    resetHandleColor() {
        this.object3D.traverse((child) => {
            if (child.isMesh) {
                if (this.isHandleMesh(child)) {
                    if (this.originalMaterials.has(child)) {
                        const originalMaterial = this.originalMaterials.get(child);
                        if (Array.isArray(originalMaterial)) {
                            child.material = originalMaterial.map(m => m.clone());
                        } else {
                            child.material = originalMaterial.clone();
                        }
                    }
                }
            }
        });
    }
}
