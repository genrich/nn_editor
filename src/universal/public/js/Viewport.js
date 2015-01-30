"use strict";

function Viewport (container)
{
    var camera, scene, renderer, controls, light,
        raycaster = new THREE.Raycaster (),
        mouse     = new THREE.Vector2 (-1, -1),
        controlsNotUpdating = true;

    scene = new THREE.Scene ();

    scene.add (new THREE.AmbientLight (0x404040));

    light = new THREE.DirectionalLight (0xffffff);
    scene.add (light);

    camera = new THREE.PerspectiveCamera (75, container.width () / container.height (), 1, 10000);
    camera.position.set (0, 0, 300);

    controls = new THREE.TrackballControls (camera, container[0]);
    controls.target.set (0, 0, 0);
    controls.addEventListener ('change', updateLightPosition);
    controls.addEventListener ('start',  function () { controlsNotUpdating = false; });
    controls.addEventListener ('end',    function () { controlsNotUpdating = true;  });
    updateLightPosition ();

    renderer = new THREE.WebGLRenderer ({ antialias: true });
    renderer.setClearColor ($('body').css ('background-color'));
    renderer.setSize (container.width (), container.height ());

    container.append (renderer.domElement);

    document.addEventListener ('mousemove', onDocumentMouseMove);
    window.addEventListener ('resize', onWindowResize);

    raycaster.linePrecision = 5;

    var minCornerX, minCornerY, minCornerZ, maxCornerX, maxCornerY, maxCornerZ,
        minCornerXidxs = [0, 3, 12, 15], minCornerYidxs = [1, 10, 13, 22], minCornerZidxs = [14, 17, 20, 23],
        maxCornerXidxs = [6, 9, 18, 21], maxCornerYidxs = [4, 7, 16, 19],  maxCornerZidxs = [2, 5, 8, 11],
        nodePos = [], nodePosAttr, nodeConns, factor;

    this.init = function (data)
    {
        factor = data.factor;

        var box = new THREE.Box3 (new THREE.Vector3 ().copy (data.boundingBox.minCorner),
                                  new THREE.Vector3 ().copy (data.boundingBox.maxCorner));

        minCornerX = box.min.x; minCornerY = box.min.y; minCornerZ = box.min.z;
        maxCornerX = box.max.x; maxCornerY = box.max.y; maxCornerZ = box.max.z;

        // create randomly distributed nodes
        // center
        nodePos.push (minCornerX + (maxCornerX - minCornerX) / 2,
                      minCornerY + (maxCornerY - minCornerY) / 2,
                      minCornerZ + (maxCornerZ - minCornerZ) / 2);
        // rest of the nodes
        for (var i = 1; i < data.nodeCount; ++i)
            nodePos.push (minCornerX + Math.random () * (maxCornerX - minCornerX),
                          minCornerY + Math.random () * (maxCornerY - minCornerY),
                          minCornerZ + Math.random () * (maxCornerZ - minCornerZ));

        // create node connections
        var geometry = new THREE.BufferGeometry ();
        geometry.boundingBox = box.clone ();
        nodePosAttr = new THREE.BufferAttribute (new Float32Array (nodePos), 3);
        geometry.addAttribute ('position', nodePosAttr);
        nodeConns = new THREE.Line (geometry, new THREE.LineBasicMaterial ({ color: 0x555555 }), THREE.LinePieces);
        refreshArbor ();
        scene.add (new BoundingBoxControls (nodeConns, data, controls, camera));
    };

    (function animate (timestamp)
    {
        controls.update ();
        renderer.render (scene, camera);

        raycaster.setFromCamera (mouse, camera);

        if (controlsNotUpdating)
        {
            scene.children.forEach (function (obj)
            {
                if (obj instanceof BoundingBoxControls)
                {
                    obj.raycast (raycaster);
                }
            });
        }

        Platform.performMicrotaskCheckpoint ();
        TWEEN.update (timestamp);

        requestAnimationFrame (animate);
    }) ();

    function onDocumentMouseMove (evnt)
    {
        mouse.x =  (evnt.clientX / window.innerWidth)  * 2 - 1;
        mouse.y = -(evnt.clientY / window.innerHeight) * 2 + 1;
    }

    function onWindowResize ()
    {
        camera.aspect = container.width () / container.height ();
        camera.updateProjectionMatrix ();

        renderer.setSize (container.width (), container.height ());
    }

    function updateLightPosition ()
    {
        light.position.copy (camera.position);
        light.target.position.copy (controls.target);
        light.target.updateMatrixWorld ();
    };

    function updateNodes (newNodeCount)
    {
        var nodeAttrPos   = nodeConns.geometry.attributes.position,
            newNodeLength = newNodeCount * 3;
        if (newNodeLength < nodeAttrPos.array.length)
        {
            nodePos = nodePos.slice (0, newNodeLength);
            nodePosAttr = new THREE.BufferAttribute (new Float32Array (nodeAttrPos.array.buffer.slice (0, newNodeLength * 4)), 3);
            nodeConns.geometry.addAttribute ('position', nodePosAttr);
        }
        else if (nodeAttrPos.array.length < newNodeLength)
        {
            var a         = new Float32Array (newNodeLength),
                oldCount  = nodeAttrPos.length / 3,
                oldLength = nodeAttrPos.length;
            a.set (nodeAttrPos.array);
            nodePosAttr = new THREE.BufferAttribute (a, 3);
            nodeConns.geometry.addAttribute ('position', nodePosAttr);
            for (var i = oldCount; i < newNodeCount; ++i)
                nodePos.push (minCornerX + Math.random () * (maxCornerX - minCornerX),
                              minCornerY + Math.random () * (maxCornerY - minCornerY),
                              minCornerZ + Math.random () * (maxCornerZ - minCornerZ));
            nodeConns.geometry.attributes.position.array.set (nodePos.slice (oldLength), oldLength);
            var box = boundingBox.geometry.attributes.position.array;
            updatePos (box[minCornerXidxs[0]], minCornerXidxs);
        }

        refreshArbor ();
    }

    function refreshArbor ()
    {
        var count     = nodePos.length,
            connCount = count / 3 - 1,
            currIdx   = 0,
            nodeInfos = new Array (count); // array of triplets: [0] flag processed
                                           //                    [1] nearest node id
                                           //                    [2] path length through nearest node

        nodeConns.geometry.addAttribute ('index', new THREE.BufferAttribute (new Uint16Array (connCount * 2), 1));

        var nodeConnsArr = nodeConns.geometry.attributes.index.array,
            nodePosArr   = nodePosAttr.array;

        for (var i = 0; i < count; i += 3) { nodeInfos[i] = 0.0; nodeInfos[i + 1] = 0.0; nodeInfos[i + 2] = Number.MAX_VALUE; }
        nodeInfos[0] = 1; // node 0(center/soma) is processed/ignored
        nodeInfos[2] = 0; // nearest node for soma is itself => path = 0.0

        for (var connIdx = 0; connIdx < connCount; ++connIdx)
        {
            var minIdx = 0, minDistance = Number.MAX_VALUE, pathLengthToCurr = nodeInfos[currIdx + 2];

            for (var probeIdx = 0; probeIdx < count; probeIdx += 3)
            {
                if (nodeInfos[probeIdx] == 0) // is not processed
                {
                    var d          = dist (currIdx, probeIdx),
                        pathLength = factor * d + pathLengthToCurr;

                    if (pathLength < nodeInfos[probeIdx + 2]) // closer through current node
                    {
                        nodeInfos[probeIdx + 1] = currIdx;              // update nearest node to current
                        nodeInfos[probeIdx + 2] = d + pathLengthToCurr; // and path length through current

                        if (pathLength < minDistance)
                        {
                            minDistance = pathLength;
                            minIdx      = probeIdx;
                        }
                    }
                    else
                    {
                        if (nodeInfos[probeIdx + 2] < minDistance) // probed idx path smaller than currently discoverd path lendth
                        {
                            minDistance = nodeInfos[probeIdx + 2]; // remember that path lenth
                            minIdx      = probeIdx;                // and index
                        }
                    }
                }
            }

            nodeConnsArr[2 * connIdx]     = minIdx                 / 3;
            nodeConnsArr[2 * connIdx + 1] = nodeInfos[minIdx + 1]  / 3; // take nearest node of remembered idx

            nodeInfos[minIdx] = 1; // mark nearest node as processed
            currIdx = minIdx;
        }

        function dist (aIdx, bIdx)
        {
            var deltaX = nodePosArr[bIdx]     - nodePosArr[aIdx],
                deltaY = nodePosArr[bIdx + 1] - nodePosArr[aIdx + 1],
                deltaZ = nodePosArr[bIdx + 2] - nodePosArr[aIdx + 2];
            deltaX *= deltaX;
            deltaY *= deltaY;
            deltaZ *= deltaZ;
            return Math.sqrt (deltaX + deltaY + deltaZ);
        }
    }
}

function BoundingBoxControls (object3d, model, controls, camera)
{
    THREE.Object3D.call (this);

    //   1____2
    // 5/___6/|   maxCorner=6
    // | 0__|_3   minCorner=0
    // 4/___7/

    var that = this,                // 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
        indicesArr = new Uint16Array ([0, 1, 0, 4, 0, 3, 5, 1, 5, 4, 5, 6, 2, 1, 2, 6, 2, 3, 7, 6, 7, 4, 7, 3]),
        affectedAxes =                [1, 4, 2, 5, 0, 3, 5, 2, 4, 1, 0, 3, 3, 0, 2, 5, 4, 1, 1, 4, 3, 0, 5, 2], // minX=0, minY=1, minZ=2
        affectedAxis,                                                                                           // maxX=3, maxY=4, maxZ=5
        minCornerXidxs = [0, 3, 12, 15], minCornerYidxs = [1, 10, 13, 22], minCornerZidxs = [2, 5, 8, 11],
        maxCornerXidxs = [6, 9, 18, 21], maxCornerYidxs = [4, 7, 16, 19],  maxCornerZidxs = [14, 17, 20, 23],
        affectedCoords = [minCornerYidxs, maxCornerYidxs, minCornerZidxs, maxCornerZidxs, minCornerXidxs, maxCornerXidxs,
                          maxCornerZidxs, minCornerZidxs, maxCornerYidxs, minCornerYidxs, minCornerXidxs, maxCornerXidxs,
                          maxCornerXidxs, minCornerXidxs, minCornerZidxs, maxCornerZidxs, maxCornerYidxs, minCornerYidxs,
                          minCornerYidxs, maxCornerYidxs, maxCornerXidxs, minCornerXidxs, maxCornerZidxs, minCornerZidxs],
        affectedCoord,
        posArr = new Float32Array (3 * 8),
        mouseDownState = { pointer: new THREE.Vector2 (), pos: 0 , objPos: new THREE.Vector3 () },
        resizeDirection = new THREE.Vector2 (),
        isNotResizing = true,

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

    new PathObserver (model, 'boundingBox.minCorner.x').open ( function (val)
    {
        showControlBoxResize ();
        // console.log (val);
        // updatePos (val, minCornerXidxs);
    });
    new PathObserver (model, 'boundingBox.minCorner.y').open ( function (val) { updatePos (val, minCornerYidxs); });
    new PathObserver (model, 'boundingBox.minCorner.z').open ( function (val) { updatePos (val, minCornerZidxs); });
    new PathObserver (model, 'boundingBox.maxCorner.x').open ( function (val) { updatePos (val, maxCornerXidxs); });
    new PathObserver (model, 'boundingBox.maxCorner.y').open ( function (val) { updatePos (val, maxCornerYidxs); });
    new PathObserver (model, 'boundingBox.maxCorner.z').open ( function (val) { updatePos (val, maxCornerZidxs); });

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
        if (isNotResizing)
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
                        affectedCoord = affectedCoords[v1idx];
                        updateArrows (v1.clone (), v1.sub (v2).normalize ());
                        resizeDirection = toScreen (arrow1.position).sub (toScreen (v1.add (arrow1.position)));
                    }
                    else
                    {
                        affectedAxis = affectedAxes[v2idx];
                        affectedCoord = affectedCoords[v2idx];
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
        if (arrow1.visible === false)
            return;

        isNotResizing = false;

        mouseDownState.pointer.set (evnt.clientX, evnt.clientY);
        mouseDownState.pos = getPos (affectedCoord);
        mouseDownState.objPos = object3d.position.clone ();

        document.addEventListener ('mousemove', onMouseMove);
        document.addEventListener ('mouseup',   onMouseUp);
    }

    function onMouseMove (evnt)
    {
        if (isNotResizing === true)
            return;

        evnt.preventDefault  ();
        evnt.stopPropagation ();

        resize (new THREE.Vector2 (evnt.clientX - mouseDownState.pointer.x, evnt.clientY - mouseDownState.pointer.y));
    }

    function onMouseUp (evnt)
    {
        isNotResizing = true;

        document.removeEventListener ('mousemove', onMouseMove);
        document.removeEventListener ('mouseup',   onMouseUp);

        document.addEventListener ('mousedown', onMouseDown);
    }

    function resize (mouseDelta)
    {
        var delta  = mouseDelta.dot (resizeDirection),
            newPos = affectedAxis < 3 ? mouseDownState.pos - delta : mouseDownState.pos + delta,
            currBox = controlBox.geometry.boundingBox;

        if (!validateModelUpdate (newPos, affectedAxis)) return;

        switch (affectedAxis % 3)
        {
            case 0:
                updatePos (newPos, affectedCoord);
                arrow1.position.x = newPos;
                arrow2.position.x = newPos;
                controlBox.geometry.computeBoundingBox ();
                object3d.position.setX (mouseDownState.objPos.x + (newPos - mouseDownState.pos) / 2);
                object3d.scale.setX ((currBox.max.x - currBox.min.x) / (initialBox.max.x - initialBox.min.x));
                break;
            case 1:
                updatePos (newPos, affectedCoord);
                arrow1.position.y = newPos;
                arrow2.position.y = newPos;
                controlBox.geometry.computeBoundingBox ();
                object3d.position.setY (mouseDownState.objPos.y + (newPos - mouseDownState.pos) / 2);
                object3d.scale.setY ((currBox.max.y - currBox.min.y) / (initialBox.max.y - initialBox.min.y));
                break;
            case 2:
                updatePos (newPos, affectedCoord);
                arrow1.position.z = newPos;
                arrow2.position.z = newPos;
                controlBox.geometry.computeBoundingBox ();
                object3d.position.setZ (mouseDownState.objPos.z + (newPos - mouseDownState.pos) / 2);
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

    function showControlBoxResize ()
    {
        if (controlBox.material.opacity != 1 && showTween === undefined)
        {
            isNotResizing = false;

            showTween = new TWEEN.Tween (controlBox.material).to ({ opacity: 1 }, 1000)
            .onComplete (function () { showTween = undefined; isNotResizing = true; });

            if (hideTween) hideTween.stop ();

            hideTween = new TWEEN.Tween (controlBox.material).to ({ opacity: 0 }, 1000)
            .delay (1000)
            .onStop     (function () { hideTween = undefined; })
            .onComplete (function () { hideTween = undefined; });

            showTween.chain (hideTween).start ();
        }
    }

    function hideControlBox ()
    {
        if (controlBox.material.opacity != 0 && hideTween === undefined)
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

    function validateModelUpdate (val, axis)
    {
        var b = model.boundingBox;

        if (val < -100 || 100 < val) return false;

        switch (axis)
        {
            case 0: if (b.maxCorner.x - 10 < val) return false; b.minCorner.x = val; break;
            case 1: if (b.maxCorner.y - 10 < val) return false; b.minCorner.y = val; break;
            case 2: if (b.maxCorner.z - 10 < val) return false; b.minCorner.z = val; break;
            case 3: if (val < b.minCorner.x + 10) return false; b.maxCorner.x = val; break;
            case 4: if (val < b.minCorner.y + 10) return false; b.maxCorner.y = val; break;
            case 5: if (val < b.minCorner.z + 10) return false; b.maxCorner.z = val; break;
        }
        return true;
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
