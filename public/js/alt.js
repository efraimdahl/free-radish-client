// setInterval(() => console.log(joystick.getPosition()), 16);

let fireing = false;
let timerId;

function createJoystick(parent) {
    console.log("Hello i was called with parent ", parent)
    const maxDiff = 100;
    const stick = document.createElement('div');
    stick.classList.add('joystick');

    stick.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    stick.addEventListener('touchstart', handleMouseDown);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('touchend', handleMouseUp);

    let dragStart = null;
    let currentPos = { x: 0, y: 0 };

    function handleMouseDown(event) {
        stick.style.transition = '0s';
        if (event.changedTouches) {
            dragStart = {
                x: event.changedTouches[0].clientX,
                y: event.changedTouches[0].clientY,
            };
            return;
        }
        dragStart = {
            x: event.clientX,
            y: event.clientY,
        };

    }

    function handleMouseMove(event) {
        if (dragStart === null) return;
        event.preventDefault();
        if (event.changedTouches) {
            event.clientX = event.changedTouches[0].clientX;
            event.clientY = event.changedTouches[0].clientY;
        }
        const xDiff = event.clientX - dragStart.x;
        const yDiff = event.clientY - dragStart.y;
        const angle = Math.atan2(yDiff, xDiff);
        const distance = Math.min(maxDiff, Math.hypot(xDiff, yDiff));
        let xNew = distance * Math.cos(angle);
        let yNew = distance * Math.sin(angle);
        stick.style.transform = `translate3d(${xNew}px, ${yNew}px, 0px)`;
        currentPos = { x: xNew, y: yNew };
        throttleFunction(sendInput,currentPos,200)
        xNew = xNew/100
        yNew = yNew/100
        let agl = Math.atan2(xNew,yNew) * 180/Math.PI
        let mag = Math.sqrt(xNew*xNew + yNew*yNew)
        console.log("This is your angle: ",agl,", mag: ", mag,)
    }

    function handleMouseUp(event) {
        if (dragStart === null) return;
        stick.style.transition = '.2s';
        stick.style.transform = `translate3d(0px, 0px, 0px)`;
        dragStart = null;
        currentPos = { x: 0, y: 0 };
        let agl = Math.tan(Math.atan(x/y)) * 180/Math.PI
        let mag = Math.sqrt(x*x + y*y)
        console.log("This is your angle: ",agl,", mag: ", mag,)
    }

    parent.appendChild(stick);
    return {
        getPosition: () => currentPos,
    };
}


function sendInput(input) {
    console.log(input);
}
function activate_fire_button(ref) {
    ref.addEventListener('mousedown', function () {
        fireing = true;
        sendInput('fire')
    });
    ref.addEventListener('touchstart', function () {
        fireing = true;
        sendInput('fire')
    });

    ref.addEventListener('mousemove', function () {
        if (fireing) {
            fireing = false
            sendInput('fireup')
        }
    })
    ref.addEventListener('touchmove', function () {
        if (fireing) {
            fireing = false
            sendInput('fireup')
        }
    })

    ref.addEventListener('mouseup', function () {
        if (fireing) {
            fireing = false
            sendInput('fireup')
        }
    })
    ref.addEventListener('touchend', function () {
        if (fireing) {
            fireing = false
            sendInput('fireup')
        }
    })
    ref.addEventListener('touchcancel', function () {
        if (fireing) {
            fireing = false
            sendInput('fireup')
        }
    })
}



// Throttle function: Input as function which needs to be throttled and delay is the time interval in milliseconds
let  throttleFunction  =  function (func,input, delay) {
	// If setTimeout is already scheduled, no need to do anything
	if (timerId) {
		return
	}
	// Schedule a setTimeout after delay seconds
	timerId  =  setTimeout(function () {
		func(input)
		// Once setTimeout function execution is finished, timerId = undefined so that in <br>
		// the next scroll event function execution can be scheduled by the setTimeout
		timerId  =  undefined;
	}, delay)
}


let ref = document.getElementById('wrapper')
console.log(ref)
const joystick = createJoystick(ref);


activate_fire_button(document.querySelector('#bang-bang'))

window.oncontextmenu = function (event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
};

