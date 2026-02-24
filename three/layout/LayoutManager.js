import * as THREE from "three";

export default class LayoutManager {
    constructor(scene, worldManager = null) {
        this.scene = scene;
        this.worldManager = worldManager;

        this.layoutRoot = new THREE.Group();
        this.layoutRoot.name = "LayoutRoot";
        this.scene.add(this.layoutRoot);

        // 如果提供了WorldManager，设置布局根节点
        if (this.worldManager) {
            this.worldManager.setLayoutRoot(this.layoutRoot);
        }

        this._tmp = {
            boundingBox: new THREE.Box3(),
            center: new THREE.Vector3(),
            delta: new THREE.Vector3(),
            position: new THREE.Vector3()
        };
    }

    layoutCenter() {
        if (this.layoutRoot.children.length === 0) {
            return;
        }

        // 过滤出带有pickRoot标志的子物体
        const pickRootChildren = this.layoutRoot.children.filter(child => 
            child.userData && child.userData.pickRoot
        );

        if (pickRootChildren.length === 0) {
            return;
        }

        // 当只有一个物体时，直接移动物体到中心
        if (pickRootChildren.length === 1) {
            const object = pickRootChildren[0];
            
            // 计算物体在世界坐标系中的当前位置
            const worldPosition = object.getWorldPosition(new THREE.Vector3());
            
            // 目标世界位置：原点，保持Y坐标不变
            const targetWorldPosition = new THREE.Vector3(0, worldPosition.y, 0);
            
            // 转换为相对于layoutRoot的局部位置
            const targetLocalPosition = this.layoutRoot.worldToLocal(targetWorldPosition);
            
            // 设置物体的局部位置
            object.position.copy(targetLocalPosition);
            this.layoutRoot.updateMatrixWorld(true);
        } 
        // 当有多个物体时，移动整个layoutRoot使它们的中心回到原点
        else {
            // 使用WorldManager计算世界中心
            if (this.worldManager) {
                const center = this.worldManager.calculateWorldCenter();
                
                const delta = this._tmp.delta;
                delta.set(-center.x, 0, -center.z);

                this.layoutRoot.position.add(delta);
                this.layoutRoot.updateMatrixWorld(true);
            } else {
                // 传统方法作为后备
                const boundingBox = this._tmp.boundingBox;
                boundingBox.makeEmpty();

                pickRootChildren.forEach(child => {
                    boundingBox.expandByObject(child);
                });

                if (boundingBox.isEmpty()) {
                    return;
                }

                const center = this._tmp.center;
                boundingBox.getCenter(center);

                const delta = this._tmp.delta;
                delta.set(-center.x, 0, -center.z);

                this.layoutRoot.position.add(delta);
                this.layoutRoot.updateMatrixWorld(true);
            }
        }
    }

    layoutScale() {
    }

    layoutClamp() {
        if (!this.worldManager || !this.worldManager.bounds.enabled) {
            return;
        }

        // 限制所有物体在世界边界内
        this.layoutRoot.children.forEach(child => {
            if (child.userData && child.userData.pickRoot) {
                const position = this._tmp.position;
                child.getWorldPosition(position);
                
                const clampedPosition = this.worldManager.clampPosition(position);
                child.position.copy(this.layoutRoot.worldToLocal(clampedPosition));
            }
        });
        
        this.layoutRoot.updateMatrixWorld(true);
    }

    add(object) {
        this.layoutRoot.add(object);
    }

    remove(object) {
        this.layoutRoot.remove(object);
    }

    getRoot() {
        return this.layoutRoot;
    }

    clear() {
        while (this.layoutRoot.children.length > 0) {
            this.layoutRoot.remove(this.layoutRoot.children[0]);
        }
    }

    // 设置WorldManager
    setWorldManager(worldManager) {
        this.worldManager = worldManager;
        if (worldManager) {
            worldManager.setLayoutRoot(this.layoutRoot);
        }
    }

    // 获取WorldManager
    getWorldManager() {
        return this.worldManager;
    }
}
