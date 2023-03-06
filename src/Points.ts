import * as THREE from 'three';

export class Points extends THREE.Object3D {
    scene: THREE.Scene;
    max_pts: number;
    pointRatio: number;
    messageRatio: number;
    messageCount: number;
    material: THREE.PointsMaterial;

    renderer: THREE.WebGLRenderer;
    camera: THREE.Camera;

    setupReady: boolean;
    fields: any
    colorsrc: string;
    colormap: any
    getColor: any

    geom!: THREE.BufferGeometry;
    positions!: THREE.BufferAttribute
    colors!: THREE.BufferAttribute
    object!: THREE.Points
    
    constructor(options:
        {
            scene: THREE.Scene,
            max_pts: number,
            pointRatio?: number,
            messageRatio?: number,
            material: THREE.PointsMaterial,
            colorsrc: string,

            renderer: THREE.WebGLRenderer,
            camera: THREE.Camera
        }) {
        super();
        this.scene = options.scene;
        this.max_pts = options.max_pts;
        this.pointRatio = options.pointRatio || 1;
        this.messageRatio = options.messageRatio || 1;
        this.material = options.material;
        this.colorsrc = options.colorsrc;
        // this.colormap = options.colormap;
        // // renderer
        this.renderer = options.renderer;
        this.camera = options.camera;
        this.setupReady = false;

        this.messageCount = 0;
    }

    setup(frame: string, point_step: number, fields: any) {

        if (this.setupReady === false) {
            console.log('SETUP')

            // turn fields to a map
            fields = fields || [];
            this.fields = new Array<string>();

            for (var i = 0; i < fields.length; i++) {
                this.fields[fields[i].name] = fields[i];
            }

            console.log('Fields: ' + this.fields)
            console.log('Fields: ' + fields)
            console.log(this.colorsrc)

            console.log('max pts: ' + this.max_pts)
            this.geom = new THREE.BufferGeometry();

            this.positions = new THREE.BufferAttribute(new Float32Array(this.max_pts * 3), 3, false);
            this.geom.setAttribute('position', this.positions);
            console.log('length: ' + this.positions.array.length)
            if (!this.colorsrc && this.fields.rgb) {
                this.colorsrc = 'rgb';
            }
            
            if (this.colorsrc) {
                var field = this.fields[this.colorsrc];
                if (field) {
                    this.colors = new THREE.BufferAttribute(new Float32Array(this.max_pts * 3), 3, false);
                    this.geom.setAttribute('color', this.colors);
                    var offset = field.offset;
                    this.getColor = [
                        function (dv:any , base: any, le: any) { return dv.getInt8(base + offset, le); },
                        function (dv:any , base: any, le: any) { return dv.getUint8(base + offset, le); },
                        function (dv:any , base: any, le: any) { return dv.getInt16(base + offset, le); },
                        function (dv:any , base: any, le: any) { return dv.getUint16(base + offset, le); },
                        function (dv:any , base: any, le: any) { return dv.getInt32(base + offset, le); },
                        function (dv:any , base: any, le: any) { return dv.getUint32(base + offset, le); },
                        function (dv:any , base: any, le: any) { return dv.getFloat32(base + offset, le); },
                        function (dv:any , base: any, le: any) { return dv.getFloat64(base + offset, le); }
                    ][field.datatype - 1];
                    this.colormap = this.colormap || function(x:any ){return new THREE.Color(x);};
                } else {
                    console.warn('unavailable field "' + this.colorsrc + '" for coloring.');
                }
            }

            this.object = new THREE.Points(this.geom, this.material);

            this.object.rotation.set(0, 0, 0)

            this.scene.add(this.object)
            this.setupReady = true;

        }
        return (this.messageCount++ % this.messageRatio) === 0;
    }

    update(n: number) {
        this.geom.setDrawRange(0, n);

        this.positions.needsUpdate = true;
        this.positions.updateRange.count = n * this.positions.itemSize;

        if(this.colors)
        {
            this.colors.needsUpdate = true;
            this.colors.updateRange.count = n * this.colors.itemSize;
        }
        
        this.renderer.render(this.scene, this.camera)

    }
}