import * as ROSLIB from 'roslib';
import * as THREE from 'three';

export class TFProcessor {
    ros: ROSLIB.Ros;
    rosTopic: ROSLIB.Topic;
    hasNewTF: number;

    constructor(options:
        {
            ros: ROSLIB.Ros,
        }) 
        {
        this.ros =  options.ros;
        this.hasNewTF = 1;

        this.rosTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: '/tf',
            queue_size: 10,
            messageType: 'tf2_msgs/msg/TFMessage'
        });

        this.rosTopic.subscribe(this.tf_callback)
    }


    private tf_callback(tf_msg:any) {
        this.hasNewTF += 1;



        // console.log('tf received: ' + this.hasNewTF)
        // updateTF
        
    }
}