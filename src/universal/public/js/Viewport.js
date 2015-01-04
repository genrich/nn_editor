function Viewport (container)
{
    var camera, scene, renderer, controls, light,
        boundingBox, nodes;

    scene = new THREE.Scene ();

    scene.add (new THREE.AmbientLight (0x404040));

    light = new THREE.DirectionalLight (0xffffff);
    scene.add (light);

    camera = new THREE.PerspectiveCamera (75, container.width () / container.height (), 1, 10000);
    camera.position.set (0, 0, 300);

    controls = new THREE.TrackballControls (camera, container[0]);
    controls.target.set (0, 0, 0);
    controls.addEventListener ('change', updateLightPosition);
    updateLightPosition ();

    renderer = new THREE.WebGLRenderer ({ antialias: true });
    renderer.setClearColor ($('body').css ('background-color'));
    renderer.setSize (container.width (), container.height ());

    container.append (renderer.domElement);

    window.addEventListener ('resize', onWindowResize, false);

    (function animate (timestamp)
    {
        controls.update ();
        renderer.render (scene, camera);
        requestAnimationFrame (animate);
    }) ();

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

    var minCornerX, minCornerY, minCornerZ, maxCornerX, maxCornerY, maxCornerZ,
        minCornerXidxs = [0, 3, 12, 15], minCornerYidxs = [1, 10, 13, 22], minCornerZidxs = [14, 17, 20, 23],
        maxCornerXidxs = [6, 9, 18, 21], maxCornerYidxs = [4, 7, 16, 19],  maxCornerZidxs = [2, 5, 8, 11],
        nodePos = [0, 0, 0];

    this.init = function (data)
    {
        // remember bounding box
        var minCorner = data.boundingBox.minCorner, maxCorner = data.boundingBox.maxCorner;
        minCornerX = minCorner.x; minCornerY = minCorner.y; minCornerZ = minCorner.z;
        maxCornerX = maxCorner.x; maxCornerY = maxCorner.y; maxCornerZ = maxCorner.z;

        // create bounding box visualisation
        var position = [minCornerX, minCornerY, maxCornerZ,
                        minCornerX, maxCornerY, maxCornerZ,
                        maxCornerX, maxCornerY, maxCornerZ,
                        maxCornerX, minCornerY, maxCornerZ,
                        minCornerX, minCornerY, minCornerZ,
                        minCornerX, maxCornerY, minCornerZ,
                        maxCornerX, maxCornerY, minCornerZ,
                        maxCornerX, minCornerY, minCornerZ];
        var indices = [0, 1, 0, 4, 0, 3, 5, 1, 5, 4, 5, 6, 2, 1, 2, 6, 2, 3, 7, 6, 7, 4, 7, 3];
        var geometry = new THREE.BufferGeometry ();
        geometry.addAttribute ('index',    new THREE.BufferAttribute (new Uint16Array  (indices),  1));
        geometry.addAttribute ('position', new THREE.BufferAttribute (new Float32Array (position), 3));
        var material = new THREE.LineBasicMaterial ({ color: 0x555555 });
        boundingBox = new THREE.Line (geometry, material, THREE.LinePieces);
        scene.add (boundingBox);

        // create nodes
        const nodeCount = 100;
        for (var i = 1; i < nodeCount; ++i)
            nodePos.push (minCornerX + Math.random () * (maxCornerX - minCornerX),
                          minCornerY + Math.random () * (maxCornerY - minCornerY),
                          minCornerZ + Math.random () * (maxCornerZ - minCornerZ));

        geometry = new THREE.BufferGeometry ();
        geometry.addAttribute ('position', new THREE.BufferAttribute (new Float32Array (nodePos), 3));
        material = new THREE.PointCloudMaterial ({ size: 2, color: 0x555555 });
        nodes = new THREE.PointCloud (geometry, material);
        scene.add (nodes);
    }

    this.updateMinCornerX = function (v) { if (validateLess (v, maxCornerXidxs)) updatePos (v, minCornerXidxs); }
    this.updateMinCornerY = function (v) { if (validateLess (v, maxCornerYidxs)) updatePos (v, minCornerYidxs); }
    this.updateMinCornerZ = function (v) { if (validateLess (v, maxCornerZidxs)) updatePos (v, minCornerZidxs); }
    this.updateMaxCornerX = function (v) { if (validateMore (v, minCornerXidxs)) updatePos (v, maxCornerXidxs); }
    this.updateMaxCornerY = function (v) { if (validateMore (v, minCornerYidxs)) updatePos (v, maxCornerYidxs); }
    this.updateMaxCornerZ = function (v) { if (validateMore (v, minCornerZidxs)) updatePos (v, maxCornerZidxs); }
    this.updateNodeCount = function (v) { if (10 <= v && v <= 100) return; }

    function validateLess (v, idxs)
    {
        var a = boundingBox.geometry.attributes.position.array;
        if (v <= a[idxs[0]] - 10)
            return true;
        else
            return false;
    }

    function validateMore (v, idxs)
    {
        var a = boundingBox.geometry.attributes.position.array;
        if (a[idxs[0]] + 10 <= v)
            return true;
        else
            return false;
    }

    function updatePos (v, idxs)
    {
        var boxAttrPos = boundingBox.geometry.attributes.position;
        idxs.forEach (function (idx)
        {
            boxAttrPos.array[idx] = v;
        });
        boxAttrPos.needsUpdate = true;

        var nodeAttrPos = nodes.geometry.attributes.position,
            len = nodePos.length / 3,
            minX = boxAttrPos.array[minCornerXidxs[0]],
            minY = boxAttrPos.array[minCornerYidxs[0]],
            minZ = boxAttrPos.array[minCornerZidxs[0]]
            maxX = boxAttrPos.array[maxCornerXidxs[0]],
            maxY = boxAttrPos.array[maxCornerYidxs[0]],
            maxZ = boxAttrPos.array[maxCornerZidxs[0]],
            scaleX = (maxX - minX) / (maxCornerX - minCornerX),
            scaleY = (maxY - minY) / (maxCornerY - minCornerY),
            scaleZ = (maxZ - minZ) / (maxCornerZ - minCornerZ);
        for (var i = 0; i < len; ++i)
        {
            nodeAttrPos.array[i * 3]     = minX + scaleX * (nodePos[i * 3]     - minCornerX);
            nodeAttrPos.array[i * 3 + 1] = minY + scaleY * (nodePos[i * 3 + 1] - minCornerY);
            nodeAttrPos.array[i * 3 + 2] = minZ + scaleZ * (nodePos[i * 3 + 2] - minCornerZ);
        }
        nodeAttrPos.needsUpdate = true;
    }
}
