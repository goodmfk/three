export default function isViewChanged({
    camera,
    controls,
    start,
    threshold
}) {
    const cameraMoved =
        camera.position.distanceTo(start.cameraPos);

    const targetMoved =
        controls.target.distanceTo(start.target);

    const dot =
        camera.quaternion.dot(start.cameraQuat);

    const qDelta =
        2 * Math.acos(Math.min(1, Math.abs(dot)));

    return (
        cameraMoved > threshold.move ||
        targetMoved > threshold.target ||
        qDelta > threshold.rotate
    );
}
