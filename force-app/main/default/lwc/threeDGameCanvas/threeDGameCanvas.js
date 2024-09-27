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
    paddlePosition = { x: 0, y: 1.5, z: -2 };
    isHoldingClick = false;
    initialClickPosition = { x: 0, y: 0 };
    paddleAngle = 0;
    gameWidth = 800;
    gameHeight = 450;
    tableWidth = 4;
    tableLength = 8;
    tableHeight = 0.1;
    maxPaddleHeight = 2.5;
    minPaddleHeight = 0.5;
    maxPaddleZ = 0;
    minPaddleZ = -4;

    renderedCallback() {
        if (this.threeJsInitialized) return;
        this.threeJsInitialized = true;

        loadScript(this, THREEJS_BUNDLE)
            .then(() => {
                console.log('Three.js bundle loaded successfully');
                console.log('THREE object:', window.ThreeJSBundle.THREE);
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
            console.log('THREE object:', THREE);
            console.log('OBJLoader:', OBJLoader);
            console.log('MTLLoader:', MTLLoader);

            const container = this.template.querySelector('.canvas-container');
            if (!container) throw new Error('Canvas container not found');
            
            console.log('Container found:', container);

            this.scene = new THREE.Scene();
            console.log('Scene created');

            this.camera = new THREE.PerspectiveCamera(45, this.gameWidth / this.gameHeight, 0.1, 1000);
            console.log('Camera created');

            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(this.gameWidth, this.gameHeight);
            container.appendChild(this.renderer.domElement);
            console.log('Renderer created and added to container');

            this.setupLighting(THREE);
            console.log('Lighting setup complete');

            this.createTable(THREE);
            console.log('Table created');

            this.loadPaddleModel(THREE, OBJLoader, MTLLoader);
            console.log('Paddle model loading initiated');

            this.createBall(THREE);
            console.log('Ball created');

            this.setupBackground(THREE);
            console.log('Background setup complete');

            this.camera.position.set(0, 4, -8);
            this.camera.lookAt(0, 0, 0);
            console.log('Camera positioned');

            this.setupEventListeners();
            console.log('Event listeners set up');

            this.animate();
            console.log('Animation loop started');

            this.renderer.domElement.style.cursor = 'none';
            console.log('Cursor style set');

            console.log('Three.js scene initialized successfully');
        } catch (error) {
            console.error('Detailed error in initThreeJs:', error.message);
            console.error('Error stack:', error.stack);
            this.handleError('Error initializing Three.js scene', error);
        }
    }

    setupLighting(THREE) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 5);
        this.scene.add(directionalLight);
    }

    createTable(THREE) {
        const tableGeometry = new THREE.BoxGeometry(this.tableWidth, this.tableHeight, this.tableLength);
        const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x1b5e20 });
        this.table = new THREE.Mesh(tableGeometry, tableMaterial);
        this.scene.add(this.table);

        const netGeometry = new THREE.BoxGeometry(this.tableWidth, 0.2, 0.02);
        const netMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        this.net = new THREE.Mesh(netGeometry, netMaterial);
        this.net.position.set(0, this.tableHeight + 0.1, 0);
        this.scene.add(this.net);

        this.addTableLines(THREE);
    }

    addTableLines(THREE) {
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
        
        const centerLineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, this.tableHeight + 0.001, -this.tableLength/2),
            new THREE.Vector3(0, this.tableHeight + 0.001, this.tableLength/2)
        ]);
        const centerLine = new THREE.Line(centerLineGeometry, lineMaterial);
        this.scene.add(centerLine);

        const sideLineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-this.tableWidth/2, this.tableHeight + 0.001, -this.tableLength/2),
            new THREE.Vector3(-this.tableWidth/2, this.tableHeight + 0.001, this.tableLength/2)
        ]);
        const sideLine1 = new THREE.Line(sideLineGeometry, lineMaterial);
        const sideLine2 = sideLine1.clone();
        sideLine2.position.x = this.tableWidth;
        this.scene.add(sideLine1, sideLine2);
    }

    loadPaddleModel(THREE, OBJLoader, MTLLoader) {
        console.log('Starting to load paddle model');
        console.log('PADDLE_OBJ:', PADDLE_OBJ);
        console.log('PADDLE_MTL:', PADDLE_MTL);
        console.log('PADDLE_TEXTURE:', PADDLE_TEXTURE);

        try {
            const loader = new OBJLoader();
            const mtlLoader = new MTLLoader();
            const textureLoader = new THREE.TextureLoader();

            textureLoader.load(
                PADDLE_TEXTURE,
                (texture) => {
                    console.log('Texture loaded successfully');
                    mtlLoader.load(
                        PADDLE_MTL,
                        (materials) => {
                            console.log('MTL loaded successfully');
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
                                    console.log('OBJ loaded successfully');
                                    this.playerPaddle = object;
                                    this.playerPaddle.scale.set(0.1, 0.1, 0.1);
                                    this.playerPaddle.position.set(0, this.maxPaddleHeight, this.minPaddleZ);
                                    
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
        } catch (error) {
            console.error('Error in loadPaddleModel:', error.message);
            console.error('Error stack:', error.stack);
        }
    }

    createBall(THREE) {
        const ballGeometry = new THREE.SphereGeometry(0.1, 32, 32);
        const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xFFA500 });
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ball.position.set(0, this.tableHeight + 0.1, 0);
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
        this.paddleAngle += event.deltaY * 0.001;
        this.paddleAngle = Math.max(-Math.PI / 4, Math.min(this.paddleAngle, Math.PI / 4));
        this.updatePaddleRotation();
    }

    updatePaddlePosition() {
        if (this.playerPaddle) {
            this.playerPaddle.position.set(
                this.paddlePosition.x,
                this.paddlePosition.y,
                this.paddlePosition.z
            );
    
            const isLeftOfCenter = this.paddlePosition.x < 0;
    
            const heightRange = this.maxPaddleHeight - this.minPaddleHeight;
            const currentHeight = this.paddlePosition.y - this.minPaddleHeight;
            const heightRatio = currentHeight / heightRange;
    
            const maxAngle = Math.PI / 2;
            let angle = (1 - heightRatio) * maxAngle;
    
            if (!isLeftOfCenter) {
                angle = Math.PI - angle;
            }
    
            this.playerPaddle.rotation.z = angle;
            this.playerPaddle.rotation.order = 'XYZ';
        }
    }

    updatePaddleRotation() {
        if (this.playerPaddle) {
            this.playerPaddle.rotation.x = this.paddleAngle;
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