function Viewport (container)
{
    "use strict";

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

    this.updateNodeCount = function (v) { v = Math.round (v); if (10 <= v && v <= 100) updateNodes (v); };
    this.updateFactor = function (v) { if (0.5 <= v && v <= 1.0) { factor = v; refreshArbor (); }};

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
    }

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
                if (nodeInfos[probeIdx] === 0) // is not processed
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
