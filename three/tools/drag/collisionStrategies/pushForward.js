/**
 * 碰撞处理策略B：自动往前挪一点
 * 当检测到碰撞时，拖动的模型自动往前挪一点，避免重合
 */

export default {
    /**
     * 处理碰撞
     * @param {DragTool} dragTool - 拖拽工具实例
     * @param {THREE.Object3D} object - 拖拽的模型
     * @param {Object} collisionInfo - 碰撞信息
     * @returns {THREE.Vector3} - 处理后的位置
     */
    handleCollision(dragTool, object, collisionInfo) {
        console.log('执行方案B：自动往前挪一点');
        
        // 保存尝试的位置
        const attemptedPosition = object.position.clone();
        
        // 计算往前挪的位置
        const pushedPosition = this._calculatePushForwardPosition(attemptedPosition, object, dragTool);
        
        // 设置新位置
        object.position.copy(pushedPosition);
        
        console.log('执行后位置:', object.position);
        
        // 触发碰撞事件
        if (dragTool.hooks.onCollision) {
            dragTool.hooks.onCollision(dragTool, object, {
                attemptedPosition: attemptedPosition,
                restoredPosition: object.position.clone(),
                collidingObjects: collisionInfo.collidingObjects,
                strategy: 'pushForward'
            });
        }
        
        return object.position.clone();
    },
    
    /**
     * 计算往前挪的位置
     * @param {THREE.Vector3} attemptedPosition - 尝试的位置
     * @param {THREE.Object3D} object - 拖拽的模型
     * @param {DragTool} dragTool - 拖拽工具实例
     * @returns {THREE.Vector3} - 计算后的位置
     */
    _calculatePushForwardPosition(attemptedPosition, object, dragTool) {
        // 获取拖拽方向
        const dragDirection = new THREE.Vector3();
        dragDirection.subVectors(attemptedPosition, dragTool.dragSession.initialPosition);
        
        // 如果拖拽方向为零向量，使用相机前方作为默认方向
        if (dragDirection.length() === 0) {
            const cameraForward = new THREE.Vector3();
            dragTool.viewer.camera.getWorldDirection(cameraForward);
            dragDirection.copy(cameraForward);
        }
        
        dragDirection.normalize();
        
        // 计算移动距离，根据模型大小调整
        const objectSize = new THREE.Vector3();
        new THREE.Box3().setFromObject(object).getSize(objectSize);
        const moveDistance = Math.max(objectSize.x, objectSize.y, objectSize.z) * 1.1; // 1.1倍模型最大尺寸
        
        // 计算新位置
        const pushedPosition = attemptedPosition.clone();
        pushedPosition.add(dragDirection.multiplyScalar(moveDistance));
        
        console.log('计算的往前挪位置:', pushedPosition);
        
        return pushedPosition;
    }
};
