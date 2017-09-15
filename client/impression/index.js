
function main() {
    var array = window.helpMe.childNodes[1].childNodes[3].childNodes[0].childNodes
    normalize(array[1])
    for (var i = 1; i < array.length-1; i += 2){
        printArray(array[i])
    }
    var routeCard = window.routeCard
    var route = document.getElementById('routeCard')
    route.innerHTML = routeCard.outerHTML
    route.innerHTML = document.getElementsByClassName('RouteDirections')[0].outerHTML
    console.log(route)
}


function printArray (elem){
    var className = elem.className
    var target = document.getElementsByClassName(className)[1]
    target.innerHTML = elem.innerHTML
}

function normalize(elem){
    var elemRoute = elem.getElementsByClassName('RouteSegment')
    var listMode = []
    for (var i = 0; i < elemRoute.length; i++){
        var walk = elemRoute[i].getElementsByClassName("icon-walk")
        var bus = elemRoute[i].getElementsByClassName("icon-bus")
        var bike = elemRoute[i].getElementsByClassName("icon-bike")
        var rentBike = elemRoute[i].getElementsByClassName("icon-cabi")
        var car = elemRoute[i].getElementsByClassName("icon-carshare")
        if (walk.length > 0){
            listMode.push('marche')
        }
        if (bike.length > 0){
            listMode.push('vélo')
        }
        if (car.length > 0){
            listMode.push('car')
        }
        if (rentBike.length > 0){
            listMode.push('vélo de location')
        }
        if (bus.length > 0){
            var busLine = elemRoute[i].getElementsByClassName("shield outline-text")[0]
            var busNumber = busLine.innerHTML
            var busName = busLine.title
            listMode.push('bus ligne ' + busNumber + ', ' + busName)
        }
        if(walk.length == 0 && bus.length == 0 && bike.length == 0) {
            console.log('autre')
            console.log(elemRoute[i])
        }
    }
    var res = ''
    for (var i = 0; i < listMode.length; i++){
        res += (i==0 ? '' : "<br>") + listMode[i]
    }
    elem.innerHTML = res
}