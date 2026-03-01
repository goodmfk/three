import returnToOrigin from './returnToOrigin.js';
import strictCollision from './strictCollision.js';

export const collisionStrategies = {
    returnToOrigin,
    strictCollision
};

export function getCollisionStrategy(strategyName) {
    return collisionStrategies[strategyName] || collisionStrategies.returnToOrigin;
}

export default collisionStrategies;
