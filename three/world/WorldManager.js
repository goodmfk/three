import * as THREE from "three";

export default class WorldManager {
    constructor(options = {}) {
        this.groundY = options.groundY || 0;
        this.unit = options.unit || "m";

        this.bounds = Object.assign({
            enabled: options.bounds?.enabled ?? true,
            shape: options.bounds?.shape ?? 'square',
            minX: options.bounds?.minX ?? -10,
            maxX: options.bounds?.maxX ?? 10,
            minZ: options.bounds?.minZ ?? -10,
            maxZ: options.bounds?.maxZ ?? 10,
            margin: options.bounds?.margin ?? 0.1
        }, options.bounds);

        this.spawnStrategy = Object.assign({
            gap: options.spawnStrategy?.gap ?? 0.5,
            autoCenter: options.spawnStrategy?.autoCenter ?? false,
            autoFitCamera: options.spawnStrategy?.autoFitCamera ?? false
        }, options.spawnStrategy);

        this.layoutRoot = null;

        this.boundaryHelper = null;
        this.scene = null;

        this._tmp = {
            box: new THREE.Box3(),
            center: new THREE.Vector3(),
            size: new THREE.Vector3(),
            position: new THREE.Vector3()
        };
    }

    setScene(scene) {
        this.scene = scene;
    }

    showBoundary() {
        if (!this.scene || this.boundaryHelper) return;

        const { minX, maxX, minZ, maxZ, shape } = this.bounds;

        let geometry;
        let position;

        if (shape === 'circle') {
            const radius = Math.min((maxX - minX) / 2, (maxZ - minZ) / 2);
            geometry = new THREE.CircleGeometry(radius, 32);
            geometry.rotateX(Math.PI / 2);
            position = new THREE.Vector3(0, this.groundY, 0);
        } else {
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

        this.boundaryHelper.userData = {
            isBoundary: true,
            pickRoot: false
        };

        this.scene.add(this.boundaryHelper);
    }

    hideBoundary() {
        if (this.boundaryHelper) {
            this.scene.remove(this.boundaryHelper);
            this.boundaryHelper.geometry.dispose();
            this.boundaryHelper.material.dispose();
            this.boundaryHelper = null;
        }
    }

    updateBoundary() {
        if (!this.boundaryHelper) return;

        const { minX, maxX, minZ, maxZ, shape } = this.bounds;

        let geometry;
        let position;

        if (shape === 'circle') {
            const radius = Math.min((maxX - minX) / 2, (maxZ - minZ) / 2);
            geometry = new THREE.CircleGeometry(radius, 32);
            geometry.rotateX(Math.PI / 2);
            position = new THREE.Vector3(0, this.groundY, 0);
        } else {
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

    setLayoutRoot(root) {
        this.layoutRoot = root;
    }

    getGroundY() {
        return this.groundY;
    }

    isInBounds(position) {
        if (!this.bounds.enabled) return true;

        const margin = this.bounds.margin;
        
        if (this.bounds.shape === 'circle') {
            const { minX, maxX, minZ, maxZ } = this.bounds;
            const radius = Math.min((maxX - minX) / 2, (maxZ - minZ) / 2) - margin;
            
            const distance = Math.sqrt(position.x * position.x + position.z * position.z);
            
            return distance <= radius;
        } else {
            return position.x >= this.bounds.minX + margin &&
                position.x <= this.bounds.maxX - margin &&
                position.z >= this.bounds.minZ + margin &&
                position.z <= this.bounds.maxZ - margin;
        }
    }

    clampPosition(position) {
        if (!this.bounds.enabled) return position;

        const margin = this.bounds.margin;
        
        if (this.bounds.shape === 'circle') {
            const { minX, maxX, minZ, maxZ } = this.bounds;
            const radius = Math.min((maxX - minX) / 2, (maxZ - minZ) / 2) - margin;
            
            const distance = Math.sqrt(position.x * position.x + position.z * position.z);
            
            if (distance <= radius) {
                return position;
            }
            
            const scale = radius / distance;
            return new THREE.Vector3(
                position.x * scale,
                position.y,
                position.z * scale
            );
        } else {
            return new THREE.Vector3(
                Math.max(this.bounds.minX + margin, Math.min(this.bounds.maxX - margin, position.x)),
                position.y,
                Math.max(this.bounds.minZ + margin, Math.min(this.bounds.maxZ - margin, position.z))
            );
        }
    }

    calculateSpawnPosition(model) {
        if (!this.layoutRoot) return new THREE.Vector3(0, this.groundY, 0);
        
        this.layoutRoot.updateMatrixWorld(true);
        
        let totalWidth = 0;
        this.layoutRoot.children.forEach(child => {
            if (child.userData && child.userData.pickRoot) {
                child.updateMatrixWorld(true);
                
                const childBox = new THREE.Box3().setFromObject(child);
                const childSize = new THREE.Vector3();
                childBox.getSize(childSize);
                totalWidth += childSize.x;
            }
        });
        
        const spawnX = totalWidth > 0 ? totalWidth : 0;
        
        return new THREE.Vector3(spawnX, this.groundY, 0);
    }

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

    calculateWorldCenter() {
        const box = this.calculateWorldBounds();
        if (!box) return new THREE.Vector3(0, this.groundY, 0);

        const center = this._tmp.center;
        box.getCenter(center);
        center.y = this.groundY;

        return center;
    }

    getOptions() {
        return {
            groundY: this.groundY,
            unit: this.unit,
            bounds: this.bounds,
            spawnStrategy: this.spawnStrategy
        };
    }
}
