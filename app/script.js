var items = []

function draw() {
    var ctx = document.getElementById('dropzone').getContext('2d');
	for(let i = 0; i < items.length; i++){
		var img = new Image();
		img.onload = function(){
			ctx.drawImage(img, items[i].x, items[i].y)
		}
		img.src = items[i].img;
	}
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
	console.log(this)
	console.log(ev);
    var data = ev.dataTransfer.getData("text");
	items.push({
		img: `img/${data}.jpg`,
		x: 0,
		y: 0
	})
	draw();
//	console.log(data)
//    ev.target.appendChild(document.getElementById(data));
}