import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class ModelManager {
    constructor() {
        this.loaders = {
            gltf: new GLTFLoader()
        };
        this.cache = new Map();
        this.loadingPromises = new Map();
    }
    
    loadModel(url) {
        if (this.cache.has(url)) {
            return Promise.resolve(this.cache.get(url));
        }
        
        if (this.loadingPromises.has(url)) {
            return this.loadingPromises.get(url);
        }
        
        const promise = new Promise((resolve, reject) => {
            this.loaders.gltf.load(
                url,
                (gltf) => {
                    this.cache.set(url, gltf);
                    this.loadingPromises.delete(url);
                    resolve(gltf);
                },
                undefined,
                (error) => {
                    this.loadingPromises.delete(url);
                    reject(error);
                }
            );
        });
        
        this.loadingPromises.set(url, promise);
        
        return promise;
    }
    
    getModel(url) {
        return this.cache.get(url);
    }
    
    hasModel(url) {
        return this.cache.has(url);
    }
    
    removeModel(url) {
        if (this.cache.has(url)) {
            this.cache.delete(url);
        }
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    getCacheSize() {
        return this.cache.size;
    }
}