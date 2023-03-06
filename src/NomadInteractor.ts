import * as ROSLIB from 'roslib';

export class NomadInteractor {
    ros: ROSLIB.Ros;
    service: ROSLIB.Service;
    slam_service: ROSLIB.Service;
    isRecording: boolean = false;
    buttonElement: HTMLButtonElement;
    textboxelement: HTMLInputElement;

    constructor(options:
        {
            ros: ROSLIB.Ros
            buttonElement: HTMLButtonElement,
            textboxelement: HTMLInputElement
        }) {
        this.ros = options.ros;
        this.buttonElement = options.buttonElement;
        this.textboxelement = options.textboxelement;
        this.service = new ROSLIB.Service({
            ros: options.ros,
            name: "/duna_slam/bag_recorder/controller",
            serviceType: "duna_slam_interfaces/srv/Command"
        })

        this.slam_service = new ROSLIB.Service({
            ros: options.ros,
            name: "/duna_slam/slam_processor_node/controller",
            serviceType: "duna_slam_interfaces/srv/Command"
        })
    }

    // Refer to: https://github.com/Marcus-D-Forte/nomad_software2/blob/main/src/duna_slam_interfaces/srv/Command.srv
    startScan(filename: string) {
        const request = new ROSLIB.ServiceRequest({
            command_id: 0,
            parameter: filename
        })

        console.log('calling recordBag service')
        this.service.callService(request, (nomad_response) => {
            console.log('HW Response: ' + nomad_response.message)
            if (nomad_response.success === false) {
                alert('Service call HW error:' + nomad_response.message)
            } else {

                console.log('calling Slam service')
                this.slam_service.callService(request, (nomad_response) => {
                    console.log('Slam HW Response: ' + nomad_response.message)
                    if (nomad_response.success === false) {
                        alert('Slam Service call HW error:' + nomad_response.message)
                    } else {

                    }
                }, (error) => {
                    alert('Service call error: ' + error)
                });

                this.disableInputContent()
                this.isRecording = true
            }
        }, (error) => {
            alert('Service call error: ' + error)
        });
    }

    stopScan() {
        const request = new ROSLIB.ServiceRequest({
            command_id: 1,
        })

        console.log('calling recordBag service')
        this.service.callService(request, (nomad_response) => {
            console.log('HW Response: ' + nomad_response.message)
            if (nomad_response.success === false) {
                alert('Service call HW error:' + nomad_response.message)
                
            } else {

                console.log('calling Slam service')
                this.slam_service.callService(request, (nomad_response) => {
                    console.log('Slam HW Response: ' + nomad_response.message)
                    if (nomad_response.success === false) {
                        alert('Slam Service call HW error:' + nomad_response.message)
                    } else {

                    }
                }, (error) => {
                    alert('Service call error: ' + error)
                });

                this.enableInputContent()
                this.isRecording = false
            }
        }, (error) => {
            alert('Service call error: ' + error)
        });
    }

    enableInputContent() {
        this.textboxelement.disabled = false
    }

    disableInputContent() {
        this.textboxelement.disabled = true
    }


}