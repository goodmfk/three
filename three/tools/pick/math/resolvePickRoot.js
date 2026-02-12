export default function resolvePickRoot(object, scene) {
    let current = object;
    let topLevel = null;

    while (current) {
        if (current.userData && current.userData.pickRoot) {
            return current;
        }

        if (current.parent === scene) {
            topLevel = current;
        }

        current = current.parent;
    }
    return topLevel || object;
}
