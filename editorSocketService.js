var redisClient = require("../modules/redisClient");
const TIMEOUT_IN_SECONDS = 3600;

module.exports = function(io) {
    // collaboration sessions
    var collaborations = {};
    
    // map from socket id to problem id
    var socketIdToProblemId = {};
    
    var sessionPath = '/temp_sessions/';
    
    io.on('connection', socket => {
        let problemId = socket.handshake.query['problemId'];
        
        // socketIdToProblemId['1234ABCD'] = 1
        socketIdToProblemId[socket.id] = problemId;
        
        // add socket.id to corresponding collaboration session participants
        // if (!(problemId in collaborations)) {
        //     collaborations[problemId] = {
        //         'participants': []
        //     };
        // }
        
        // example:
        // problemId: 1
        // socket.id: 1234ABCD, 7890ABCD
        // collaborations[1]['participants']: [1234ABCD, 7890ABCD]
        // collaborations[problemId]['participants'].push(socket.id);
        
        if (problemId in collaborations) {
            collaborations[problemId]['participants'].push(socket.id);
        } else {
            redisClient.get(sessionPath + problemId, (data) => {
                if (data) {
                    console.log('session terminated previously, pulling back from redis');
                    collaborations[problemId] = {
                        'participants': [],
                        'cachedInstructions': JSON.parse(data)
                    };
                } else {
                    console.log('creating new session');
                    collaborations[problemId] = {
                        'participants': [],
                        'cachedInstructions': []
                    };
                }
                
                // given a problem id, get all participants
                collaborations[problemId]['participants'].push(socket.id);
            });
        }
        
        // socket event listeners
        socket.on('change', delta => {
            console.log("change " + socketIdToProblemId[socket.id] + " " + delta);
            let problemId = socketIdToProblemId[socket.id];
            
            if (problemId in collaborations) {
                // save instructions to collaborations
                collaborations[problemId]['cachedInstructions'].push(
                    ['change', delta, Date.now()]);
                
                let participants = collaborations[problemId]['participants'];
                
                for (let i = 0; i < participants.length; i++) {
                    if (socket.id != participants[i]) {
                        io.to(participants[i]).emit('change', delta);
                    }
                }
            } else {
                console.log('warning: could not tie socket id to any collaborations');
            }
        });
        
        socket.on('restoreBuffer', () => {
            let problemId = socketIdToProblemId[socket.id];
            console.log('restore buffer for problem: ' + problemId + ', socket id: ' + socket.id);
            
            if (problemId in collaborations) {
                let instructions = collaborations[problemId]['cachedInstructions'];
                
                for (let i = 0; i < instructions.length; i++) {
                    socket.emit(instructions[i][0], instructions[i][1]);
                }
            } else {
                console.log('no collaboration found for this socket');
            }
        });
        
        socket.on('disconnect', () => {
            let problemId = socketIdToProblemId[socket.id];
            console.log('disconnect problem: ' + problemId + ', socket id: ' + socket.id);
            
            let foundAndRemoved = false;
            
            if (problemId in collaborations) {
                let participants = collaborations[problemId]['participants'];
                let index = participants.indexOf(socket.id);
                
                if (index >= 0) {
                    participants.splice(index, 1);
                    foundAndRemoved = true;
                    
                    if (participants.length === 0) {
                        console.log('last participant is leaving, commit to redis');
                        
                        let key = sessionPath + problemId;
                        let value = JSON.stringify(collaborations[problemId]['cachedInstructions']);
                        
                        redisClient.set(key, value, redisClient.redisPrint);
                        redisClient.expire(key, TIMEOUT_IN_SECONDS);
                        
                        delete collaborations[problemId];
                    }
                }
            }
            
            if (!foundAndRemoved) {
                console.log('warning: could not find socket id in collaborations');
            }
        });
    });
    
    
    //first content
    // io.on('connection', (socket) => {
    //     console.log(socket);
        
    //     var message = socket.handshake.query['message'];
    //     console.log(message);
        
    //     io.to(socket.id).emit('message', 'Hi from server');
    // });
}