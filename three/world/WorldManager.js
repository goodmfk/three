import * as THREE from "three";

export default class WorldManager {
    constructor(options = {}) {
        // 世界定义
        this.groundY = options.groundY || 0;
        this.unit = options.unit || "m"; // 默认使用米作为单位

        // 世界边界
        this.bounds = Object.assign({
            enabled: options.bounds?.enabled ?? true,
            shape: options.bounds?.shape ?? 'square', // 'square' 或 'circle'
            minX: options.bounds?.minX ?? -10,
            maxX: options.bounds?.maxX ?? 10,
            minZ: options.bounds?.minZ ?? -10,
            maxZ: options.bounds?.maxZ ?? 10,
            margin: options.bounds?.margin ?? 0.1
        }, options.bounds);

        // 添加模型策略
        this.spawnStrategy = Object.assign({
            gap: options.spawnStrategy?.gap ?? 0.5, // 模型间距
            autoCenter: options.spawnStrategy?.autoCenter ?? false, // 自动居中
            autoFitCamera: options.spawnStrategy?.autoFitCamera ?? false // 自动调整相机
        }, options.spawnStrategy);

        // 布局根节点
        this.layoutRoot = null;

        // 边界可视化
        this.boundaryHelper = null;
        this.scene = null;

        // 临时变量
        this._tmp = {
            box: new THREE.Box3(),
            center: new THREE.Vector3(),
            size: new THREE.Vector3(),
            position: new THREE.Vector3()
        };
    }

    // 设置场景
    setScene(scene) {
        this.scene = scene;
    }

    // 显示边界
    showBoundary() {
        if (!this.scene || this.boundaryHelper) return;

        const { minX, maxX, minZ, maxZ, shape } = this.bounds;

        let geometry;
        let position;

        if (shape === 'circle') {
            // 创建圆形边界线框
            const radius = Math.min((maxX - minX) / 2, (maxZ - minZ) / 2);
            geometry = new THREE.CircleGeometry(radius, 32);
            // 旋转圆形几何，使其在XZ平面上
            geometry.rotateX(Math.PI / 2);
            position = new THREE.Vector3(0, this.groundY, 0);
        } else {
            // 创建方形边界线框
            geometry = new THREE.BoxGeometry(
                maxX - minX,
                0.1,
                maxZ - minZ
            );
            position = new THREE.Vector3(
                (minX + maxX) / 2,
                this.groundY,
                (minZ + maxZ) / 2
            );
        }

        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            linewidth: 2
        });

        this.boundaryHelper = new THREE.LineSegments(edges, material);
        this.boundaryHelper.position.copy(position);

        // 设置属性，避免被选中和拖动
        this.boundaryHelper.userData = {
            isBoundary: true,
            pickRoot: false
        };

        this.scene.add(this.boundaryHelper);
    }

    // 隐藏边界
    hideBoundary() {
        if (this.boundaryHelper) {
            this.scene.remove(this.boundaryHelper);
            this.boundaryHelper.geometry.dispose();
            this.boundaryHelper.material.dispose();
            this.boundaryHelper = null;
        }
    }

    // 更新边界可视化
    updateBoundary() {
        if (!this.boundaryHelper) return;

        const { minX, maxX, minZ, maxZ, shape } = this.bounds;

        let geometry;
        let position;

        if (shape === 'circle') {
            // 创建圆形边界线框
            const radius = Math.min((maxX - minX) / 2, (maxZ - minZ) / 2);
            geometry = new THREE.CircleGeometry(radius, 32);
            // 旋转圆形几何，使其在XZ平面上
            geometry.rotateX(Math.PI / 2);
            position = new THREE.Vector3(0, this.groundY, 0);
        } else {
            // 创建方形边界线框
            geometry = new THREE.BoxGeometry(
                maxX - minX,
                0.1,
                maxZ - minZ
            );
            position = new THREE.Vector3(
                (minX + maxX) / 2,
                this.groundY,
                (minZ + maxZ) / 2
            );
        }

        this.boundaryHelper.geometry.dispose();
        const edges = new THREE.EdgesGeometry(geometry);
        this.boundaryHelper.geometry = edges;
        this.boundaryHelper.position.copy(position);
    }

    // 设置布局根节点
    setLayoutRoot(root) {
        this.layoutRoot = root;
    }

    // 获取地面Y坐标
    getGroundY() {
        return this.groundY;
    }

    // 检查位置是否在世界边界内
    isInBounds(position) {
        if (!this.bounds.enabled) return true;

        const margin = this.bounds.margin;
        
        if (this.bounds.shape === 'circle') {
            // 圆形边界逻辑
            const { minX, maxX, minZ, maxZ } = this.bounds;
            const radius = Math.min((maxX - minX) / 2, (maxZ - minZ) / 2) - margin;
            
            // 计算位置到原点的距离
            const distance = Math.sqrt(position.x * position.x + position.z * position.z);
            
            return distance <= radius;
        } else {
            // 方形边界逻辑
            return position.x >= this.bounds.minX + margin &&
                position.x <= this.bounds.maxX - margin &&
                position.z >= this.bounds.minZ + margin &&
                position.z <= this.bounds.maxZ - margin;
        }
    }

    // 限制位置在世界边界内
    clampPosition(position) {
        if (!this.bounds.enabled) return position;

        const margin = this.bounds.margin;
        
        if (this.bounds.shape === 'circle') {
            // 圆形边界逻辑
            const { minX, maxX, minZ, maxZ } = this.bounds;
            const radius = Math.min((maxX - minX) / 2, (maxZ - minZ) / 2) - margin;
            
            // 计算位置到原点的距离
            const distance = Math.sqrt(position.x * position.x + position.z * position.z);
            
            // 如果距离小于等于半径，直接返回原始位置
            if (distance <= radius) {
                return position;
            }
            
            // 否则，将位置限制在圆形边界上
            const scale = radius / distance;
            return new THREE.Vector3(
                position.x * scale,
                position.y,
                position.z * scale
            );
        } else {
            // 方形边界逻辑
            return new THREE.Vector3(
                Math.max(this.bounds.minX + margin, Math.min(this.bounds.maxX - margin, position.x)),
                position.y,
                Math.max(this.bounds.minZ + margin, Math.min(this.bounds.maxZ - margin, position.z))
            );
        }
    }

    // 计算新模型的初始位置
    calculateSpawnPosition(model) {
        if (!this.layoutRoot) return new THREE.Vector3(0, this.groundY, 0);
        
        // 强制更新 layoutRoot 的矩阵
        this.layoutRoot.updateMatrixWorld(true);
        
        // 计算所有现有模型的总宽度
        let totalWidth = 0;
        this.layoutRoot.children.forEach(child => {
            if (child.userData && child.userData.pickRoot) {
                // 强制更新模型的矩阵
                child.updateMatrixWorld(true);
                
                // 计算每个模型的宽度
                const childBox = new THREE.Box3().setFromObject(child);
                const childSize = new THREE.Vector3();
                childBox.getSize(childSize);
                totalWidth += childSize.x;
            }
        });
        
        // 计算新模型的位置：沿X轴排列，与前一个模型贴合
        const spawnX = totalWidth > 0 ? totalWidth : 0;
        
        return new THREE.Vector3(spawnX, this.groundY, 0);
    }

    // 计算所有模型的边界盒
    calculateWorldBounds() {
        if (!this.layoutRoot) return null;

        const box = this._tmp.box;
        box.makeEmpty();

        this.layoutRoot.children.forEach(child => {
            if (child.userData && child.userData.pickRoot) {
                box.expandByObject(child);
            }
        });

        if (box.isEmpty()) return null;

        return box;
    }

    // 计算世界中心
    calculateWorldCenter() {
        const box = this.calculateWorldBounds();
        if (!box) return new THREE.Vector3(0, this.groundY, 0);

        const center = this._tmp.center;
        box.getCenter(center);
        center.y = this.groundY;

        return center;
    }

    // 获取配置选项
    getOptions() {
        return {
            groundY: this.groundY,
            unit: this.unit,
            bounds: this.bounds,
            spawnStrategy: this.spawnStrategy
        };
    }
}