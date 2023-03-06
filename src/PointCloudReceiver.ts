import * as ROSLIB from 'roslib';
import * as THREE from 'three';
import { Points } from './Points'

// initialize decoder with static lookup table 'e'

class decode64 {
  static S: any = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  static e: any = {}

  static decode(inbytes: any, outbytes: any, record_size: number, pointRatio: number) {
    var x, b = 0, l = 0, j = 0, L = inbytes.length, A = outbytes.length;
    record_size = record_size || A; // default copies everything (no skipping)
    pointRatio = pointRatio || 1; // default copies everything (no skipping)
    var bitskip = (pointRatio - 1) * record_size * 8;
    for (x = 0; x < L && j < A; x++) {
      b = (b << 6) + this.e[inbytes.charAt(x)];
      l += 6;
      if (l >= 8) {
        l -= 8;
        outbytes[j++] = (b >>> l) & 0xff;
        if ((j % record_size) === 0) { // skip records
          // no    optimization: for(var i=0;i<bitskip;x++){l+=6;if(l>=8) {l-=8;i+=8;}}
          // first optimization: for(;l<bitskip;l+=6){x++;} l=l%8;
          x += Math.ceil((bitskip - l) / 6);
          l = l % 8;

          if (l > 0) { b = this.e[inbytes.charAt(x)]; }
        }
      }
    }
    return Math.floor(j / record_size);
  }
}

for (var i = 0; i < 64; i++) { decode64.e[decode64.S.charAt(i)] = i; }

export class PointCloudReceiver {
  ros: ROSLIB.Ros;
  topicName: string;
  points: Points;
  rosTopic: ROSLIB.Topic;
  max_pts: number
  buffer: any
  lastMessages: any
  decayTime: number

  // Save constructor data of `points` to allow reset
  point_options: 
  {
    scene: THREE.Scene
    renderer: THREE.WebGLRenderer
    camera: THREE.Camera
    material: THREE.PointsMaterial
    max_pts: number
    colorsrc: 'rgba'
  }
  constructor(options:
    {
      ros: ROSLIB.Ros
      topicName: string
      scene: THREE.Scene
      compression?: string
      throttle_rate?: number
      renderer: THREE.WebGLRenderer
      camera: THREE.Camera
      material: THREE.PointsMaterial
      decayTime: number
      max_pts: number
    }) {
    this.ros = options.ros,
    this.topicName = options.topicName
    this.max_pts = options.max_pts || 10000;
    this.decayTime = options.decayTime || 1;
    this.lastMessages = [];
    this.buffer = null;

    this.point_options = {
      scene: options.scene,
      renderer: options.renderer,
      camera: options.camera,
      material: options.material,
      max_pts: options.max_pts,
      colorsrc: 'rgba'
    };

    this.points = new Points(this.point_options)

    this.rosTopic = new ROSLIB.Topic({
      ros: this.ros,
      name: this.topicName,
      messageType: "sensor_msgs/msg/PointCloud2",
      compression: options.compression || "raw",
      queue_length: 1,
      throttle_rate: options.throttle_rate || undefined
    })

    this.subscribe();
  }

  unsubscribe() {
    this.rosTopic.unsubscribe(() => this.processMessage);
  }
  subscribe() {
    // this.unsubscribe();
    console.log('PCReceiver: Subscribing to ' + this.topicName)
    this.rosTopic.subscribe(this.processMessage.bind(this));
  }


  resetPoints() {
    this.points.scene.remove(this.points.object)
    this.points.renderer.clear()
    this.points = new Points(this.point_options)
    this.lastMessages = [];
    // this.points.clear();
    //this.points = new Points(this.point_options)
  }
  processMessage(msg: any) {
    // console.log('PCReceiver:  Message received')
    //     console.log('step: ' + msg.point_step)
    if (!this.points.setup(msg.header.frame_id, msg.point_step, msg.fields)) {
      return;
    }
    var n, pointRatio = this.points.pointRatio;
    var bufSz = this.max_pts * msg.point_step;

    // decode message buffer
    if (msg.data.buffer) {
      this.buffer = msg.data.slice(0, Math.min(msg.data.byteLength, bufSz));
      n = Math.min(msg.height * msg.width / pointRatio, this.points.positions.array.length / 3);
    } else {
      if (!this.buffer || this.buffer.byteLength < bufSz) {
        this.buffer = new Uint8Array(bufSz);
      }
      n = decode64.decode(msg.data, this.buffer, msg.point_step, pointRatio);
      pointRatio = 1;
    }

    var dv = new DataView(this.buffer.buffer);
    var littleEndian = !msg.is_bigendian;
    var x = this.points.fields.x.offset;
    var y = this.points.fields.y.offset;
    var z = this.points.fields.z.offset;
    var base, color;

    // allocate buffers to hold point data from the new message
    var newPointCount = n;
    var newPositions = new Array(newPointCount);
    var newColors: any = this.points.colors ? new Array(newPointCount) : undefined;

    // read data points from message and store them in the allocated buffers
    for (var i = 0; i < n; i++) {
      base = i * pointRatio * msg.point_step;
      newPositions[3 * i] = dv.getFloat32(base + x, littleEndian);
      newPositions[3 * i + 1] = dv.getFloat32(base + y, littleEndian);
      newPositions[3 * i + 2] = dv.getFloat32(base + z, littleEndian);

      if (this.points.colors) {
        color = this.points.colormap(this.points.getColor(dv, base, littleEndian));
        newColors[3 * i] = color.r;
        newColors[3 * i + 1] = color.g;
        newColors[3 * i + 2] = color.b;
      }
    }

    // append newly read data to the message history array and discard old data
    this.lastMessages.push({ count: newPointCount, positions: newPositions, colors: newColors });
    if (this.lastMessages.length > this.decayTime) {
      this.lastMessages = this.lastMessages.splice(this.lastMessages.length - this.decayTime);
    }

    // write data points from message history to this.points
    var arraySize = this.points.positions.array.length;
    let addedPointCount = 0;

    // reverse loop -> start with newer data in case we have more points than can be displayed
    for (var i = this.lastMessages.length - 1; i >= 0 && addedPointCount < arraySize; i--) {
      var message = this.lastMessages[i];
      for (var j = 0; j < message.count && addedPointCount < arraySize; j++) {

        (<Float32Array>this.points.positions.array)[addedPointCount * 3 + 0] = message.positions[j * 3 + 0];
        (<Float32Array>this.points.positions.array)[addedPointCount * 3 + 1] = message.positions[j * 3 + 1];
        (<Float32Array>this.points.positions.array)[addedPointCount * 3 + 2] = message.positions[j * 3 + 2];

        if (this.points.colors) {
          (<Float32Array>this.points.colors.array)[addedPointCount * 3 + 0] = message.colors[j * 3 + 0];
          (<Float32Array>this.points.colors.array)[addedPointCount * 3 + 1] = message.colors[j * 3 + 1];
          (<Float32Array>this.points.colors.array)[addedPointCount * 3 + 2] = message.colors[j * 3 + 2];
        }
        addedPointCount++;
      }
    }
    // send update message to this.points
    this.points.update(addedPointCount);
  }
}



