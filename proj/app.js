import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, mult, rotateX, rotateY, rotateZ, rotate, translate} from "../../libs/MV.js";
import { modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, multTranslation, popMatrix, pushMatrix } from "../../libs/stack.js";

import * as CUBE from '../../libs/objects/cube.js';
import * as SPHERE from '../../libs/objects/sphere.js';
import * as CYLINDER from '../../libs/objects/cylinder.js'
import * as TORUS from "../../libs/objects/torus.js";

function setup(shaders) {
    // Colors
    const white = [1.0, 1.0, 1.0, 1.0];
    const black = [0.0, 0.0, 0.0, 1.0];
    const gray = [0.4, 0.4, 0.4, 1.0];
    const dark_gray = [0.3, 0.3, 0.3, 1.0];
    const light_gray = [0.7, 0.7, 0.7, 1.0];
    const red = [1.0, 0.0, 0.0, 1.0];
    const dark_red = [0.8, 0.0, 0.0, 1.0];
    const yellow = [1.0, 1.0, 0.0, 1.0];
    const orange = [1.0, 0.66, 0.0, 1.0];
    const dark_orange = [0.8, 0.5, 0.0, 1.0];
    const blue = [0.0, 0.6, 1.0, 1.0];
    const light_blue = [0.0, 0.6, 0.8, 0.8];

    // Wheels metrics and positions
    let wheelRadius = 0.2;
    
    // Floor's tiles metrics
    const tileSize = 0.1;
    const tileHeight = 0.01;

    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    /** @type WebGL2RenderingContext */
    let gl = setupWebGL(canvas);
    // Variables and constants
    let mode = gl.TRIANGLES;
    // Initial zoom level for the view
    let zoom = 1.2;
    //// Initial rotation angle around the Y-axis for the axonometric view
    let theta = -25;
    // Initial rotation angle around the X-axis for the axonometric view
    let gama = 25;
    // Initial rotation angle of the car
    let carRot = 0;
    // Initial rotation angle of the wheels
    let wheelRot = 0;  
    // Initial angle of the ladder
    let angleLadder = -10;
    // Initial rotation angle of the ladder
    let ladderRot = 0;
    // Initial extension length of the ladder
    let ladderExtension = 0;
    // Step for the car movement
    let moveStep = 0.01;
    // Number of steps for the ladder
    let ladderSteps = 8;

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let wheelWidth, distXWheels, distZWheels, blinkerRadius;
    let wheelPos, frontBlinkerPos, backBlinkerPos, carPos;
    let wheelPositions, blinkers;

    function initMetrics(){
        wheelWidth = wheelRadius/2;
        wheelPos = [wheelRadius*2, 0, wheelWidth*3];
        wheelPositions = [
            [-wheelPos[0], -wheelPos[1], wheelPos[2]],
            [wheelPos[0], -wheelPos[1], wheelPos[2]],
            [-wheelPos[0], -wheelPos[1], -wheelPos[2]],
            [wheelPos[0], -wheelPos[1], -wheelPos[2]]
        ];
        distXWheels = (wheelPos[0] * 2) - wheelRadius - wheelWidth;
        distZWheels = (wheelPos[2] * 2) - wheelWidth/2;
       
        // Blinkers metrics and positions
        frontBlinkerPos = [-(wheelRadius*3), wheelRadius*1.2, distZWheels/2];
        backBlinkerPos = [wheelRadius*3+wheelWidth/2, wheelRadius*0.35, distZWheels*0.4];
        blinkerRadius = wheelWidth*0.6;
    
        
        // Defines blinkers positions, color, state and count
        blinkers = [
            { position: frontBlinkerPos, color: orange , blinking: false, blinkCount: 0 },
            { position: [frontBlinkerPos[0], frontBlinkerPos[1], -frontBlinkerPos[2]], color: orange, blinking: false, blinkCount: 0 },
            { position: backBlinkerPos, color: orange, blinking: false, blinkCount: 0 },
            { position: [backBlinkerPos[0], backBlinkerPos[1], -backBlinkerPos[2]], color: orange, blinking: false, blinkCount: 0 },
        ];
        
        // Initial position of the car
        carPos = [0, (wheelRadius+wheelWidth)/2, 0];    
    }

    initMetrics();
    
    let mProjection = ortho(-aspect * zoom, aspect * zoom, -zoom, zoom, -100, 100);

    // Define the different views for the scene
    const front_view = lookAt([0, 0, 10], [0, 0, 0], [0, 1, 0]);
    const left_view = mult(front_view, rotateY(90));
    const top_view = mult(front_view, rotateX(90));
    let axo_view = mult(mult(front_view, rotateX(gama)), rotateY(theta));
    
    let big_view = axo_view;
    let all_views = false;
    let visiblePanel = true;

    resize_canvas();
    
    window.addEventListener('resize', resize_canvas);

    window.addEventListener("wheel", function (event) {
        zoom *= 1 + (event.deltaY / 1000);
    });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Function responsible for updating the axonometric view
    function updateAxoView() {
        let axo_before = axo_view;
        axo_view = mult(mult(front_view, rotateX(gama)), rotateY(theta));
        if (big_view === axo_before) {
            big_view = axo_view; 
        }
    }
        
    // Function responsible for resetting the axonometric view
    function resetAxoView() {
        theta = -25;
        gama = 25;
        updateAxoView();
    }
    
    // Function that handles panel switching
    function togglePanel() {
        if (visiblePanel) {
            document.getElementById("panel").style.display = "block";
        } else {
            document.getElementById("panel").style.display = "none";
        }
    }

    // Function to handle each command key down event listener
    document.onkeydown = function (event) {
        switch (event.key.toLowerCase()) {
            case '1':
                // Front view
                all_views = false;
                big_view = front_view;
                break;
            case '2':
                // Left view
                all_views = false;
                big_view = left_view;
                break;
            case '3':
                // Top view
                all_views = false;
                big_view = top_view;
                break;
            case '4':
                // Axonometric view
                all_views = false;
                big_view = axo_view;
                break;
            case '0':
                //All views
                all_views = !all_views;
                break;
            case 'h':
                //Toggles panel
                visiblePanel = !visiblePanel;
                togglePanel();
                break;
            case 'q':
                //Rotate ladder CCW
                ladderRot += 5;
                break;
            case 'e':
                //Rotate ladder CW
                ladderRot -= 5;
                break;
            case 'w':
                //Raise ladder
                angleLadder -= 5;
                if (angleLadder < -90) angleLadder = -90;
                break;
            case 's':
                //Lower ladder
                angleLadder += 5;
                if (angleLadder > 0) angleLadder = 0;
                break;
            case 'o':
                //Extend ladder
                ladderExtension += 0.1*wheelRadius;
                if (ladderExtension > wheelRadius*3.5-wheelWidth*1.5){
                    ladderExtension = wheelRadius*2.9;
                } 
                break;
            case 'p':
                //Reduce ladder
                ladderExtension -= 0.1*wheelRadius;
                if (ladderExtension < 0){
                    ladderExtension = 0;
                }
                break;
            case 'a':
                //Move forward
                carPos[0] -= moveStep;
                if (carPos[0] < -0.5) {
                    carPos[0] = -0.5;
                }
                wheelRot += (moveStep / (2 * Math.PI * wheelRadius)) * 360;
                break;
            case 'd':
                //Move backward
                carPos[0] += moveStep;
                if (carPos[0] > 0.5){
                    carPos[0] = 0.5;
                }
                wheelRot -= (moveStep / (2 * Math.PI * wheelRadius)) * 360;
                break;
            case 'arrowup':
                //Increase gamma
                gama += 1;
                updateAxoView();
                break;
            case 'arrowdown':
                //Decrease gamma
                gama -= 1;
                updateAxoView();
                break;
            case 'arrowright':
                //Increase theta
                theta += 1;
                updateAxoView();
                break; 
            case 'arrowleft':
                //Decrease theta
                theta -= 1;  
                updateAxoView(); 
                break;
            case 'r':
                //Reset view params
                resetAxoView();
                break;
            case ' ':
                //Change drawing mode
                mode = (mode === gl.TRIANGLES) ? gl.LINES : gl.TRIANGLES;
                break;
            case 'wheelup':
                // Zoom in
                zoom += 0.1;
                break;
            case 'wheeldown':
                // Zoom out
                zoom -= 0.1;
                break;
            case 'l':
                // Turn on the blinkers
                blinkers.forEach(blinker => {
                    blinker.blinking = true;
                    blinker.blinkCount = 0;
                });
                break;
            case 'i':
                // Increase wheel radius
                wheelRadius += 0.01;
                if (wheelRadius > 0.5){
                    wheelRadius = 0.5;
                } else {
                    zoom += 0.05;
                }
                initMetrics();
                break;
            case 'k':
                // Decrease wheel radius
                wheelRadius -= 0.01;
                if (wheelRadius < 0.1){
                    wheelRadius = 0.1;
                } else {
                    zoom -= 0.05;
                }
                initMetrics();
                if (ladderExtension > wheelRadius*3.5-wheelWidth*1.5){
                    ladderExtension = wheelRadius*2.9;
                } 
                break;
            case 'm':
                // Increase steps
                ladderSteps += 1;
                if (ladderSteps > 20){
                    ladderSteps = 20;
                }
                break;
            case 'n':
                // Decrease steps
                ladderSteps -= 1;
                if (ladderSteps < 5){
                    ladderSteps = 5;
                }
                break;
        }
    }

    gl.clearColor(0.1, 0.7, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST); 

    // Initialize objects
    CUBE.init(gl);
    SPHERE.init(gl);
    CYLINDER.init(gl);
    TORUS.init(gl);

    window.requestAnimationFrame(render);

    function resize_canvas(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0, 0, canvas.width, canvas.height);
        mProjection = ortho(-aspect * zoom, aspect * zoom, -zoom, zoom, 100, -100);
    }

    function setColor(color){
        gl.uniform4fv(gl.getUniformLocation(program, "u_color"), color);
    }

    function uploadProjection() {
        uploadMatrix("u_projection", mProjection);
    }

    function uploadModelView() {
        uploadMatrix("u_model_view", modelView());
    }

    function uploadMatrix(name, m) {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, name), false, flatten(m));
    }

    // Function responsible for handling the floor design in a checkered floor
    function drawFloor() {
        for(let i = -10; i < 10; i++) {
            for(let j = -10; j < 10; j++) {
                pushMatrix();
                multTranslation([i*tileSize+tileSize/2, 0, j*tileSize+tileSize/2]); 
                multScale([tileSize, tileHeight, tileSize]); 
                uploadModelView();
                if ((i + j) % 2 === 0) {
                    setColor(dark_gray); 
                } else {
                    setColor(white); 
                }
                CUBE.draw(gl, program, mode); 
                setColor(gray);
                CUBE.draw(gl, program, gl.LINES);
                popMatrix();
            }
        }
    }

    // Function responsible for handling the wheels des
    function drawWheels() {
        wheelPositions.forEach(pos => {
            // Initial wheel design
            pushMatrix();
            multTranslation(pos);
            multRotationX(90);
            multRotationY(wheelRot);
            multScale([wheelRadius, wheelWidth, wheelRadius]);
            pushMatrix();

            // Wheel
            uploadModelView();
            setColor(black);
            TORUS.draw(gl, program, mode);
            setColor(dark_gray);
            TORUS.draw(gl, program, gl.LINES);
            popMatrix();

            // Wheel rim
            pushMatrix();
            multScale([1, wheelWidth/2, 1]);
            uploadModelView();
            setColor(gray); 
            CYLINDER.draw(gl, program, mode);
            setColor(dark_gray);
            CYLINDER.draw(gl, program, gl.LINES);
            popMatrix();

            // Wheel axis
            for (let i = 0; i < 2; i++) {
                pushMatrix();
                if (i === 0) {
                    multRotationY(90);
                }
                multScale([1, wheelWidth/2+0.1, 0.1]);
                uploadModelView();
                setColor(red);
                CUBE.draw(gl, program, mode);
                setColor(dark_red);
                CUBE.draw(gl, program, gl.LINES);
                popMatrix();
            }

            popMatrix();
        });
    }

    // Function responsible for handling the truck's body design
    function drawBody() {
        let baseHeight = wheelRadius*0.7;
        let baseWidth = distXWheels+wheelRadius*3;
        // Truck's base
        pushMatrix();
        multTranslation([0, wheelRadius/3, 0]); 
        pushMatrix();
        multScale([baseWidth, baseHeight, distZWheels]);
        uploadModelView();
        setColor(red); 
        CUBE.draw(gl, program, mode);
        setColor(dark_red);
        CUBE.draw(gl, program, gl.LINES);
        popMatrix();

        for (let i = -1; i < 2; i += 2) {
            // Side bumpers
            pushMatrix();
            multTranslation([0, 0, i*(distZWheels+wheelWidth/2)/2]);
            multScale([distXWheels-wheelWidth/4, baseHeight, wheelWidth/2]);
            uploadModelView();
            setColor(white); 
            CUBE.draw(gl, program, mode);
            setColor(light_gray);
            CUBE.draw(gl, program, gl.LINES);
            popMatrix();

            // Front and back bumpers
            pushMatrix();
            multTranslation([i*(distXWheels+wheelWidth), 0, 0]);
            multScale([wheelWidth, baseHeight, distZWheels+wheelWidth]);
            pushMatrix();
            uploadModelView();
            setColor(white); 
            CUBE.draw(gl, program, mode);
            setColor(light_gray);
            CUBE.draw(gl, program, gl.LINES);
            popMatrix();

            // Car plate (orange)
            pushMatrix();
            multTranslation([i/2, 0, 0]);
            multScale([0.01, 0.5, 0.45]); 
            pushMatrix();
            uploadModelView();
            setColor(orange); 
            CUBE.draw(gl, program, mode);
            setColor(dark_orange);
            CUBE.draw(gl, program, gl.LINES);
            popMatrix();

            // Car plate (blue)
            pushMatrix();
            multTranslation([i,0,i*0.4]); 
            multScale([0,1,0.25]); 
            uploadModelView();
            setColor(blue); 
            CUBE.draw(gl, program, mode);
            setColor(light_blue);
            CUBE.draw(gl, program, gl.LINES);
            popMatrix();

            // CGI
            for (let j = 0; j < 3; j++){
                for (let k = -1; k < 2; k+=2){
                    pushMatrix();
                    multTranslation([0.1*i, k*0.25, -i*((j*0.2)-0.07)]);
                    multScale([1, 0.05, 0.1]);
                    uploadModelView();
                    setColor(black);
                    CUBE.draw(gl, program, mode);
                    CUBE.draw(gl, program, gl.LINES);
                    popMatrix();
                }
                pushMatrix();
                if (j === 2){
                    multTranslation([i, 0, -i*((j*0.2)-0.07)]);
                } else {
                    multTranslation([i, 0, -i*((j*0.2)-0.12)]);
                }
                if (j ===1){
                    pushMatrix();
                    multTranslation([0, -0.15, -i*0.1]);
                    multScale([1, 0.2, 0.01]);
                    uploadModelView();
                    setColor(black);
                    CUBE.draw(gl, program, mode);
                    CUBE.draw(gl, program, gl.LINES);
                    popMatrix();

                    pushMatrix();
                    multRotationX(90);
                    multTranslation([0, -i*0.08, 0.05]);
                    multScale([1, 0.05, 0.01]);
                    uploadModelView();
                    setColor(black);
                    CUBE.draw(gl, program, mode);
                    CUBE.draw(gl, program, gl.LINES);
                    popMatrix();
                }
                multScale([0.05, 0.5, 0.01]);
                uploadModelView();
                setColor(black);
                CUBE.draw(gl, program, mode);
                CUBE.draw(gl, program, gl.LINES);
                popMatrix();
            }
            popMatrix();
            popMatrix();
        }

        // Red stripe where the truck's cabin and loading area are located
        pushMatrix();
        multTranslation([0, wheelWidth, 0]);  
        multScale([baseWidth+wheelWidth*1.5, wheelWidth*0.55, distZWheels+wheelWidth]);
        uploadModelView();
        setColor(dark_red);
        CUBE.draw(gl, program, mode);
        setColor(red); 
        CUBE.draw(gl, program, gl.LINES);
        popMatrix();

        // Truck's cabin
        pushMatrix();
        multTranslation([-wheelRadius*2, wheelRadius*1.64, 0]);
        pushMatrix();
        multScale([wheelRadius*2, wheelRadius*2, distZWheels+wheelWidth]);
        uploadModelView();
        setColor(red);
        CUBE.draw(gl, program, mode);
        setColor(dark_red);
        CUBE.draw(gl, program, gl.LINES);
        popMatrix();
        
        // Cabin's side windows
        for (let i = -1; i < 2; i += 2) {
            pushMatrix();
            multTranslation([-wheelWidth/2, wheelRadius*0.1, i*(distZWheels/2+wheelWidth/2)]);
            multScale([wheelRadius*1.3, wheelRadius*1.3, tileHeight]);
            uploadModelView();
            setColor(light_blue); 
            CUBE.draw(gl, program, mode);
            setColor(dark_gray);
            CUBE.draw(gl, program, gl.LINES);
            popMatrix();
        }

        // Cabin's frontal window
        pushMatrix();
        multTranslation([-wheelRadius, wheelRadius*0.1, 0]);
        multScale([tileHeight, wheelRadius*1.3, wheelRadius*3]);
        uploadModelView();
        setColor(light_blue);
        CUBE.draw(gl, program, mode);
        setColor(dark_gray);
        CUBE.draw(gl, program, gl.LINES);
        popMatrix();
           
        // Truck load
        pushMatrix();
        multTranslation([wheelRadius*3.1, -wheelWidth*0.4, 0]);
        multScale([wheelRadius*3.8, wheelRadius*1.6, distZWheels+wheelWidth]);
        pushMatrix();
        uploadModelView();
        setColor(red); 
        CUBE.draw(gl, program, mode);
        setColor(dark_red);
        CUBE.draw(gl, program, gl.LINES);
        popMatrix();

        // Truck load's back doors
        for (let i = -1; i < 2; i += 2) {
            pushMatrix();
            multTranslation([0.5, 0, i*0.25]);
            multScale([tileHeight*0.1, 1, 0.5]);
            pushMatrix();
            uploadModelView();
            setColor(red);
            CUBE.draw(gl, program, mode);
            setColor(dark_red);
            CUBE.draw(gl, program, gl.LINES);
            popMatrix();

            // Handles
            multTranslation([1, -0.1, -i*0.3]);
            multScale([0, 0.03, 0.2]);
            setColor(gray);
            uploadModelView();
            CUBE.draw(gl, program, mode);
            setColor(dark_gray);
            CUBE.draw(gl, program, gl.LINES);
            popMatrix();
        }
        
        popMatrix();
        popMatrix();
        popMatrix();

        //Blinkers
        drawBlinkers();
    } 
        
    function drawLadder() {
        let truckCenter = [wheelRadius*2,wheelWidth*5.4,0];
        
        // Orange cylinder where the ladder is attached
        pushMatrix();
        multTranslation(truckCenter); 
        multRotationY(ladderRot);
        pushMatrix();
        multScale([wheelRadius*1.3, wheelWidth/2, wheelRadius*1.3]); 
        uploadModelView();
        setColor(orange); 
        CYLINDER.draw(gl, program, mode);
        setColor(dark_orange);
        CYLINDER.draw(gl, program, gl.LINES);
        popMatrix();

        // Ladder base
        pushMatrix();
        multTranslation([0, wheelWidth*0.6, 0]); 
        pushMatrix();
        multScale([wheelWidth*1.5, wheelWidth, wheelWidth*1.5]); 
        uploadModelView();
        setColor(gray); 
        CUBE.draw(gl, program, mode);
        setColor(dark_gray);
        CUBE.draw(gl, program, gl.LINES);
        popMatrix(); 

        // Lader and steps
        for (let i = 0; i < 2; i++) {
            pushMatrix();
            for  (let j = -1; j < 2; j += 2) {
                pushMatrix();
                multTranslation([0, 0, j*((wheelWidth*0.8))]);
                multRotationZ(angleLadder); 
                if(i === 1){
                    multTranslation([-ladderExtension-wheelWidth*0.1, wheelWidth*0.3, 0]);
                }
                multTranslation([-wheelRadius*1.6, wheelWidth*0.1, 0]);
                if (j === 1) {
                    pushMatrix();
                }
                multScale([wheelRadius*3.5, wheelWidth*0.25, wheelWidth*0.2]);
                uploadModelView();
                setColor(gray);
                CUBE.draw(gl, program, mode);
                setColor(dark_gray);
                CUBE.draw(gl, program, gl.LINES);
                popMatrix();
            }

            let stepWidth = wheelRadius*2.9/ladderSteps;

            for (let k = 0; k < ladderSteps; k++) {
                pushMatrix();
                if(i === 1){
                    multTranslation([(stepWidth*k)-wheelRadius*1.5-0.02, 0, -wheelWidth*0.8]);
                } else {
                    multTranslation([(stepWidth*k)-wheelRadius*1.6, 0, -wheelWidth*0.8]);
                }
                multScale([stepWidth*0.3, wheelWidth*0.1, wheelWidth*1.5]);
                uploadModelView();
                setColor(gray);
                CUBE.draw(gl, program, mode);
                setColor(dark_gray);
                CUBE.draw(gl, program, gl.LINES);
                popMatrix();
            }
            popMatrix();
        }
        popMatrix();

    }

    // Function responsible for the blinkers design
    function drawBlinkers() {
        blinkers.forEach(blinker => {
            pushMatrix();
            multTranslation(blinker.position);
            multScale([0.01, blinkerRadius, blinkerRadius]);
            setColor(blinker.color);
            uploadModelView();
            SPHERE.draw(gl, program, mode); 
            popMatrix();
        });
    }
        
    // Function responsible for handling the overall car design
    function drawCar() {
        pushMatrix();
        multTranslation(carPos);
        multRotationY(carRot);
        drawWheels();
        drawBody();
        drawLadder();
        popMatrix();
    }

    // Top level function responsible for the scene design (car and floor)
    function draw_scene(view) {
        gl.useProgram(program);
    
        mProjection = ortho(-aspect * zoom, aspect * zoom, -zoom, zoom, -100, 100);
        uploadProjection();
    
        loadMatrix(view);
    
        drawFloor();
        drawCar();
    }
  
    // Function responsible for handling the blinkers
    function handleBlinkers() {
        blinkers.forEach(blinker => {
            if (blinker.blinking) {
                blinker.blinkCount++;
                if (blinker.blinkCount % 20 < 10) {
                    blinker.color = yellow; 
                } else {
                    blinker.color = orange; 
                }
                if (blinker.blinkCount >= 100) {
                    blinker.blinking = false;
                    blinker.blinkCount = 0;
                    blinker.color = orange; 
                }
            }
        });
    }

    function draw_views() {
        let hw = canvas.width / 2;
        let hh = canvas.height / 2;
    
        if (all_views) {
            // Draw on front view
            gl.viewport(0, hh, hw, hh);
            draw_scene(front_view);
    
            // Draw on top view
            gl.viewport(0, 0, hw, hh);
            draw_scene(top_view);
    
            // Draw on left view
            gl.viewport(hw, hh, hw, hh);
            draw_scene(left_view);
    
            // Draw of 4th view
            gl.viewport(hw, 0, hw, hh);
            draw_scene(axo_view);
        }
        else {
            gl.viewport(0, 0, canvas.width, canvas.height);
            draw_scene(big_view);
        }
    }

    function render() {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        handleBlinkers();
        draw_views();
    }

}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))