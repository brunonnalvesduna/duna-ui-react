import './App.css'
import * as ROSLIB from 'roslib';
import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';
import { Color } from 'three';

import { Delete, Edit } from '@mui/icons-material';

import { PointCloudReceiver } from './PointCloudReceiver';
import { NomadInteractor } from './NomadInteractor';
import { TFProcessor } from './TFProcessor';
import { StatusDisplay } from './StatusDisplay';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const startScanButton = useRef<HTMLButtonElement>(null!);
  const bagfilenameObj = useRef<HTMLInputElement>(null!);
  const cameraStatus = useRef<HTMLSpanElement>(null!);
  const imuStatus = useRef<HTMLSpanElement>(null!);
  const lidarStatus = useRef<HTMLSpanElement>(null!);
  const canvasRef = useRef<HTMLElement>(null!);

  // @ts-ignores // WORKAROUND VITE ISSUE
  const websocketURL = 'ws://' + location.hostname + ':9090'
  // @ts-ignores // WORKAROUND VITE ISSUE
  const lidar_topic = import.meta.env.VITE_LASER_TOPIC

  // ThreeJS
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor("#000000");
  renderer.setSize(window.innerWidth, window.innerHeight);
  useEffect(() => {
    if (canvasRef.current.childElementCount === 0) {
      const viewer = canvasRef.current.appendChild(renderer.domElement);
      console.log(viewer)
    }
  }, [])

  // Camera Controls
  const axesHelper = new THREE.AxesHelper(1);
  axesHelper.setColors(new Color('red'), new Color('green'), new Color('blue'))
  scene.add(axesHelper);
  const controls = new ArcballControls(camera, renderer.domElement);
  camera.position.set(-2, -2, 1);
  camera.up.set(0, 0, 1);

  renderer.render(scene, camera)
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix()
  })

  const fakeScans = [
    {
      id: 1,
      fileName: 'scan1'
    },
    {
      id: 2,
      fileName: 'scan2'
    },
    {
      id: 3,
      fileName: 'scan3'
    },
  ]


  // Create a connection to the rosbridge WebSocket server.
  const ros = new ROSLIB.Ros({});
  console.log(websocketURL);

  ros.on('connection', (event) => {
    console.log('Connected to WS successfully!')
  }
  )
  ros.on('error', (event) => {
    alert('Unable to connect to ' + websocketURL)
  });

  ros.connect(websocketURL)
  tryWSConnection(ros) // does not work

  var tf_processor = new TFProcessor(
    {
      ros: ros,
    }
  )

  const pc_receiver = new PointCloudReceiver(
    {
      ros: ros,
      topicName: lidar_topic,
      scene: scene,
      renderer: renderer,
      camera: camera,
      material: new THREE.PointsMaterial(
        {
          size: 0.02,
          vertexColors: true // This allows colors from message
        }
      ),
      max_pts: 1000000,
      decayTime: 1000
    }
  )

  // Bag file processor
  const nomadInteractor = new NomadInteractor({
    ros: ros,
    buttonElement: startScanButton.current,
    textboxelement: bagfilenameObj.current,
  })

  // Linked to HTML object
  function onStartBagButtonClick() {
    if (nomadInteractor.isRecording === false) {
      const scan_save_name = bagfilenameObj.current.value
      console.log(scan_save_name)
      if (scan_save_name && scan_save_name.length === 0) {
        alert('Por favor digite o nome do scan!')
      } else {
        setIsScanning(true)
        nomadInteractor.startScan(scan_save_name)
        pc_receiver.resetPoints()
      }
    } else {
      setIsScanning(false)
      nomadInteractor.stopScan()
    }
  }

  // This class will manipulate the html elements according to sensor status topic.

  useEffect(() => {
    let statusDisplay = new StatusDisplay(
      {
        ros: ros,
        topicName: '/sensor_statuses',
        elements: {
          camera_LED: cameraStatus.current,
          IMU_LED: imuStatus.current,
          lidar_LED: lidarStatus.current
        }
      }
    )
  }, [])

  // Rendering (Main loop)
  var render = function () {
    requestAnimationFrame(render);
    controls.update();
    // console.log(tf_processor.hasNewTF)
    renderer.render(scene, camera);
  };

  render();

  function tryWSConnection(ros: ROSLIB.Ros) {
    if (ros) {
      ros.connect(websocketURL)
      setTimeout(tryWSConnection.bind(ros), 5000)
    }
  }

  return (
    <div id="viewer" onContextMenu={() => false}>
      <span className="status">

        <div className="led_text_group">
          <span id="camera_status" ref={cameraStatus} className="led"></span>
          <p className="sensor_status_text"> Cam </p>
        </div>

        <div className="led_text_group">
          <span id="lidar_status" ref={lidarStatus} className="led"></span>
          <p className="sensor_status_text"> Lidar </p>
        </div>

        <div className="led_text_group">
          <span id="imu_status" ref={imuStatus} className="led"></span>
          <p className="sensor_status_text"> IMU </p>
        </div>

      </span>

      <span className="seeAllScansButton">
        <button id="seeAllScansButton" onClick={() => setIsOpen(true)}>See Scans</button>
      </span>

      <Dialog fullWidth PaperProps={{ sx: { height: '50%' } }} open={isOpen} sx={{ padding: 2 }}>
        <DialogTitle>Listagem de cenas</DialogTitle>
        <DialogContent>
          {fakeScans.map((scan) => (
            <DialogContentText display="flex" alignItems="center" justifyContent="space-between" key={scan.id}>
              <span style={{ fontSize: '24px' }} >{scan.fileName}</span>
              <Button onClick={() => console.log(scan.id)}><Edit fontSize='small' /></Button>
              <Button onClick={() => console.log(scan.id)}><Delete fontSize='small' /></Button>
            </DialogContentText>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>


      <div className="bagSaveInput">
        <input id="bagFilename" placeholder="Scan Name" type="text" ref={bagfilenameObj} />
        <span>
          <button id="startScanButton" ref={startScanButton} onClick={() => onStartBagButtonClick()}>{isScanning ? "Stop Scan" : "Start Scan"}</button>
        </span>
      </div>
      <span ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
      </span>
    </ div >
  )
}

export default App

