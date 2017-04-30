
//FightCode can only understand your robot
//if its class is called Robot
var Robot = function(robot) {
};

var time = 0;
var timer = {
  lastCooldown: 0,
  lastLoggedTime: 0
};
var found = false;
var history = {
  enemies: {},
  allies: {}
};
var initialized = false;

// INIT

function init(ev){
  var robot = ev.robot;
  //robot.clone();
  setupAllyIfRequired(robot);
  initialized = true;
}

function setupAllyIfRequired(robot){
  if(!history.allies[robot.id]){
    history.allies[robot.id] = {
      target: {
        x: null,
        y: null,
        robotId: null,
        time: null,
        adjustmentDeg: null
      },
      cannon: 'searching',
      markers: []
    }
  }
}

function setupEnemyIfRequired(robot){
  if(!history.enemies[robot.id]){
    history.enemies[robot.id] = {
      markers: []
    }
  }
}


// TIME MONITORING & LOGGING

function updateTime(ev){
  var robot = ev.robot;
  var timeElapsed = 0;
  if(!robot.parentId){
    if(timer.lastCooldown < robot.gunCoolDownTime){
      timeElapsed = 50 - robot.gunCoolDownTime + timer.lastCooldown;
      handleHasFired(ev)
    } else {
      timeElapsed = (timer.lastCooldown - robot.gunCoolDownTime);
    }
    timer.lastCooldown = robot.gunCoolDownTime;
    time += timeElapsed;
  }
}

function runLog(ev){
  if(timer.lastLoggedTime < (time - 2000)){
    console.log('\n\n\n\n\nTIME: ' + time)
    timer.lastLoggedTime = time;
    console.log(JSON.stringify(ev.robot))
    console.log(JSON.stringify(history))

  }
}

function executeTick(ev){
  updateTime(ev);
  runLog(ev);
  handleCannonAction(ev);
  handleTankMovement(ev);
  fire(ev);
}

function handleCannonAction(ev){
  var robot = ev.robot;
  if(history.allies[robot.id] && history.allies[robot.id].cannon == 'searching'){
    cannonSearch(ev);
  }
}

function handleTankMovement(ev){
  var robot = ev.robot;
  robot.ahead(3)
}

// CANNON

function fire(ev){
  var robot = ev.robot;
  robot.fire();
}

function cannonSearch(ev){
  var robot = ev.robot;
  robot.rotateCannon(5);
}

function handleHasFired(ev){
  var lastTargetTime = 30;
  var robot = ev.robot;
  if(history.allies[robot.id].target.time < time - lastTargetTime){
    history.allies[robot.id].cannon = 'searching';
  }
}



// TARGET TRAJECTORY

function getEnemyHistory(target){
  return history.enemies[target.id].markers;
}

function getPredictedBearing(target){
  return target.angle;
}

function getPredictedSpeed(target){
  console.log('..getting predicted speed...')
  var enemyHistory = getEnemyHistory(target);
  if (enemyHistory.length > 1){
    var marker1 = enemyHistory[enemyHistory.length - 1];
    var marker2 = enemyHistory[enemyHistory.length - 2];
    if(isMoving(marker1, marker2)){
      return 1;
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}

function getTargetAngle(robot, target){
  var p1 = robot.position;
  var p2 = target.position;
  var angleDeg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
  return angleDeg;
}


function isMoving(a, b){
  console.log('...checking if moving')
  var tolerance = 50;
  var changeX = (a.position.x - b.position.x)/(b.time - a.time);
  var changeY = (a.position.y - b.position.y)/(b.time - a.time);
  console.log('MOVEMENT ' + changeX + ', ' + changeY)
  if((changeX + changeY)*100 > tolerance){
    console.log('determined is moving')
    return true;
  } else {
    console.log('determined is not moving')
    return false;
  }
}

function getNewPositionFromVector(target, bearing, distance){
  console.log('...getting new position from vector')
  var newPosition = {
    x: target.position.x + Math.cos(bearing) * distance,
    y: target.position.y + Math.sin(bearing) * distance
  };
  return newPosition;
}

function getPositionUponCooldown(robot, target){
  console.log('...getting enemy position upon cooldown...');
  var bearing = getPredictedBearing(target);
  var distance = getPredictedSpeed(target) * robot.gunCoolDownTime;
  var estimatedPos = getNewPositionFromVector(target, bearing, distance);
  return estimatedPos;
}

function getRelativeAngle(point, aimpoint){
  console.log('ROBOT POS ' + JSON.stringify(point))
  console.log('ENEMY POS ' + JSON.stringify(aimpoint))

  var deltaX = point.x - aimpoint.x;
  var deltaY = point.y - aimpoint.y;
  var rad = Math.atan2(deltaY, deltaX);
  var deg = rad * (180 / Math.PI);
  return deg;
}

// ENEMY TRACKING

function markEnemy(enemy){
  enemy.time = time;
  setupEnemyIfRequired(enemy);
  history.enemies[enemy.id].markers.push(enemy);
}

function targetEnemy(robot, target){
  var estimatedPos = getPositionUponCooldown(robot, target);
  console.log('ESTIMATED POS ' + JSON.stringify(estimatedPos))
  var aimpointAngle = getRelativeAngle(robot.position, estimatedPos);
  console.log('NEW ANGLE: ' + aimpointAngle)
  history.allies[robot.id].cannon = 'targeting';
  var adjustmentDeg = robot.cannonAbsoluteAngle - aimpointAngle;
  console.log('ADJUSTMENT DEG: ' + adjustmentDeg)
  var targetingSpecs = {
    robotId: target.id,
    position: estimatedPos,
    adjustmentDeg: adjustmentDeg,
    time: time
  }
  setTarget(robot, targetingSpecs);
  robot.rotateCannon(adjustmentAngle);
}

function setTarget(robot, specs){
  history.allies[robot.id].target = specs;
}


// QUERIES

function isEnemy(robot){
  if(history.allies[robot.id]){
    return false;
  } else {
    return true;
  }
}



// Root functions

Robot.prototype.onIdle = function(ev) {
  var robot = ev.robot;
  if(!initialized){
    init(ev)
  }
  executeTick(ev);

};

Robot.prototype.onScannedRobot = function(ev) {
    var robot = ev.robot;
    var scanned = ev.scannedRobot;
    if(isEnemy(scanned)){
      console.log('FOUND ENEMY')
      markEnemy(scanned);
      targetEnemy(robot, scanned);
    };
};

Robot.prototype.onWallCollision = function(ev) {
};
