(function () {
  'use strict';

  function Anchor(image, position) {
    this.image = image;
    this.position = position;
    this.size = { width: 6, height: 6 };
    this.pos = { x: 0, y: 0 };

    this.updatePosition();
  }

  Anchor.prototype.updatePosition = function () {
    switch(this.position) {
      case 'top-left': 
        this.pos.x = this.image.pos.x;
        this.pos.y = this.image.pos.y;
        break;
      case 'top-right': 
        this.pos.x = (this.image.pos.x + this.image.size.width);
        this.pos.y = this.image.pos.y;
        break;
      case 'bottom-left': 
        this.pos.x = this.image.pos.x;
        this.pos.y = (this.image.pos.y + this.image.size.height);
        break;
      case 'bottom-right':
        this.pos.x = (this.image.pos.x + this.image.size.width);
        this.pos.y = (this.image.pos.y + this.image.size.height);
        break;
    }

    this.pos.x = this.pos.x - this.size.width / 2;
    this.pos.y = this.pos.y - this.size.height / 2;
  };

  function ImageObject(image) {
    this.src = image;
    this.size = { width: image.width, height: image.height };
    this.pos = { x: 0, y: 0 };
    this.anchors = {
      topLeft: new Anchor(this, 'top-left'),
      topRight: new Anchor(this, 'top-right'),
      bottomLeft: new Anchor(this, 'bottom-left'),
      bottomRight: new Anchor(this, 'bottom-right')
    };
  }

  ImageObject.prototype.updateAnchorsPosition = function () {
    var anchors = this.anchors;

    Object.keys(anchors)
      .map(function (pos) { return anchors[pos] })
      .forEach(function (anchor) {
        anchor.updatePosition();
      });
  };

  ImageObject.prototype.moveTo = function (mousePos) {
    this.pos.x = mousePos.x;
    this.pos.y = mousePos.y;
    this.updateAnchorsPosition();
  };

  ImageObject.prototype.resizeTo = function (anchor, fromPos, toPos) {
    if (anchor.position === 'top-left') {
      this.size.width = this.size.width - (toPos.x - fromPos.x);
      this.size.height = this.size.height - (toPos.y - fromPos.y);
      this.moveTo({ x: toPos.x, y: toPos.y });
    }

    if (anchor.position === 'top-right') {
      this.size.width = this.size.width + (toPos.x - fromPos.x);
      this.size.height = this.size.height - (toPos.y - fromPos.y);
      this.moveTo({ x: this.pos.x, y: toPos.y });
    }

    if (anchor.position === 'bottom-left') {
      this.size.width = this.size.width - (toPos.x - fromPos.x);
      this.size.height = this.size.height + (toPos.y - fromPos.y);
      this.moveTo({ x: toPos.x, y: this.pos.y });
    }

    if (anchor.position === 'bottom-right') {
      this.size.width = this.size.width + (toPos.x - fromPos.x);
      this.size.height = this.size.height + (toPos.y - fromPos.y);
    }

    this.updateAnchorsPosition();
  };

  function CanvasEditor(canvas) {
	
    var images = [];
    var context = canvas.getContext('2d');
    var actionContext = {};
	
    addListeners();
    window.requestAnimationFrame(render);

    function addListeners() {
      context.canvas.addEventListener('drop', handleDrop, false);
      context.canvas.addEventListener('dragover', handleDragover, false);
      context.canvas.addEventListener('mousedown', handleMousedown, false);
      context.canvas.addEventListener('mousemove', handleMousemove, false);
      context.canvas.addEventListener('mouseup', handleMouseup, false);
      context.canvas.addEventListener('mouseout', handleMouseout, false);
    }

    function handleDrop(evt) {
      evt.stopPropagation();
      evt.preventDefault();

      var files = evt.dataTransfer.files;

      if (!files || files.length === 0) {
        return;
      }

      loadAndAddImageToCanvas(files[0]);
    }

    function handleDragover(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'copy';
    }

    function handleMousedown(evt) {
      actionContext.click = getMousePosition(evt);
      actionContext.drag = { from: actionContext.click, to: actionContext.click };
      actionContext.target = getClickedObject();
      actionContext.targetClickOffset = getTargetClickOffset();

      console.log(actionContext);
    }

    function handleMousemove(evt) {
      if (!actionContext.target) {
        return;
      }

      actionContext.drag = {
        from: actionContext.drag.to,
        to: getMousePosition(evt)
      };

      if (actionContext.target instanceof ImageObject) {
        actionContext.target.moveTo({
          x: actionContext.drag.to.x - actionContext.targetClickOffset.x,
          y: actionContext.drag.to.y - actionContext.targetClickOffset.y
        });
      }

      if (actionContext.target instanceof Anchor) {
        actionContext.target.image.resizeTo(actionContext.target, actionContext.drag.from, actionContext.drag.to);
      }
    }

    function handleMouseup(evt) {
      actionContext.target = null;
    }

    function handleMouseout(evt) {
      actionContext.target = null;
    }

    function getMousePosition(evt) {
      var canvasBoundings = context.canvas.getBoundingClientRect();

      return {
        x: evt.clientX - canvasBoundings.left,
        y: evt.clientY - canvasBoundings.top,
      };
    }

    function getTargetClickOffset() {
      if (!actionContext.target) {
        return;
      }

      return {
        x: (actionContext.click.x - actionContext.target.pos.x),
        y: (actionContext.click.y - actionContext.target.pos.y)
      };
    }

    function getReversedItems() {
      return images.slice().reverse();
    }

    function getClickedAnchor() {
      return getReversedItems()
        .map(function (image) { return image.anchors; })
        .map(function (anchors) {
          return Object.keys(anchors).map(function (key) { return anchors[key]; });
        })
        .reduce(function (arr, anchors) { return arr.concat(anchors) }, [])
        .find(function (anchor) {
          return collisionCheck(actionContext.click, anchor);
        });
    }

    function getClickedImage() {
      return getReversedItems()
        .find(function (image) {
          return collisionCheck(actionContext.click, image);
        });
    }

    function getClickedObject() {
      var anchor = getClickedAnchor();

      if (anchor) {
        return anchor;
      }

      return getClickedImage();
    }

    function collisionCheck(position, target) {
      return position.x > target.pos.x && position.x < (target.pos.x + target.size.width) &&
             position.y > target.pos.y && position.y < (target.pos.y + target.size.height);
    }

    function loadAndAddImageToCanvas(file) {
      var reader = new FileReader();

      reader.addEventListener('loadend', function () {
        addImageToCanvas(reader.result);
      });

      reader.readAsDataURL(file);
    }

    function addImageToCanvas(data) {
      var image = new Image();

      image.addEventListener('load', function () {
        images.push(new ImageObject(image));
      });

      image.src = data;
    }

    function drawImage(image) {
      context.drawImage(
        image.src,
        image.pos.x,
        image.pos.y,
        image.size.width,
        image.size.height
      );
    }

    function drawAnchors(image) {
      context.fillStyle = 'black';

      Object.keys(image.anchors)
        .map(function (position) { return image.anchors[position]; })
        .forEach(function (anchor) {
          context.fillRect(anchor.pos.x, anchor.pos.y, anchor.size.width, anchor.size.height);
        });
    }

    function render() {
      context.clearRect(0, 0, canvas.width, canvas.height);

      images.forEach(function (image) {
        drawImage(image);
        drawAnchors(image);
      });

      window.requestAnimationFrame(render);
    }
  }


  window.addEventListener('load', function () {
    var canvas = document.querySelector('canvas');
    var canvasEditor = new CanvasEditor(canvas);
  });

})();
	
	






