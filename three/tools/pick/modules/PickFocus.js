import FocusSession from './FocusSession.js';

export default class PickFocus {

    #session = null;
    
    constructor(viewer, options = {}) {
        this.viewer = viewer;

        this.options = Object.assign(
            {
                distance: null,
                duration: 0.35
            },
            options
        );
    }

    select(object) {
        if (this.options.distance == null) return;

        if (this.#session && this.#session.active) {
            return;
        }

        this.#session = new FocusSession(this.viewer, {
            distance: this.options.distance,
            duration: this.options.duration
        });

        this.#session.start(object);
    }

    clear() {
        if (this.#session && this.#session.originDistance !== null) {
            this.#session.restore();
        }
    }

    run(delta) {
        if (this.#session) {
            this.#session.run(delta);
        }
    }
}
