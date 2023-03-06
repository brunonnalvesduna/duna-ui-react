import * as ROSLIB from 'roslib';

type sensor_statuses = 
{
    camera_ok: boolean;
    imu_ok: boolean;
    lidar_ok: boolean;    
}

type html_elements = 
{
    camera_LED: HTMLElement;
    lidar_LED: HTMLElement;
    IMU_LED: HTMLElement;
}

export class StatusDisplay {
    ros: ROSLIB.Ros;
    status_topic: ROSLIB.Topic;
    elements: html_elements;
    private timeoutID: NodeJS.Timeout;

    constructor(options:
        {
        ros: ROSLIB.Ros,
        topicName: string,
        elements: html_elements
        }) {

        this.ros = options.ros;
        this.status_topic = new ROSLIB.Topic({
            ros: this.ros,
            name: options.topicName,
            messageType: "std_msgs/msg/String"
        })

        this.elements = options.elements;
        this.status_topic.subscribe(this.processMessage.bind(this));

        // Add timeout in case messages stop coming.
        this.timeoutID = setTimeout(this.messageTimeoutCallback.bind(this), 5000);
        }
        
    processMessage(msg: any)
    {
        var status:sensor_statuses = JSON.parse(msg.data)
        // console.log(status)
        
        if (status.camera_ok)
            this.elements.camera_LED.style.backgroundColor = "green";
        else
            this.elements.camera_LED.style.backgroundColor = "red";

        if(status.imu_ok)
            this.elements.IMU_LED.style.backgroundColor = "green";
        else
            this.elements.IMU_LED.style.backgroundColor = "red";

        if(status.lidar_ok)
            this.elements.lidar_LED.style.backgroundColor = "green";
        else
            this.elements.lidar_LED.style.backgroundColor = "red";

        // Refresh timeout
        clearTimeout(this.timeoutID)
        this.timeoutID = setTimeout(this.messageTimeoutCallback.bind(this), 5000);
    }

    messageTimeoutCallback()
    {
        this.elements.lidar_LED.style.backgroundColor = "red";
        this.elements.IMU_LED.style.backgroundColor = "red";
        this.elements.camera_LED.style.backgroundColor = "red";
    }
}