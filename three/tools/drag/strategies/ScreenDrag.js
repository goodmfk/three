import * as THREE from "three";

export default class ScreenDrag {
    constructor(camera, options = {}) {
        this.camera = camera;
        this.options = Object.assign(
            {
                snap: {
                    enabled: true,
                    distance: 0.3, // 吸附距离，与 aaa2.html 一致
                    minOverlapY: 0.02
                }
            },
            options
        );

        // 四个水平面法线（不处理顶/底面，避免吸到上下）
        this.FACES = [
            new THREE.Vector3(1, 0, 0),   // 右
            new THREE.Vector3(-1, 0, 0),  // 左
            new THREE.Vector3(0, 0, 1),   // 前
            new THREE.Vector3(0, 0, -1)   // 后
        ];

        // 临时变量
        this._tmp = {
            plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), // 固定地面平面
            rayHit: new THREE.Vector3(),
            startObjectWorld: new THREE.Vector3()
        };
    }

    start(dragSession, ray, hitPoint) {
        const object = dragSession.object;
        if (!object) return false;

        // 保存物体初始位置
        object.getWorldPosition(this._tmp.startObjectWorld);

        // 计算射线与地面平面的交点
        if (!ray.intersectPlane(this._tmp.plane, this._tmp.rayHit)) {
            return false;
        }

        // 计算偏移量：物体位置 - 射线交点
        dragSession.grabOffset = this._tmp.startObjectWorld.clone().sub(this._tmp.rayHit);

        return true;
    }

    update(dragSession, ray) {
        const object = dragSession.object;
        if (!object) return null;

        // 计算当前射线与地面平面的交点
        if (!ray.intersectPlane(this._tmp.plane, this._tmp.rayHit)) {
            return null;
        }

        // 计算新位置：射线交点 + 偏移量
        const newWorldPos = this._tmp.rayHit.clone().add(dragSession.grabOffset);

        // 保持物体在地面上
        newWorldPos.y = this._tmp.startObjectWorld.y;

        // 应用吸附
        if (this.options.snap && this.options.snap.enabled) {
            this._applySnap(object, dragSession, newWorldPos);
        }

        // 转换为局部坐标
        if (object.parent) {
            return object.parent.worldToLocal(newWorldPos);
        }

        return newWorldPos;
    }

    end(dragSession) {
        // 结束拖拽，清理状态
        if (this.options.layoutManager && this.options.layoutManager.layoutCenter) {
            this.options.layoutManager.layoutCenter();
        }
        
        // 调整相机位置，使所有模型看起来居中
        this._fitCameraToObjects();
    }

    // 调整相机位置，使所有模型看起来居中
    _fitCameraToObjects() {
        const lm = this.options.layoutManager;
        if (!lm || !lm.getRoot) return;
        
        const root = lm.getRoot();
        if (!root || root.children.length === 0) return;
        
        // 计算所有对象的包围盒
        const box = new THREE.Box3();
        root.children.forEach(child => box.expandByObject(child));
        
        if (box.isEmpty()) return;
        
        // 计算包围盒的中心点和尺寸
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        
        // 计算合适的相机距离
        const maxSize = Math.max(size.x, size.y, size.z);
        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        let distance = maxSize / (2 * Math.tan(fov / 2));
        distance *= 1.25; // 留白
        
        // 获取相机的目标点（如果有）
        let controlsTarget = new THREE.Vector3(0, 0, 0);
        if (this.camera.userData.controls && this.camera.userData.controls.target) {
            controlsTarget.copy(this.camera.userData.controls.target);
        }
        
        // 计算相机方向
        const dir = new THREE.Vector3()
            .subVectors(this.camera.position, controlsTarget)
            .normalize();
        
        // 设置相机位置
        this.camera.position.copy(center).add(dir.multiplyScalar(distance));
        
        // 更新相机的近远裁剪面
        this.camera.near = distance / 100;
        this.camera.far = distance * 100;
        this.camera.updateProjectionMatrix();
        
        // 更新相机目标点
        if (this.camera.userData.controls && this.camera.userData.controls.target) {
            this.camera.userData.controls.target.copy(center);
            this.camera.userData.controls.update();
        }
    }

    // 计算某个物体某个面（世界空间）
    _getFace(object, localNormal) {
        // 确保物体有必要的用户数据
        if (!object.userData.halfX) {
            // 计算物体的包围盒
            const box = new THREE.Box3().setFromObject(object);
            const size = new THREE.Vector3();
            box.getSize(size);
            object.userData.halfX = size.x / 2;
            object.userData.halfZ = size.z / 2;
        }

        // 把局部法线变成世界法线（乘物体旋转）
        const normal = localNormal.clone().applyQuaternion(object.quaternion);

        // extent：这个方向上要走多少才到"面中心"
        let extent = 0.5;
        if (Math.abs(localNormal.x) === 1) extent = object.userData.halfX || 0.5;
        if (Math.abs(localNormal.z) === 1) extent = object.userData.halfZ || 0.5;

        // 面中心 = 物体中心 + normal * extent
        const center = object.position.clone().add(normal.clone().multiplyScalar(extent));

        return { normal, center };
    }

    // 应用吸附功能
    _applySnap(object, dragSession, worldPos) {
        const lm = this.options.layoutManager;
        if (!lm || !lm.getRoot) return;

        const root = lm.getRoot();
        if (!root) return;

        const others = root.children;
        if (!others || others.length < 2) return;

        const snapDistance = this.options.snap.distance || 0.5; // 增加吸附距离
        const minOverlapY = this.options.snap.minOverlapY || 0.02;

        // 获取物体的世界位置和尺寸
        object.updateMatrixWorld(true);
        const boxA = new THREE.Box3().setFromObject(object);
        const objectSize = new THREE.Vector3();
        boxA.getSize(objectSize);

        let bestTarget = null;
        let bestSnapPos = null;
        let minDistance = Infinity;

        // 遍历其他物体，寻找可吸附的目标
        for (const target of others) {
            if (target === object) continue;

            // 获取目标物体的包围盒
            target.updateMatrixWorld(true);
            const boxB = new THREE.Box3().setFromObject(target);

            // 检查Y轴重叠
            const overlapY = Math.min(boxA.max.y, boxB.max.y) - Math.max(boxA.min.y, boxB.min.y);
            if (overlapY <= minOverlapY) continue;

            // 计算各个方向的潜在吸附位置
            const potentialSnapPositions = [
                // 吸附到目标的右侧
                new THREE.Vector3(
                    boxB.max.x + objectSize.x / 2,
                    worldPos.y,
                    (boxB.min.z + boxB.max.z) / 2
                ),
                // 吸附到目标的左侧
                new THREE.Vector3(
                    boxB.min.x - objectSize.x / 2,
                    worldPos.y,
                    (boxB.min.z + boxB.max.z) / 2
                ),
                // 吸附到目标的前方
                new THREE.Vector3(
                    (boxB.min.x + boxB.max.x) / 2,
                    worldPos.y,
                    boxB.max.z + objectSize.z / 2
                ),
                // 吸附到目标的后方
                new THREE.Vector3(
                    (boxB.min.x + boxB.max.x) / 2,
                    worldPos.y,
                    boxB.min.z - objectSize.z / 2
                )
            ];

            // 检查每个潜在吸附位置
            for (const snapPos of potentialSnapPositions) {
                // 计算当前位置到吸附位置的距离
                const distance = worldPos.distanceTo(snapPos);
                if (distance > snapDistance) continue;

                // 寻找最小距离
                if (distance < minDistance) {
                    // 检查吸附后是否与其他物体碰撞
                    let collision = false;
                    
                    // 临时设置物体位置用于碰撞检测
                    const savedPos = object.position.clone();
                    const tempPos = object.parent ? object.parent.worldToLocal(snapPos.clone()) : snapPos;
                    object.position.copy(tempPos);
                    object.updateMatrixWorld(true);
                    
                    const testBox = new THREE.Box3().setFromObject(object);
                    for (const other of others) {
                        if (other === object || other === target) continue;
                        other.updateMatrixWorld(true);
                        const otherBox = new THREE.Box3().setFromObject(other);
                        if (testBox.intersectsBox(otherBox)) {
                            collision = true;
                            break;
                        }
                    }
                    
                    // 恢复物体位置
                    object.position.copy(savedPos);
                    object.updateMatrixWorld(true);
                    
                    // 如果没有碰撞，记录这个吸附位置
                    if (!collision) {
                        minDistance = distance;
                        bestTarget = target;
                        bestSnapPos = snapPos;
                    }
                }
            }
        }

        // 应用吸附
        if (bestTarget && bestSnapPos) {
            worldPos.copy(bestSnapPos);
            
            // 对齐旋转
            object.rotation.y = bestTarget.rotation.y;
        }
    }
}