function BoundingBoxControls (object3d, model, controls, camera)
{
    "use strict";

    THREE.Object3D.call (this);

    //   1____2
    // 5/___6/|   maxCorner=6
    // | 0__|_3   minCorner=0
    // 4/___7/

    var indicesArr = new Uint16Array ([0, 1, 0, 4, 0, 3, 5, 1, 5, 4, 5, 6, 2, 1, 2, 6, 2, 3, 7, 6, 7, 4, 7, 3]),
        affectedAxes =                [1, 4, 2, 5, 0, 3, 5, 2, 4, 1, 0, 3, 3, 0, 2, 5, 4, 1, 1, 4, 3, 0, 5, 2], // minX=0, minY=1, minZ=2
        affectedAxis,                                                                                           // maxX=3, maxY=4, maxZ=5
        minCornerXidxs = [0, 3, 12, 15], minCornerYidxs = [1, 10, 13, 22], minCornerZidxs = [2, 5, 8, 11],
        maxCornerXidxs = [6, 9, 18, 21], maxCornerYidxs = [4, 7, 16, 19],  maxCornerZidxs = [14, 17, 20, 23],
        axisToIdxs = [minCornerXidxs, minCornerYidxs, minCornerZidxs, maxCornerXidxs, maxCornerYidxs, maxCornerZidxs],
        posArr = new Float32Array (3 * 8),
        mouseLast = new THREE.Vector2 (),
        resizeDirection = new THREE.Vector2 (),
        isResizing = false,

        arrow1 = new THREE.ArrowHelper (new THREE.Vector3 (), new THREE.Vector3 (), 30, 0xffff55, 10, 7),
        arrow2 = new THREE.ArrowHelper (new THREE.Vector3 (), new THREE.Vector3 (), 30, 0xffff55, 10, 7),
        controlBox = new THREE.Line (new THREE.BufferGeometry (),
                                     new THREE.LineBasicMaterial ({ visible:     true,
                                                                    transparent: true,
                                                                    opacity:     0,
                                                                    color:       0x555555 }),
                                     THREE.LinePieces);

    arrow1.visible = false;
    arrow2.visible = false;
    arrow1.line.material.linewidth = 3;
    arrow2.line.material.linewidth = 3;

    document.addEventListener ('mousedown', onMouseDown);

    controlBox.geometry.addAttribute ('index',    new THREE.BufferAttribute (indicesArr, 1));
    controlBox.geometry.addAttribute ('position', new THREE.BufferAttribute (posArr,     3));

    controlBox.add (object3d);

    this.add (controlBox);
    this.add (arrow1);
    this.add (arrow2);

    new PathObserver (model, 'boundingBox.minCorner.x').open (function (newPos, oldPos) { showControlBoxResize (newPos, oldPos, 0); });
    new PathObserver (model, 'boundingBox.minCorner.y').open (function (newPos, oldPos) { showControlBoxResize (newPos, oldPos, 1); }); 
    new PathObserver (model, 'boundingBox.minCorner.z').open (function (newPos, oldPos) { showControlBoxResize (newPos, oldPos, 2); });
    new PathObserver (model, 'boundingBox.maxCorner.x').open (function (newPos, oldPos) { showControlBoxResize (newPos, oldPos, 3); });
    new PathObserver (model, 'boundingBox.maxCorner.y').open (function (newPos, oldPos) { showControlBoxResize (newPos, oldPos, 4); });
    new PathObserver (model, 'boundingBox.maxCorner.z').open (function (newPos, oldPos) { showControlBoxResize (newPos, oldPos, 5); });

    updatePos (model.boundingBox.minCorner.x, minCornerXidxs);
    updatePos (model.boundingBox.minCorner.y, minCornerYidxs);
    updatePos (model.boundingBox.minCorner.z, minCornerZidxs);
    updatePos (model.boundingBox.maxCorner.x, maxCornerXidxs);
    updatePos (model.boundingBox.maxCorner.y, maxCornerYidxs);
    updatePos (model.boundingBox.maxCorner.z, maxCornerZidxs);

    controlBox.geometry.computeBoundingSphere ();
    controlBox.geometry.computeBoundingBox ();
    var initialBox = controlBox.geometry.boundingBox.clone ();

    this.raycast = function (raycaster)
    {
        if (!isResizing)
        {
            if (raycaster.ray.isIntersectionBox (controlBox.geometry.boundingBox))
            {
                var intersects = raycaster.intersectObject (controlBox, false);
                if (intersects.length > 0)
                {
                    var v1idx = intersects[0].index,
                        v2idx = intersects[0].index + 1,
                        v1 = new THREE.Vector3 ().fromArray (posArr, indicesArr[v1idx] * 3),
                        v2 = new THREE.Vector3 ().fromArray (posArr, indicesArr[v2idx] * 3),
                        pointer = intersects[0].point;

                    if (pointer.distanceToSquared (v1) < pointer.distanceToSquared (v2))
                    {
                        affectedAxis = affectedAxes[v1idx];
                        updateArrows (v1.clone (), v1.sub (v2).normalize ());
                        resizeDirection = toScreen (arrow1.position).sub (toScreen (v1.add (arrow1.position)));
                    }
                    else
                    {
                        affectedAxis = affectedAxes[v2idx];
                        updateArrows (v2.clone (), v2.sub (v1).normalize ());
                        resizeDirection = toScreen (arrow1.position).sub (toScreen (v2.add (arrow1.position)));
                    }
                    controls.enabled = false;

                    arrow1.visible = true;
                    arrow2.visible = true;
                }
                else
                {
                    controls.enabled = true;

                    arrow1.visible = false;
                    arrow2.visible = false;
                }

                controlBox.geometry.attributes.position.needsUpdate = true;
                showControlBox ();
            }
            else
            {
                hideControlBox ();
            }
        }
    };

    function onMouseDown (evnt)
    {
        if (arrow1.visible === false) return;

        isResizing = true;

        mouseLast.set (evnt.clientX, evnt.clientY);

        document.addEventListener ('mousemove', onMouseMove);
        document.addEventListener ('mouseup',   onMouseUp);
    }

    function onMouseMove (evnt)
    {
        if (!isResizing) return;

        evnt.preventDefault  ();
        evnt.stopPropagation ();

        var mouseDelta = new THREE.Vector2 (evnt.clientX - mouseLast.x, evnt.clientY - mouseLast.y),
            delta = mouseDelta.dot (resizeDirection),
            oldPos = getPos (axisToIdxs[affectedAxis]),
            newPos = affectedAxis < 3 ? oldPos - delta : oldPos + delta;

        newPos = validateResize (newPos, affectedAxis);
        modelUpdate (newPos, affectedAxis);

        mouseLast.set (evnt.clientX, evnt.clientY);
    }

    function onMouseUp ()
    {
        isResizing = false;

        document.removeEventListener ('mousemove', onMouseMove);
        document.removeEventListener ('mouseup',   onMouseUp);

        document.addEventListener ('mousedown', onMouseDown);
    }

    function resize (newPos, oldPos, affectedAxis)
    {
        var currBox = controlBox.geometry.boundingBox;

        updatePos (newPos, axisToIdxs[affectedAxis]);
        controlBox.geometry.computeBoundingBox ();

        switch (affectedAxis % 3)
        {
            case 0:
                arrow1.position.x = newPos;
                arrow2.position.x = newPos;
                object3d.position.setX (object3d.position.x + (newPos - oldPos) / 2);
                object3d.scale.setX ((currBox.max.x - currBox.min.x) / (initialBox.max.x - initialBox.min.x));
                break;
            case 1:
                arrow1.position.y = newPos;
                arrow2.position.y = newPos;
                object3d.position.setY (object3d.position.y + (newPos - oldPos) / 2);
                object3d.scale.setY ((currBox.max.y - currBox.min.y) / (initialBox.max.y - initialBox.min.y));
                break;
            case 2:
                arrow1.position.z = newPos;
                arrow2.position.z = newPos;
                object3d.position.setZ (object3d.position.z + (newPos - oldPos) / 2);
                object3d.scale.setZ ((currBox.max.z - currBox.min.z) / (initialBox.max.z - initialBox.min.z));
                break;
        }
        controlBox.geometry.computeBoundingSphere ();
        controlBox.geometry.attributes.position.needsUpdate = true;
    }

    function getPos (idxs) { return posArr[idxs[0]]; }

    function updatePos (v, idxs)
    {
        idxs.forEach (function (idx)
        {
            posArr[idx] = v;
        });
    }

    function toScreen (v)
    {
        var vector = v.clone ().project (camera);
        return new THREE.Vector2 ((vector.x + 1) / 2 * controls.domElement.clientWidth,
                                 -(vector.y - 1) / 2 * controls.domElement.clientHeight);
    }

    var showTween, hideTween;
    function showControlBox ()
    {
        if (controlBox.material.opacity != 1 && showTween === undefined)
        {
            showTween = new TWEEN.Tween (controlBox.material).to ({ opacity: 1 }, 1000)
            .onStop     (function () { showTween = undefined; })
            .onComplete (function () { showTween = undefined; });

            if (hideTween) hideTween.stop ();

            showTween.start ();
        }
    }

    function showControlBoxResize (newPos, oldPos, axis)
    {
        if (!isResizing && controlBox.material.opacity != 1 && showTween === undefined)
        {
            isResizing = true;

            showTween = new TWEEN.Tween (controlBox.material).to ({ opacity: 1 }, 1000)
            .onComplete (function () { showTween = undefined; isResizing = false; });

            if (hideTween) hideTween.stop ();

            hideTween = new TWEEN.Tween (controlBox.material).to ({ opacity: 0 }, 1000)
            .delay (1000)
            .onStop     (function () { hideTween = undefined; })
            .onComplete (function () { hideTween = undefined; });

            showTween.chain (hideTween).start ();
        }
        
        resize (validateResize (newPos, axis), validateResize (oldPos, axis), axis);
    }

    function hideControlBox ()
    {
        if (controlBox.material.opacity !== 0 && hideTween === undefined)
        {
            hideTween = new TWEEN.Tween (controlBox.material).to ({ opacity: 0 }, 1000)
            .onStop     (function () { hideTween = undefined; })
            .onComplete (function () { hideTween = undefined; });

            if (showTween)
                showTween.stop ();

            hideTween.start ();

            controls.enabled = true;

            arrow1.visible = false;
            arrow2.visible = false;
        }
    }

    function validateResize (newPos, axis)
    {
        switch (axis)
        {
            case 0: if (getPos (axisToIdxs[3]) - 10 < newPos) return getPos (axisToIdxs[3]) - 10; break;
            case 1: if (getPos (axisToIdxs[4]) - 10 < newPos) return getPos (axisToIdxs[4]) - 10; break;
            case 2: if (getPos (axisToIdxs[5]) - 10 < newPos) return getPos (axisToIdxs[5]) - 10; break;
            case 3: if (newPos < getPos (axisToIdxs[0]) + 10) return getPos (axisToIdxs[0]) + 10; break;
            case 4: if (newPos < getPos (axisToIdxs[1]) + 10) return getPos (axisToIdxs[1]) + 10; break;
            case 5: if (newPos < getPos (axisToIdxs[2]) + 10) return getPos (axisToIdxs[2]) + 10; break;
        }

        if (newPos < -100)   return -100;
        if (100    < newPos) return  100;

        return newPos;
    }

    function modelUpdate (newPos, axis)
    {
        switch (axis)
        {
            case 0: model.boundingBox.minCorner.x = newPos; break;
            case 1: model.boundingBox.minCorner.y = newPos; break;
            case 2: model.boundingBox.minCorner.z = newPos; break;
            case 3: model.boundingBox.maxCorner.x = newPos; break;
            case 4: model.boundingBox.maxCorner.y = newPos; break;
            case 5: model.boundingBox.maxCorner.z = newPos; break;
        }
    }

    function updateArrows (pos, dir)
    {
        arrow1.position.copy (pos);
        arrow2.position.copy (pos);

        arrow1.setDirection (dir);
        arrow2.setDirection (dir.negate ());
    }
}

BoundingBoxControls.prototype = Object.create (THREE.Object3D.prototype);
