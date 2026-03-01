export default {
    handleCollision(dragTool, object, collisionInfo) {
        const attemptedPosition = object.position.clone();
        
        object.position.copy(dragTool.dragSession.initialPosition);
        
        if (dragTool.hooks.onCollision) {
            dragTool.hooks.onCollision(dragTool, object, {
                attemptedPosition: attemptedPosition,
                restoredPosition: object.position.clone(),
                collidingObjects: collisionInfo.collidingObjects,
                strategy: 'strictCollision',
                isStrict: true
            });
        }
        
        return object.position.clone();
    },
    
    isRealTime() {
        return true;
    }
};
