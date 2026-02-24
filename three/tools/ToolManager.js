import * as THREE from "three";

export class ToolManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.tools = {};
        this.activeTools = new Set();

        this.initPrivateArgs();

        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
    }

    initPrivateArgs() {
        this._selectedObject = null;
        this._isDragging = false;
        this._pointerDown = false;
        this._dragStartPos = new THREE.Vector2();
        this._lastMousePos = new THREE.Vector2();
        this._raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();
    }

    init() {
        if (!this.viewer.renderer) return;
        
        const el = this.viewer.renderer.domElement;
        el.addEventListener('pointerdown', this.handlePointerDown);
        el.addEventListener('pointermove', this.handlePointerMove);
        el.addEventListener('pointerup', this.handlePointerUp);
        el.addEventListener('pointerleave', this.handlePointerUp);
        el.addEventListener('pointercancel', this.handlePointerUp);
        
        window.addEventListener('blur', () => {
            this.forceEndDrag();
        });
    }

    register(name, tool) {
        this.tools[name] = tool;
    }

    enable(name) {
        const tool = this.tools[name];
        if (!tool) return;

        if (tool.enable) {
            tool.enable();
        }

        this.activeTools.add(tool);
    }

    disable(name) {
        const tool = this.tools[name];
        if (!tool) return;

        if (tool.disable) {
            tool.disable();
        }

        this.activeTools.delete(tool);
    }

    getTool(name) {
        return this.tools[name];
    }

    setSelectedObject(object) {
        this._selectedObject = object;
    }

    getSelectedObject() {
        return this._selectedObject;
    }

    handlePointerDown(e) {
        if (e.button !== 0) return;
        
        const el = this.viewer.renderer.domElement;
        el.setPointerCapture(e.pointerId);
        
        const rect = el.getBoundingClientRect();
        this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this._dragStartPos.set(this._mouse.x, this._mouse.y);
        this._lastMousePos.set(this._mouse.x, this._mouse.y);

        const hitObject = this.pickObjectAt(e);
        if (hitObject) {
            this._pointerDown = true;
            if (hitObject !== this.getSelectedObject()) {
                this.setSelectedObject(hitObject);
            }
            if (this.viewer.controls) {
                this.viewer.controls.enabled = false;
            }
        } else {
            this._pointerDown = false;
        }
    }

    handlePointerMove(e) {
        const rect = this.viewer.renderer.domElement.getBoundingClientRect();
        this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const mouseDelta = Math.sqrt(
            Math.pow(this._mouse.x - this._lastMousePos.x, 2) +
            Math.pow(this._mouse.y - this._lastMousePos.y, 2)
        );

        if (mouseDelta > 0.01) {
            const hoverObject = this.pickObjectAt(e);
            if (hoverObject) {
                this.viewer.renderer.domElement.classList.add('object-hover');
            } else {
                this.viewer.renderer.domElement.classList.remove('object-hover');
            }
        }

        if (!this._pointerDown) return;
        
        if (this._selectedObject && this.tools.drag) {
            if (!this._isDragging) {
                if (mouseDelta > 0.01) {
                    this._isDragging = true;
                    this.tools.drag.startDrag(this._selectedObject, this._mouse);
                }
            } else {
                this.tools.drag.updateDrag(this._mouse, this.viewer.camera);
            }
        }

        this._lastMousePos.set(this._mouse.x, this._mouse.y);
    }

    handlePointerUp(e) {
        const el = this.viewer.renderer.domElement;
        if (e) {
            el.releasePointerCapture(e.pointerId);
        }
        
        this._pointerDown = false;
        
        if (this._isDragging) {
            this._isDragging = false;
            if (this.tools.drag) {
                this.tools.drag.endDrag();
            }
        }
    }

    pickObjectAt(e) {
        const rect = this.viewer.renderer.domElement.getBoundingClientRect();
        this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this._raycaster.setFromCamera(this._mouse, this.viewer.camera);

        const hits = this._raycaster.intersectObjects(
            this.viewer.scene.children,
            true
        );

        if (!hits.length) return null;

        let hitObject = hits[0].object;
        
        // 如果击中的是边界对象，跳过
        if (hitObject.userData && hitObject.userData.isBoundary) {
            return null;
        }
        
        let pickRoot = null;
        
        let current = hitObject;
        while (current) {
            if (current.userData && current.userData.pickRoot) {
                pickRoot = current;
                break;
            }
            if (!current.parent) {
                break;
            }
            current = current.parent;
        }

        if (pickRoot) {
            return pickRoot;
        }

        current = hitObject;
        while (current.parent && current.parent !== this.viewer.scene) {
            current = current.parent;
        }

        return current;
    }
    
    forceEndDrag() {
        if (this._isDragging) {
            this._isDragging = false;
            if (this.tools.drag) {
                this.tools.drag.endDrag();
            }
        }
        
        this._pointerDown = false;
        
        if (this.viewer.controls) {
            this.viewer.controls.enabled = true;
        }
    }
}
