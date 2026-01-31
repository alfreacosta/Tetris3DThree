import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// constantes y confguracion del tablero
const ANCHO_TABLERO = 10;
const ALTO_TABLERO = 20;
const PROFUNDIDAD_TABLERO = 10;
const TAMANO_CUBO = 1;
const PIEZAS = {
    X: {
        color: 0x00ff00,
        rotaciones: [
            [[0,0,0], [1,0,0], [-1,0,0], [0,1,0], [0,-1,0]],  
            [[0,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]],  
            [[0,0,0], [1,0,0], [-1,0,0], [0,0,1], [0,0,-1]]   
        ]
    },
    L: {
        color: 0xff8800,
        rotaciones: [
            [[0,0,0], [0,1,0], [0,2,0], [1,0,0]],  
            [[0,0,0], [0,0,1], [0,0,2], [0,1,0]],  
            [[0,0,0], [1,0,0], [2,0,0], [0,0,1]],  
            [[0,0,0], [0,1,0], [1,0,0], [1,1,0]]   
        ]
    },
    T: {
        color: 0xff00ff,
        rotaciones: [
            [[0,0,0], [1,0,0], [-1,0,0], [0,1,0]],  
            [[0,0,0], [0,1,0], [0,-1,0], [0,0,1]],  
            [[0,0,0], [1,0,0], [-1,0,0], [0,0,1]],  
            [[0,0,0], [0,1,0], [1,0,0], [0,0,1]]    
        ]
    },
    I: {
        color: 0x00ffff,
        rotaciones: [
            [[0,0,0], [0,1,0], [0,2,0], [0,3,0]],  
            [[0,0,0], [1,0,0], [2,0,0], [3,0,0]],  
            [[0,0,0], [0,0,1], [0,0,2], [0,0,3]]   
        ]
    },
    Z: {
        color: 0xff0000,  // rojo
        rotaciones: [
            [[0,0,0], [1,0,0], [0,1,0], [-1,1,0]],  
            [[0,0,0], [0,1,0], [0,0,1], [0,1,-1]],  
            [[0,0,0], [1,0,0], [1,0,1], [0,0,-1]]   
        ]
    },  
    O: {
        color: 0xffff00,  // amarillo
        rotaciones: [
            [[0,0,0], [1,0,0], [0,1,0], [1,1,0]]  
        ]
    }
};

// la clase principal del juego
class TetrisGame {
    constructor() {
        console.log('iniciando tetris 3d');
        this.canvas = document.getElementById('game-canvas');
        this.previewCanvas = document.getElementById('preview-canvas');
        console.log('canvas encontrado:', this.canvas ? 'si' : 'NO');
        
        // estado del jjuego
        this.tablero = this.crear_tablero_vacio();
        this.puntaje = 0;
        this.lineas = 0;
        this.nivel = 1;
        this.piezas_colocadas = 0;  // cuentas las piezzas que se colocaron colocadas
        this.juego_terminado = false;
        this.pausado = false;
        
        // piezzas
        this.pieza_actual = null;
        this.pieza_siguiente = this.obtener_pieza_aleatoria();
        
        // temporizadorres
        this.ultimo_tiempo_caida = 0;
        this.velocidad_caida = 1000; // milisegundos
        
        // variables de la camaraa
        this.camara_distancia = 40.0;
        this.camara_angulo_h = 46.0;  // orizontal
        this.camara_angulo_v = 30.0;  // vertikal
        
        // audios
        this.audio = {
            background: new Audio('musica_fondo.mp3'),
            theme: new Audio('TetrisNintendo.mp3')
        };
        this.audio.background.loop = true;
        this.audio.background.volume = 0.3;
        this.audio.theme.loop = true;
        this.audio.theme.volume = 0.5;
        
        // inicializar sistema de sonidos
        this.inicializar_sonidos();
        
        console.log('inicialisando componentes del juego');
        this.inicializar_threejs();
        console.log('threejs listo');
        this.inicializar_preview();
        console.log('preview listo');
        this.inicializar_controles();
        console.log('controles configurados');
        this.actualizar_hud();  // inicializar el hud con valores iniciales
        console.log('hud actualisado');
        this.cargar_mejores_puntajes();
        this.mostrar_mejores_puntajes();
        this.generar_pieza();
        console.log('primera pieza generada');
        this.reproducir_audio();
        console.log('audio iniciado');
        this.animar();
        console.log('juego completamente cargado y corriendo');
        console.log('estadisticas: puntaje=' + this.puntaje + ', nivel=' + this.nivel);
    }
    
    crear_tablero_vacio() {
        const tablero = [];
        for (let x = 0; x < ANCHO_TABLERO; x++) {
            tablero[x] = [];
            for (let y = 0; y < ALTO_TABLERO; y++) {
                tablero[x][y] = [];
                for (let z = 0; z < PROFUNDIDAD_TABLERO; z++) {
                    tablero[x][y][z] = 0;
                }
            }
        }
        return tablero;
    }
    
    inicializar_sonidos() {
        // crear contexto de audio web
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log('sistema de sonidos inicializado');
    }
    
    generar_tono(frecuencia, duracion, volumen = 0.2) {
        // generar un tono usando Web Audio API
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        oscillator.frequency.value = frecuencia;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(volumen, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duracion);
        
        oscillator.start(this.audioCtx.currentTime);
        oscillator.stop(this.audioCtx.currentTime + duracion);
    }
    
    sonido_mover() {
        // beep corto para movimientos
        this.generar_tono(440, 0.05, 0.4);
    }
    
    sonido_rotar() {
        // dos tonos rapidos (bajo-alto)
        this.generar_tono(300, 0.05, 0.35);
        setTimeout(() => this.generar_tono(500, 0.05, 0.35), 50);
    }
    
    sonido_drop() {
        // tono descendente
        const duracion = 0.2;
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + duracion);
        
        gainNode.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duracion);
        
        oscillator.start(this.audioCtx.currentTime);
        oscillator.stop(this.audioCtx.currentTime + duracion);
    }
    
    sonido_linea() {
        // tono ascendente para linea completada
        const duracion = 0.3;
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, this.audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + duracion);
        
        gainNode.gain.setValueAtTime(0.6, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duracion);
        
        oscillator.start(this.audioCtx.currentTime);
        oscillator.stop(this.audioCtx.currentTime + duracion);
    }
    
    sonido_fijar() {
        // sonido cuando se fija una pieza
        this.generar_tono(300, 0.08, 0.45);
    }
    
    inicializar_threejs() {
        // escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // camara
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.actualizar_posicion_camara();  // usar posiscion calculadaa
        
        // renderizador
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true 
        });
        this.renderer.setSize(
            Math.min(window.innerWidth, 1400),
            Math.min(window.innerHeight, 900)
        );
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // controles de camarra
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(ANCHO_TABLERO/2, ALTO_TABLERO/2, PROFUNDIDAD_TABLERO/2);
        
        // iluminasion
        this.configurar_iluminacion();
        
        // tablero
        this.crear_tablero();
        
        // ejes de referensia
        this.crear_ejes_ayuda();
        
        // grupos para las piezass
        this.boardGroup = new THREE.Group();
        this.pieceGroup = new THREE.Group();
        this.fantasmaGroup = new THREE.Group();  // grupo para la pieza fantasma
        this.scene.add(this.boardGroup);
        this.scene.add(this.pieceGroup);
        this.scene.add(this.fantasmaGroup);
        
        // evento resize
        window.addEventListener('resize', () => this.al_redimensionar_ventana());
    }
    
    configurar_iluminacion() {
        // luzz ambiental mas fuerte
        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambient);
        
        // luz direcional principal mas fuerte
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight1.position.set(15, 30, 15);
        dirLight1.castShadow = true;
        dirLight1.shadow.camera.left = -20;
        dirLight1.shadow.camera.right = 20;
        dirLight1.shadow.camera.top = 20;
        dirLight1.shadow.camera.bottom = -20;
        this.scene.add(dirLight1);
        
        // luz direccional secundaria mas fuerte
        const dirLight2 = new THREE.DirectionalLight(0x4fc3f7, 0.7);
        dirLight2.position.set(-10, 15, -10);
        this.scene.add(dirLight2);
        
        // luz puntual mas fuerte
        const pointLight = new THREE.PointLight(0x4caf50, 1.0, 50);
        pointLight.position.set(ANCHO_TABLERO/2, ALTO_TABLERO, PROFUNDIDAD_TABLERO/2);
        this.scene.add(pointLight);
        
        // luz adicional desde abajo para mas brillo
        const pointLight2 = new THREE.PointLight(0xffffff, 0.5, 50);
        pointLight2.position.set(ANCHO_TABLERO/2, 0, PROFUNDIDAD_TABLERO/2);
        this.scene.add(pointLight2);
    }
    
    crear_tablero() {
        // marco del tableroo
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x4caf50, linewidth: 2 });
        
        // lineas vertikales
        for (let x of [0, ANCHO_TABLERO]) {
            for (let z of [0, PROFUNDIDAD_TABLERO]) {
                const points = [
                    new THREE.Vector3(x, 0, z),
                    new THREE.Vector3(x, ALTO_TABLERO, z)
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, edgeMaterial);
                this.scene.add(line);
            }
        }
        
        // lineas orizontales de la base
        const basePoints = [
            [0, 0, 0], [ANCHO_TABLERO, 0, 0],
            [ANCHO_TABLERO, 0, 0], [ANCHO_TABLERO, 0, PROFUNDIDAD_TABLERO],
            [ANCHO_TABLERO, 0, PROFUNDIDAD_TABLERO], [0, 0, PROFUNDIDAD_TABLERO],
            [0, 0, PROFUNDIDAD_TABLERO], [0, 0, 0]
        ];
        
        for (let i = 0; i < basePoints.length; i += 2) {
            const points = [
                new THREE.Vector3(...basePoints[i]),
                new THREE.Vector3(...basePoints[i + 1])
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, edgeMaterial);
            this.scene.add(line);
        }
        
        // lineas orizontales del tope
        const topPoints = [
            [0, ALTO_TABLERO, 0], [ANCHO_TABLERO, ALTO_TABLERO, 0],
            [ANCHO_TABLERO, ALTO_TABLERO, 0], [ANCHO_TABLERO, ALTO_TABLERO, PROFUNDIDAD_TABLERO],
            [ANCHO_TABLERO, ALTO_TABLERO, PROFUNDIDAD_TABLERO], [0, ALTO_TABLERO, PROFUNDIDAD_TABLERO],
            [0, ALTO_TABLERO, PROFUNDIDAD_TABLERO], [0, ALTO_TABLERO, 0]
        ];
        
        for (let i = 0; i < topPoints.length; i += 2) {
            const points = [
                new THREE.Vector3(...topPoints[i]),
                new THREE.Vector3(...topPoints[i + 1])
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, edgeMaterial);
            this.scene.add(line);
        }
        
        // piso con cuadriculaa
        const gridHelper = new THREE.GridHelper(
            Math.max(ANCHO_TABLERO, PROFUNDIDAD_TABLERO), 
            Math.max(ANCHO_TABLERO, PROFUNDIDAD_TABLERO),
            0x444444,
            0x222222
        );
        gridHelper.position.set(ANCHO_TABLERO/2, 0, PROFUNDIDAD_TABLERO/2);
        this.scene.add(gridHelper);
    }
    
    crear_ejes_ayuda() {
        const axisLenghtXZ = 12;  
        const axisLenghtY = 16;   
        const origin = new THREE.Vector3(0, 0, 0);  // en la esquina mismo del tablero
        
        // eje X (rojo) - orizontal
        const arrowX = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),  // direksion
            origin,
            axisLenghtXZ,
            0xff0000,  // rojo
            2.0,  // largo de la cabeza
            1.2   // ancho de la cabeza
        );
        this.scene.add(arrowX);
        
        // eje Y (verde) - vertikal mas alto
        const arrowY = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            origin,
            axisLenghtY,
            0x00ff00,  // verde
            2.5,
            1.5
        );
        this.scene.add(arrowY);
        
        // eje Z (azul) - profundidadd
        const arrowZ = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            origin,
            axisLenghtXZ,
            0x0000ff,  // azul
            2.0,
            1.2
        );
        this.scene.add(arrowZ);
        
        // agregar etiketas de texto muchisimo mas grandes
        this.crear_etiqueta_eje('X', 13.5, 0, 0, 0xff0000);
        this.crear_etiqueta_eje('Y', 0, 18.0, 0, 0x00ff00);
        this.crear_etiqueta_eje('Z', 0, 0, 13.5, 0x0000ff);
    }
    
    crear_etiqueta_eje(text, x, y, z, color) {
        // crear un canvas para el textoo
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;
        
        // estilo del texto muchisimo mas grande
        context.font = 'Bold 96px Arial';
        context.fillStyle = '#' + color.toString(16).padStart(6, '0');
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 64, 64);
        
        // crear textura desde el canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // crear sprite con la texturaa mucho mas grande
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, y, z);
        sprite.scale.set(2.0, 2.0, 1);
        
        this.scene.add(sprite);
    }
    
    inicializar_preview() {
        // escena del preview
        this.previewScene = new THREE.Scene();
        this.previewScene.background = new THREE.Color(0x1a1a1a);
        
        // camara del preveiw
        this.previewCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        this.previewCamera.position.set(4, 4, 4);
        this.previewCamera.lookAt(0, 0, 0);
        
        // renderizador del prevview
        this.previewRenderer = new THREE.WebGLRenderer({ 
            canvas: this.previewCanvas,
            antialias: true 
        });
        this.previewRenderer.setSize(140, 140);
        
        // luces para el previeew
        const previewLight1 = new THREE.DirectionalLight(0xffffff, 1);
        previewLight1.position.set(5, 5, 5);
        this.previewScene.add(previewLight1);
        
        const previewLight2 = new THREE.AmbientLight(0xffffff, 0.5);
        this.previewScene.add(previewLight2);
        
        this.actualizar_preview();
    }
    
    actualizar_preview() {
        // limpiar prevview anterior
        while(this.previewScene.children.length > 2) {
            this.previewScene.remove(this.previewScene.children[2]);
        }
        
        if (!this.pieza_siguiente) return;
        
        const forma = this.pieza_siguiente.rotaciones[0];
        const geometria = new THREE.BoxGeometry(0.9, 0.9, 0.9);
        const material = new THREE.MeshPhongMaterial({ 
            color: this.pieza_siguiente.color,
            shininess: 80,
            specular: 0x555555
        });
        
        forma.forEach(([x, y, z]) => {
            const cubo = new THREE.Mesh(geometria, material);
            cubo.position.set(x - 1, y - 1, z - 1);
            
            const bordes = new THREE.EdgesGeometry(geometria);
            const linea = new THREE.LineSegments(
                bordes, 
                new THREE.LineBasicMaterial({ color: 0x000000 })
            );
            cubo.add(linea);
            
            this.previewScene.add(cubo);
        });
        
        this.previewRenderer.render(this.previewScene, this.previewCamera);
    }
    
    obtener_pieza_aleatoria() {
        const tipos = Object.keys(PIEZAS);
        const tipo = tipos[Math.floor(Math.random() * tipos.length)];
        return {
            tipo: tipo,
            color: PIEZAS[tipo].color,
            rotaciones: PIEZAS[tipo].rotaciones,
            indice_rotacion: 0,
            x: Math.floor(ANCHO_TABLERO / 2) - 1,
            y: ALTO_TABLERO - 4,
            z: Math.floor(PROFUNDIDAD_TABLERO / 2) - 1
        };
    }
    
    generar_pieza() {
        this.pieza_actual = this.pieza_siguiente;
        this.pieza_siguiente = this.obtener_pieza_aleatoria();
        this.actualizar_preview();
        
        if (this.detectar_colision(this.pieza_actual, 0, 0, 0)) {
            this.terminar_juego();
            return;
        }
        
        this.renderizar_pieza();
    }
    
    renderizar_pieza() {
        // limpiar piezza anterior
        while(this.pieceGroup.children.length > 0) {
            this.pieceGroup.remove(this.pieceGroup.children[0]);
        }
        
        if (!this.pieza_actual) return;
        
        const forma = this.pieza_actual.rotaciones[this.pieza_actual.indice_rotacion];
        const geometria = new THREE.BoxGeometry(TAMANO_CUBO - 0.1, TAMANO_CUBO - 0.1, TAMANO_CUBO - 0.1);
        const material = new THREE.MeshPhongMaterial({ 
            color: this.pieza_actual.color,
            shininess: 100,
            specular: 0x777777
        });
        
        forma.forEach(([dx, dy, dz]) => {
            const cubo = new THREE.Mesh(geometria, material);
            cubo.position.set(
                this.pieza_actual.x + dx + 0.5,
                this.pieza_actual.y + dy + 0.5,
                this.pieza_actual.z + dz + 0.5
            );
            
            const bordes = new THREE.EdgesGeometry(geometria);
            const linea = new THREE.LineSegments(
                bordes, 
                new THREE.LineBasicMaterial({ color: 0x000000 })
            );
            cubo.add(linea);
            
            this.pieceGroup.add(cubo);
        });
        
        // renderizar piezza fantasma
        this.renderizar_pieza_fantasma();
    }
    
    renderizar_pieza_fantasma() {
        // limpiar piezza fantasma anterior
        while(this.fantasmaGroup.children.length > 0) {
            this.fantasmaGroup.remove(this.fantasmaGroup.children[0]);
        }
        
        if (!this.pieza_actual) return;
        
        // encontrar donde va caer la piessa
        let offset_y = 0;
        while (!this.detectar_colision(this.pieza_actual, 0, offset_y - 1, 0)) {
            offset_y--;
        }
        
        // si la pieza ya esta en el fondo no mostrar fantasmaa
        if (offset_y === 0) return;
        
        const forma = this.pieza_actual.rotaciones[this.pieza_actual.indice_rotacion];
        const geometria = new THREE.BoxGeometry(TAMANO_CUBO - 0.1, TAMANO_CUBO - 0.1, TAMANO_CUBO - 0.1);
        
        // material semi transparente para la sombra
        const material = new THREE.MeshPhongMaterial({ 
            color: this.pieza_actual.color,
            transparent: true,
            opacity: 0.3,
            shininess: 50
        });
        
        forma.forEach(([dx, dy, dz]) => {
            const cubo = new THREE.Mesh(geometria, material);
            cubo.position.set(
                this.pieza_actual.x + dx + 0.5,
                this.pieza_actual.y + dy + offset_y + 0.5,
                this.pieza_actual.z + dz + 0.5
            );
            
            const bordes = new THREE.EdgesGeometry(geometria);
            const linea = new THREE.LineSegments(
                bordes, 
                new THREE.LineBasicMaterial({ 
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.5
                })
            );
            cubo.add(linea);
            
            this.fantasmaGroup.add(cubo);
        });
    }
    
    renderizar_tablero() {
        // limpiar tablero anteriorr
        while(this.boardGroup.children.length > 0) {
            this.boardGroup.remove(this.boardGroup.children[0]);
        }
        
        const geometria = new THREE.BoxGeometry(TAMANO_CUBO - 0.1, TAMANO_CUBO - 0.1, TAMANO_CUBO - 0.1);
        
        for (let x = 0; x < ANCHO_TABLERO; x++) {
            for (let y = 0; y < ALTO_TABLERO; y++) {
                for (let z = 0; z < PROFUNDIDAD_TABLERO; z++) {
                    if (this.tablero[x][y][z] !== 0) {
                        const material = new THREE.MeshPhongMaterial({ 
                            color: this.tablero[x][y][z],
                            shininess: 80,
                            specular: 0x555555
                        });
                        
                        const cubo = new THREE.Mesh(geometria, material);
                        cubo.position.set(x + 0.5, y + 0.5, z + 0.5);
                        
                        const bordes = new THREE.EdgesGeometry(geometria);
                        const linea = new THREE.LineSegments(
                            bordes, 
                            new THREE.LineBasicMaterial({ color: 0x000000 })
                        );
                        cubo.add(linea);
                        
                        this.boardGroup.add(cubo);
                    }
                }
            }
        }
    }
    
    detectar_colision(pieza, dx, dy, dz) {
        const forma = pieza.rotaciones[pieza.indice_rotacion];
        
        for (let [bx, by, bz] of forma) {
            const newX = pieza.x + bx + dx;
            const newY = pieza.y + by + dy;
            const newZ = pieza.z + bz + dz;
            
            if (newX < 0 || newX >= ANCHO_TABLERO ||
                newY < 0 || newY >= ALTO_TABLERO ||
                newZ < 0 || newZ >= PROFUNDIDAD_TABLERO) {
                return true;
            }
            if (this.tablero[newX][newY][newZ] !== 0) {
                return true;
            }
        }
        
        return false;
    }
    
    mover_pieza(dx, dy, dz, con_sonido = false) {
        if (!this.pieza_actual || this.juego_terminado || this.pausado) return false;
        
        if (!this.detectar_colision(this.pieza_actual, dx, dy, dz)) {
            this.pieza_actual.x += dx;
            this.pieza_actual.y += dy;
            this.pieza_actual.z += dz;
            console.log('pieza movida a (' + this.pieza_actual.x + ',' + this.pieza_actual.y + ',' + this.pieza_actual.z + ')');
            if (con_sonido) {
                this.sonido_mover();
            }
            this.renderizar_pieza();
            return true;
        } else {
            console.log('movimiento bloqueado - colision detectada');
        }
        
        return false;
    }
    
    rotar_pieza_eje(eje, angulo) {
        if (!this.pieza_actual || this.juego_terminado || this.pausado) return;
        
        // guardar forma anterior de la pieza
        const forma_anterior = JSON.parse(JSON.stringify(this.pieza_actual.rotaciones[this.pieza_actual.indice_rotacion]));
        
        // aplicar rotasion real segun el ejee
        const forma_nueva = [];
        const rad = (angulo * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        // rotar cada cubo de la piessa
        for (let cubo of forma_anterior) {
            let [x, y, z] = cubo;
            let nx, ny, nz;
            
            if (eje === 'x') {
                // rotasion sobre eje X (orizontal)
                nx = x;
                ny = Math.round(y * cos - z * sin);
                nz = Math.round(y * sin + z * cos);
            } else if (eje === 'y') {
                // rotasion sobre eje Y (vertikal)
                nx = Math.round(z * sin + x * cos);
                ny = y;
                nz = Math.round(z * cos - x * sin);
            } else if (eje === 'z') {
                // rotasion sobre eje Z (profundidadd)
                nx = Math.round(x * cos - y * sin);
                ny = Math.round(x * sin + y * cos);
                nz = z;
            }
            
            forma_nueva.push([nx, ny, nz]);
        }
        
        // crear pieza temporal para chekear colision
        const pieza_temp = {
            rotaciones: [forma_nueva],
            indice_rotacion: 0,
            x: this.pieza_actual.x,
            y: this.pieza_actual.y,
            z: this.pieza_actual.z
        };
        
        if (this.detectar_colision(pieza_temp, 0, 0, 0)) {
            // si colisiona no rotar
            console.log('rotasion blokeada en eje ' + eje.toUpperCase() + ' - ay colision');
        } else {
            // rotasion exitosa - actualizar la forma de la pieza
            this.pieza_actual.rotaciones[this.pieza_actual.indice_rotacion] = forma_nueva;
            this.sonido_rotar();
            this.renderizar_pieza();
            console.log('rotado ' + angulo + ' grados en eje ' + eje.toUpperCase() + ' - exitoso');
        }
    }
    
    actualizar_posicion_camara() {
        // calcular posicion de camara en coordenadas esfericas
        const centro_x = ANCHO_TABLERO / 2;
        const centro_y = ALTO_TABLERO / 2;
        const centro_z = PROFUNDIDAD_TABLERO / 2;
        
        // convertir angulos a radianes
        const angulo_h_rad = this.camara_angulo_h * Math.PI / 180;
        const angulo_v_rad = this.camara_angulo_v * Math.PI / 180;
        
        // calcular posicion usando coordenaddas esfericas
        const ojo_x = centro_x + this.camara_distancia * Math.cos(angulo_v_rad) * Math.sin(angulo_h_rad);
        const ojo_y = centro_y + this.camara_distancia * Math.sin(angulo_v_rad);
        const ojo_z = centro_z + this.camara_distancia * Math.cos(angulo_v_rad) * Math.cos(angulo_h_rad);
        
        // actualizar camaara
        this.camera.position.set(ojo_x, ojo_y, ojo_z);
        this.camera.lookAt(centro_x, centro_y, centro_z);
        
        // actualizar target de orbit controls
        if (this.controls) {
            this.controls.target.set(centro_x, centro_y, centro_z);
            this.controls.update();
        }
    }
    
    calcular_movimiento_relativo_camara(tecla) {
        // calcula el movimiento segun la tekla y orientacion de camara
        const ang_h_rad = this.camara_angulo_h * Math.PI / 180;
        
        let dx = 0;
        let dz = 0;
        
        // vectores direccionales segun orientacion de camaraa
        const adelante_x = -Math.sin(ang_h_rad);
        const adelante_z = -Math.cos(ang_h_rad);
        
        const derecha_x = Math.cos(ang_h_rad);
        const derecha_z = -Math.sin(ang_h_rad);
        
        // mapear teclas a movimientoss
        if (tecla === 'ArrowUp') {
            // mover adelante acia donde mira camara
            if (Math.abs(adelante_x) > Math.abs(adelante_z)) {
                dx = adelante_x > 0 ? 1 : -1;
                dz = 0;
            } else {
                dx = 0;
                dz = adelante_z > 0 ? 1 : -1;
            }
        } else if (tecla === 'ArrowDown') {
            // mover atras opuesto a donde mira camaraa
            if (Math.abs(adelante_x) > Math.abs(adelante_z)) {
                dx = adelante_x > 0 ? -1 : 1;
                dz = 0;
            } else {
                dx = 0;
                dz = adelante_z > 0 ? -1 : 1;
            }
        } else if (tecla === 'ArrowRight') {
            // mover a la derecha de la camaara
            if (Math.abs(derecha_x) > Math.abs(derecha_z)) {
                dx = derecha_x > 0 ? 1 : -1;
                dz = 0;
            } else {
                dx = 0;
                dz = derecha_z > 0 ? 1 : -1;
            }
        } else if (tecla === 'ArrowLeft') {
            // mover a la izquierda de la camaara
            if (Math.abs(derecha_x) > Math.abs(derecha_z)) {
                dx = derecha_x > 0 ? -1 : 1;
                dz = 0;
            } else {
                dx = 0;
                dz = derecha_z > 0 ? -1 : 1;
            }
        }
        
        return { dx, dz };
    }
    
    fijar_pieza() {
        console.log('fijando pieza al tablero');
        const forma = this.pieza_actual.rotaciones[this.pieza_actual.indice_rotacion];
        
        forma.forEach(([dx, dy, dz]) => {
            const x = this.pieza_actual.x + dx;
            const y = this.pieza_actual.y + dy;
            const z = this.pieza_actual.z + dz;
            
            if (x >= 0 && x < ANCHO_TABLERO && 
                y >= 0 && y < ALTO_TABLERO && 
                z >= 0 && z < PROFUNDIDAD_TABLERO) {
                this.tablero[x][y][z] = this.pieza_actual.color;
            }
        });
        
        this.piezas_colocadas++;  // incrementar contadorr
        
        // sumar puntos por pieza colocada
        this.puntaje += 10 * this.nivel;
        console.log('pieza numero ' + this.piezas_colocadas + ' colocada - puntos: +' + (10 * this.nivel));
        
        this.sonido_fijar();
        this.actualizar_hud();
        this.renderizar_tablero();
        this.limpiar_lineas();
        this.generar_pieza();
    }
    
    limpiar_lineas() {
        let lineas_eliminadas = 0;
        
        for (let y = 0; y < ALTO_TABLERO; y++) {
            let esta_llena = true;
            
            for (let x = 0; x < ANCHO_TABLERO; x++) {
                for (let z = 0; z < PROFUNDIDAD_TABLERO; z++) {
                    if (this.tablero[x][y][z] === 0) {
                        esta_llena = false;
                        break;
                    }
                }
                if (!esta_llena) break;
            }
            
            if (esta_llena) {
                // eliminar lineaa
                for (let yy = y; yy < ALTO_TABLERO - 1; yy++) {
                    for (let x = 0; x < ANCHO_TABLERO; x++) {
                        for (let z = 0; z < PROFUNDIDAD_TABLERO; z++) {
                            this.tablero[x][yy][z] = this.tablero[x][yy + 1][z];
                        }
                    }
                }
                
                // limpiar linea superiorr
                for (let x = 0; x < ANCHO_TABLERO; x++) {
                    for (let z = 0; z < PROFUNDIDAD_TABLERO; z++) {
                        this.tablero[x][ALTO_TABLERO - 1][z] = 0;
                    }
                }
                
                lineas_eliminadas++;
                y--; // revisar misma linea de nuebo
            }
        }
        
        if (lineas_eliminadas > 0) {
            // sistema de puntuasion progresibo
            let puntos = 0;
            if (lineas_eliminadas === 1) {
                puntos = 100 * this.nivel;
            } else if (lineas_eliminadas === 2) {
                puntos = 300 * this.nivel;
            } else if (lineas_eliminadas === 3) {
                puntos = 500 * this.nivel;
            } else {  // 4 o mass
                puntos = 800 * this.nivel;
            }
            
            // actualizar puntaje y lineass
            this.puntaje += puntos;
            this.lineas += lineas_eliminadas;
            
            // calcular nuevo nivel cada 10 lineas sube de nivel
            const nivel_anterior = this.nivel;
            this.nivel = Math.floor(this.lineas / 10) + 1;
            
            // si subio de nivel aumentar velocidadd
            if (this.nivel > nivel_anterior) {
                this.velocidad_caida = Math.max(100, 1000 - (this.nivel - 1) * 50);
                console.log('NIVEL ' + this.nivel + ' - velocidad: ' + this.velocidad_caida + 'ms');
            }
            
            console.log('puntos ganados: ' + puntos + ' | puntaje total: ' + this.puntaje + ' | nivel: ' + this.nivel + ' | lineas: ' + this.lineas);
            
            this.sonido_linea();
            this.actualizar_hud();
            this.renderizar_tablero();
        }
    }
    
    caer() {
        if (!this.mover_pieza(0, -1, 0)) {
            this.fijar_pieza();
        }
    }
    
    caida_rapida() {
        if (this.juego_terminado || this.pausado) return;
        
        this.sonido_drop();
        while (this.mover_pieza(0, -1, 0)) {
            // caida rapidaa
        }
        this.fijar_pieza();
    }
    
    inicializar_controles() {
        document.addEventListener('keydown', (e) => {
            if (this.juego_terminado && e.key !== 'r' && e.key !== 'R') return;
            
            switch(e.key) {
                // movimientos con flechas relativos a camara
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'ArrowUp':
                case 'ArrowDown':
                    const { dx, dz } = this.calcular_movimiento_relativo_camara(e.key);
                    this.mover_pieza(dx, 0, dz, true);  // true = con sonido
                    e.preventDefault();
                    break;
                case ' ':
                    this.caida_rapida();
                    e.preventDefault();
                    break;
                    
                // rotaciones eje x con q w e
                case 'q':
                case 'Q':
                    this.rotar_pieza_eje('x', 90);
                    break;
                case 'w':
                case 'W':
                    this.rotar_pieza_eje('x', 180);
                    break;
                case 'e':
                case 'E':
                    this.rotar_pieza_eje('x', -90);
                    break;
                    
                // rotaciones eje y con a s d
                case 'a':
                case 'A':
                    this.rotar_pieza_eje('y', 90);
                    break;
                case 's':
                case 'S':
                    this.rotar_pieza_eje('y', 180);
                    break;
                case 'd':
                case 'D':
                    this.rotar_pieza_eje('y', -90);
                    break;
                    
                // rotaciones eje z con z x c
                case 'z':
                case 'Z':
                    this.rotar_pieza_eje('z', 90);
                    break;
                case 'x':
                case 'X':
                    this.rotar_pieza_eje('z', 180);
                    break;
                case 'c':
                case 'C':
                    this.rotar_pieza_eje('z', -90);
                    break;
                
                // controles de camara con numpad
                case '2':
                    // camara abajo angulo vertical menos
                    this.camara_angulo_v -= 10;
                    if (this.camara_angulo_v < -10) this.camara_angulo_v = -10;
                    this.actualizar_posicion_camara();
                    console.log(`Cámara inclinada abajo (${this.camara_angulo_v}°)`);
                    break;
                case '4':
                    // camara izquierda angulo orizontal menos
                    this.camara_angulo_h -= 15;
                    if (this.camara_angulo_h < 0) this.camara_angulo_h += 360;
                    this.actualizar_posicion_camara();
                    console.log(`Cámara rotada izquierda (${this.camara_angulo_h}°)`);
                    break;
                case '6':
                    // camara derecha angulo orizontal mass
                    this.camara_angulo_h += 15;
                    if (this.camara_angulo_h >= 360) this.camara_angulo_h -= 360;
                    this.actualizar_posicion_camara();
                    console.log(`Cámara rotada derecha (${this.camara_angulo_h}°)`);
                    break;
                case '8':
                    // camara arriba angulo vertikal mas
                    this.camara_angulo_v += 10;
                    if (this.camara_angulo_v > 85) this.camara_angulo_v = 85;
                    this.actualizar_posicion_camara();
                    console.log(`Cámara inclinada arriba (${this.camara_angulo_v}°)`);
                    break;
                case '5':
                    // reset camara a posicion inicial
                    this.camara_distancia = 40.0;
                    this.camara_angulo_h = 46.0;
                    this.camara_angulo_v = 30.0;
                    this.actualizar_posicion_camara();
                    console.log('Cámara reseteada a posición inicial');
                    break;
                case '+':
                case '=':
                    // asercar camaraa
                    this.camara_distancia -= 3;
                    if (this.camara_distancia < 15) this.camara_distancia = 15;
                    this.actualizar_posicion_camara();
                    console.log(`Cámara acercada (distancia: ${this.camara_distancia})`);
                    break;
                case '-':
                case '_':
                    // alejar camaara
                    this.camara_distancia += 3;
                    if (this.camara_distancia > 80) this.camara_distancia = 80;
                    this.actualizar_posicion_camara();
                    console.log(`Cámara alejada (distancia: ${this.camara_distancia})`);
                    break;
                    
                // otros controless
                case 'p':
                case 'P':
                    this.alternar_pausa();
                    break;
                case 'r':
                case 'R':
                    this.reiniciar();
                    break;
            }
        });
    }
    
    alternar_pausa() {
        this.pausado = !this.pausado;
        
        if (this.pausado) {
            console.log('juego pausado');
            this.mostrar_mensaje('PAUSADO<br><small>Presiona P para continuar</small>');
            this.audio.theme.pause();
        } else {
            console.log('juego reanudado');
            this.ocultar_mensaje();
            this.audio.theme.play();
        }
    }
    
    reiniciar() {
        console.log('reinisiando juego');
        this.tablero = this.crear_tablero_vacio();
        this.puntaje = 0;
        this.lineas = 0;
        this.nivel = 1;
        this.piezas_colocadas = 0;  // resetear contadoor
        this.juego_terminado = false;
        this.pausado = false;
        this.velocidad_caida = 1000;
        this.pieza_siguiente = this.obtener_pieza_aleatoria();
        this.generar_pieza();
        this.renderizar_tablero();
        this.actualizar_hud();
        this.ocultar_mensaje();
        this.reproducir_audio();
        console.log('juego reinisiado - empesando de nuevo');
    }
    
    terminar_juego() {
        this.juego_terminado = true;
        
        // guardar puntaje en mejores puntajes
        this.agregar_puntaje(this.puntaje, this.nivel, this.lineas, this.piezas_colocadas);
        
        // contar cubos en el tableero
        let cubos_fijos = 0;
        for (let x = 0; x < ANCHO_TABLERO; x++) {
            for (let y = 0; y < ALTO_TABLERO; y++) {
                for (let z = 0; z < PROFUNDIDAD_TABLERO; z++) {
                    if (this.tablero[x][y][z] !== 0) cubos_fijos++;
                }
            }
        }
        
        const mensaje = `
            <div style="color: #f44336; font-size: 32px; margin-bottom: 20px;">GAME OVER</div>
            <div style="font-size: 18px; line-height: 1.8;">
                Puntaje final: <strong>${this.puntaje}</strong><br>
                Nivel alcanzado: <strong>${this.nivel}</strong><br>
                Líneas completadas: <strong>${this.lineas}</strong><br>
                Piezas colocadas: <strong>${this.piezas_colocadas}</strong><br>
                Cubos en tablero: <strong>${cubos_fijos}</strong>
            </div>
            <div style="margin-top: 20px; color: #aaa;">Presiona R para reiniciar</div>
        `;

        this.mostrar_mensaje(mensaje, true);
        this.audio.theme.pause();
        console.log('\nGAME OVER');
    }
    
    mostrar_mensaje(text, isGameOver = false) {
        const msgDiv = document.getElementById('message');
        const msgText = document.getElementById('message-text');
        msgText.innerHTML = text;
        if (isGameOver) {
            msgText.classList.add('game-over');
        } else {
            msgText.classList.remove('game-over');
        }
        msgDiv.classList.add('show');
    }
    
    ocultar_mensaje() {
        document.getElementById('message').classList.remove('show');
    }
    
    actualizar_hud() {
        document.getElementById('score').textContent = this.puntaje;
        document.getElementById('level').textContent = this.nivel;
        document.getElementById('lines').textContent = this.lineas;
        document.getElementById('pieces').textContent = this.piezas_colocadas;
    }
    
    cargar_mejores_puntajes() {
        // cargar puntajes desde localStorage
        const stored = localStorage.getItem('tetris3d_highscores');
        if (stored) {
            this.mejores_puntajes = JSON.parse(stored);
        } else {
            this.mejores_puntajes = [];
        }
    }
    
    guardar_mejores_puntajes() {
        // guardar puntajes en localStorage
        localStorage.setItem('tetris3d_highscores', JSON.stringify(this.mejores_puntajes));
    }
    
    agregar_puntaje(puntaje, nivel, lineas, piezas) {
        // agregar nuevo puntaje
        const fecha = new Date().toLocaleDateString('es-ES');
        this.mejores_puntajes.push({
            puntaje: puntaje,
            nivel: nivel,
            lineas: lineas,
            piezas: piezas,
            fecha: fecha
        });
        
        // ordenar por puntaje descendente
        this.mejores_puntajes.sort((a, b) => b.puntaje - a.puntaje);
        
        // mantener solo los mejores 10
        this.mejores_puntajes = this.mejores_puntajes.slice(0, 10);
        
        this.guardar_mejores_puntajes();
        this.mostrar_mejores_puntajes();
    }
    
    mostrar_mejores_puntajes() {
        const lista = document.getElementById('scores-list');
        if (!lista) return;
        
        if (this.mejores_puntajes.length === 0) {
            lista.innerHTML = '<div style="text-align: center; color: #999;">Sin puntajes aun</div>';
            return;
        }
        
        lista.innerHTML = this.mejores_puntajes.map((entry, index) => `
            <div class="score-entry">
                <span class="rank">${index + 1}.</span>
                <span>${entry.puntaje} pts</span>
                <span style="font-size: 11px; color: #999;">Nv${entry.nivel}</span>
            </div>
        `).join('');
    }
    
    reproducir_audio() {
        console.log('intentando reproducir audio');
        // solo reproducir el tema principal (no ambos a la vez)
        this.audio.theme.play().then(() => {
            console.log('tema de tetris reprodusiendose');
        }).catch(e => {
            // si falla pausar el juego y mostrar mensaje al usuario
            console.log('audio bloqueado - esperando interaccion del usuario');
            this.pausado = true;
            this.mostrar_mensaje('Presiona cualquier tecla o click para comenzar', false);
            
            // esperar primer click o tecla
            const activarAudio = () => {
                this.audio.theme.play().then(() => {
                    console.log('tema de tetris activado');
                    this.pausado = false;
                    this.ocultar_mensaje();
                }).catch(err => console.log('error al reproducir audio:', err));
            };
            
            // escuchar cualquier interaccion
            document.addEventListener('click', activarAudio, { once: true });
            document.addEventListener('keydown', activarAudio, { once: true });
        });
    }
    
    al_redimensionar_ventana() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(
            Math.min(window.innerWidth, 1400),
            Math.min(window.innerHeight, 900)
        );
        this.actualizar_posicion_camara();
    }
    
    actualizar(deltaTime) {
        if (this.juego_terminado || this.pausado) return;
        
        this.ultimo_tiempo_caida += deltaTime;
        
        if (this.ultimo_tiempo_caida >= this.velocidad_caida) {
            this.caer();
            this.ultimo_tiempo_caida = 0;
        }
    }
    
    animar() {
        requestAnimationFrame(() => this.animar());
        const currentTime = performance.now();
        const deltaTime = currentTime - (this.lastTime || currentTime);
        this.lastTime = currentTime;
        
        this.actualizar(deltaTime);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
// Aca iniciamos el juego
window.addEventListener('DOMContentLoaded', () => {
    new TetrisGame();
});
