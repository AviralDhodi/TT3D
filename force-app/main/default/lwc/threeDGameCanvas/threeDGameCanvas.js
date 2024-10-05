import { LightningElement } from 'lwc';

import { loadScript } from 'lightning/platformResourceLoader';

import THREEJS_BUNDLE from '@salesforce/resourceUrl/threejsBundle';

import PADDLE_OBJ from '@salesforce/resourceUrl/paddleObj';

import PADDLE_MTL from '@salesforce/resourceUrl/paddleMtl';

import PADDLE_TEXTURE from '@salesforce/resourceUrl/paddleTexture';



export default class ThreeDGameCanvas extends LightningElement {

    threeJsInitialized = false;

    error = null;

    scene;

    camera;

    renderer;

    playerPaddle;

    opponentPaddle;

    ball;

    table;

    net;

    animationFrameId;

    mousePosition = { x: 0, y: 0 };

    paddlePosition = { x: 0, y: 2.1, z: -2.85 };

    isHoldingClick = false;

    initialClickPosition = { x: 0, y: 0 };

    gameWidth = 1138;

    gameHeight = 640;

    tableWidth = 5.7;

    tableLength = 11.4;

    tableHeight = 0.14;

    maxPaddleHeight = 3.55;

    minPaddleHeight = 0.71;

    maxPaddleZ = 0;

    minPaddleZ = -5.7;

    paddleQuaternion;

    paddlePitchAngle = -Math.PI / 2; // Initial 90 degrees backwards

    paddleYawAngle = 0;



    renderedCallback() {

        if (this.threeJsInitialized) return;

        this.threeJsInitialized = true;



        loadScript(this, THREEJS_BUNDLE)

            .then(() => {

                console.log('Three.js bundle loaded successfully');

                this.initThreeJs();

            })

            .catch(error => this.handleError('Error loading Three.js bundle', error));

    }



    handleError(message, error) {

        console.error('Error occurred:', message);

        console.error('Error details:', error);

        console.error('Error stack:', error.stack);

        this.error = `${message}: ${error.message}`;

    }



    initThreeJs() {

        try {

            console.log('Starting Three.js initialization');

            const { THREE, OBJLoader, MTLLoader } = window.ThreeJSBundle;

            

            if (!THREE) {

                throw new Error('THREE is not defined. Make sure the Three.js bundle is loaded correctly.');

            }



            const container = this.template.querySelector('.canvas-container');

            if (!container) throw new Error('Canvas container not found');



            this.scene = new THREE.Scene();

            this.camera = new THREE.PerspectiveCamera(45, this.gameWidth / this.gameHeight, 0.1, 1000);

            this.renderer = new THREE.WebGLRenderer({ antialias: true });

            this.renderer.setSize(this.gameWidth, this.gameHeight);

            container.appendChild(this.renderer.domElement);



            this.paddleQuaternion = new THREE.Quaternion();



            this.setupLighting(THREE);

            this.createTable(THREE);

            this.loadPaddleModel(THREE, OBJLoader, MTLLoader);

            this.createBall(THREE);

            this.setupBackground(THREE);



            this.camera.position.set(0, 5.7, -11.4);

            this.camera.lookAt(0, 0, 0);



            this.setupEventListeners();

            this.animate();



            this.renderer.domElement.style.cursor = 'none';



            console.log('Three.js scene initialized successfully');

        } catch (error) {

            this.handleError('Error initializing Three.js scene', error);

        }

    }



    setupLighting(THREE) {

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);

        this.scene.add(ambientLight);



        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);

        directionalLight.position.set(0, 14.25, 7.125);

        this.scene.add(directionalLight);

    }



    createTable(THREE) {

        const tableGeometry = new THREE.BoxGeometry(this.tableWidth, this.tableHeight, this.tableLength);

        const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x1b5e20 });

        this.table = new THREE.Mesh(tableGeometry, tableMaterial);

        this.scene.add(this.table);



        const netGeometry = new THREE.BoxGeometry(this.tableWidth, 0.285, 0.0285);

        const netMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

        this.net = new THREE.Mesh(netGeometry, netMaterial);

        this.net.position.set(0, this.tableHeight + 0.1425, 0);

        this.scene.add(this.net);



        this.addTableLines(THREE);

    }



    addTableLines(THREE) {

        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF });

        

        const centerLineGeometry = new THREE.BufferGeometry().setFromPoints([

            new THREE.Vector3(0, this.tableHeight + 0.00142, -this.tableLength/2),

            new THREE.Vector3(0, this.tableHeight + 0.00142, this.tableLength/2)

        ]);

        const centerLine = new THREE.Line(centerLineGeometry, lineMaterial);

        this.scene.add(centerLine);



        const sideLineGeometry = new THREE.BufferGeometry().setFromPoints([

            new THREE.Vector3(-this.tableWidth/2, this.tableHeight + 0.00142, -this.tableLength/2),

            new THREE.Vector3(-this.tableWidth/2, this.tableHeight + 0.00142, this.tableLength/2)

        ]);

        const sideLine1 = new THREE.Line(sideLineGeometry, lineMaterial);

        const sideLine2 = sideLine1.clone();

        sideLine2.position.x = this.tableWidth;

        this.scene.add(sideLine1, sideLine2);

    }



    loadPaddleModel(THREE, OBJLoader, MTLLoader) {

        const loader = new OBJLoader();

        const mtlLoader = new MTLLoader();

        const textureLoader = new THREE.TextureLoader();



        textureLoader.load(

            PADDLE_TEXTURE,

            (texture) => {

                mtlLoader.load(

                    PADDLE_MTL,

                    (materials) => {

                        materials.preload();

                        

                        if (materials.materials['01___Default']) {

                            materials.materials['01___Default'].map = texture;

                        } else {

                            console.error('Material "01___Default" not found in MTL');

                        }

                        

                        loader.setMaterials(materials);

                        

                        loader.load(

                            PADDLE_OBJ,

                            (object) => {

                                this.playerPaddle = object;

                                this.playerPaddle.scale.set(0.071, 0.071, 0.071);

                                this.playerPaddle.position.set(0, this.tableHeight / 2 + 0.1425, -this.tableLength / 2 + 0.285);

                                

                                this.updatePaddleRotation();

                                

                                this.playerPaddle.traverse((child) => {

                                    if (child instanceof THREE.Mesh) {

                                        child.material = materials.materials['01___Default'];

                                        child.material.needsUpdate = true;

                                    }

                                });

                                

                                this.scene.add(this.playerPaddle);

                                console.log('Paddle added to scene');

                            },

                            (xhr) => console.log((xhr.loaded / xhr.total * 100) + '% loaded'),

                            (error) => console.error('Error loading paddle OBJ:', error.message)

                        );

                    },

                    (xhr) => console.log((xhr.loaded / xhr.total * 100) + '% loaded'),

                    (error) => console.error('Error loading paddle MTL:', error.message)

                );

            },

            (xhr) => console.log((xhr.loaded / xhr.total * 100) + '% loaded'),

            (error) => console.error('Error loading paddle texture:', error.message)

        );

    }



    createBall(THREE) {

        const ballGeometry = new THREE.SphereGeometry(0.1425, 32, 32);

        const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xFFA500 });

        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);

        this.ball.position.set(0, this.tableHeight + 0.1425, 0);

        this.scene.add(this.ball);

    }



    setupBackground(THREE) {

        this.scene.background = new THREE.Color(0x87CEEB);

    }



    setupEventListeners() {

        const canvas = this.template.querySelector('canvas');

        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));

        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));

        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));

        canvas.addEventListener('wheel', this.onWheel.bind(this));

    }



    onMouseMove(event) {

        event.preventDefault();

        const canvas = this.template.querySelector('canvas');

        const rect = canvas.getBoundingClientRect();

        

        const currentMouseX = event.clientX - rect.left;

        const currentMouseY = event.clientY - rect.top;



        const paddleX = -((currentMouseX / this.gameWidth) * this.tableWidth - this.tableWidth / 2);

        this.paddlePosition.x = Math.max(-this.tableWidth / 2, Math.min(paddleX, this.tableWidth / 2));



        if (this.isHoldingClick) {

            const deltaY = (this.initialClickPosition.y - currentMouseY) / this.gameHeight;

            const deltaZ = deltaY * (this.maxPaddleZ - this.minPaddleZ);

            this.paddlePosition.z = Math.max(this.minPaddleZ, Math.min(this.paddlePosition.z + deltaZ, this.maxPaddleZ));

            

            this.initialClickPosition.y = currentMouseY;

        } else {

            const paddleY = (1 - (currentMouseY / this.gameHeight)) * (this.maxPaddleHeight - this.minPaddleHeight) + this.minPaddleHeight;

            this.paddlePosition.y = Math.max(this.minPaddleHeight, Math.min(paddleY, this.maxPaddleHeight));

        }



        this.updatePaddlePosition();

    }



    onMouseDown(event) {

        this.isHoldingClick = true;

        const canvas = this.template.querySelector('canvas');

        const rect = canvas.getBoundingClientRect();

        this.initialClickPosition = { 

            x: event.clientX - rect.left, 

            y: event.clientY - rect.top 

        };

    }



    onMouseUp(event) {

        this.isHoldingClick = false;

    }



    onWheel(event) {

        event.preventDefault();

        const scrollSpeed = 0.01;

        const maxPitchAngle = Math.PI / 4; // 45 degrees in radians

    

        // Update pitch angle based on wheel movement

        this.paddlePitchAngle -= event.deltaY * scrollSpeed;

        

        // Limit pitch angle between -135 degrees and -45 degrees

        this.paddlePitchAngle = Math.max(-Math.PI * 3/4, Math.min(this.paddlePitchAngle, -Math.PI / 4));

    

        this.updatePaddleRotation();

    }



    updatePaddlePosition() {

        if (this.playerPaddle) {

            this.playerPaddle.position.set(

                this.paddlePosition.x,

                this.paddlePosition.y,

                this.paddlePosition.z

            );

    

            // Calculate Yaw based on y-position

            const minY = this.tableHeight / 2 + 0.1425; // Minimum paddle height

            const maxY = this.maxPaddleHeight;

            const normalizedY = (this.paddlePosition.y - minY) / (maxY - minY);

            const maxYawAngle = Math.PI / 2; // 90 degrees

            this.paddleYawAngle = (1 - normalizedY) * maxYawAngle;

    

            // Determine yaw direction based on x-position

            if (this.paddlePosition.x < 0) {

                this.paddleYawAngle *= -1; // Yaw to the left if on the left side

            }

    

            this.updatePaddleRotation();

        }

    }



    updatePaddleRotation() {

        if (this.playerPaddle && this.paddleQuaternion) {

            const { THREE } = window.ThreeJSBundle;

            

            // Apply rotations in order: Pitch -> Yaw

            const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.paddlePitchAngle);

            const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.paddleYawAngle);

            

            this.paddleQuaternion.copy(pitchQuaternion);

            this.paddleQuaternion.multiply(yawQuaternion);

            

            this.playerPaddle.quaternion.copy(this.paddleQuaternion);

        }

    }



    animate() {

        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

        if (this.renderer && this.scene && this.camera) {

            this.renderer.render(this.scene, this.camera);

        }

    }



    disconnectedCallback() {

        if (this.animationFrameId) {

            cancelAnimationFrame(this.animationFrameId);

        }

        this.disposeThreeJsObjects();

    }



    disposeThreeJsObjects() {

        if (this.scene) {

            this.scene.traverse((object) => {

                if (object.geometry) object.geometry.dispose();

                if (object.material) {

                    if (Array.isArray(object.material)) {

                        object.material.forEach(material => material.dispose());

                    } else {

                        object.material.dispose();

                    }

                }

            });

        }

        if (this.renderer) {

            this.renderer.dispose();

        }

    }

}